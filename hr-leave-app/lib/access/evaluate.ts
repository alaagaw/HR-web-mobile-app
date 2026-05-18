// ============================================================
// Access evaluation — the single rule engine.
//
// Phase 1 runs this client-side for navbar + route guard.
// Phase 2's Postgres fn_can_access() must mirror this logic
// EXACTLY so the two layers never disagree. Keep it pure and
// dependency-free for that reason (and so it stays testable).
// ============================================================

import { Role } from '@/types/enums';
import type { AccessPolicy, AccessRule } from '@/types/models';

/** Minimal slice of the signed-in profile the engine needs. */
export interface AccessSubject {
  role?: string | null;
  department?: string | null;
  job_title?: string | null;
}

/**
 * Minimal hardcoded lockout floor: HR / HR_Director can ALWAYS
 * reach the Access Control screen and the HR Admin menu — and
 * nothing else. This is the only role-based bypass left; it
 * exists solely so a bad policy or zero superusers can never
 * permanently brick policy management. Every other resource
 * obeys rules + the superuser flag, so a page CAN be restricted
 * away from regular HR (that was the whole point of switching to
 * an explicit superuser model — migration 047).
 *
 * Phase 2's fn_can_access() MUST mirror exactly this: superuser
 * bypass + this two-key HR floor, nothing broader.
 */
const FAILSAFE_RESOURCE_KEYS = new Set<string>([
  'nav:admin',
  'page:admin/access-control',
]);

export function isAccessFailsafe(
  subject: AccessSubject | null | undefined,
  resourceKey: string | undefined,
): boolean {
  const hrLike = subject?.role === Role.HR || subject?.role === Role.HRDirector;
  return hrLike && !!resourceKey && FAILSAFE_RESOURCE_KEYS.has(resourceKey);
}

/** Department is stored UPPERCASE (lookup_departments); role is an enum. */
const norm = (v: string | null | undefined) => (v ?? '').trim().toLowerCase();

function dimensionMatches(
  allowed: string[] | undefined,
  value: string | null | undefined,
): boolean {
  // Empty / absent ⇒ this dimension does not constrain the rule.
  if (!allowed || allowed.length === 0) return true;
  const v = norm(value);
  if (!v) return false;
  return allowed.some((a) => norm(a) === v);
}

/** A rule passes only if every NON-EMPTY dimension matches (AND). */
export function ruleMatches(rule: AccessRule, subject: AccessSubject): boolean {
  return (
    dimensionMatches(rule.roles, subject.role) &&
    dimensionMatches(rule.departments, subject.department) &&
    dimensionMatches(rule.job_titles, subject.job_title)
  );
}

/**
 * Resolve access for one resource.
 *
 * @param policy        the DB row, or undefined if none exists yet
 * @param subject       the signed-in profile slice
 * @param legacyDefault what to do when there is no (or a disabled)
 *                      policy — pass the resource's registry default
 *                      so a not-yet-seeded resource keeps today's
 *                      behavior instead of vanishing/leaking.
 * @param opts          resourceKey (for the HR lockout floor) and
 *                      isSuperuser (HR-assigned, bypasses everything).
 */
export function evaluateAccess(
  policy: AccessPolicy | undefined,
  subject: AccessSubject | null | undefined,
  legacyDefault: boolean,
  opts?: { resourceKey?: string; isSuperuser?: boolean },
): boolean {
  if (opts?.isSuperuser) return true;
  if (isAccessFailsafe(subject, opts?.resourceKey)) return true;
  if (!subject) return false;
  if (!policy || policy.enabled === false) return legacyDefault;
  if (policy.visible_to_all) return true;
  const rules = Array.isArray(policy.rules) ? policy.rules : [];
  return rules.some((r) => ruleMatches(r, subject));
}
