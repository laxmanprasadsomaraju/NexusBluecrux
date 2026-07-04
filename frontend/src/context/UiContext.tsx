import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

interface UiContextValue {
  raiseModalOpen: boolean;
  openRaiseModal: () => void;
  closeRaiseModal: () => void;

  escalateExceptionId: string | null;
  openEscalate: (exceptionId: string) => void;
  closeEscalate: () => void;

  chatOpen: boolean;
  toggleChat: () => void;
  closeChat: () => void;

  notifOpen: boolean;
  toggleNotif: () => void;
  closeNotif: () => void;

  scorecardPartnerId: string | null;
  openScorecard: (partnerId: string) => void;
  closeScorecard: () => void;

  justCreatedIds: Set<string>;
  markJustCreated: (id: string) => void;
}

export const UiContext = createContext<UiContextValue | undefined>(undefined);

export function UiProvider({ children }: { children: ReactNode }) {
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [escalateExceptionId, setEscalateExceptionId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scorecardPartnerId, setScorecardPartnerId] = useState<string | null>(null);
  const [justCreatedIds, setJustCreatedIds] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const markJustCreated = useCallback((id: string) => {
    setJustCreatedIds((prev) => new Set(prev).add(id));
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setJustCreatedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timers.current.delete(id);
    }, 5000);
    timers.current.set(id, timer);
  }, []);

  const value = useMemo<UiContextValue>(
    () => ({
      raiseModalOpen,
      openRaiseModal: () => setRaiseModalOpen(true),
      closeRaiseModal: () => setRaiseModalOpen(false),

      escalateExceptionId,
      openEscalate: (id: string) => setEscalateExceptionId(id),
      closeEscalate: () => setEscalateExceptionId(null),

      chatOpen,
      toggleChat: () => setChatOpen((v) => !v),
      closeChat: () => setChatOpen(false),

      notifOpen,
      toggleNotif: () => setNotifOpen((v) => !v),
      closeNotif: () => setNotifOpen(false),

      scorecardPartnerId,
      openScorecard: (id: string) => setScorecardPartnerId(id),
      closeScorecard: () => setScorecardPartnerId(null),

      justCreatedIds,
      markJustCreated,
    }),
    [raiseModalOpen, escalateExceptionId, chatOpen, notifOpen, scorecardPartnerId, justCreatedIds, markJustCreated]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}
