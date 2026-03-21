export interface ToggleOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
  title?: string
}

export function ToggleGroup<T extends string>({ options, value, onChange, disabled }: {
  options: ToggleOption<T>[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'inline-flex', background: '#e5e7eb', borderRadius: 6, padding: 2 }}>
      {options.map(opt => {
        const isDisabled = disabled || opt.disabled
        const isActive = value === opt.value
        return (
          <button key={opt.value} onClick={() => { if (!isDisabled) onChange(opt.value) }}
            disabled={isDisabled} title={opt.title}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: 5, border: 'none',
              cursor: isDisabled ? 'default' : 'pointer',
              fontWeight: 600, fontSize: '0.8rem',
              background: isActive ? '#fff' : 'transparent',
              color: isActive ? '#111' : '#666',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              opacity: isDisabled ? 0.4 : 1,
            }}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
