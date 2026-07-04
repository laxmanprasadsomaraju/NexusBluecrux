import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import * as settingsApi from '../../api/settings';
import { Button } from '../../components/Button/Button';
import { Switch } from '../../components/Switch/Switch';
import { Select } from '../../components/Form/Field';
import { Spinner } from '../../components/Spinner/Spinner';
import { SeverityDot } from '../../components/SeverityDot/SeverityDot';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../api/client';

const FEATURE_LABELS: Record<string, [string, string]> = {
  ai_suggestions: ['AI suggestions', 'Show AI-generated suggestions on exceptions'],
  auto_escalation: ['Auto-escalation', 'Escalate automatically when a deadline passes'],
  teams_notifications: ['Microsoft Teams notifications', 'Post to Teams on create/escalate/overdue'],
  partner_portal: ['Partner portal', 'Allow partner-facing logins (Phase 2)'],
};

export function Settings() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: queryKeys.settings(), queryFn: settingsApi.getSettings });

  const [slaHours, setSlaHours] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [currency, setCurrency] = useState('EUR');
  const [retention, setRetention] = useState(7);

  useEffect(() => {
    if (data) {
      setSlaHours(data.sla_hours);
      setFlags(data.feature_flags);
      setCurrency(data.currency);
      setRetention(data.retention_years);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      settingsApi.updateSettings({ sla_hours: slaHours, feature_flags: flags, currency, retention_years: retention }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings() });
      showToast('Workspace settings saved', 'success');
    },
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not save settings', 'error'),
  });

  if (isLoading || !data) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, maxWidth: 1100 }}>
        <div style={{ background: 'var(--white)', border: '0.5px solid var(--mid-gray)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>SLA targets</div>
          <div style={{ fontSize: 11, color: 'var(--timestamp-gray)', marginTop: 2, marginBottom: 12 }}>
            Hours to first action by severity. Drives the SLA countdown on every exception card.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['critical', 'high', 'medium'].map((sev) => (
              <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SeverityDot severity={sev} />
                <span style={{ fontSize: 12, color: 'var(--dark-gray)', flex: 1, textTransform: 'capitalize' }}>{sev}</span>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={slaHours[sev] ?? ''}
                  onChange={(e) => setSlaHours({ ...slaHours, [sev]: Number(e.target.value) })}
                  style={{ width: 64, border: '0.5px solid var(--mid-gray)', borderRadius: 8, padding: '5px 8px', fontSize: 13 }}
                />
                <span style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>hours</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--white)', border: '0.5px solid var(--mid-gray)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>Feature options</div>
          <div style={{ fontSize: 11, color: 'var(--timestamp-gray)', marginTop: 2, marginBottom: 12 }}>
            Workspace-level switches. Changes apply to all users on next load.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(FEATURE_LABELS).map(([key, [label, sub]]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Switch checked={!!flags[key]} onChange={() => setFlags({ ...flags, [key]: !flags[key] })} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--black)', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--white)', border: '0.5px solid var(--mid-gray)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>Organisation</div>
          <div style={{ fontSize: 11, color: 'var(--timestamp-gray)', marginTop: 2, marginBottom: 12 }}>
            Identity, reporting currency and compliance retention.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--dark-gray)', flex: 1 }}>Reporting currency</span>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: 120 }}>
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
                <option value="CHF">CHF</option>
              </Select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--dark-gray)', flex: 1 }}>Audit retention</span>
              <Select value={retention} onChange={(e) => setRetention(Number(e.target.value))} style={{ width: 160 }}>
                <option value={5}>5 years</option>
                <option value={7}>7 years (GxP default)</option>
                <option value={10}>10 years</option>
              </Select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--dark-gray)', flex: 1 }}>SSO provider</span>
              <span style={{ fontSize: 12, color: 'var(--black)', fontWeight: 500 }}>Microsoft Entra ID</span>
            </div>
          </div>
        </div>
      </div>
      <Button variant="primary" style={{ marginTop: 14 }} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Spinner size={12} color="var(--navy-dark)" /> : 'Save settings'}
      </Button>
    </div>
  );
}
