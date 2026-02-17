import type {
  Profile,
  ProfileSummary,
  LeaveRequest,
  LeaveRequestDraft,
  LeaveBalance,
  LeaveLedgerEntry,
  Attachment,
  AppNotification,
  HistoryEntry,
  EmployeeDocument,
  EmployeeDocumentDraft,
  HoursComputeParams,
  HoursResult,
  RequestFilters,
  EmployeeFilters,
  RenewalTask,
  RenewalTaskHistory,
  RenewalTaskFilters,
  RegistrationFormData,
  InviteEmployeeData,
  PendingRegistration,
  ApproveRegistrationData,
} from '@/types/models';
import type { ExcessDetermination, RegistrationStatus } from '@/types/enums';

// ============================================================
// SERVICE INTERFACES — Define WHAT the app can do, not HOW
// ============================================================

export interface AuthService {
  signIn(email: string, password: string): Promise<Profile>;
  signUp(email: string, password: string): Promise<{ user: Profile; needsEmailVerification: boolean }>;
  changePassword(newPassword: string): Promise<void>;
  signOut(): Promise<void>;
  getSession(): Promise<Profile | null>;
  onAuthStateChange(callback: (user: Profile | null) => void): () => void;
}

export interface LeaveService {
  createDraft(employeeId: string, data: LeaveRequestDraft): Promise<LeaveRequest>;
  submitRequest(requestId: string): Promise<LeaveRequest>;
  getMyRequests(employeeId: string, filters?: RequestFilters): Promise<LeaveRequest[]>;
  getRequestById(id: string): Promise<LeaveRequest>;
  cancelRequest(id: string, reason: string): Promise<void>;
  // HR admin
  getAllRequests(filters?: RequestFilters): Promise<LeaveRequest[]>;
  getAllRequestsInRange(dateFrom: string, dateTo: string): Promise<LeaveRequest[]>;
  reassignRequest(id: string, newAssigneeId: string, reason: string): Promise<void>;
  bypassApproval(id: string, reason: string): Promise<void>;
}

export interface LeaveApprovalService {
  getMyPendingApprovals(userId: string): Promise<LeaveRequest[]>;
  getChainRequests(userId: string, role: string): Promise<LeaveRequest[]>;
  approveRequest(requestId: string, userId: string, comment?: string): Promise<void>;
  rejectRequest(requestId: string, userId: string, comment: string): Promise<void>;
  determineExcess(requestId: string, userId: string, determination: ExcessDetermination, comment?: string): Promise<void>;
}

export interface BalanceService {
  getEmployeeBalance(employeeId: string): Promise<LeaveBalance[]>;
  getEmergencyCount(employeeId: string): Promise<number>;
  adjustBalance(employeeId: string, leaveType: string, hours: number, reason: string, performedBy: string): Promise<void>;
  getLedger(employeeId: string): Promise<LeaveLedgerEntry[]>;
  getAllLedgerEntries(): Promise<(LeaveLedgerEntry & { employee_name: string; employee_department: string | null; performer_name: string | null })[]>;
}

export interface AttachmentService {
  uploadAttachment(requestId: string, file: { uri: string; name: string; type: string; size: number }, uploadedBy: string): Promise<Attachment>;
  deleteAttachment(attachmentId: number): Promise<void>;
  getAttachments(requestId: string): Promise<Attachment[]>;
}

export interface NotificationService {
  getMyNotifications(userId: string): Promise<AppNotification[]>;
  markAsRead(id: number): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}

export interface AuditService {
  getRequestHistory(requestId: string): Promise<HistoryEntry[]>;
}

export interface UserService {
  getProfile(userId: string): Promise<Profile>;
  updateProfile(userId: string, data: Partial<Profile>): Promise<Profile>;
  getEmployees(filters?: EmployeeFilters): Promise<Profile[]>;
  updateEmployeeOrg(employeeId: string, supervisorId: string, managerId: string): Promise<void>;
}

export interface DocumentService {
  // Employee self-service
  getMyDocument(employeeId: string): Promise<EmployeeDocument | null>;
  upsertMyDocument(employeeId: string, data: EmployeeDocumentDraft): Promise<EmployeeDocument>;

  // HR admin
  getDocumentByEmployee(employeeId: string): Promise<EmployeeDocument | null>;
  getAllDocuments(): Promise<EmployeeDocument[]>;
  getExpiringDocuments(withinDays: number): Promise<EmployeeDocument[]>;
  verifyDocument(documentId: string, verifiedBy: string): Promise<EmployeeDocument>;
  updateDocument(documentId: string, data: Partial<EmployeeDocument>): Promise<EmployeeDocument>;

  // Bulk import (Excel/CSV)
  bulkUpsert(rows: Array<{ emp_code: string } & EmployeeDocumentDraft>): Promise<{ success: number; errors: string[] }>;
}

export interface CreateRenewalTaskInput {
  employeeId: string;
  documentId: string;
  documentType: string;
  expiryDate: string;
  assignedToId: string;
  assignedById: string;
  notes?: string;
}

export interface RenewalTaskService {
  createTask(data: CreateRenewalTaskInput): Promise<RenewalTask>;
  createBulkTasks(tasks: CreateRenewalTaskInput[]): Promise<RenewalTask[]>;
  getMyPendingTasks(userId: string): Promise<RenewalTask[]>;
  getAllTasks(filters?: RenewalTaskFilters): Promise<RenewalTask[]>;
  getTaskById(id: string): Promise<RenewalTask>;
  startTask(taskId: string, userId: string): Promise<void>;
  completeTask(taskId: string, userId: string, newExpiryDate: string, comment?: string): Promise<void>;
  cancelTask(taskId: string, userId: string, reason: string): Promise<void>;
  getTaskHistory(taskId: string): Promise<RenewalTaskHistory[]>;
  getAllHistory(dateFrom?: string, dateTo?: string): Promise<(RenewalTaskHistory & { task?: RenewalTask })[]>;
}

export interface RegistrationService {
  // Self-registration flow
  submitRegistration(userId: string, data: RegistrationFormData): Promise<Profile>;
  getRegistrationStatus(userId: string): Promise<RegistrationStatus>;

  // HR admin
  getPendingRegistrations(): Promise<PendingRegistration[]>;
  approveRegistration(userId: string, data: ApproveRegistrationData, approvedBy: string): Promise<Profile>;
  rejectRegistration(userId: string, reason: string, rejectedBy: string): Promise<Profile>;

  // HR invite (calls Edge Function)
  inviteEmployee(data: InviteEmployeeData, invitedBy: string): Promise<void>;
}
