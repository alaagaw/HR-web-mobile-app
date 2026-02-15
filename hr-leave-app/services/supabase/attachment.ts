import { supabase } from './client';
import type { AttachmentService } from '../types';
import type { Attachment } from '@/types/models';
import { ATTACHMENTS_BUCKET } from '@/lib/constants';
import { HistoryAction } from '@/types/enums';

export const attachmentService: AttachmentService = {
  async uploadAttachment(requestId, file, uploadedBy) {
    const filePath = `${requestId}/${Date.now()}-${file.name}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(filePath, { uri: file.uri, type: file.type, name: file.name } as any);

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .getPublicUrl(filePath);

    // Save metadata
    const { data: attachment, error: insertError } = await supabase
      .from('leave_attachments')
      .insert({
        request_id: requestId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    // Log history
    await supabase.from('leave_request_history').insert({
      request_id: requestId,
      action: HistoryAction.AttachmentAdded,
      performed_by: uploadedBy,
      performer_role: 'employee',
      metadata: { file_name: file.name },
    });

    return attachment as Attachment;
  },

  async deleteAttachment(attachmentId) {
    const { data: attachment } = await supabase
      .from('leave_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (!attachment) throw new Error('Attachment not found');

    // Delete from storage
    const filePath = attachment.file_url.split('/').slice(-2).join('/');
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([filePath]);

    // Delete metadata
    await supabase.from('leave_attachments').delete().eq('id', attachmentId);

    // Log history
    await supabase.from('leave_request_history').insert({
      request_id: attachment.request_id,
      action: HistoryAction.AttachmentRemoved,
      performed_by: attachment.uploaded_by,
      performer_role: 'employee',
      metadata: { file_name: attachment.file_name },
    });
  },

  async getAttachments(requestId) {
    const { data, error } = await supabase
      .from('leave_attachments')
      .select('*')
      .eq('request_id', requestId)
      .order('uploaded_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as Attachment[];
  },
};
