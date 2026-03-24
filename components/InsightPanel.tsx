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
      <section>
        <h3 className="mb-2 font-semibold text-cyan-300">상위 연관 키워드</h3>
        <ul className="space-y-1 text-slate-200">
          {insights.topKeywords.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-cyan-300">탐색 의도 상위 그룹</h3>
        <div className="flex flex-wrap gap-2">
          {insights.topIntentGroups.map((group) => (
            <span key={group} className="rounded bg-slate-800 px-2 py-1 text-xs">
              {group}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-1 text-slate-300">
        <p>국내 기반 키워드: {insights.domesticCount}</p>
        <p>해외 확장 키워드: {insights.globalExpandedCount}</p>
        <p>재검증 통과: {insights.recheckedCount}</p>
        {insights.warning && <p className="text-amber-300">⚠ {insights.warning}</p>}
      </section>
    </aside>
  );
}
