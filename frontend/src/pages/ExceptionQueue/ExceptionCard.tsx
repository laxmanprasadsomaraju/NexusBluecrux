import styles from './ExceptionCard.module.css';
import { SeverityDot } from '../../components/SeverityDot/SeverityDot';
import { Avatar } from '../../components/Avatar/Avatar';
import type { ExceptionListItem } from '../../types';

interface ExceptionCardProps {
  exception: ExceptionListItem;
  selected: boolean;
  isNew: boolean;
  onClick: () => void;
}

export function ExceptionCard({ exception, selected, isNew, onClick }: ExceptionCardProps) {
  const tags = [exception.type, exception.company, exception.source_system].filter(Boolean);
  return (
    <div className={[styles.card, selected ? styles.selected : ''].filter(Boolean).join(' ')} onClick={onClick}>
      <div className={styles.topRow}>
        <SeverityDot severity={exception.severity} />
        <div className={styles.title}>{exception.title}</div>
        {isNew && <span className={styles.newBadge}>New</span>}
      </div>
      <div className={styles.tagsRow}>
        {tags.map((t, i) => (
          <span key={`${t}-${i}`} className={styles.tag}>
            {t}
          </span>
        ))}
      </div>
      <div className={styles.footerRow}>
        <span className={styles.age}>{exception.age}</span>
        <span className={styles.spacer} />
        <Avatar name={exception.owner_name} size={18} />
        <span className={styles.ownerName}>{exception.owner_name}</span>
      </div>
    </div>
  );
}
