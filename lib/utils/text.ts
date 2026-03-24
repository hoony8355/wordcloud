import { normalizeKeyword } from './normalize';

const STOPWORDS = new Set([
  '그리고',
  '입니다',
  '있는',
  '하는',
  '에서',
  '으로',
  '관련',
  '추천',
  'the',
  'and',
  'for',
  'with',
  'best'
]);

export function tokenize(text: string): string[] {
  return normalizeKeyword(text)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function extractNgrams(text: string, maxN = 3): string[] {
  const tokens = tokenize(text);
  const results: string[] = [];

  for (let n = 1; n <= maxN; n += 1) {
    for (let i = 0; i <= tokens.length - n; i += 1) {
      const phrase = tokens.slice(i, i + n).join(' ');
      if (phrase.length > 1) {
        results.push(phrase);
      }
    }
  }

  return results;
}
