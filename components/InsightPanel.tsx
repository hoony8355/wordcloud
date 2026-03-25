import type { AnalyzeInsights } from '@/types/keyword';

interface InsightPanelProps {
  insights?: AnalyzeInsights;
}

export default function InsightPanel({ insights }: InsightPanelProps) {
  if (!insights) {
    return (
      <aside className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
        아직 분석 결과가 없습니다.
      </aside>
    );
  }

  return (
    <aside className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-800 p-2">
          <p className="text-[11px] text-slate-400">국내 기반</p>
          <p className="text-lg font-semibold text-cyan-300">{insights.domesticCount}</p>
        </div>
        <div className="rounded-lg bg-slate-800 p-2">
          <p className="text-[11px] text-slate-400">해외 확장</p>
          <p className="text-lg font-semibold text-fuchsia-300">{insights.globalExpandedCount}</p>
        </div>
        <div className="rounded-lg bg-slate-800 p-2">
          <p className="text-[11px] text-slate-400">재검증 통과</p>
          <p className="text-lg font-semibold text-emerald-300">{insights.recheckedCount}</p>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-cyan-300">Top 키워드</h3>
        <ol className="space-y-1 text-slate-200">
          {insights.topKeywords.map((item, idx) => (
            <li key={item} className="rounded bg-slate-800 px-2 py-1">
              {idx + 1}. {item}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-cyan-300">의도 분포</h3>
        <div className="flex flex-wrap gap-2">
          {insights.topIntentGroups.map((group) => (
            <span key={group} className="rounded bg-slate-800 px-2 py-1 text-xs">
              {group}
            </span>
          ))}
        </div>
      </section>

      {insights.topOpportunities && insights.topOpportunities.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-cyan-300">광고 관점 기회 키워드</h3>
          <ul className="space-y-1 text-xs text-slate-300">
            {insights.topOpportunities.map((row) => (
              <li key={row.keyword} className="rounded bg-slate-800 px-2 py-1">
                <p className="font-medium text-slate-100">{row.keyword}</p>
                <p>{row.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {insights.warning && <p className="rounded bg-amber-900/40 p-2 text-amber-300">⚠ {insights.warning}</p>}
    </aside>
  );
}
