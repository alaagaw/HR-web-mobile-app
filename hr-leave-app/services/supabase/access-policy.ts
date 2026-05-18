import { supabase } from './client';
import type { AccessPolicy, AccessRule } from '@/types/models';

/**
 * CRUD for access_policies (migration 045) — the HR-configurable
 * gate for navbar items and pages.
 *
 * Reads are allowed for any signed-in user (the client needs the
 * full set to render the navbar); writes are RLS-restricted to
 * HR / HR_Director. This service is the only place that touches
 * the table; evaluation lives in lib/access/evaluate.ts.
 */
export const accessPolicyService = {
  /** The whole policy set — small table, fetched once per session. */
  async listAll(): Promise<AccessPolicy[]> {
    const { data, error } = await supabase
      .from('access_policies')
      .select('*')
      .order('category', { ascending: true })
      .order('label', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AccessPolicy[];
  },

  /**
   * HR edits one resource's policy. Upsert keyed on resource_key
   * so a resource that was only in the registry (never seeded)
   * gets its first row created on first edit.
   */
  async upsert(
    policy: {
      resource_key: string;
      label: string;
      category: 'nav' | 'page';
      visible_to_all: boolean;
      rules: AccessRule[];
      enabled?: boolean;
    },
    updatedBy: string,
  ): Promise<AccessPolicy> {
    const { data, error } = await supabase
      .from('access_policies')
      .upsert(
        {
          resource_key: policy.resource_key,
          label: policy.label,
          category: policy.category,
          visible_to_all: policy.visible_to_all,
          rules: policy.rules,
          enabled: policy.enabled ?? true,
          updated_by: updatedBy,
        },
        { onConflict: 'resource_key' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as AccessPolicy;
  },
};
