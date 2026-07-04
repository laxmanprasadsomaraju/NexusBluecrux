import { useState, type ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
}

// Simple hover tooltip — used for the AI suggestion disclaimer per COLOUR_SPEC C3.
export function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 6,
            background: 'var(--navy-dark)',
            color: 'var(--white)',
            fontSize: 11,
            padding: '6px 10px',
            borderRadius: 6,
            width: 240,
            lineHeight: 1.4,
            zIndex: 20,
            boxShadow: 'var(--shadow-modal)',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
