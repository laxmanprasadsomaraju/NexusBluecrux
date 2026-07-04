import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/Modal/Modal';
import { Button } from '../../components/Button/Button';
import { Field, Input, Select, Textarea, ErrorText } from '../../components/Form/Field';
import { Spinner } from '../../components/Spinner/Spinner';
import { queryKeys } from '../../api/queryKeys';
import * as usersApi from '../../api/users';
import { useUi } from '../../hooks/useUi';
import { useRaiseException } from '../../hooks/useRaiseException';
import { raiseExceptionSchema, validateAll } from '../../lib/validators';
import styles from './RaiseExceptionModal.module.css';

const SOURCE_OPTIONS = ['Manual', 'Axon', 'Helion', 'Anaplan', 'SAP', 'Binocs'];

export function RaiseExceptionModal() {
  const { closeRaiseModal } = useUi();
  const raiseException = useRaiseException();
  const { data: usersData } = useQuery({ queryKey: queryKeys.users(), queryFn: usersApi.listUsers });

  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('');
  const [sourceSystem, setSourceSystem] = useState('Manual');
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discardAsk, setDiscardAsk] = useState(false);
  const [ownerFocused, setOwnerFocused] = useState(false);

  const ownerMatches = useMemo(() => {
    if (ownerQuery.trim().length < 2 || ownerId) return [];
    const q = ownerQuery.toLowerCase();
    return (usersData?.items ?? []).filter((u) => u.name.toLowerCase().includes(q) || (u.team_name || '').toLowerCase().includes(q)).slice(0, 6);
  }, [ownerQuery, ownerId, usersData]);

  function markDirty() {
    setDirty(true);
  }

  function attemptClose() {
    if (dirty && !discardAsk) {
      setDiscardAsk(true);
      return;
    }
    closeRaiseModal();
  }

  function submit() {
    const result = validateAll(raiseExceptionSchema, {
      title,
      severity,
      source_system: sourceSystem,
      owner_id: ownerId,
      due_date: dueDate,
      notes,
    });
    if (!result.ok) {
      setErrors(result.errors);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setErrors({});
    raiseException.mutate(
      {
        title: title.trim(),
        severity,
        source_system: sourceSystem,
        owner_id: ownerId,
        notes,
      },
      { onSuccess: () => closeRaiseModal() }
    );
  }

  return (
    <Modal
      title="Raise exception"
      onClose={attemptClose}
      footer={
        discardAsk ? (
          <>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)', marginRight: 'auto' }}>Discard changes?</span>
            <Button variant="outline" onClick={() => setDiscardAsk(false)}>
              Keep
            </Button>
            <Button variant="danger" onClick={closeRaiseModal}>
              Discard
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={attemptClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className={shake ? styles.shake : ''}
              onClick={submit}
              disabled={raiseException.isPending}
            >
              {raiseException.isPending ? <Spinner size={12} color="var(--navy-dark)" /> : 'Submit exception'}
            </Button>
          </>
        )
      }
    >
      <Field label="Exception title *" error={errors.title}>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
          placeholder="e.g. QC hold on Batch X-4421"
        />
      </Field>
      <Field label="Severity *" error={errors.severity}>
        <Select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            markDirty();
          }}
        >
          <option value="">Select severity…</option>
          <option value="critical">● Critical</option>
          <option value="high">● High</option>
          <option value="medium">● Medium</option>
        </Select>
      </Field>
      <Field label="Source system">
        <Select
          value={sourceSystem}
          onChange={(e) => {
            setSourceSystem(e.target.value);
            markDirty();
          }}
        >
          {SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <div style={{ position: 'relative' }}>
        <Field label="Owner *" error={errors.owner_id}>
          <Input
            value={ownerId ? ownerQuery : ownerQuery}
            onChange={(e) => {
              setOwnerQuery(e.target.value);
              setOwnerId('');
              markDirty();
            }}
            onFocus={() => setOwnerFocused(true)}
            onBlur={() => setTimeout(() => setOwnerFocused(false), 150)}
            placeholder="Search by name or team…"
          />
        </Field>
        {ownerFocused && ownerMatches.length > 0 && (
          <div className={styles.ownerDropdown}>
            {ownerMatches.map((u) => (
              <div
                key={u.id}
                className={styles.ownerMatch}
                onClick={() => {
                  setOwnerId(u.id);
                  setOwnerQuery(u.name);
                }}
              >
                <div style={{ fontSize: 13, color: 'var(--black)' }}>{u.name}</div>
                <div style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>
                  {u.title || u.role} {u.team_name ? `· ${u.team_name}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Field label="Due date">
        <Input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            markDirty();
          }}
        />
      </Field>
      <Field label="Notes / context">
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            markDirty();
          }}
          placeholder="Add any context that helps the owner act quickly…"
        />
      </Field>
      {errors._root && <ErrorText>{errors._root}</ErrorText>}
    </Modal>
  );
}
