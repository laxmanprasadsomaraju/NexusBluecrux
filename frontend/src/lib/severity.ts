import { colors } from './tokens';
import type { Severity } from '../types';

export interface SeverityStyle {
  label: string;
  dot: string;
  badgeBg: string;
  badgeText: string;
}

const SEVERITY_STYLES: Record<Severity, SeverityStyle> = {
  critical: { label: 'Critical', dot: colors.critical, badgeBg: colors.criticalBg, badgeText: colors.critical },
  high: { label: 'High', dot: colors.high, badgeBg: colors.highBg, badgeText: colors.high },
  medium: { label: 'Medium', dot: colors.medium, badgeBg: colors.mediumBg, badgeText: colors.medium },
};

// The ONLY function allowed to map a severity string to colour — "red only ever means
// Critical" is enforced by routing every severity badge/dot through here.
export function getSeverityStyle(severity: string): SeverityStyle {
  return SEVERITY_STYLES[severity as Severity] || SEVERITY_STYLES.medium;
}

export function severityRank(severity: string): number {
  if (severity === 'critical') return 0;
  if (severity === 'high') return 1;
  return 2;
}
