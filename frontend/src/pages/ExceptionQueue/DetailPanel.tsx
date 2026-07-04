import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styles from './DetailPanel.module.css';
import { queryKeys } from '../../api/queryKeys';
import * as exceptionsApi from '../../api/exceptions';
import { SeverityBadge } from '../../components/Badge/SeverityBadge';
import { StatusBadge } from '../../components/Badge/StatusBadge';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Textarea } from '../../components/Form/Field';
import { Spinner } from '../../components/Spinner/Spinner';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { useApproveFlow } from '../../hooks/useApproveFlow';
import { useUi } from '../../hooks/useUi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime, formatMoneyFull } from '../../lib/formatters';
import { colors } from '../../lib/tokens';
import { ApiError } from '../../api/client';
import type { TimelineEvent } from '../../types';

const TIMELINE_DOT: Record<string, { bg: string; border: string }> = {
  detected: { bg: colors.mediumBg, border: colors.medium },
  action: { bg: colors.resolvedBg, border: colors.resolved },
  note: { bg: colors.lightGray, border: colors.midGray },
  escalation: { bg: colors.criticalBg, border: colors.critical },
  system: { bg: colors.lightGray, border: colors.midGray },
};

function TimelineDotIcon({ kind }: { kind: string }) {
  const c = TIMELINE_DOT[kind] || TIMELINE_DOT.system;
  return <div className={styles.timelineDot} style={{ background: c.bg, border: `1.5px solid ${c.border}` }} />;
}

