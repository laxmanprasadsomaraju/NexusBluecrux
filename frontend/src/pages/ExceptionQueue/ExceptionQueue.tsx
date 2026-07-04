import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styles from './ExceptionQueue.module.css';
import { queryKeys } from '../../api/queryKeys';
import * as exceptionsApi from '../../api/exceptions';
import { StatCard } from '../../components/Card/StatCard';
import { Pill } from '../../components/Pill/Pill';
import { Input } from '../../components/Form/Field';
import { Button } from '../../components/Button/Button';
import { ExceptionList } from './ExceptionList';
import { DetailPanel, DetailPanelEmpty } from './DetailPanel';
import { useDebouncedSearchParam } from '../../hooks/useDebouncedSearchParam';
import { useToast } from '../../hooks/useToast';
import { BASE_URL } from '../../api/client';

type PillFilter = 'all' | 'critical' | 'mine' | 'partner';

export function ExceptionQueue() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useDebouncedSearchParam('q');

  const pill = (searchParams.get('pill') as PillFilter) || 'all';
  const statusFilter = searchParams.get('status') || '';
  const partnerId = searchParams.get('partner') || '';
  const partnerName = searchParams.get('partnerName') || '';
  const q = searchParams.get('q') || '';
  const selected = searchParams.get('selected');

  function updateParams(patch: Record<string, string | null>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      });
      return next;
    });
  }

  const statsQuery = useQuery({ queryKey: queryKeys.exceptionStats(), queryFn: exceptionsApi.getExceptionStats });

  const listFilters = {
    severity: pill === 'critical' ? 'critical' : undefined,
    owner: pill === 'mine' ? 'me' : undefined,
    status: statusFilter || undefined,
    partner: partnerId || undefined,
    q: q || undefined,
    page_size: 200,
  };

  const listQuery = useQuery({
    queryKey: queryKeys.exceptions(listFilters),
    queryFn: () => exceptionsApi.listExceptions(listFilters),
  });

  const items = useMemo(() => {
    let base = listQuery.data?.items ?? [];
    if (pill === 'partner') base = base.filter((e) => !!e.partner_id);
    return base;
  }, [listQuery.data, pill]);

  const allCount = listQuery.data?.total ?? 0;

  function selectPill(next: PillFilter) {
    updateParams({ pill: next === 'all' ? null : next });
  }

  function selectException(id: string) {
    updateParams({ selected: id });
  }

  async function exportCsv() {
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`${BASE_URL}/exceptions/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exceptions_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Could not export CSV', 'error');
    }
  }

  const stats = statsQuery.data;

  return (
    <div className={styles.page}>
      <div className={styles.statStrip}>
        <StatCard
          label="Critical open"
          value={stats?.critical_open ?? '—'}
          valueColor="var(--critical)"
          delta={
            stats
              ? `${stats.critical_open_delta_vs_last_week >= 0 ? '↑' : '↓'} ${Math.abs(stats.critical_open_delta_vs_last_week)} vs last week`
              : undefined
          }
          deltaColor={stats && stats.critical_open_delta_vs_last_week > 0 ? 'var(--critical)' : 'var(--resolved)'}
          onClick={() => selectPill('critical')}
          active={pill === 'critical'}
        />
        <StatCard
          label="Awaiting action"
          value={stats?.awaiting_action ?? '—'}
          valueColor="var(--high)"
          delta={
            stats
              ? `${stats.awaiting_action_delta_vs_last_week >= 0 ? '↑' : '↓'} ${Math.abs(stats.awaiting_action_delta_vs_last_week)} vs last week`
              : undefined
          }
          onClick={() => updateParams({ status: 'awaiting_action' })}
          active={statusFilter === 'awaiting_action'}
        />
        <StatCard
          label="Resolved this week"
          value={stats?.resolved_this_week ?? '—'}
          valueColor="var(--resolved)"
          delta="Actions taken this week"
          onClick={() => updateParams({ status: 'resolved' })}
          active={statusFilter === 'resolved'}
        />
        <StatCard label="Avg time to act" value={`${stats?.avg_time_to_act_hours ?? '—'}h`} valueColor="var(--cyan-primary)" delta="Time to first action" />
      </div>

      <div className={styles.filterBar}>
        <Pill active={pill === 'all'} onClick={() => selectPill('all')}>
          All ({allCount})
        </Pill>
        <Pill active={pill === 'critical'} onClick={() => selectPill('critical')}>
          Critical
        </Pill>
        <Pill active={pill === 'mine'} onClick={() => selectPill('mine')}>
          Mine
        </Pill>
        <Pill active={pill === 'partner'} onClick={() => selectPill('partner')}>
          Partner
        </Pill>

        {partnerId && (
          <>
            <button className={styles.partnerChip} onClick={() => updateParams({ partner: null, partnerName: null })}>
              ← All partners
            </button>
            <span style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>Showing: {partnerName}</span>
          </>
        )}
        {statusFilter && (
          <button className={styles.chip} onClick={() => updateParams({ status: null })}>
            Filter: {statusFilter === 'awaiting_action' ? 'Awaiting action' : 'Resolved'} ✕
          </button>
        )}

        <Input
          className={styles.search}
          placeholder="Search exceptions…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <Button variant="outline" size="small" onClick={exportCsv}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Export CSV</span>
        </Button>
      </div>

      <div className={styles.mainRow}>
        <div className={styles.listColumn}>
          <ExceptionList items={items} selectedId={selected} onSelect={selectException} />
        </div>
        <div className={styles.detailColumn}>
          {selected ? <DetailPanel key={selected} exceptionId={selected} /> : <DetailPanelEmpty />}
        </div>
      </div>
    </div>
  );
}
