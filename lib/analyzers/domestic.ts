import { ANALYZE_LIMITS } from '@/config/weights';
import { searchKakao } from '@/lib/providers/kakao';
import { searchNaver } from '@/lib/providers/naver';
import { scoreByFrequency } from '@/lib/utils/keywords';

const intentSuffixes = ['가격', '비용', '후기', '리뷰', '추천', '비교', '예약', '문의', '위치', '전문'];

function buildDomesticQueryVariants(rootKeyword: string): string[] {
  const variants = [
    rootKeyword,
    `${rootKeyword} 추천`,
    `${rootKeyword} 후기`,
    `${rootKeyword} 가격`,
    `${rootKeyword} 비교`
  ];

  return [...new Set(variants.map((item) => item.trim()).filter(Boolean))];
}

function addIntentTemplateBoost(rootKeyword: string, map: Map<string, number>): void {
  intentSuffixes.forEach((suffix, idx) => {
    const key = `${rootKeyword} ${suffix}`.trim();
    const base = map.get(key) ?? 0;
    const boost = Math.max(0.75 - idx * 0.05, 0.22);
    map.set(key, Math.max(base, boost));
  });
}

export async function collectDomesticCandidates(rootKeyword: string): Promise<Map<string, number>> {
  const variants = buildDomesticQueryVariants(rootKeyword);

  const settled = await Promise.allSettled(
    variants.map(async (query) => {
      const [naverCorpus, kakaoCorpus] = await Promise.allSettled([searchNaver(query), searchKakao(query)]);
      return [
        ...(naverCorpus.status === 'fulfilled' ? naverCorpus.value : []),
        ...(kakaoCorpus.status === 'fulfilled' ? kakaoCorpus.value : [])
      ];
    })
  );

  const corpus = settled.flatMap((row) => (row.status === 'fulfilled' ? row.value : []));
  const map = scoreByFrequency(corpus, rootKeyword);

  addIntentTemplateBoost(rootKeyword, map);

  const ordered = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, ANALYZE_LIMITS.maxDomesticCandidates);

  return new Map(ordered);
}
