import { ANALYZE_LIMITS } from '@/config/weights';
import { fetchDatamuseRelated } from '@/lib/providers/datamuse';
import { searchKakao } from '@/lib/providers/kakao';
import { searchNaver } from '@/lib/providers/naver';
import { translateKeyword } from '@/lib/providers/translator';
import { searchWikipedia } from '@/lib/providers/wikipedia';
import { scoreByFrequency } from '@/lib/utils/keywords';

export interface GlobalAnalysisResult {
  translated: string;
  globalMap: Map<string, number>;
  recheckedMap: Map<string, number>;
}

export async function collectGlobalCandidates(rootKeyword: string): Promise<GlobalAnalysisResult> {
  const { translated } = await translateKeyword(rootKeyword, 'ko', 'en');

  const [datamuseMap, wikiTexts] = await Promise.all([
    fetchDatamuseRelated(translated).catch(() => new Map<string, number>()),
    searchWikipedia(translated).catch(() => [])
  ]);

  const wikiMap = scoreByFrequency(wikiTexts, translated);
  const globalMap = new Map<string, number>();

  datamuseMap.forEach((score, keyword) => globalMap.set(keyword, score));
  wikiMap.forEach((score, keyword) => {
    globalMap.set(keyword, Math.max(score, globalMap.get(keyword) ?? 0));
  });

  const limitedGlobal = new Map(
    [...globalMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, ANALYZE_LIMITS.maxGlobalCandidates)
  );

  const koreanRecheck = await Promise.all(
    [...limitedGlobal.keys()].map(async (globalKeyword) => {
      const translatedBack = await translateKeyword(globalKeyword, 'en', 'ko').catch(() => ({ translated: globalKeyword }));
      const [naverRows, kakaoRows] = await Promise.allSettled([
        searchNaver(translatedBack.translated, ['blog', 'webkr']),
        searchKakao(translatedBack.translated, ['web', 'blog'])
      ]);

      const signal =
        (naverRows.status === 'fulfilled' ? naverRows.value.length : 0) +
        (kakaoRows.status === 'fulfilled' ? kakaoRows.value.length : 0);

      return {
        keyword: translatedBack.translated,
        score: signal > 0 ? Math.min(1, signal / 80) : 0
      };
    })
  );

  const recheckedMap = new Map<string, number>();
  koreanRecheck.forEach(({ keyword, score }) => {
    if (score > 0.05) {
      recheckedMap.set(keyword, score);
    }
  });

  return { translated, globalMap: limitedGlobal, recheckedMap };
}
