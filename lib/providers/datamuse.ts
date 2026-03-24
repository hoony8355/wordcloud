import { fetchJson } from './http';

interface DatamuseRow {
  word: string;
  score?: number;
}

export async function fetchDatamuseRelated(term: string): Promise<Map<string, number>> {
  if (!term) return new Map();

  const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(term)}&max=20`;
  const rows = await fetchJson<DatamuseRow[]>(url).catch(() => []);
  const max = Math.max(...rows.map((row) => row.score ?? 1), 1);
  const map = new Map<string, number>();

  rows.forEach((row) => {
    map.set(row.word, (row.score ?? 1) / max);
  });

  return map;
}
