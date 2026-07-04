import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/Modal/Modal';
import { Button } from '../../components/Button/Button';
import { Field, Select, Input, Textarea } from '../../components/Form/Field';
import { Spinner } from '../../components/Spinner/Spinner';
import { queryKeys } from '../../api/queryKeys';
import * as usersApi from '../../api/users';
import { useUi } from '../../hooks/useUi';
import { useEscalate } from '../../hooks/useEscalate';
import { escalateSchema, validateAll } from '../../lib/validators';

export function EscalateModal() {
  const { escalateExceptionId, closeEscalate } = useUi();
  const { data: usersData } = useQuery({ queryKey: queryKeys.users(), queryFn: usersApi.listUsers });
  const escalate = useEscalate(escalateExceptionId || '');

  const [targetId, setTargetId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!escalateExceptionId) return null;

  const candidates = (usersData?.items ?? []).filter((u) => u.role !== 'partner');

  function submit() {
    const result = validateAll(escalateSchema, { target_user_id: targetId, deadline, note });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const target = candidates.find((u) => u.id === targetId);
    escalate.mutate(
      {
        target_user_id: targetId,
        targetName: target?.name || 'the escalation target',
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        note,
      },
      {
        onSuccess: () => {
          closeEscalate();
          setTargetId('');
          setDeadline('');
          setNote('');
          setErrors({});
        },
      }
    );
  }

  return (
    <Modal
      title="Escalate exception"
      onClose={closeEscalate}
      footer={
        <>
          <Button variant="outline" onClick={closeEscalate}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={escalate.isPending}>
            {escalate.isPending ? <Spinner size={12} color="var(--navy-dark)" /> : 'Send escalation'}
          </Button>
        </>
      }
    >
      <Field label="Escalate to *" error={errors.target_user_id}>
        <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="">Select from escalation path…</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.title || u.role}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Deadline">
        <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <Field label="Note">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this being escalated?" style={{ height: 64 }} />
      </Field>
    </Modal>
  );
}
