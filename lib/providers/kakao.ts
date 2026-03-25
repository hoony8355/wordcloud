import { fetchJson } from './http';

const KAKAO_BASE = 'https://dapi.kakao.com/v2/search';

function getHeaders() {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return null;
  return { Authorization: `KakaoAK ${key}` };
}

interface KakaoDoc {
  title?: string;
  contents?: string;
}

export async function searchKakao(query: string, endpoints: string[] = ['web', 'blog', 'cafe']): Promise<string[]> {
  const headers = getHeaders();
  if (!headers) return [];

  const requests = endpoints.map(async (endpoint) => {
    const url = `${KAKAO_BASE}/${endpoint}?query=${encodeURIComponent(query)}&size=15`;
    const data = await fetchJson<{ documents?: KakaoDoc[] }>(url, { headers });
    return (data.documents ?? []).flatMap((doc) => [doc.title ?? '', doc.contents ?? '']);
  });

  const settled = await Promise.allSettled(requests);
  return settled.flatMap((res) => (res.status === 'fulfilled' ? res.value : []));
}