export function DetailPanel({ exceptionId }: { exceptionId: string }) {
  const { user } = useAuth();
  const { openEscalate } = useUi();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [openingSource, setOpeningSource] = useState(false);

  const { data: exc, isLoading } = useQuery({
    queryKey: queryKeys.exception(exceptionId),
    queryFn: () => exceptionsApi.getException(exceptionId),
  });

  const approveFlow = useApproveFlow(exceptionId);

  const noteMutation = useMutation({
    mutationFn: (body: string) => exceptionsApi.addNote(exceptionId, body),
    onSuccess: () => {
      setNoteOpen(false);
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: queryKeys.exception(exceptionId) });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
    },
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not add note', 'error'),
  });

  async function openInSource() {
    if (!exc) return;
    setOpeningSource(true);
    try {
      const link = await exceptionsApi.getDeeplink(exc.id);
      window.open(link.url, '_blank', 'noopener');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not resolve deep link', 'error');
    } finally {
      setOpeningSource(false);
    }
  }

  if (isLoading || !exc) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  const canApprove = exc.allowed_actions.includes('approve');
  const canEscalate = exc.allowed_actions.includes('escalate');
  const isTerminal = exc.status === 'action_taken' || exc.status === 'resolved';
  const showApproved = isTerminal || approveFlow.status === 'approved';

  return (
    <>
      <div className={styles.scroll}>
        {/* 1. Header */}
        <div className={styles.header}>
          <div className={styles.title}>{exc.title}</div>
          <div className={styles.badgeRow}>
            <SeverityBadge severity={exc.severity} />
            <StatusBadge status={exc.status} label={exc.status_label} />
            <Badge bg="var(--medium-bg)" text="var(--medium)">
              {exc.type} · {exc.company || '—'}
            </Badge>
          </div>
        </div>

        {/* 2. Impact analysis */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Impact analysis</div>
          <div className={styles.impactRows}>
            {exc.impact.map(([label, value, isRisk], i) => (
              <div className={styles.impactRow} key={i}>
                <div className={styles.impactLabel}>{label}</div>
                <div className={styles.impactValue} style={{ color: isRisk ? 'var(--critical)' : 'var(--black)' }}>
                  {value}
                </div>
              </div>
            ))}
            {exc.risk_date && (
              <div className={styles.impactRow}>
                <div className={styles.impactLabel}>Risk date</div>
                <div className={styles.impactValue}>{exc.risk_date}</div>
              </div>
            )}
            {exc.value_at_risk > 0 && (
              <div className={styles.impactRow}>
                <div className={styles.impactLabel}>Value at risk</div>
                <div className={styles.impactValue} style={{ color: 'var(--critical)' }}>
                  {formatMoneyFull(exc.value_at_risk)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2b. Why this exception exists */}
        <div className={styles.traceBox}>
          <div className={styles.traceLabel}>Why this exception exists</div>
          <div className={styles.impactRows}>
            <div className={styles.impactRow}>
              <div className={styles.impactLabel} style={{ fontSize: 12 }}>
                Created by rule
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)' }}>{exc.rule_trace.rule_name}</div>
            </div>
            <div className={styles.impactRow}>
              <div className={styles.impactLabel} style={{ fontSize: 12 }}>
                Condition met
              </div>
              <div style={{ fontSize: 12, color: 'var(--dark-gray)' }}>{exc.rule_trace.condition}</div>
            </div>
            <div className={styles.impactRow}>
              <div className={styles.impactLabel} style={{ fontSize: 12 }}>
                Routed to
              </div>
              <div style={{ fontSize: 12, color: 'var(--dark-gray)' }}>{exc.rule_trace.route_to_role}</div>
            </div>
          </div>
        </div>

        {/* 3. AI suggestion */}
        {exc.ai_suggestion && (
          <Tooltip text="This suggestion is generated by AI. Always verify before approving.">
            <div className={styles.aiBox}>
              <div className={styles.aiHeader}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>AI suggestion</span>
              </div>
              <div className={styles.aiBody}>{exc.ai_suggestion.body}</div>
              <div className={styles.aiConfidence}>Confidence: {Math.round(exc.ai_suggestion.confidence * 100)}%</div>
            </div>
          </Tooltip>
        )}

        {/* 4. Activity timeline */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Activity timeline</div>
          <div className={styles.timeline}>
            {exc.timeline.map((item: TimelineEvent, i: number) => (
              <div className={styles.timelineItem} key={item.id}>
                <div className={styles.timelineDotCol}>
                  <TimelineDotIcon kind={item.kind} />
                  {i < exc.timeline.length - 1 && <div className={styles.timelineLine} />}
                </div>
                <div className={styles.timelineBody}>
                  <div className={styles.timelineHead}>
                    <span className={styles.timelineWho}>{item.actor_name}</span>
                    <span className={styles.timelineWhen}>{formatDateTime(item.created_at)}</span>
                  </div>
                  <div className={styles.timelineText}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>
          {noteOpen && (
            <div className={styles.noteBox}>
              <Textarea
                placeholder="Add a note to the timeline…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                style={{ height: 64 }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <Button variant="primary" size="small" disabled={!noteText.trim() || noteMutation.isPending} onClick={() => noteMutation.mutate(noteText)}>
                  Add note
                </Button>
                <Button variant="outline" size="small" onClick={() => setNoteOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Action bar */}
      <div className={styles.actionBar}>
        {canApprove && !showApproved && approveFlow.status !== 'confirming' && approveFlow.status !== 'approving' && (
          <Button variant="primary" onClick={approveFlow.beginConfirm}>
            Approve {exc.type.toLowerCase().includes('hold') ? 're-slot' : 'action'}
          </Button>
        )}
        {canApprove && approveFlow.status === 'confirming' && (
          <>
            <span className={styles.confirmText}>Confirm approval?</span>
            <Button variant="primary" size="small" onClick={approveFlow.confirmApprove}>
              Yes, approve
            </Button>
            <Button variant="outline" size="small" onClick={approveFlow.cancelConfirm}>
              Cancel
            </Button>
          </>
        )}
        {canApprove && approveFlow.status === 'approving' && (
          <Button variant="primary" disabled>
            <Spinner size={12} color="var(--navy-dark)" /> Approving…
          </Button>
        )}
        {canApprove && showApproved && (
          <Button variant="success" disabled>
            Approved ✓
          </Button>
        )}
        {canEscalate && (
          <Button variant="outline" onClick={() => openEscalate(exc.id)}>
            Escalate
          </Button>
        )}
        <Button variant="outline" onClick={() => setNoteOpen((v) => !v)}>
          Add note
        </Button>
        <Button variant="outline" className={styles.sourceLink} onClick={openInSource} disabled={openingSource}>
          {openingSource ? <Spinner size={12} /> : null}
          <span>Open in {exc.source_system}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </Button>
      </div>
    </>
  );
}

export function DetailPanelEmpty() {
  return <EmptyState title="Select an exception to view details." />;
}

export function useCurrentUserId() {
  const { user } = useAuth();
  return user?.id;
}
