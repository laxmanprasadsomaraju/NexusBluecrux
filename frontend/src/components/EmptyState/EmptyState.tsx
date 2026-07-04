export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, padding: 32 }}>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--black)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--timestamp-gray)' }}>{subtitle}</div>}
    </div>
  );
}
