import { supabase } from './client';
import type { HRPoliciesService } from '../types';
import type {
  HRDocument,
  HRDocumentFolder,
  HRDocumentVersion,
} from '@/types/models';
import { HRDocumentStatus } from '@/types/enums';
import { HR_DOCUMENTS_BUCKET } from '@/lib/constants';

// There are two FK relationships between hr_documents and
// hr_document_versions (documents.current_version_id -> versions, and
// versions.document_id -> documents), which makes PostgREST embedding
// ambiguous. So we never embed — we fetch documents, then fetch their
// current versions in one batched query and stitch them together here.
async function attachCurrentVersions(docs: HRDocument[]): Promise<HRDocument[]> {
  const versionIds = docs
    .map((d) => d.current_version_id)
    .filter((v): v is string => !!v);

  if (versionIds.length === 0) {
    return docs.map((d) => ({ ...d, current_version: null }));
  }

  const { data: versions, error } = await supabase
    .from('hr_document_versions')
    .select('*')
    .in('id', versionIds);
  if (error) throw new Error(error.message);

  const byId = new Map<string, HRDocumentVersion>(
    (versions ?? []).map((v) => [v.id, v as HRDocumentVersion]),
  );

  return docs.map((d) => ({
    ...d,
    current_version: d.current_version_id
      ? byId.get(d.current_version_id) ?? null
      : null,
  }));
}

function sanitizeFileName(name: string): string {
  // Keep word chars, dot and dash; collapse everything else. Preserves
  // the extension so MIME sniffing / "download original" stays sane.
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 180) || 'file';
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const hrPoliciesService: HRPoliciesService = {
  // ── Folders ────────────────────────────────────────────────

  async listFolders() {
    const { data, error } = await supabase
      .from('hr_document_folders')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as HRDocumentFolder[];
  },

  async createFolder(name, parentId, createdBy) {
    const { data, error } = await supabase
      .from('hr_document_folders')
      .insert({ name: name.trim(), parent_id: parentId, created_by: createdBy })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as HRDocumentFolder;
  },

  async renameFolder(folderId, name) {
    const { data, error } = await supabase
      .from('hr_document_folders')
      .update({ name: name.trim() })
      .eq('id', folderId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as HRDocumentFolder;
  },

  async deleteFolder(folderId) {
    // DB enforces ON DELETE RESTRICT for sub-folders; documents in the
    // folder are detached (folder_id -> NULL) automatically.
    const { error } = await supabase
      .from('hr_document_folders')
      .delete()
      .eq('id', folderId);
    if (error) {
      throw new Error(
        /foreign key|violates/i.test(error.message)
          ? 'This folder still has sub-folders. Delete or move them first.'
          : error.message,
      );
    }
  },

  // ── Documents ──────────────────────────────────────────────

  async listDocuments(includeArchived) {
    let q = supabase.from('hr_documents').select('*');
    if (!includeArchived) q = q.eq('status', HRDocumentStatus.Active);
    const { data, error } = await q.order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return attachCurrentVersions((data ?? []) as HRDocument[]);
  },

  async searchDocuments(query) {
    const { data, error } = await supabase.rpc('search_hr_documents', {
      p_query: query,
    });
    if (error) throw new Error(error.message);
    return attachCurrentVersions((data ?? []) as HRDocument[]);
  },

  async getVersions(documentId) {
    const { data, error } = await supabase
      .from('hr_document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_no', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as HRDocumentVersion[];
  },

  async updateDocument(documentId, draft) {
    const { data, error } = await supabase
      .from('hr_documents')
      .update({
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        tags: draft.tags,
        folder_id: draft.folder_id,
        visibility: draft.visibility,
      })
      .eq('id', documentId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const [withVersion] = await attachCurrentVersions([data as HRDocument]);
    return withVersion;
  },

  async uploadDocument({ documentId, draft, file, changeNote, uploadedBy }) {
    // 1. Create the logical document, or reuse the existing one.
    let docId = documentId;
    if (!docId) {
      const { data: created, error: cErr } = await supabase
        .from('hr_documents')
        .insert({
          title: draft.title.trim(),
          description: draft.description?.trim() || null,
          tags: draft.tags,
          folder_id: draft.folder_id,
          visibility: draft.visibility,
          status: HRDocumentStatus.Active,
          created_by: uploadedBy,
        })
        .select('id')
        .single();
      if (cErr) throw new Error(cErr.message);
      docId = created.id as string;
    }

    // 2. Next version number for this document.
    const { data: last } = await supabase
      .from('hr_document_versions')
      .select('version_no')
      .eq('document_id', docId)
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersionNo = (last?.version_no ?? 0) + 1;

    // 3. Upload the file to the private bucket.
    const safeName = sanitizeFileName(file.name);
    const filePath = `${docId}/${newId()}-${safeName}`;
    const blob = await (await fetch(file.uri)).blob();

    const { error: upErr } = await supabase.storage
      .from(HR_DOCUMENTS_BUCKET)
      .upload(filePath, blob, { contentType: file.type, upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    // 4. Record the version row.
    const { data: version, error: vErr } = await supabase
      .from('hr_document_versions')
      .insert({
        document_id: docId,
        version_no: nextVersionNo,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        change_note: changeNote?.trim() || null,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();
    if (vErr) {
      // Roll back the orphaned object so storage doesn't accumulate junk.
      await supabase.storage.from(HR_DOCUMENTS_BUCKET).remove([filePath]);
      throw new Error(vErr.message);
    }

    // 5. Point the document at the new version + sync its metadata.
    const { data: updated, error: dErr } = await supabase
      .from('hr_documents')
      .update({
        current_version_id: version.id,
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        tags: draft.tags,
        folder_id: draft.folder_id,
        visibility: draft.visibility,
      })
      .eq('id', docId)
      .select()
      .single();
    if (dErr) throw new Error(dErr.message);

    // 6. Kick off text extraction — FIRE AND FORGET. Indexing is best
    //    effort and can be slow (edge cold start + parser load). The
    //    file + version + pointer are already committed, so the upload
    //    must NOT wait on it; the doc is usable immediately and just
    //    becomes content-searchable a few seconds later.
    void supabase.functions
      .invoke('extract-document-text', { body: { version_id: version.id } })
      .catch(() => {
        /* non-fatal: document stands; only its content search lags */
      });

    const [withVersion] = await attachCurrentVersions([updated as HRDocument]);
    return withVersion;
  },

  async archiveDocument(documentId, archivedBy) {
    const { error } = await supabase
      .from('hr_documents')
      .update({
        status: HRDocumentStatus.Archived,
        archived_at: new Date().toISOString(),
        archived_by: archivedBy,
      })
      .eq('id', documentId);
    if (error) throw new Error(error.message);
  },

  async reactivateDocument(documentId) {
    const { error } = await supabase
      .from('hr_documents')
      .update({
        status: HRDocumentStatus.Active,
        archived_at: null,
        archived_by: null,
      })
      .eq('id', documentId);
    if (error) throw new Error(error.message);
  },

  async getFileUrl(versionId, download) {
    const { data, error } = await supabase.functions.invoke('hr-document-url', {
      body: { version_id: versionId, download },
    });
    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error(data?.error || 'Could not get document URL');
    return data as { url: string; file_name: string; file_type: string };
  },
};
