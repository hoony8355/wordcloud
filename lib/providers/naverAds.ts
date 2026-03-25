import crypto from 'crypto';
import { fetchJson } from './http';

interface NaverAdsKeywordRow {
  relKeyword?: string;
  monthlyPcQcCnt?: unknown;
  monthlyMobileQcCnt?: unknown;
  monthlyAvePcClkCnt?: unknown;
  monthlyAveMobileClkCnt?: unknown;
  monthlyAvePcCtr?: unknown;
  monthlyAveMobileCtr?: unknown;
  compIdx?: unknown;
}

interface NaverAdsResponse {
  keywordList?: NaverAdsKeywordRow[];
}

export interface NaverAdsMetric {
  relKeyword: string;
  queryVolume: number;
  clickVolume: number;
  ctr: number;
  competition: 'low' | 'mid' | 'high' | 'unknown';
  normalizedQueryVolume: number;
  normalizedClickVolume: number;
  normalizedCtr: number;
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

function normalizeMapValues(map: Map<string, NaverAdsMetric>, key: 'queryVolume' | 'clickVolume' | 'ctr', target: 'normalizedQueryVolume' | 'normalizedClickVolume' | 'normalizedCtr') {
  const max = Math.max(...[...map.values()].map((item) => item[key]), 1);
  map.forEach((row) => {
    row[target] = row[key] / max;
  });
}

export async function fetchNaverAdsKeywordMetrics(keywords: string[]): Promise<Map<string, NaverAdsMetric>> {
  const config = getConfig();
  if (!config || keywords.length === 0) return new Map();

  const metricMap = new Map<string, NaverAdsMetric>();

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

      const queryVolume = toNumber(row.monthlyPcQcCnt) + toNumber(row.monthlyMobileQcCnt);
      const clickVolume = toNumber(row.monthlyAvePcClkCnt) + toNumber(row.monthlyAveMobileClkCnt);
      const ctr = toNumber(row.monthlyAvePcCtr) + toNumber(row.monthlyAveMobileCtr);
      const competition = ['low', 'mid', 'high'].includes(String(row.compIdx))
        ? (String(row.compIdx) as 'low' | 'mid' | 'high')
        : 'unknown';

      const prev = metricMap.get(row.relKeyword);
      if (!prev || prev.queryVolume < queryVolume) {
        metricMap.set(row.relKeyword, {
          relKeyword: row.relKeyword,
          queryVolume,
          clickVolume,
          ctr,
          competition,
          normalizedQueryVolume: 0,
          normalizedClickVolume: 0,
          normalizedCtr: 0
        });
      }
    }
  }

  if (metricMap.size === 0) return metricMap;

  normalizeMapValues(metricMap, 'queryVolume', 'normalizedQueryVolume');
  normalizeMapValues(metricMap, 'clickVolume', 'normalizedClickVolume');
  normalizeMapValues(metricMap, 'ctr', 'normalizedCtr');

  return metricMap;
}
