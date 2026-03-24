import { ANALYZE_LIMITS } from '@/config/weights';
import { searchKakao } from '@/lib/providers/kakao';
import { searchNaver } from '@/lib/providers/naver';
import { scoreByFrequency } from '@/lib/utils/keywords';

const demoKoreanSuffixes = ['가격', '후기', '추천', '예약', '비교', '전문', '근처', '이벤트', '문의'];

export async function collectDomesticCandidates(rootKeyword: string): Promise<Map<string, number>> {
  const [naverCorpus, kakaoCorpus] = await Promise.allSettled([
    searchNaver(rootKeyword),
    searchKakao(rootKeyword)
  ]);

  const corpus = [
    ...(naverCorpus.status === 'fulfilled' ? naverCorpus.value : []),
    ...(kakaoCorpus.status === 'fulfilled' ? kakaoCorpus.value : [])
  ];

  const map = scoreByFrequency(corpus, rootKeyword);

  if (map.size === 0) {
    demoKoreanSuffixes.forEach((suffix, idx) => {
      map.set(`${rootKeyword} ${suffix}`, Math.max(0.9 - idx * 0.08, 0.2));
    });
  }

  const ordered = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, ANALYZE_LIMITS.maxDomesticCandidates);

  return new Map(ordered);
}
