import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import * as usersApi from '../../api/users';
import { Table, Th, Td, Tr } from '../../components/Table/Table';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Select, Field, Input } from '../../components/Form/Field';
import { Modal } from '../../components/Modal/Modal';
import { Spinner } from '../../components/Spinner/Spinner';
import { getUserStatusBadge } from '../../lib/statusBadges';
import { formatRelative } from '../../lib/formatters';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../api/client';
import type { UserFull } from '../../types';

const ROLES = ['planner', 'manager', 'director', 'partner', 'admin'];

const PERMISSIONS = [
  { cap: 'View exception queue', planner: '✓', manager: '✓', director: '✓', partner: '—', admin: '✓' },
  { cap: 'Approve actions', planner: '✓', manager: '✓', director: '✓', partner: '—', admin: '✓' },
  { cap: 'Escalate exceptions', planner: '✓', manager: '✓', director: '✓', partner: '—', admin: '✓' },
  { cap: 'View executive view', planner: '✓', manager: '✓', director: '✓', partner: '—', admin: '✓' },
  { cap: 'Manage alert rules', planner: '—', manager: '—', director: '✓', partner: '—', admin: '✓' },
  { cap: 'Manage integrations', planner: '—', manager: '—', director: '—', partner: '—', admin: '✓' },
  { cap: 'Manage users', planner: '—', manager: '—', director: '—', partner: '—', admin: '✓' },
  { cap: 'View audit log', planner: '—', manager: '—', director: '—', partner: '—', admin: '✓' },
  { cap: 'Respond to partner requests', planner: '—', manager: '—', director: '—', partner: '✓', admin: '—' },
];

export function Users() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'planner', title: '' });

  const { data, isLoading } = useQuery({ queryKey: queryKeys.users(), queryFn: usersApi.listUsers });

  const patchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { role?: string; status?: string } }) => usersApi.patchUser(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users() }),
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not update user', 'error'),
  });

  const reinviteMutation = useMutation({
    mutationFn: (id: string) => usersApi.reinviteUser(id),
    onSuccess: () => showToast('Invitation re-sent', 'success'),
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not re-invite user', 'error'),
  });

  const inviteMutation = useMutation({
    mutationFn: usersApi.inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      showToast('Invitation sent', 'success');
      setInviteOpen(false);
      setForm({ name: '', email: '', role: 'planner', title: '' });
    },
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not invite user', 'error'),
  });

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  const items = (data?.items ?? []) as UserFull[];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--timestamp-gray)', flex: 1 }}>
          Users sign in via Microsoft Entra ID (SSO). Roles control what each user can see and approve.
        </div>
        <Button variant="primary" onClick={() => setInviteOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Invite user</span>
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Team</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Last active</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((u, i) => {
            const badge = getUserStatusBadge(u.status);
            return (
              <Tr key={u.id} index={i}>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={u.name} size={24} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)', whiteSpace: 'nowrap' }}>{u.name}</span>
                  </div>
                </Td>
                <Td>{u.team_name || '—'}</Td>
                <Td>
                  <Select
                    value={u.role}
                    onChange={(e) => patchMutation.mutate({ id: u.id, payload: { role: e.target.value } })}
                    style={{ padding: '4px 8px', fontSize: 12 }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r[0].toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td>
                  <Badge bg={badge.bg} text={badge.text}>
                    {badge.label}
                  </Badge>
                </Td>
                <Td>
                  <span style={{ whiteSpace: 'nowrap' }}>{u.last_active_at ? formatRelative(u.last_active_at) : '—'}</span>
                </Td>
                <Td>
                  {u.status === 'invited' ? (
                    <Button variant="outline" size="small" disabled={reinviteMutation.isPending} onClick={() => reinviteMutation.mutate(u.id)}>
                      {reinviteMutation.isPending ? <Spinner size={11} /> : 'Re-invite'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => patchMutation.mutate({ id: u.id, payload: { status: u.status === 'active' ? 'deactivated' : 'active' } })}
                    >
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>

      <div style={{ background: 'var(--white)', border: '0.5px solid var(--mid-gray)', borderRadius: 12, padding: 14, marginTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>Permissions by role</div>
        <div style={{ fontSize: 11, color: 'var(--timestamp-gray)', marginTop: 2, marginBottom: 10 }}>
          Enforced via Entra ID role claims. Every permission change is written to the audit log.
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--timestamp-gray)', textAlign: 'left', padding: '6px 10px', borderBottom: '0.5px solid var(--mid-gray)' }}>
                Capability
              </th>
              {['Planner', 'Manager', 'Director', 'Partner', 'Admin'].map((h) => (
                <th key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--timestamp-gray)', textAlign: 'center', padding: '6px 10px', borderBottom: '0.5px solid var(--mid-gray)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((row) => (
              <tr key={row.cap}>
                <td style={{ fontSize: 12, color: 'var(--dark-gray)', padding: '7px 10px' }}>{row.cap}</td>
                {[row.planner, row.manager, row.director, row.partner, row.admin].map((v, idx) => (
                  <td key={idx} style={{ fontSize: 12, textAlign: 'center', padding: '7px 10px', color: v === '✓' ? 'var(--resolved)' : 'var(--timestamp-gray)' }}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <Modal
          title="Invite user"
          onClose={() => setInviteOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!form.name.trim() || !form.email.trim() || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate(form)}
              >
                {inviteMutation.isPending ? <Spinner size={12} color="var(--navy-dark)" /> : 'Send invite'}
              </Button>
            </>
          }
        >
          <Field label="Full name *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sam Okafor" />
          </Field>
          <Field label="Email *">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" />
          </Field>
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Demand Planner" />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r[0].toUpperCase() + r.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
        </Modal>
      )}
    </div>
  );
}
