import { ANALYZE_LIMITS } from '@/config/weights';

export async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = ANALYZE_LIMITS.requestTimeoutMs): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
