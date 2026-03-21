'use client'
import { useState } from 'react'

export interface DebugLogEntry {
  timestamp: string; method: string; url: string
  requestBody?: unknown; responseStatus?: number; responseBody?: unknown; durationMs: number
}

export function DebugPanel({ logs }: { logs: DebugLogEntry[] }) {
  const [expanded, setExpanded] = useState(true)
  if (logs.length === 0) return null

  return (
    <div style={{ background: '#1e1b2e', borderRadius: 8, marginBottom: '1rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', fontFamily: 'ui-monospace, monospace' }}>
      <button onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: '#2d2640', border: 'none', cursor: 'pointer', color: '#c4b5fd', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit' }}>
        <span>Server Network Logs ({logs.length} request{logs.length !== 1 ? 's' : ''})</span>
        <span>{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0.75rem 1rem', maxHeight: 500, overflowY: 'auto' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: i < logs.length - 1 ? '0.75rem' : 0, borderBottom: i < logs.length - 1 ? '1px solid #3b3555' : 'none', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ background: log.responseStatus && log.responseStatus < 400 ? '#065f46' : '#991b1b', color: '#fff', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600 }}>
                  {log.responseStatus ?? '???'}
                </span>
                <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem' }}>{log.method}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', wordBreak: 'break-all' }}>{log.url}</span>
                <span style={{ color: '#64748b', fontSize: '0.7rem', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{log.durationMs}ms</span>
              </div>
              {log.requestBody && (
                <details style={{ marginBottom: '0.25rem' }}>
                  <summary style={{ color: '#7dd3fc', fontSize: '0.75rem', cursor: 'pointer' }}>Request Body</summary>
                  <pre style={{ color: '#cbd5e1', fontSize: '0.75rem', margin: '0.25rem 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(log.requestBody, null, 2)}
                  </pre>
                </details>
              )}
              {log.responseBody && (
                <details>
                  <summary style={{ color: '#86efac', fontSize: '0.75rem', cursor: 'pointer' }}>Response Body</summary>
                  <pre style={{ color: '#cbd5e1', fontSize: '0.75rem', margin: '0.25rem 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(log.responseBody, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
