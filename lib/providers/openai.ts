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

const intentMap: Record<string, OpenAIIntentRow['intent']> = {
  정보탐색: '정보탐색',
  구매검토: '구매검토',
  비교후기: '비교/후기',
  '비교/후기': '비교/후기',
  브랜드지역: '브랜드/지역',
  '브랜드/지역': '브랜드/지역',
  행동유도: '행동유도',
  세부니즈: '세부니즈'
};

function extractJsonArray(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  }
  return trimmed;
}

function normalizeIntent(value: unknown): OpenAIIntentRow['intent'] | null {
  const normalized = String(value ?? '').replace(/\s/g, '').replace(/\//g, '/');
  return intentMap[normalized] ?? null;
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
    const parsed = JSON.parse(extractJsonArray(content)) as Array<{ keyword?: unknown; intent?: unknown; persona?: unknown }>;

    return parsed
      .map((row) => {
        const keyword = String(row.keyword ?? '').trim();
        const intent = normalizeIntent(row.intent);
        if (!keyword || !intent) return null;

        return {
          keyword,
          intent,
          persona: String(row.persona ?? '일반 탐색 사용자').trim() || '일반 탐색 사용자'
        } satisfies OpenAIIntentRow;
      })
      .filter((row): row is OpenAIIntentRow => Boolean(row));
  } catch {
    return [];
  }
}
