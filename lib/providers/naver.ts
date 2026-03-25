import { fetchJson } from './http';

const NAVER_BASE = 'https://openapi.naver.com/v1/search';
const DATALAB_URL = 'https://openapi.naver.com/v1/datalab/search';

function getHeaders() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    'X-Naver-Client-Id': clientId,
    'X-Naver-Client-Secret': clientSecret
  };
}

interface NaverItem {
  title: string;
  description: string;
}

export async function searchNaver(query: string, endpoints: string[] = ['blog', 'webkr', 'shop', 'kin']): Promise<string[]> {
  const headers = getHeaders();
  if (!headers) return [];

  const requests = endpoints.map(async (endpoint) => {
    const url = `${NAVER_BASE}/${endpoint}.json?query=${encodeURIComponent(query)}&display=20&sort=sim`;
    const data = await fetchJson<{ items?: NaverItem[] }>(url, { headers });
    return (data.items ?? []).flatMap((item) => [item.title, item.description]);
  });

  const settled = await Promise.allSettled(requests);
  return settled.flatMap((res) => (res.status === 'fulfilled' ? res.value : []));
}

export async function getNaverTrendScores(rootKeyword: string, candidates: string[]): Promise<Map<string, number>> {
  const headers = getHeaders();
  if (!headers || candidates.length === 0) return new Map();

  const compact = candidates.slice(0, 5);
  const body = {
    startDate: '2024-01-01',
    endDate: new Date().toISOString().slice(0, 10),
    timeUnit: 'month',
    keywordGroups: compact.map((keyword) => ({ groupName: keyword, keywords: [keyword, rootKeyword] }))
  };

  const result = await fetchJson<{ results?: Array<{ title: string; data: Array<{ ratio: number }> }> }>(
    DATALAB_URL,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  ).catch(() => ({ results: [] }));

  const map = new Map<string, number>();
  let max = 0;

  for (const row of result.results ?? []) {
    const avg = row.data.length ? row.data.reduce((acc, cur) => acc + cur.ratio, 0) / row.data.length : 0;
    max = Math.max(max, avg);
    map.set(row.title, avg);
  }

  if (max === 0) return map;

  for (const [key, value] of map.entries()) {
    map.set(key, value / max);
  }

  return map;
}
