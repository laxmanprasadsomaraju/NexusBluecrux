import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styles from './PartnerQueue.module.css';
import { queryKeys } from '../../api/queryKeys';
import * as exceptionsApi from '../../api/exceptions';
import { SeverityDot } from '../../components/SeverityDot/SeverityDot';
import { SeverityBadge } from '../../components/Badge/SeverityBadge';
import { StatusBadge } from '../../components/Badge/StatusBadge';
import { Button } from '../../components/Button/Button';
import { Textarea } from '../../components/Form/Field';
import { Spinner } from '../../components/Spinner/Spinner';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { useToast } from '../../hooks/useToast';
import { formatDateTime, formatMoneyFull } from '../../lib/formatters';
import { ApiError } from '../../api/client';

export function PartnerQueue() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [confirming, setConfirming] = useState(false);

  const { data: listData, isLoading } = useQuery({
    queryKey: queryKeys.exceptions({ page_size: 100 }),
    queryFn: () => exceptionsApi.listExceptions({ page_size: 100 }),
  });

  const items = listData?.items ?? [];
  const activeId = selectedId || items[0]?.id || null;

  const { data: detail } = useQuery({
    queryKey: queryKeys.exception(activeId || ''),
    queryFn: () => exceptionsApi.getException(activeId as string),
    enabled: !!activeId,
  });

  const respondMutation = useMutation({
    mutationFn: (body: string) => exceptionsApi.addNote(activeId as string, body),
    onSuccess: () => {
      showToast('Response submitted — client notified in NEXUS', 'success');
      setResponse('');
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.exception(activeId || '') });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
    },
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not submit response', 'error'),
  });

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  if (!items.length) {
    return <EmptyState title="No requests yet" subtitle="Requests addressed to your organisation will show up here." />;
  }

  return (
    <div className={styles.layout}>
      <div className={styles.list}>
        <div className={styles.listLabel}>Your requests</div>
        {items.map((exc) => (
          <div
            key={exc.id}
            className={[styles.card, exc.id === activeId ? styles.cardSelected : ''].filter(Boolean).join(' ')}
            onClick={() => {
              setSelectedId(exc.id);
              setConfirming(false);
              setResponse('');
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <SeverityDot severity={exc.severity} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--black)', lineHeight: 1.35 }}>{exc.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, margin: '8px 0 0 16px', alignItems: 'center' }}>
              <StatusBadge status={exc.status} label={exc.status_label} />
              <span style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>{exc.age}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.detail}>
        {detail ? (
          <>
            <div className={styles.detailScroll}>
              <div style={{ borderBottom: '0.5px solid var(--mid-gray)', paddingBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--black)', lineHeight: 1.4 }}>{detail.title}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <SeverityBadge severity={detail.severity} />
                  <StatusBadge status={detail.status} label={detail.status_label} />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className={styles.sectionLabel}>Request details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {detail.impact.map(([label, value, isRisk], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline' }}>
                      <div style={{ width: 150, minWidth: 150, fontSize: 13, color: 'var(--timestamp-gray)' }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isRisk ? 'var(--critical)' : 'var(--black)' }}>{value}</div>
                    </div>
                  ))}
                  {detail.value_at_risk > 0 && (
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <div style={{ width: 150, minWidth: 150, fontSize: 13, color: 'var(--timestamp-gray)' }}>Value at risk</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--critical)' }}>{formatMoneyFull(detail.value_at_risk)}</div>
                    </div>
                  )}
                </div>
              </div>

              {detail.escalation_deadline && (
                <div style={{ marginTop: 14, background: 'var(--high-bg)', borderLeft: '4px solid var(--high)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--dark-gray)', lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 500, color: 'var(--high)' }}>Response needed by {formatDateTime(detail.escalation_deadline)}.</span> If no
                  response is received, this request auto-escalates to the client's Supply Chain Director.
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <div className={styles.sectionLabel}>Your response</div>
                <div style={{ marginTop: 12, maxWidth: 560 }}>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Constraints, partial coverage, alternatives, committed quantity…"
                    style={{ height: 80 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div className={styles.sectionLabel}>Request timeline</div>
                <div style={{ marginTop: 12 }}>
                  {detail.timeline.map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--light-gray)', border: '1.5px solid var(--mid-gray)' }} />
                        {i < detail.timeline.length - 1 && <div style={{ width: 0.5, flex: 1, background: 'var(--mid-gray)', minHeight: 12 }} />}
                      </div>
                      <div style={{ paddingBottom: 14, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)' }}>{item.actor_name}</span>
                          <span style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>{formatDateTime(item.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--dark-gray)', lineHeight: 1.5, marginTop: 2 }}>{item.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.actionBar}>
              {!confirming ? (
                <Button variant="primary" disabled={!response.trim()} onClick={() => setConfirming(true)}>
                  Submit response
                </Button>
              ) : (
                <>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)' }}>Confirm submission? It cannot be edited afterwards.</span>
                  <Button variant="primary" onClick={() => respondMutation.mutate(response)} disabled={respondMutation.isPending}>
                    {respondMutation.isPending ? <Spinner size={12} color="var(--navy-dark)" /> : 'Yes, submit'}
                  </Button>
                  <Button variant="outline" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={() => respondMutation.mutate('Cannot fulfil this request — no capacity available in the requested window.')}
                disabled={respondMutation.isPending}
              >
                Cannot fulfil
              </Button>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--timestamp-gray)' }}>Signed in via Entra B2B · partner-scoped access</span>
            </div>
          </>
        ) : (
          <EmptyState title="Select a request" />
        )}
      </div>
    </div>
  );
}
