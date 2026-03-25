import { fetchJson } from './http';

function getConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export async function upstashGet<T>(key: string): Promise<T | null> {
  const cfg = getConfig();
  if (!cfg) return null;

  const data = await fetchJson<{ result?: string | null }>(`${cfg.url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` }
  }).catch(() => ({ result: null }));

  if (!data.result) return null;
  try {
    return JSON.parse(data.result) as T;
  } catch {
    return null;
  }
}

export async function upstashSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const cfg = getConfig();
  if (!cfg) return;

  await fetchJson(`${cfg.url}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(JSON.stringify(value))}`, {
    headers: { Authorization: `Bearer ${cfg.token}` }
  }).catch(() => null);
}
