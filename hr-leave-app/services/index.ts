// ============================================================
// SERVICE BARREL EXPORT — THE place to swap backends
// ============================================================
// Today: all services from Supabase
// Tomorrow: change one line per service to swap to Express, Django, etc.

export { authService } from './supabase/auth';
export { leaveService } from './supabase/leave';
export { leaveApprovalService } from './supabase/leave-approval';
export { balanceService } from './supabase/balance';
export { attachmentService } from './supabase/attachment';
export { notificationService } from './supabase/notification';
export { auditService } from './supabase/audit';
export { userService } from './supabase/user';
export { documentService } from './supabase/document';
export { renewalTaskService } from './supabase/renewal-task';
export { registrationService } from './supabase/registration';
export { timeTrackingService } from './supabase/time-tracking';
export { projectService } from './supabase/project';
export { supplierService } from './supabase/supplier';
export { timesheetService } from './supabase/timesheet';
export { profileCapabilitiesService } from './supabase/profile-capabilities';
export { projectManagersService } from './supabase/project-managers';
export { projectHoursChangeService } from './supabase/project-hours-change';
export { monthClosureService } from './supabase/month-closure';
export { overtimeService } from './supabase/overtime';
export { compensationService } from './supabase/compensation';
export { lookupService, canonicaliseDepartment, canonicaliseNationality, canonicaliseDesignation } from './supabase/lookup';
export type { LookupItem } from './supabase/lookup';
export { hrPoliciesService } from './supabase/hr-policies';
export { accessPolicyService } from './supabase/access-policy';
