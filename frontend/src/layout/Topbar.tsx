import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import styles from './Topbar.module.css';
import { Button } from '../components/Button/Button';
import { useUi } from '../hooks/useUi';
import { useSync } from '../hooks/useSync';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../hooks/useToast';
import * as reportsApi from '../api/reports';
import { ApiError } from '../api/client';

const TITLES: Record<string, [string, string?]> = {
  '/exceptions': ['Exception queue'],
  '/actions': ['My actions', 'Your personal to-do list, sorted by urgency'],
  '/executive': ['Executive view', 'How the organisation is doing, without chasing anyone'],
  '/partners': ['Partner network', 'CMOs, suppliers and 3PLs'],
  '/rules': ['Alert rules', 'Rules run on every sync — condition, severity, routed role'],
  '/teams': ['Teams'],
  '/integrations': ['Integrations'],
  '/users': ['Users & permissions'],
  '/settings': ['Workspace settings'],
  '/audit-log': ['Audit log', 'Append-only record of every event and action'],
};

function screenMeta(pathname: string): [string, string?] {
  const match = Object.keys(TITLES).find((p) => pathname.startsWith(p));
  return match ? TITLES[match] : ['NEXUS'];
}

export function Topbar() {
  const location = useLocation();
  const [title, defaultSub] = screenMeta(location.pathname);
  const { openRaiseModal, toggleChat, toggleNotif } = useUi();
  const { syncing, subtitle, sync } = useSync();
  const { data: notifData } = useNotifications();
  const { showToast } = useToast();
  const [pdfLoading, setPdfLoading] = useState(false);
  const isExec = location.pathname.startsWith('/executive');

  async function exportPdf() {
    setPdfLoading(true);
    try {
      const res = await reportsApi.generateExecutivePdf();
      window.open(reportsApi.reportFileUrl(res.download_url), '_blank');
      showToast('Executive PDF generated', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'PDF generation failed', 'error');
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className={styles.topbar}>
      <div className={styles.titleBlock}>
        <div className={styles.title}>{title}</div>
        <div className={styles.subtitle}>{location.pathname.startsWith('/exceptions') ? subtitle : defaultSub}</div>
      </div>
      <button className={styles.aiButton} onClick={toggleChat}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span>Ask AI</span>
      </button>
      <button className={styles.notifButton} onClick={toggleNotif} aria-label="Notifications">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
        </svg>
        {!!notifData?.unread_count && <span className={styles.notifBadge}>{notifData.unread_count}</span>}
      </button>
      {isExec && (
        <Button variant="outline" onClick={exportPdf} disabled={pdfLoading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>{pdfLoading ? 'Generating…' : 'Export PDF'}</span>
        </Button>
      )}
      <Button variant="outline" onClick={sync} disabled={syncing}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={syncing ? styles.spin : ''}
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
          <path d="M21 3v5h-5"></path>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
          <path d="M3 21v-5h5"></path>
        </svg>
        <span>Sync</span>
      </Button>
      <Button variant="primary" onClick={openRaiseModal}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Raise exception</span>
      </Button>
    </div>
  );
}
