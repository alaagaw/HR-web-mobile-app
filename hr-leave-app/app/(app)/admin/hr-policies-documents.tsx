import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/layout/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { hrPoliciesService } from '@/services';
import { Role, HRDocumentStatus, HRDocumentVisibility } from '@/types/enums';
import type {
  HRDocument,
  HRDocumentFolder,
  HRDocumentVersion,
} from '@/types/models';
import { HR_DOC_ALLOWED_TYPES, HR_DOC_MAX_FILE_SIZE_BYTES } from '@/lib/constants';

const isWeb = Platform.OS === 'web';

// ── Lazy-load web-only deps ──────────────────────────────────
let RichTreeView: any;
let MuiThemeProvider: any;
let Chip: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let MuiButton: any;
let TextField: any;
let MenuItem: any;
let Autocomplete: any;
let Snackbar: any;
let Alert: any;
let CircularProgress: any;

if (isWeb) {
  RichTreeView = require('@mui/x-tree-view/RichTreeView').RichTreeView;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiButton = require('@mui/material/Button').default;
  TextField = require('@mui/material/TextField').default;
  MenuItem = require('@mui/material/MenuItem').default;
  Autocomplete = require('@mui/material/Autocomplete').default;
  Snackbar = require('@mui/material/Snackbar').default;
  Alert = require('@mui/material/Alert').default;
  CircularProgress = require('@mui/material/CircularProgress').default;
}

