/**
 * HR Roles and Permission Helpers
 */

export const LEAVE_APPROVAL_MANAGERS = [
  'hasintha@circlegroup.lk',
  'eranda@circlegroup.lk',
];

/**
 * Check if the current user is designated as a Leave Approval Manager
 * (e.g. CEO or GM / Project Director)
 */
export function isLeaveApprovalManager(user) {
  if (!user || !user.email) return false;
  return LEAVE_APPROVAL_MANAGERS.includes(user.email.toLowerCase().trim());
}
