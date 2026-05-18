// ============================================================
// Resource registry — the single client-side list of every
// guardable navbar item and page. Keys MUST match the seed in
// migration 045 (access_policies.resource_key).
//
// `legacyDefault` reproduces today's hardcoded behavior. It is
// only used when no policy row exists yet (e.g. a resource added
// in code before its seed migration ran) so nothing silently
// disappears or leaks. Once seeded, the DB row wins.
// ============================================================

import { Role } from '@/types/enums';
import type { AccessSubject } from './evaluate';

const isApprover = (s: AccessSubject) =>
  s.role === Role.Supervisor ||
  s.role === Role.Manager ||
  s.role === Role.HR ||
  s.role === Role.HRDirector;

const isHR = (s: AccessSubject) =>
  s.role === Role.HR || s.role === Role.HRDirector;

const ALL = () => true;

export interface AccessResource {
  key: string;
  label: string;
  category: 'nav' | 'page';
  /** Pages only: the expo-router path the route guard protects. */
  route?: string;
  legacyDefault: (s: AccessSubject) => boolean;
}

export const ACCESS_RESOURCES: AccessResource[] = [
  // ── Navbar (mirrors NAV_ITEMS in (tabs)/_layout.tsx) ────────
  { key: 'nav:dashboard',             label: 'Dashboard',                category: 'nav', legacyDefault: ALL },
  { key: 'nav:requests',              label: 'My Requests',              category: 'nav', legacyDefault: ALL },
  { key: 'nav:tasks',                 label: 'Tasks',                    category: 'nav', legacyDefault: isApprover },
  { key: 'nav:team',                  label: 'Team',                     category: 'nav', legacyDefault: isApprover },
  { key: 'nav:timeclock',             label: 'Clock In/Out',             category: 'nav', legacyDefault: ALL },
  { key: 'nav:timesheet-entry',       label: 'Timesheet',                category: 'nav', legacyDefault: ALL },
  { key: 'nav:calendar',              label: 'Calendar',                 category: 'nav', legacyDefault: ALL },
  { key: 'nav:timesheet-management',  label: 'Timesheet Management',     category: 'nav', route: '/(app)/admin/timesheet-management', legacyDefault: isHR },
  { key: 'nav:notifications',         label: 'Notifications',            category: 'nav', legacyDefault: ALL },
  { key: 'nav:hr-policies-documents', label: 'HR Policies & Documents',  category: 'nav', legacyDefault: ALL },
  { key: 'nav:admin',                 label: 'HR Admin',                 category: 'nav', legacyDefault: isHR },
  { key: 'nav:profile',               label: 'Profile',                  category: 'nav', legacyDefault: ALL },

  // ── HR Admin pages (today: HR-only via the admin tab) ───────
  { key: 'page:admin/document-expiry',            label: 'Document Expiry',              category: 'page', route: '/(app)/admin/document-expiry',            legacyDefault: isHR },
  { key: 'page:admin/registrations',              label: 'Pending Registrations',        category: 'page', route: '/(app)/admin/registrations',              legacyDefault: isHR },
  { key: 'page:admin/employees',                  label: 'Manage Employees',             category: 'page', route: '/(app)/admin/employees',                  legacyDefault: isHR },
  { key: 'page:admin/balances',                   label: 'Manage Balances',              category: 'page', route: '/(app)/admin/balances',                   legacyDefault: isHR },
  { key: 'page:admin/compensation',               label: 'Compensation',                 category: 'page', route: '/(app)/admin/compensation',               legacyDefault: isHR },
  { key: 'page:admin/leave-payouts',              label: 'Leave Payouts',                category: 'page', route: '/(app)/admin/leave-payouts',              legacyDefault: isHR },
  { key: 'page:admin/request-history',            label: 'Leave Request History',        category: 'page', route: '/(app)/admin/request-history',            legacyDefault: isHR },
  { key: 'page:admin/renewal-history',            label: 'Document Renewal History',     category: 'page', route: '/(app)/admin/renewal-history',            legacyDefault: isHR },
  { key: 'page:admin/balance-ledger',             label: 'Balance Ledger',               category: 'page', route: '/(app)/admin/balance-ledger',             legacyDefault: isHR },
  { key: 'page:admin/user-activity',              label: 'User Activity',                category: 'page', route: '/(app)/admin/user-activity',              legacyDefault: isHR },
  { key: 'page:admin/projects',                   label: 'Projects',                     category: 'page', route: '/(app)/admin/projects',                   legacyDefault: isHR },
  { key: 'page:admin/suppliers',                  label: 'Suppliers',                    category: 'page', route: '/(app)/admin/suppliers',                  legacyDefault: isHR },
  { key: 'page:admin/timesheets',                 label: 'Monthly Consolidated',         category: 'page', route: '/(app)/admin/timesheets',                 legacyDefault: isHR },
  { key: 'page:admin/timesheet-assignments',      label: 'Timesheet Assignments',        category: 'page', route: '/(app)/admin/timesheet-assignments',      legacyDefault: isHR },
  { key: 'page:admin/project-hours-requests',     label: 'Hours Change Requests',        category: 'page', route: '/(app)/admin/project-hours-requests',     legacyDefault: isHR },
  { key: 'page:admin/month-closures',             label: 'Month Closures',               category: 'page', route: '/(app)/admin/month-closures',             legacyDefault: isHR },
  { key: 'page:admin/employee-project-breakdown', label: 'Employee × Project Breakdown', category: 'page', route: '/(app)/admin/employee-project-breakdown', legacyDefault: isHR },
  { key: 'page:admin/access-control',             label: 'Access Control',               category: 'page', route: '/(app)/admin/access-control',             legacyDefault: isHR },
];

export const ACCESS_RESOURCE_BY_KEY: Record<string, AccessResource> =
  Object.fromEntries(ACCESS_RESOURCES.map((r) => [r.key, r]));
