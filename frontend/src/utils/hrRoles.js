/**
 * HR Roles and Permission Helpers
 */

/**
 * Check if the current user is designated as an Approval Manager
 * (strictly determined by manual assignment in HR Settings; no automatic or default assignments).
 */
export function isLeaveApprovalManager(user) {
  if (!user) return false;
  if (user.role === 'super_admin' || user.roles?.includes('super_admin')) return true;
  return Boolean(user.is_approval_manager);
}

export const isApprovalManager = isLeaveApprovalManager;
