export interface HorizontalBarDatum {
  label: string;
  value: number;
  displayValue: string;
  color: string;
}

interface HorizontalBarListProps {
  data: HorizontalBarDatum[];
  maxValue?: number;
}

// Hand-rolled horizontal bar list — styled div track + fill, colour by threshold.
// Used for exceptions-by-source, team response times, and partner scorecards.
export function HorizontalBarList({ data, maxValue }: HorizontalBarListProps) {
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--dark-gray)', flex: 1 }}>{d.label}</span>
            <span style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>{d.displayValue}</span>
          </div>
          <div style={{ height: 6, background: 'var(--mid-gray)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (d.value / max) * 100)}%`,
                background: d.color,
                borderRadius: 3,
              }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <div style={{ fontSize: 12, color: 'var(--timestamp-gray)' }}>No data yet.</div>}
    </div>
  );
}
