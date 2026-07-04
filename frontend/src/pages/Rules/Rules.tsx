import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import * as rulesApi from '../../api/rules';
import { Button } from '../../components/Button/Button';
import { Switch } from '../../components/Switch/Switch';
import { SeverityBadge } from '../../components/Badge/SeverityBadge';
import { Spinner } from '../../components/Spinner/Spinner';
import { Modal } from '../../components/Modal/Modal';
import { Field, Input, Select } from '../../components/Form/Field';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ruleSchema, validateAll } from '../../lib/validators';
import { ApiError } from '../../api/client';

const ROUTE_OPTIONS = ['QC Ops Lead', 'SC Planner', 'External Manufacturing Manager', 'Procurement Lead', 'Demand Planner'];
const SOURCE_OPTIONS = ['Axon', 'Helion', 'Anaplan', 'SAP', 'Binocs', 'Manual'];

export function Rules() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'admin' || user?.role === 'director';
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', condition_dsl: '', severity: 'high', route_to_role: ROUTE_OPTIONS[0], source_system: SOURCE_OPTIONS[0] });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({ queryKey: queryKeys.rules(), queryFn: rulesApi.listRules });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => rulesApi.patchRule(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rules() }),
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not update rule', 'error'),
  });

  const createMutation = useMutation({
    mutationFn: rulesApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules() });
      showToast('Rule created', 'success');
      setModalOpen(false);
      setForm({ name: '', condition_dsl: '', severity: 'high', route_to_role: ROUTE_OPTIONS[0], source_system: SOURCE_OPTIONS[0] });
    },
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not create rule', 'error'),
  });

  function submit() {
    const result = validateAll(ruleSchema, form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    createMutation.mutate({ ...form, enabled: true });
  }

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 960 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--timestamp-gray)', flex: 1 }}>
            Rules run on every sync: condition → severity → routed role. Every change is audited.
          </div>
          {canManage && (
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>New rule</span>
            </Button>
          )}
        </div>

        {(data?.items ?? []).map((r) => (
          <div key={r.id} style={{ background: 'var(--white)', border: '0.5px solid var(--mid-gray)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Switch
              checked={r.enabled}
              disabled={!canManage || toggleMutation.isPending}
              onChange={() => toggleMutation.mutate({ id: r.id, enabled: !r.enabled })}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{r.name}</div>
              <div style={{ fontSize: 12, color: 'var(--timestamp-gray)', marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>{r.condition_dsl}</div>
            </div>
            <SeverityBadge severity={r.severity} />
            <div style={{ fontSize: 12, color: 'var(--dark-gray)', whiteSpace: 'nowrap' }}>→ {r.route_to_role}</div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: 'var(--timestamp-gray)', marginTop: 4 }}>
          Rules evaluate on every sync. A matched rule creates the exception, sets severity, and routes to the owning role — the trace is visible on each
          exception under "Why this exception exists".
        </div>
      </div>

      {modalOpen && (
        <Modal
          title="New alert rule"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={submit} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Spinner size={12} color="var(--navy-dark)" /> : 'Create rule'}
              </Button>
            </>
          }
        >
          <Field label="Rule name *" error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Safety stock breach" />
          </Field>
          <Field label="Condition *" error={errors.condition_dsl}>
            <Input
              value={form.condition_dsl}
              onChange={(e) => setForm({ ...form, condition_dsl: e.target.value })}
              placeholder="e.g. Axon stock < 50% of policy days"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Severity">
              <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </Select>
            </Field>
            <Field label="Source system">
              <Select value={form.source_system} onChange={(e) => setForm({ ...form, source_system: e.target.value })}>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Route to">
            <Select value={form.route_to_role} onChange={(e) => setForm({ ...form, route_to_role: e.target.value })}>
              {ROUTE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
        </Modal>
      )}
    </div>
  );
}