// ── Design tokens (match projects.tsx) ───────────────────────
const DT = {
  bgMain: '#0b1220',
  cardBg: '#111a2e',
  border: '#1e293b',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

// Virtual tree nodes that aren't real folders.
const NODE_ALL = '__all__';
const NODE_UNFILED = '__unfiled__';
const NODE_ARCHIVED = '__archived__';

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function fileKindLabel(type: string): string {
  if (type === PDF) return 'PDF';
  if (type === DOCX || type === 'application/msword') return 'Word';
  if (type === XLSX_MIME || type === 'application/vnd.ms-excel') return 'Excel';
  if (type.startsWith('image/')) return 'Image';
  return 'File';
}

function formatBytes(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Build the nested tree the RichTreeView expects from a flat folder list.
interface TreeNode { id: string; label: string; children?: TreeNode[]; }

function buildTree(folders: HRDocumentFolder[], isHR: boolean): TreeNode[] {
  const byParent = new Map<string | null, HRDocumentFolder[]>();
  for (const f of folders) {
    const k = f.parent_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(f);
  }
  const toNode = (f: HRDocumentFolder): TreeNode => {
    const kids = (byParent.get(f.id) ?? []).map(toNode);
    // Non-HR users never receive hr_only folders (RLS), so this marker
    // only ever shows for HR — a cue that the folder is restricted.
    const label = f.visibility === HRDocumentVisibility.HROnly ? `${f.name}  ·  HR only` : f.name;
    return { id: f.id, label, children: kids.length ? kids : undefined };
  };
  const roots = (byParent.get(null) ?? []).map(toNode);
  const tree: TreeNode[] = [
    { id: NODE_ALL, label: 'All Documents', children: roots.length ? roots : undefined },
    { id: NODE_UNFILED, label: 'Unfiled' },
  ];
  if (isHR) tree.push({ id: NODE_ARCHIVED, label: 'Archived' });
  return tree;
}

// ── Document metadata dialog (used for both upload & edit) ────
interface DocDialogState {
  open: boolean;
  mode: 'create' | 'replace' | 'edit';
  documentId: string | null;
  title: string;
  description: string;
  tags: string[];
  folder_id: string | null;
  visibility: HRDocumentVisibility;
  changeNote: string;
  file: { uri: string; name: string; type: string; size: number } | null;
  submitting: boolean;
}

const EMPTY_DIALOG: DocDialogState = {
  open: false,
  mode: 'create',
  documentId: null,
  title: '',
  description: '',
  tags: [],
  folder_id: null,
  visibility: HRDocumentVisibility.All,
  changeNote: '',
  file: null,
  submitting: false,
};

function DocDialog({
  state,
  folders,
  allTags,
  onChange,
  onClose,
  onSubmit,
}: {
  state: DocDialogState;
  folders: HRDocumentFolder[];
  allTags: string[];
  onChange: (patch: Partial<DocDialogState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!Dialog) return null;
  const needsFile = state.mode !== 'edit';
  const title =
    state.mode === 'create' ? 'New Document'
    : state.mode === 'replace' ? 'Upload New Version'
    : 'Edit Document';
  const isValid =
    state.title.trim().length > 0 && (!needsFile || !!state.file);

  const onPick = (e: any) => {
    const f: File | undefined = e.target.files?.[0];
    if (!f) return;
    if (f.size > HR_DOC_MAX_FILE_SIZE_BYTES) {
      alert(`File too large. Max ${(HR_DOC_MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB.`);
      return;
    }
    if (!HR_DOC_ALLOWED_TYPES.includes(f.type)) {
      alert('Unsupported file type. Allowed: PDF, Word, Excel, images.');
      return;
    }
    onChange({
      file: { uri: URL.createObjectURL(f), name: f.name, type: f.type, size: f.size },
      title: state.title || f.name.replace(/\.[^.]+$/, ''),
    });
  };

  return (
    <Dialog open={state.open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}>
      <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
        {state.mode === 'replace' && (
          <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
            The current file is kept as an older version and stays downloadable.
          </div>
        )}
      </DialogTitle>
      <DialogContent sx={{ pt: '24px !important', pb: 1, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {needsFile && (
          <div>
            <input
              type="file"
              accept={HR_DOC_ALLOWED_TYPES.join(',')}
              onChange={onPick}
              style={{ fontSize: 13 }}
            />
            {state.file && (
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                {state.file.name} · {fileKindLabel(state.file.type)} · {formatBytes(state.file.size)}
              </div>
            )}
          </div>
        )}
        <TextField label="Title" value={state.title} required size="small" fullWidth
          onChange={(e: any) => onChange({ title: e.target.value })} />
        <TextField label="Description" value={state.description} size="small" fullWidth multiline rows={2}
          onChange={(e: any) => onChange({ description: e.target.value })} />
        <Autocomplete
          multiple freeSolo options={allTags} value={state.tags}
          onChange={(_: any, v: string[]) => onChange({ tags: v })}
          renderInput={(p: any) => (
            <TextField {...p} label="Tags" size="small" placeholder="Add a tag and press Enter" />
          )}
          size="small" fullWidth
        />
        <TextField label="Folder" value={state.folder_id ?? ''} size="small" fullWidth select
          onChange={(e: any) => onChange({ folder_id: e.target.value || null })}>
          <MenuItem value="">— Unfiled —</MenuItem>
          {folders.map((f) => (
            <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
          ))}
        </TextField>
        <TextField label="Visibility" value={state.visibility} size="small" fullWidth select
          onChange={(e: any) => onChange({ visibility: e.target.value })}
          helperText={
            state.visibility === HRDocumentVisibility.All
              ? 'Every signed-in employee can read this.'
              : 'Only HR / HR Director can see this document.'
          }>
          <MenuItem value={HRDocumentVisibility.All}>All employees</MenuItem>
          <MenuItem value={HRDocumentVisibility.HROnly}>HR only</MenuItem>
        </TextField>
        {state.mode === 'replace' && (
          <TextField label="What changed? (optional)" value={state.changeNote} size="small" fullWidth
            onChange={(e: any) => onChange({ changeNote: e.target.value })} />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <MuiButton onClick={onClose} disabled={state.submitting} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </MuiButton>
        <MuiButton variant="contained" onClick={onSubmit} disabled={!isValid || state.submitting}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}>
          {state.submitting ? 'Saving…' : state.mode === 'edit' ? 'Save Changes' : 'Upload'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ── Inline preview pane ──────────────────────────────────────
function PreviewPane({ version, isDark }: { version: HRDocumentVersion | null; isDark: boolean }) {
  const [state, setState] = useState<{
    loading: boolean;
    kind: 'pdf' | 'image' | 'html' | 'none' | 'error';
    url?: string;
    html?: string;
    msg?: string;
  }>({ loading: false, kind: 'none' });

  useEffect(() => {
    let alive = true;
    if (!version) { setState({ loading: false, kind: 'none' }); return; }
    setState({ loading: true, kind: 'none' });

    (async () => {
      try {
        const { url } = await hrPoliciesService.getFileUrl(version.id, false);
        if (!alive) return;
        const t = version.file_type;
        if (t === PDF) {
          setState({ loading: false, kind: 'pdf', url });
        } else if (t.startsWith('image/')) {
          setState({ loading: false, kind: 'image', url });
        } else if (t === DOCX) {
          const ab = await (await fetch(url)).arrayBuffer();
          const mammoth = require('mammoth');
          const { value } = await mammoth.convertToHtml({ arrayBuffer: ab });
          if (alive) setState({ loading: false, kind: 'html', html: value });
        } else if (t === XLSX_MIME) {
          const ab = await (await fetch(url)).arrayBuffer();
          const XLSX = require('xlsx');
          const wb = XLSX.read(new Uint8Array(ab), { type: 'array' });
          const html = wb.SheetNames
            .map((n: string) => `<h3 style="margin:16px 0 6px">${n}</h3>${XLSX.utils.sheet_to_html(wb.Sheets[n])}`)
            .join('');
          if (alive) setState({ loading: false, kind: 'html', html });
        } else {
          setState({ loading: false, kind: 'none', msg: 'No inline preview for this file type. Use Download to open it.' });
        }
      } catch (e: any) {
        if (alive) setState({ loading: false, kind: 'error', msg: e?.message || 'Preview failed' });
      }
    })();

    return () => { alive = false; };
  }, [version?.id]);

  const frame: React.CSSProperties = {
    flex: 1, minHeight: 0, borderRadius: 10, overflow: 'auto',
    border: `1px solid ${isDark ? DT.border : '#E2E8F0'}`,
    background: '#FFFFFF',
  };

  if (!version) {
    return (
      <div style={{ ...frame, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DT.textMuted }}>
        Select a document to preview it.
      </div>
    );
  }
  if (state.loading) {
    return (
      <div style={{ ...frame, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {CircularProgress ? <CircularProgress size={28} /> : 'Loading…'}
      </div>
    );
  }
  if (state.kind === 'pdf') {
    return <iframe title="preview" src={state.url} style={{ ...frame, border: 'none' } as any} />;
  }
  if (state.kind === 'image') {
    return (
      <div style={{ ...frame, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
        <img src={state.url} alt={version.file_name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
    );
  }
  if (state.kind === 'html') {
    return (
      <div style={{ ...frame, padding: 20, color: '#111' }}>
        <div dangerouslySetInnerHTML={{ __html: state.html || '' }} />
      </div>
    );
  }
  return (
    <div style={{ ...frame, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DT.textMuted, padding: 24, textAlign: 'center' }}>
      {state.msg || 'No preview available.'}
    </div>
  );
}

// ── Folder create / edit dialog ──────────────────────────────
interface FolderDialogState {
  open: boolean;
  mode: 'create' | 'edit';
  folderId: string | null;
  parentId: string | null;
  name: string;
  visibility: HRDocumentVisibility;
  submitting: boolean;
}

const EMPTY_FOLDER_DIALOG: FolderDialogState = {
  open: false,
  mode: 'create',
  folderId: null,
  parentId: null,
  name: '',
  visibility: HRDocumentVisibility.All,
  submitting: false,
};

function FolderDialog({
  state,
  onChange,
  onClose,
  onSubmit,
}: {
  state: FolderDialogState;
  onChange: (patch: Partial<FolderDialogState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!Dialog) return null;
  const isValid = state.name.trim().length > 0;
  return (
    <Dialog open={state.open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}>
      <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {state.mode === 'create' ? 'New Folder' : 'Edit Folder'}
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: '24px !important', pb: 1, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="Folder name" value={state.name} required size="small" fullWidth autoFocus
          onChange={(e: any) => onChange({ name: e.target.value })} />
        <TextField label="Visibility" value={state.visibility} size="small" fullWidth select
          onChange={(e: any) => onChange({ visibility: e.target.value })}
          helperText={
            state.visibility === HRDocumentVisibility.All
              ? 'Every signed-in employee can see this folder.'
              : 'Only HR / HR Director can see this folder and everything inside it.'
          }>
          <MenuItem value={HRDocumentVisibility.All}>All employees</MenuItem>
          <MenuItem value={HRDocumentVisibility.HROnly}>HR only</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <MuiButton onClick={onClose} disabled={state.submitting} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </MuiButton>
        <MuiButton variant="contained" onClick={onSubmit} disabled={!isValid || state.submitting}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}>
          {state.submitting ? 'Saving…' : state.mode === 'create' ? 'Create' : 'Save Changes'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ── Main screen ──────────────────────────────────────────────
export default function HRPoliciesDocumentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isHR = user?.role === Role.HR || user?.role === Role.HRDirector;

  const [folders, setFolders] = useState<HRDocumentFolder[]>([]);
  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string>(NODE_ALL);
  const [selectedDoc, setSelectedDoc] = useState<HRDocument | null>(null);
  const [versions, setVersions] = useState<HRDocumentVersion[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<HRDocument[] | null>(null);
  const [dialog, setDialog] = useState<DocDialogState>(EMPTY_DIALOG);
  const [folderDialog, setFolderDialog] = useState<FolderDialogState>(EMPTY_FOLDER_DIALOG);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [f, d] = await Promise.all([
        hrPoliciesService.listFolders(),
        hrPoliciesService.listDocuments(isHR), // HR also pulls archived
      ]);
      setFolders(f);
      setDocuments(d);
    } catch (e: any) {
      notify(e?.message || 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  }, [isHR]);

  useEffect(() => { refresh(); }, [refresh]);

  // Debounced content search.
  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      try {
        setSearchResults(await hrPoliciesService.searchDocuments(q));
      } catch {
        setSearchResults([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const openDoc = useCallback(async (doc: HRDocument) => {
    setSelectedDoc(doc);
    try {
      setVersions(await hrPoliciesService.getVersions(doc.id));
    } catch {
      setVersions([]);
    }
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    documents.forEach((d) => d.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [documents]);

  const tree = useMemo(() => buildTree(folders, isHR), [folders, isHR]);

  const visibleDocs = useMemo(() => {
    if (searchResults) return searchResults;
    if (selectedNode === NODE_ARCHIVED) {
      return documents.filter((d) => d.status === HRDocumentStatus.Archived);
    }
    const active = documents.filter((d) => d.status === HRDocumentStatus.Active);
    if (selectedNode === NODE_ALL) return active;
    if (selectedNode === NODE_UNFILED) return active.filter((d) => !d.folder_id);
    return active.filter((d) => d.folder_id === selectedNode);
  }, [documents, searchResults, selectedNode]);

  // ── Handlers ───────────────────────────────────────────────
  const handleNewFolder = () => {
    const parentId = selectedNode.startsWith('__') ? null : selectedNode;
    setFolderDialog({ ...EMPTY_FOLDER_DIALOG, open: true, mode: 'create', parentId });
  };

  const handleEditFolder = () => {
    if (selectedNode.startsWith('__')) return;
    const f = folders.find((x) => x.id === selectedNode);
    if (!f) return;
    setFolderDialog({
      open: true, mode: 'edit', folderId: f.id, parentId: f.parent_id,
      name: f.name, visibility: f.visibility, submitting: false,
    });
  };

  const submitFolderDialog = async () => {
    if (!user) return;
    setFolderDialog((s) => ({ ...s, submitting: true }));
    try {
      if (folderDialog.mode === 'create') {
        await hrPoliciesService.createFolder(
          folderDialog.name, folderDialog.parentId, folderDialog.visibility, user.id,
        );
        notify('Folder created');
      } else {
        await hrPoliciesService.updateFolder(
          folderDialog.folderId!, folderDialog.name, folderDialog.visibility,
        );
        notify('Folder updated');
      }
      setFolderDialog(EMPTY_FOLDER_DIALOG);
      await refresh();
    } catch (e: any) {
      notify(e?.message || 'Folder save failed', 'error');
      setFolderDialog((s) => ({ ...s, submitting: false }));
    }
  };

  const handleDeleteFolder = async () => {
    if (selectedNode.startsWith('__')) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this folder? Documents inside become Unfiled.')) return;
    try {
      await hrPoliciesService.deleteFolder(selectedNode);
      setSelectedNode(NODE_ALL);
      notify('Folder deleted');
      refresh();
    } catch (e: any) { notify(e?.message || 'Could not delete folder', 'error'); }
  };

  const openCreate = () =>
    setDialog({
      ...EMPTY_DIALOG, open: true, mode: 'create',
      folder_id: selectedNode.startsWith('__') ? null : selectedNode,
    });

  const openReplace = () => {
    if (!selectedDoc) return;
    setDialog({
      ...EMPTY_DIALOG, open: true, mode: 'replace',
      documentId: selectedDoc.id, title: selectedDoc.title,
      description: selectedDoc.description ?? '', tags: selectedDoc.tags ?? [],
      folder_id: selectedDoc.folder_id, visibility: selectedDoc.visibility,
    });
  };

  const openEdit = () => {
    if (!selectedDoc) return;
    setDialog({
      ...EMPTY_DIALOG, open: true, mode: 'edit',
      documentId: selectedDoc.id, title: selectedDoc.title,
      description: selectedDoc.description ?? '', tags: selectedDoc.tags ?? [],
      folder_id: selectedDoc.folder_id, visibility: selectedDoc.visibility,
    });
  };

  const submitDialog = async () => {
    if (!user) return;
    setDialog((s) => ({ ...s, submitting: true }));
    const draft = {
      title: dialog.title,
      description: dialog.description || null,
      tags: dialog.tags,
      folder_id: dialog.folder_id,
      visibility: dialog.visibility,
    };
    try {
      let saved: HRDocument;
      if (dialog.mode === 'edit') {
        saved = await hrPoliciesService.updateDocument(dialog.documentId!, draft);
      } else {
        saved = await hrPoliciesService.uploadDocument({
          documentId: dialog.documentId,
          draft,
          file: dialog.file!,
          changeNote: dialog.mode === 'replace' ? dialog.changeNote || null : null,
          uploadedBy: user.id,
        });
      }
      setDialog(EMPTY_DIALOG);
      notify(dialog.mode === 'replace' ? 'New version uploaded' : 'Saved');
      await refresh();
      await openDoc(saved);
    } catch (e: any) {
      notify(e?.message || 'Save failed', 'error');
      setDialog((s) => ({ ...s, submitting: false }));
    }
  };

  const doArchiveToggle = async () => {
    if (!selectedDoc || !user) return;
    try {
      if (selectedDoc.status === HRDocumentStatus.Active) {
        await hrPoliciesService.archiveDocument(selectedDoc.id, user.id);
        notify('Document archived');
      } else {
        await hrPoliciesService.reactivateDocument(selectedDoc.id);
        notify('Document reactivated');
      }
      await refresh();
      setSelectedDoc((d) => d ? { ...d, status: d.status === HRDocumentStatus.Active ? HRDocumentStatus.Archived : HRDocumentStatus.Active } : d);
    } catch (e: any) { notify(e?.message || 'Action failed', 'error'); }
  };

  const download = async (versionId: string) => {
    try {
      const { url } = await hrPoliciesService.getFileUrl(versionId, true);
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } catch (e: any) { notify(e?.message || 'Download failed', 'error'); }
  };

  // ── Mobile (web-first feature: read-only notice) ───────────
  if (!isWeb) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
        <ScreenHeader title="HR Policies & Documents" />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {visibleDocs.length === 0 ? (
            <EmptyState title="No documents" description="Open this section on the web app to manage documents." />
          ) : (
            visibleDocs.map((d) => (
              <View key={d.id} className="mb-3 p-4 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800">
                <Text className="text-base font-bold text-text-primary dark:text-white">{d.title}</Text>
                <Text className="text-xs text-text-muted dark:text-slate-400 mt-1">
                  {d.current_version ? fileKindLabel(d.current_version.file_type) : 'No file'} · Updated {formatDate(d.updated_at)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Web layout ─────────────────────────────────────────────
  const cur = selectedDoc?.current_version ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? DT.bgMain : '#F8FAFC' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: `1px solid ${isDark ? DT.border : '#E2E8F0'}`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div
          onClick={() => (window.history.length > 1 ? window.history.back() : router.replace('/(app)/(tabs)/admin' as any))}
          style={{ width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#E2E8F0' : '#0F172A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? DT.textPrimary : '#0F172A' }}>
            HR Policies &amp; Documents
          </div>
          <div style={{ fontSize: 13, color: isDark ? DT.textSecondary : DT.textMuted, marginTop: 2 }}>
            Browse, search, preview and download company policies and documents
          </div>
        </div>
        {isHR && (
          <>
            <button onClick={handleNewFolder} style={btnStyle(isDark, 'ghost')}>+ Folder</button>
            <button onClick={openCreate} style={btnStyle(isDark, 'primary')}>+ New Document</button>
          </>
        )}
      </div>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <MuiThemeProvider isDark={isDark}>
        {/* Left: search + tree */}
        <View style={{ width: 300, borderRightWidth: 1, borderRightColor: isDark ? DT.border : '#E2E8F0', padding: 16 }}>
          <input
            placeholder="Search title or contents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13, marginBottom: 14,
              border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`, borderRadius: 8,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF', color: isDark ? '#F8FAFC' : '#0F172A', outline: 'none',
            }}
          />
          {searchResults && (
            <div style={{ fontSize: 12, color: DT.textMuted, marginBottom: 8 }}>
              {searchResults.length} result(s) — clear search to browse folders
            </div>
          )}
          <RichTreeView
            items={tree}
            selectedItems={selectedNode}
            onSelectedItemsChange={(_e: any, id: string | null) => { if (id) { setSearch(''); setSelectedNode(id); } }}
            defaultExpandedItems={[NODE_ALL]}
          />
          {isHR && !selectedNode.startsWith('__') && (
            <>
              <button onClick={handleEditFolder} style={{ ...btnStyle(isDark, 'ghost'), marginTop: 14, width: '100%' }}>
                Edit selected folder
              </button>
              <button onClick={handleDeleteFolder} style={{ ...btnStyle(isDark, 'danger'), marginTop: 8, width: '100%' }}>
                Delete selected folder
              </button>
            </>
          )}
        </View>

        {/* Middle: document list */}
        <View style={{ width: 320, borderRightWidth: 1, borderRightColor: isDark ? DT.border : '#E2E8F0' }}>
          <ScrollView contentContainerStyle={{ padding: 12 }}>
            {loading ? (
              <Text style={{ color: DT.textMuted, padding: 12 }}>Loading…</Text>
            ) : visibleDocs.length === 0 ? (
              <EmptyState title="No documents" description={isHR ? 'Use “+ New Document” to add one.' : 'Nothing here yet.'} />
            ) : (
              visibleDocs.map((d) => {
                const sel = selectedDoc?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => openDoc(d)}
                    style={{
                      padding: '12px 14px', marginBottom: 8, borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${sel ? DT.primary : isDark ? DT.border : '#E2E8F0'}`,
                      backgroundColor: sel ? (isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF') : (isDark ? DT.cardBg : '#FFFFFF'),
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#F8FAFC' : '#0F172A' }}>{d.title}</div>
                    <div style={{ fontSize: 12, color: DT.textMuted, marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{d.current_version ? fileKindLabel(d.current_version.file_type) : 'No file'}</span>
                      <span>·</span>
                      <span>Updated {formatDate(d.updated_at)}</span>
                      {d.visibility === HRDocumentVisibility.HROnly && Chip && (
                        <Chip label="HR only" size="small" color="warning" sx={{ height: 18, fontSize: 10 }} />
                      )}
                      {d.status === HRDocumentStatus.Archived && Chip && (
                        <Chip label="Archived" size="small" sx={{ height: 18, fontSize: 10 }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Right: detail + preview */}
        <View style={{ flex: 1, padding: 20 }}>
          {!selectedDoc ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DT.textMuted, height: '100%' }}>
              Select a document on the left.
            </div>
          ) : (
            <View style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    {selectedDoc.title}
                  </div>
                  {selectedDoc.description ? (
                    <div style={{ fontSize: 13, color: DT.textMuted, marginTop: 4 }}>{selectedDoc.description}</div>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {selectedDoc.tags?.map((t) => Chip && (
                      <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {cur && (
                    <button onClick={() => download(cur.id)} style={btnStyle(isDark, 'primary')}>Download</button>
                  )}
                  {isHR && (
                    <>
                      <button onClick={openReplace} style={btnStyle(isDark, 'ghost')}>Replace</button>
                      <button onClick={openEdit} style={btnStyle(isDark, 'ghost')}>Edit</button>
                      <button onClick={doArchiveToggle} style={btnStyle(isDark, selectedDoc.status === HRDocumentStatus.Active ? 'danger' : 'ghost')}>
                        {selectedDoc.status === HRDocumentStatus.Active ? 'Archive' : 'Reactivate'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
                {/* Preview */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <PreviewPane version={cur} isDark={isDark} />
                </div>
                {/* Version history */}
                <div style={{ width: 260, borderLeft: `1px solid ${isDark ? DT.border : '#E2E8F0'}`, paddingLeft: 16, overflow: 'auto' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? DT.textSecondary : DT.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                    Versions
                  </div>
                  {versions.map((v) => (
                    <div key={v.id} style={{
                      padding: '10px 12px', marginBottom: 8, borderRadius: 8,
                      border: `1px solid ${v.id === selectedDoc.current_version_id ? DT.primary : isDark ? DT.border : '#E2E8F0'}`,
                      backgroundColor: isDark ? DT.cardBg : '#FFFFFF',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        v{v.version_no}{v.id === selectedDoc.current_version_id ? ' · current' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: DT.textMuted, marginTop: 2 }}>
                        {formatDate(v.uploaded_at)} · {formatBytes(v.file_size)}
                      </div>
                      {v.change_note ? (
                        <div style={{ fontSize: 11, color: DT.textMuted, marginTop: 4, fontStyle: 'italic' }}>{v.change_note}</div>
                      ) : null}
                      <button onClick={() => download(v.id)} style={{ ...btnStyle(isDark, 'ghost'), marginTop: 8, fontSize: 11, padding: '4px 10px' }}>
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </View>
          )}
        </View>
        </MuiThemeProvider>
      </View>

      {/* Dialogs + snackbar */}
      <MuiThemeProvider isDark={isDark}>
        <DocDialog
          state={dialog}
          folders={folders}
          allTags={allTags}
          onChange={(patch) => setDialog((s) => ({ ...s, ...patch }))}
          onClose={() => !dialog.submitting && setDialog(EMPTY_DIALOG)}
          onSubmit={submitDialog}
        />
        <FolderDialog
          state={folderDialog}
          onChange={(patch) => setFolderDialog((s) => ({ ...s, ...patch }))}
          onClose={() => !folderDialog.submitting && setFolderDialog(EMPTY_FOLDER_DIALOG)}
          onSubmit={submitFolderDialog}
        />
        {Snackbar && (
          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled">
              {snackbar.message}
            </Alert>
          </Snackbar>
        )}
      </MuiThemeProvider>
    </View>
  );
}

function btnStyle(isDark: boolean, kind: 'primary' | 'ghost' | 'danger'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
    cursor: 'pointer', border: '1px solid transparent', whiteSpace: 'nowrap',
  };
  if (kind === 'primary') return { ...base, backgroundColor: DT.primary, color: '#FFFFFF' };
  if (kind === 'danger') return { ...base, backgroundColor: 'transparent', color: DT.danger, borderColor: DT.danger };
  return {
    ...base, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
    color: isDark ? '#E2E8F0' : '#0F172A', borderColor: isDark ? '#334155' : '#CBD5E1',
  };
}
