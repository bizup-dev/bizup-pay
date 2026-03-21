export function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  const bg = active ? '#0070f3' : done ? '#16a34a' : '#e5e7eb'
  const color = active || done ? '#fff' : '#999'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
        {done ? 'V' : num}
      </div>
      <span style={{ fontWeight: active ? 600 : 400, color: active ? '#111' : '#666', fontSize: '0.9rem' }}>{label}</span>
    </div>
  )
}
