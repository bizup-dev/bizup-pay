export function FormField({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem', color: '#444' }}>
        {label}
      </label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' }} />
    </div>
  )
}
