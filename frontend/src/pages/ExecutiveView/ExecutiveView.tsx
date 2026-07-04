import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import styles from './ExecutiveView.module.css';
import { queryKeys } from '../../api/queryKeys';
import * as analyticsApi from '../../api/analytics';
import * as partnersApi from '../../api/partners';
import { HorizontalBarList } from '../../components/HorizontalBarList/HorizontalBarList';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Spinner } from '../../components/Spinner/Spinner';
import { getSeverityStyle } from '../../lib/severity';
import { getPartnerStatusBadge } from '../../lib/statusBadges';
import { colors, responseTimeColor, sourceColors } from '../../lib/tokens';
import { formatMoneyFull } from '../../lib/formatters';

export function ExecutiveView() {
  const navigate = useNavigate();

  const trendQuery = useQuery({ queryKey: queryKeys.analyticsTrend(), queryFn: () => analyticsApi.getResolutionTrend(4) });
  const sourceQuery = useQuery({ queryKey: queryKeys.analyticsBySource(), queryFn: analyticsApi.getBySource });
  const teamQuery = useQuery({ queryKey: queryKeys.analyticsTeamResponse(), queryFn: analyticsApi.getTeamResponse });
  const varQuery = useQuery({ queryKey: queryKeys.analyticsValueAtRisk(), queryFn: analyticsApi.getValueAtRisk });
  const otrQuery = useQuery({ queryKey: queryKeys.analyticsOnTimeRate(), queryFn: analyticsApi.getOnTimeRate });
  const partnersQuery = useQuery({ queryKey: queryKeys.partners(), queryFn: partnersApi.listPartners });

  const loading = trendQuery.isLoading || sourceQuery.isLoading || teamQuery.isLoading || varQuery.isLoading || otrQuery.isLoading;

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  const trendData = (trendQuery.data?.weeks ?? []).map((w, i) => ({
    label: `W${i + 1}`,
    Resolved: w.resolved,
    Opened: w.opened,
  }));

  const sourceBars = (sourceQuery.data?.items ?? []).map((s) => ({
    label: s.source_system,
    value: s.count,
    displayValue: String(s.count),
    color: sourceColors[s.source_system] || colors.midGray,
  }));

  const teamBars = (teamQuery.data?.items ?? []).map((t) => ({
    label: t.team,
    value: t.avg_response_hours,
    displayValue: `${t.avg_response_hours}h`,
    color: responseTimeColor(t.avg_response_hours),
  }));

  const varData = varQuery.data;
  const otrData = otrQuery.data;
  const otrPct = otrData?.on_time_rate_pct;
  const otrColor =
    otrPct === null || otrPct === undefined
      ? colors.timestampGray
      : otrPct >= (otrData?.target_pct ?? 85)
        ? colors.resolved
        : otrPct >= (otrData?.target_pct ?? 85) - 10
          ? colors.high
          : colors.critical;

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        <div className={styles.kpiStrip}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Value at risk — open</div>
            <div className={styles.kpiValue} style={{ color: 'var(--critical)' }}>
              {varData ? formatMoneyFull(varData.total_value_at_risk, varData.currency) : '—'}
            </div>
            <div className={styles.kpiDelta} style={{ color: (varData?.delta_vs_last_week ?? 0) > 0 ? 'var(--critical)' : 'var(--resolved)' }}>
              {varData && (varData.delta_vs_last_week >= 0 ? '↑ ' : '↓ ') + formatMoneyFull(Math.abs(varData.delta_vs_last_week), varData.currency) + ' vs last week'}
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Value protected — resolved</div>
            <div className={styles.kpiValue} style={{ color: 'var(--resolved)' }}>
              {varData ? formatMoneyFull(varData.value_protected_resolved, varData.currency) : '—'}
            </div>
            <div className={styles.kpiDelta} style={{ color: 'var(--timestamp-gray)' }}>
              Recovered by resolved exceptions
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Actions completed on time</div>
            <div className={styles.kpiValue} style={{ color: otrColor }}>
              {otrPct !== null && otrPct !== undefined ? `${otrPct}%` : 'n/a'}
            </div>
            <div className={styles.kpiDelta} style={{ color: 'var(--timestamp-gray)' }}>
              Target: {otrData?.target_pct}%
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Sample size</div>
            <div className={styles.kpiValue} style={{ color: 'var(--black)' }}>
              {otrData?.sample_size ?? 0}
            </div>
            <div className={styles.kpiDelta} style={{ color: 'var(--timestamp-gray)' }}>
              Completed actions measured
            </div>
          </div>
        </div>

        <div className={[styles.chartCard, styles.full].join(' ')}>
          <div className={styles.chartTitle}>Exception resolution trend</div>
          <div className={styles.chartSub}>Last 4 weeks — opened vs resolved</div>
          <div style={{ width: '100%', height: 140, marginTop: 8 }}>
            <ResponsiveContainer>
              <BarChart data={trendData} barGap={4} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={colors.midGray} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: colors.timestampGray }} axisLine={{ stroke: colors.midGray }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: colors.timestampGray }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `0.5px solid ${colors.midGray}` }} />
                <Bar dataKey="Opened" fill={colors.high} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Resolved" fill={colors.resolved} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: colors.high }} />
              Opened
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: colors.resolved }} />
              Resolved
            </div>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle} style={{ marginBottom: 12 }}>
            Exceptions by source
          </div>
          <HorizontalBarList data={sourceBars} />
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle} style={{ marginBottom: 12 }}>
            Team response times
          </div>
          <HorizontalBarList data={teamBars} />
        </div>

        <div className={[styles.chartCard, styles.full].join(' ')}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div className={styles.chartTitle}>Partner performance</div>
              <div className={styles.chartSub}>CMO, supplier and 3PL summary — click a row to drill into their exceptions</div>
            </div>
            <Button variant="outline" size="small" onClick={() => navigate('/partners')}>
              Full partner network →
            </Button>
          </div>
          <div>
            {(partnersQuery.data?.items ?? []).map((p) => {
              const sevStyle = p.open_top_severity ? getSeverityStyle(p.open_top_severity) : null;
              const statusStyle = getPartnerStatusBadge(p.status);
              return (
                <div
                  key={p.id}
                  className={styles.partnerRow}
                  onClick={() => navigate(`/exceptions?partner=${p.id}&partnerName=${encodeURIComponent(p.name)}`)}
                >
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)', width: 150, minWidth: 150 }}>{p.name}</span>
                  <Badge bg="var(--white)" text="var(--dark-gray)" style={{ border: '0.5px solid var(--mid-gray)' }}>
                    {p.type}
                  </Badge>
                  <span style={{ fontSize: 12, fontWeight: 500, color: sevStyle?.dot || 'var(--dark-gray)' }}>{p.open_summary}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: responseTimeColor(p.avg_response_hours) }}>{p.avg_response_hours}h</span>
                  <Badge bg={statusStyle.bg} text={statusStyle.text}>
                    {statusStyle.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
