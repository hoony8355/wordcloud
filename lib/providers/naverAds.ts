import crypto from 'crypto';
import { fetchJson } from './http';

interface NaverAdsKeywordRow {
  relKeyword?: string;
  monthlyPcQcCnt?: unknown;
  monthlyMobileQcCnt?: unknown;
}

interface NaverAdsResponse {
  keywordList?: NaverAdsKeywordRow[];
}

function getConfig() {
  const apiKey = process.env.NAVER_AD_API_KEY;
  const secretKey = process.env.NAVER_AD_SECRET_KEY;
  const customerId = process.env.NAVER_AD_CUSTOMER_ID;
  if (!apiKey || !secretKey || !customerId) return null;
  return { apiKey, secretKey, customerId };
}

function createSignature(timestamp: string, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const normalized = String(value).trim();
  if (!normalized || normalized === '< 10') return 0;

  const parsed = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchNaverAdsKeywordMetrics(keywords: string[]): Promise<Map<string, number>> {
  const config = getConfig();
  if (!config || keywords.length === 0) return new Map();

  const metricMap = new Map<string, number>();

  for (const keyword of keywords.slice(0, 20)) {
    const timestamp = Date.now().toString();
    const uri = '/keywordstool';
    const signature = createSignature(timestamp, 'GET', uri, config.secretKey);
    const query = `hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`;

    const data = await fetchJson<NaverAdsResponse>(`https://api.searchad.naver.com${uri}?${query}`, {
      method: 'GET',
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY': config.apiKey,
        'X-Customer': config.customerId,
        'X-Signature': signature
      }
    }).catch(() => ({ keywordList: [] }));

    for (const row of data.keywordList ?? []) {
      if (!row.relKeyword) continue;
      const volume = toNumber(row.monthlyPcQcCnt) + toNumber(row.monthlyMobileQcCnt);
      metricMap.set(row.relKeyword, Math.max(volume, metricMap.get(row.relKeyword) ?? 0));
    }
  }

  if (metricMap.size === 0) return metricMap;
  const max = Math.max(...metricMap.values(), 1);
  for (const [key, value] of metricMap.entries()) {
    metricMap.set(key, value / max);
  }

  return metricMap;
}
