import { fetchJson } from './http';

export async function searchWikipedia(term: string): Promise<string[]> {
  if (!term) return [];

  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: term,
    format: 'json',
    srlimit: '10',
    utf8: '1'
  });

  const url = `https://en.wikipedia.org/w/api.php?${params.toString()}`;
  const data = await fetchJson<{ query?: { search?: Array<{ title: string; snippet: string }> } }>(url).catch(() => ({ query: {} }));

  return (data.query?.search ?? []).flatMap((item) => [item.title, item.snippet]);
}
