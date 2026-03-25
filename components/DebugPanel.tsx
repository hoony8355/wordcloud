interface DebugEntry {
  ts: string;
  level: 'info' | 'error';
  message: string;
  payload?: unknown;
}

interface DebugPanelProps {
  entries: DebugEntry[];
}

export default function DebugPanel({ entries }: DebugPanelProps) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-xs text-slate-200">
      <h3 className="mb-3 text-sm font-semibold text-cyan-300">실시간 디버그 로그 (F12 + 화면)</h3>
      <div className="max-h-56 space-y-2 overflow-auto">
        {entries.length === 0 && <p className="text-slate-400">아직 로그가 없습니다.</p>}
        {entries.map((entry, idx) => (
          <div key={`${entry.ts}-${idx}`} className="rounded border border-slate-700 bg-slate-950 p-2">
            <p>
              <span className={entry.level === 'error' ? 'text-rose-300' : 'text-emerald-300'}>[{entry.level.toUpperCase()}]</span>{' '}
              {entry.ts} - {entry.message}
            </p>
            {entry.payload !== undefined ? (
              <pre className="mt-1 whitespace-pre-wrap text-[11px] text-slate-400">{JSON.stringify(entry.payload, null, 2)}</pre>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
