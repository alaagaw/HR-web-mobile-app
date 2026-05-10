import { supabase } from './client';
import type { ProfileCapabilities } from '@/types/models';

/**
 * CRUD for the profile_capabilities table.
 *
 * The row is sparse: every profile is allowed to NOT have a row (treated as
 * all flags false). Calling setForProfile inserts on first write and upserts
 * subsequently. Calling clearForProfile is the only way to wipe all flags
 * for a profile, but it's rarely needed — flipping individual flags to
 * false via setForProfile achieves the same.
 */
export const profileCapabilitiesService = {
  async getForProfile(profileId: string): Promise<ProfileCapabilities | null> {
    const { data, error } = await supabase
      .from('profile_capabilities')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as ProfileCapabilities | null;
  },

  async getMany(): Promise<ProfileCapabilities[]> {
    const { data, error } = await supabase
      .from('profile_capabilities')
      .select('*');
    if (error) throw new Error(error.message);
    return (data ?? []) as ProfileCapabilities[];
  },

  async setForProfile(
    profileId: string,
    flags: Partial<Pick<ProfileCapabilities,
      'is_general_manager' |
      'is_operations_manager' |
      'can_approve_project_hours_changes' |
      'can_close_month'
    >>,
  ): Promise<ProfileCapabilities> {
    const { data, error } = await supabase
      .from('profile_capabilities')
      .upsert(
        {
          profile_id: profileId,
          is_general_manager: flags.is_general_manager ?? false,
          is_operations_manager: flags.is_operations_manager ?? false,
          can_approve_project_hours_changes: flags.can_approve_project_hours_changes ?? false,
          can_close_month: flags.can_close_month ?? false,
        },
        { onConflict: 'profile_id' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ProfileCapabilities;
  },

  async clearForProfile(profileId: string): Promise<void> {
    const { error } = await supabase
      .from('profile_capabilities')
      .delete()
      .eq('profile_id', profileId);
    if (error) throw new Error(error.message);
  },
};
