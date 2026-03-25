import type { AnalyzeInsights, IntentGroup, KeywordCandidate } from '@/types/keyword';

export function buildInsights(candidates: KeywordCandidate[]): AnalyzeInsights {
  const ordered = [...candidates].sort((a, b) => b.score.finalScore - a.score.finalScore);

  const groupCount = new Map<IntentGroup, number>();
  ordered.forEach((candidate) => {
    groupCount.set(candidate.intent, (groupCount.get(candidate.intent) ?? 0) + 1);
  });

  return {
    topKeywords: ordered.slice(0, 8).map((row) => row.keyword),
    topIntentGroups: [...groupCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map((entry) => entry[0]),
    domesticCount: ordered.filter((row) => row.source === 'domestic').length,
    globalExpandedCount: ordered.filter((row) => row.source !== 'domestic').length,
    recheckedCount: ordered.filter((row) => row.rechecked).length
  };
}
