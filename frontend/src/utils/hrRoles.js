/**
 * HR Roles and Permission Helpers
 */

export const LEAVE_APPROVAL_MANAGERS = [
  'hasintha@circlegroup.lk',
  'eranda@circlegroup.lk',
];

/**
 * Check if the current user is designated as an Approval Manager
 * (manually configured in HR Settings for approving leaves and attendance adjustments)
 */
export function isLeaveApprovalManager(user) {
  if (!user) return false;
  if (user.role === 'super_admin' || user.roles?.includes('super_admin')) return true;
  if (user.is_approval_manager !== undefined) {
    return Boolean(user.is_approval_manager);
  }
  // Fallback to initial seed emails if flag not present in cache
  if (user.email && LEAVE_APPROVAL_MANAGERS.includes(user.email.toLowerCase().trim())) {
    return true;
  }
  return false;
}

export const isApprovalManager = isLeaveApprovalManager;
