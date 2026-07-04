interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export function Switch({ checked, onChange, disabled }: SwitchProps) {
  return (
    <div
      onClick={disabled ? undefined : onChange}
      role="switch"
      aria-checked={checked}
      style={{
        width: 34,
        height: 18,
        minWidth: 34,
        borderRadius: 10,
        background: checked ? 'var(--cyan-primary)' : 'var(--mid-gray)',
        position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 0.15s ease',
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--white)',
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          transition: 'left 0.15s ease',
        }}
      />
    </div>
  );
}
