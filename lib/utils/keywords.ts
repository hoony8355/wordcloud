import type { IntentGroup } from '@/types/keyword';
import { extractNgrams, tokenize } from './text';

const intentRules: Array<{ keywords: string[]; group: IntentGroup }> = [
  { keywords: ['가격', '비용', '견적', '할인', '가성비'], group: '구매검토' },
  { keywords: ['후기', '리뷰', '전후', '비교', '평점'], group: '비교/후기' },
  { keywords: ['예약', '상담', '문의', '신청', '전화'], group: '행동유도' },
  { keywords: ['남자', '여자', '초보', '전문', '맞춤'], group: '세부니즈' },
  { keywords: ['강남', '서울', '브랜드', '지역', '매장'], group: '브랜드/지역' }
];

export function classifyIntent(keyword: string): IntentGroup {
  for (const rule of intentRules) {
    if (rule.keywords.some((token) => keyword.includes(token))) {
      return rule.group;
    }
  }
  return '정보탐색';
}

export function scoreByFrequency(corpus: string[], rootKeyword: string): Map<string, number> {
  const countMap = new Map<string, number>();

  for (const chunk of corpus) {
    const merged = [...tokenize(chunk), ...extractNgrams(chunk, 2)];
    merged.forEach((token) => {
      if (token === rootKeyword || token.length < 2) return;
      countMap.set(token, (countMap.get(token) ?? 0) + 1);
    });
  }

  const max = Math.max(...countMap.values(), 1);
  const normalized = new Map<string, number>();
  countMap.forEach((value, key) => normalized.set(key, value / max));
  return normalized;
}
