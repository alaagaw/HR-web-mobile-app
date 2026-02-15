// ============================================================
// SERVICE BARREL EXPORT — THE place to swap backends
// ============================================================
// Today: all services from Supabase
// Tomorrow: change one line per service to swap to Express, Django, etc.

export { authService } from './supabase/auth';
export { leaveService } from './supabase/leave';
export { approvalService } from './supabase/approval';
export { balanceService } from './supabase/balance';
export { attachmentService } from './supabase/attachment';
export { notificationService } from './supabase/notification';
export { auditService } from './supabase/audit';
export { userService } from './supabase/user';
