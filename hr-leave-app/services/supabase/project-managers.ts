import { supabase } from './client';
import type { ProjectManagerAssignment } from '@/types/models';

/**
 * CRUD for the project_managers join table.
 *
 * A profile can be PM on zero, one, or many projects. The approval pipeline
 * for project-hours change requests reads from this table to decide who is
 * allowed to see / request changes on a project.
 */
export const projectManagersService = {
  async getForProject(projectId: string): Promise<ProjectManagerAssignment[]> {
    const { data, error } = await supabase
      .from('project_managers')
      .select('*, profile:profiles!profile_id(id,full_name,role,department)')
      .eq('project_id', projectId);
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectManagerAssignment[];
  },

  async getForProfile(profileId: string): Promise<ProjectManagerAssignment[]> {
    const { data, error } = await supabase
      .from('project_managers')
      .select('*, project:projects!project_id(*)')
      .eq('profile_id', profileId);
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectManagerAssignment[];
  },

  /**
   * Replace the PM list for a project. Anything not in `profileIds` is removed;
   * anything new is inserted. Idempotent and safe to call repeatedly.
   */
  async setForProject(
    projectId: string,
    profileIds: string[],
    assignedBy: string,
  ): Promise<void> {
    const { data: existing, error: readErr } = await supabase
      .from('project_managers')
      .select('profile_id')
      .eq('project_id', projectId);
    if (readErr) throw new Error(readErr.message);

    const existingIds = new Set((existing ?? []).map((r: any) => r.profile_id));
    const targetIds = new Set(profileIds);

    const toRemove = [...existingIds].filter((id) => !targetIds.has(id));
    const toAdd = [...targetIds].filter((id) => !existingIds.has(id));

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('project_managers')
        .delete()
        .eq('project_id', projectId)
        .in('profile_id', toRemove);
      if (error) throw new Error(error.message);
    }

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('project_managers')
        .insert(toAdd.map((profileId) => ({
          project_id: projectId,
          profile_id: profileId,
          assigned_by: assignedBy,
        })));
      if (error) throw new Error(error.message);
    }
  },
};
