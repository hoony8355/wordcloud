import type { IntentGroup, KeywordCandidate } from '@/types/keyword';
import { classifyIntentsWithOpenAI } from '@/lib/providers/openai';

const allowed: IntentGroup[] = ['정보탐색', '구매검토', '비교/후기', '브랜드/지역', '행동유도', '세부니즈'];

export async function enrichIntentByLLM(candidates: KeywordCandidate[]): Promise<KeywordCandidate[]> {
  const rows = await classifyIntentsWithOpenAI(candidates.map((item) => item.keyword));
  if (rows.length === 0) return candidates;

  const intentMap = new Map(rows.map((row) => [row.keyword, row.intent]));

  return candidates.map((item) => {
    const llmIntent = intentMap.get(item.keyword);
    if (!llmIntent || !allowed.includes(llmIntent)) return item;
    return { ...item, intent: llmIntent };
  });
}
