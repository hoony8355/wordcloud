import type { AnalyzeResponse } from '@/types/keyword';

const isBrowser = typeof window !== 'undefined';
const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_LOGS === '1' || process.env.NODE_ENV !== 'production';

function stamp() {
  return new Date().toISOString();
}

export function logAnalyzeStart(keyword: string): void {
  if (!isBrowser || !DEBUG_ENABLED) return;
  console.groupCollapsed(`[KeywordMVP][${stamp()}] analyze:start`);
  console.log('keyword:', keyword);
  console.groupEnd();
}

export function logAnalyzeSuccess(response: AnalyzeResponse): void {
  if (!isBrowser || !DEBUG_ENABLED) return;

  console.groupCollapsed(`[KeywordMVP][${stamp()}] analyze:success`);
  console.table(
    response.nodes.map((node) => ({
      id: node.id,
      group: node.group,
      score: Number(node.score.toFixed(3)),
      source: node.source,
      rechecked: Boolean(node.rechecked)
    }))
  );
  console.log('insights:', response.insights);
  console.log('debug:', response.debug);
  console.groupEnd();
}

export function logAnalyzeError(error: unknown): void {
  if (!isBrowser || !DEBUG_ENABLED) return;
  console.groupCollapsed(`[KeywordMVP][${stamp()}] analyze:error`);
  console.error(error);
  console.groupEnd();
}
