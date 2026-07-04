import { useAuth } from './hooks/useAuth';
import { useUi } from './hooks/useUi';
import { RaiseExceptionModal } from './overlays/RaiseExceptionModal/RaiseExceptionModal';
import { EscalateModal } from './overlays/EscalateModal/EscalateModal';
import { AiAssistantDrawer } from './overlays/AiAssistantDrawer/AiAssistantDrawer';
import { NotificationsPanel } from './overlays/NotificationsPanel/NotificationsPanel';

// Global overlays mounted once at the app root (not per-route), per the build spec.
export function GlobalOverlays() {
  const { user } = useAuth();
  const { raiseModalOpen, escalateExceptionId, chatOpen, notifOpen } = useUi();

  if (!user) return null;

  return (
    <>
      {raiseModalOpen && <RaiseExceptionModal />}
      {escalateExceptionId && <EscalateModal />}
      {chatOpen && <AiAssistantDrawer />}
      {notifOpen && <NotificationsPanel />}
    </>
  );
}
