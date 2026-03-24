import { getNaverTrendScores } from '@/lib/providers/naver';

export async function collectTrendScores(rootKeyword: string, candidates: string[]): Promise<Map<string, number>> {
  const trendMap = await getNaverTrendScores(rootKeyword, candidates).catch(() => new Map());

  if (trendMap.size === 0) {
    const fallback = new Map<string, number>();
    candidates.forEach((candidate, idx) => {
      fallback.set(candidate, Math.max(0.8 - idx * 0.07, 0.15));
    });
    return fallback;
  }

  return trendMap;
}
