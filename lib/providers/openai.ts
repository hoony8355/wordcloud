import { fetchJson } from './http';

export interface OpenAIIntentRow {
  keyword: string;
  intent: '정보탐색' | '구매검토' | '비교/후기' | '브랜드/지역' | '행동유도' | '세부니즈';
  persona: string;
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function classifyIntentsWithOpenAI(keywords: string[]): Promise<OpenAIIntentRow[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || keywords.length === 0) return [];

  const prompt = `다음 키워드를 intent(정보탐색/구매검토/비교후기/브랜드지역/행동유도/세부니즈)와 persona로 분류해 JSON 배열로 반환해줘.\n키워드: ${keywords.join(', ')}`;

  const data = await fetchJson<OpenAIResponse>(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_INTENT_MODEL ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '반드시 JSON 배열만 반환하라.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    },
    8000,
    0
  ).catch(() => ({ choices: [] }));

  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as Array<{ keyword: string; intent: string; persona: string }>;
    return parsed
      .filter((row) => row.keyword && row.intent)
      .map((row) => ({
        keyword: row.keyword,
        intent: (row.intent.replace('/', '') === '비교후기' ? '비교/후기' : row.intent) as OpenAIIntentRow['intent'],
        persona: row.persona ?? '일반 탐색 사용자'
      }));
  } catch {
    return [];
  }
}
