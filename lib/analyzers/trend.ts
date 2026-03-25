import { getNaverTrendScores } from '@/lib/providers/naver';

function chunk<T>(rows: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    result.push(rows.slice(i, i + size));
  }
  return result;
}

export async function collectTrendScores(rootKeyword: string, candidates: string[]): Promise<Map<string, number>> {
  const fallback = new Map<string, number>();
  candidates.forEach((candidate, idx) => {
    fallback.set(candidate, Math.max(0.8 - idx * 0.07, 0.15));
  });

  if (candidates.length === 0) return fallback;

  const batches = chunk(candidates, 5);
  const settled = await Promise.allSettled(batches.map((group) => getNaverTrendScores(rootKeyword, group)));

  const merged = new Map<string, number>();
  settled.forEach((row) => {
    if (row.status !== 'fulfilled') return;
    row.value.forEach((value, key) => {
      merged.set(key, Math.max(value, merged.get(key) ?? 0));
    });
  });

  if (merged.size === 0) return fallback;

  const maxValue = Math.max(...merged.values(), 1);
  for (const [key, value] of merged.entries()) {
    merged.set(key, value / maxValue);
  }

  candidates.forEach((candidate) => {
    if (!merged.has(candidate)) {
      merged.set(candidate, fallback.get(candidate) ?? 0.15);
    }
  });

  return merged;
}
