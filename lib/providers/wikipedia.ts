import { fetchJson } from './http';

interface WikipediaSearchItem {
  title: string;
  snippet: string;
}

interface WikipediaSearchResponse {
  query?: {
    search?: WikipediaSearchItem[];
  };
}

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
  const data = await fetchJson<WikipediaSearchResponse>(url).catch(
    (): WikipediaSearchResponse => ({ query: { search: [] } })
  );

  const rows = data.query?.search ?? [];
  return rows.flatMap((item) => [item.title, item.snippet]);
}
