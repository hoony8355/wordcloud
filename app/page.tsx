'use client';

import { useState } from 'react';
import DebugPanel from '@/components/DebugPanel';
import KeywordGraph from '@/components/KeywordGraph';
import UsageGuide from '@/components/UsageGuide';
import InsightPanel from '@/components/InsightPanel';
import SearchForm from '@/components/SearchForm';
import { logAnalyzeError, logAnalyzeNetwork, logAnalyzeStart, logAnalyzeSuccess } from '@/lib/utils/clientLogger';
import type { AnalyzeErrorResponse, AnalyzeResponse } from '@/types/keyword';

interface DebugEntry {
  ts: string;
  level: 'info' | 'error';
  message: string;
  payload?: unknown;
}

function now() {
  return new Date().toISOString();
}

export default function HomePage() {
  const [data, setData] = useState<AnalyzeResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);

  const addDebug = (entry: DebugEntry) => {
    setDebugEntries((prev) => [entry, ...prev].slice(0, 50));
  };

  const handleAnalyze = async (keyword: string) => {
    if (!keyword.trim()) {
      setError('키워드를 입력해주세요.');
      addDebug({ ts: now(), level: 'error', message: '빈 입력 차단' });
      return;
    }

    setLoading(true);
    setError(undefined);
    addDebug({ ts: now(), level: 'info', message: '분석 요청 시작', payload: { keyword } });
    logAnalyzeStart(keyword);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword })
      });

      const raw = await response.json();
      logAnalyzeNetwork(response.status, raw);
      addDebug({ ts: now(), level: 'info', message: 'API 응답 수신', payload: { status: response.status, body: raw } });

      if (!response.ok) {
        const failed = raw as AnalyzeErrorResponse;
        addDebug({
          ts: now(),
          level: 'error',
          message: 'API 오류 응답',
          payload: failed
        });
        throw new Error(`[${failed.requestId ?? 'unknown'}] ${failed.error ?? '분석 실패'}`);
      }

      const json = raw as AnalyzeResponse;
      logAnalyzeSuccess(json);
      addDebug({ ts: now(), level: 'info', message: '분석 성공', payload: json.debug });
      if (json.debug?.stage === 'error') {
        addDebug({
          ts: now(),
          level: 'error',
          message: '서버 fallback 결과 수신',
          payload: { warning: json.insights.warning, debug: json.debug }
        });
      }
      setData(json);
    } catch (err) {
      logAnalyzeError(err);
      addDebug({
        ts: now(),
        level: 'error',
        message: '요청 처리 중 예외',
        payload: err instanceof Error ? { message: err.message, stack: err.stack } : err
      });
      setError(err instanceof Error ? err.message : '요청 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">국내 중심 연관 키워드 네트워크 MVP</h1>
        <p className="text-sm text-slate-300">국내 API를 기준축으로, 번역+해외 확장 후 국내 재검증된 키워드를 그래프로 시각화합니다.</p>
      </header>

      <UsageGuide />
      <SearchForm onSubmit={handleAnalyze} loading={loading} />
      {error && <p className="rounded-lg border border-rose-700 bg-rose-950 p-3 text-sm text-rose-200">{error}</p>}

      {data?.debug && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300">
          <p>Request ID: {data.debug.requestId}</p>
          <p>
            Duration: {data.debug.durationMs}ms / Cache: {data.debug.fromCache ? 'HIT' : 'MISS'} / Stage: {data.debug.stage}
          </p>
          <p>
            Domestic: {data.debug.domesticCandidateCount}, Trend: {data.debug.trendCandidateCount}, Global:{' '}
            {data.debug.globalCandidateCount}, Rechecked: {data.debug.recheckedCandidateCount}
          </p>
          {data.debug.errorMessage && <p className="text-rose-300">Error: {data.debug.errorMessage}</p>}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <KeywordGraph data={data} />
        <InsightPanel insights={data?.insights} />
      </section>

      <DebugPanel entries={debugEntries} />
    </main>
  );
}
