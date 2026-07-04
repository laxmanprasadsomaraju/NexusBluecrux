import { colors } from './tokens';

export interface BadgeStyle {
  label: string;
  bg: string;
  text: string;
}

// My Actions bucket badges — COLOUR_SPEC B4.
const BUCKET_STYLES: Record<string, BadgeStyle> = {
  Overdue: { label: 'Overdue', bg: colors.criticalBg, text: colors.critical },
  'Due today': { label: 'Due today', bg: colors.highBg, text: colors.high },
  Tomorrow: { label: 'Tomorrow', bg: colors.mediumBg, text: colors.medium },
  'This week': { label: 'This week', bg: colors.lightGray, text: colors.darkGray },
  Completed: { label: 'Done', bg: colors.resolvedBg, text: colors.resolved },
};

export function getActionStatusBadge(bucket: string): BadgeStyle {
  return BUCKET_STYLES[bucket] || BUCKET_STYLES['This week'];
}

// Exception status badge — used in the detail header and exception list.
const EXCEPTION_STATUS_STYLES: Record<string, BadgeStyle> = {
  new: { label: 'New', bg: colors.mediumBg, text: colors.medium },
  awaiting_action: { label: 'Awaiting action', bg: colors.highBg, text: colors.high },
  in_review: { label: 'In review', bg: colors.mediumBg, text: colors.medium },
  escalated: { label: 'Escalated', bg: colors.criticalBg, text: colors.critical },
  partner_response_pending: { label: 'Partner response pending', bg: colors.highBg, text: colors.high },
  resolution_in_progress: { label: 'Resolution in progress', bg: colors.mediumBg, text: colors.medium },
  action_taken: { label: 'Action taken — monitoring', bg: colors.resolvedBg, text: colors.resolved },
  resolved: { label: 'Resolved', bg: colors.resolvedBg, text: colors.resolved },
};

export function getExceptionStatusBadge(status: string, label?: string): BadgeStyle {
  const found = EXCEPTION_STATUS_STYLES[status];
  if (found) return found;
  return { label: label || status, bg: colors.lightGray, text: colors.darkGray };
}

// Partner status badge — On track / Monitoring / Needs action (COLOUR_SPEC B6).
const PARTNER_STATUS_STYLES: Record<string, BadgeStyle> = {
  on_track: { label: 'On track', bg: colors.resolvedBg, text: colors.resolved },
  monitoring: { label: 'Monitoring', bg: colors.highBg, text: colors.high },
  needs_action: { label: 'Needs action', bg: colors.criticalBg, text: colors.critical },
};

export function getPartnerStatusBadge(status: string): BadgeStyle {
  return PARTNER_STATUS_STYLES[status] || PARTNER_STATUS_STYLES.on_track;
}

// Integration connection status.
export function getIntegrationStatusBadge(status: string): BadgeStyle {
  return status === 'connected'
    ? { label: 'Connected', bg: colors.resolvedBg, text: colors.resolved }
    : { label: 'Disconnected', bg: colors.lightGray, text: colors.darkGray };
}

// User account status (Users & permissions screen).
export function getUserStatusBadge(status: string): BadgeStyle {
  if (status === 'active') return { label: 'Active', bg: colors.resolvedBg, text: colors.resolved };
  if (status === 'invited') return { label: 'Invited', bg: colors.mediumBg, text: colors.medium };
  return { label: 'Deactivated', bg: colors.lightGray, text: colors.darkGray };
}
