import { supabase } from './client';
import type { ProjectService } from '../types';
import type { Project } from '@/types/models';

export const projectService: ProjectService = {
  async getAll(filters) {
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      const s = `%${filters.search}%`;
      query = query.or(`name.ilike.${s},project_number.ilike.${s},client.ilike.${s},location.ilike.${s}`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Project[];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Project;
  },

  async create(draft, createdBy) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...draft,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Project;
  },

  async update(id, updates) {
    // entry_mode is locked forever after creation. regular_hours_per_day
    // moves through the approval pipeline, not direct edits. Strip both so
    // a stale UI or bad caller cannot bypass the rule.
    const { entry_mode: _em, regular_hours_per_day: _rh, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Project;
  },

  async delete(id) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
