import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ANALYZE_LIMITS } from '@/config/weights';
import { buildInsights } from '@/lib/analyzers/cluster';
import { collectDomesticCandidates } from '@/lib/analyzers/domestic';
import { collectGlobalCandidates } from '@/lib/analyzers/global';
import { enrichIntentByLLM } from '@/lib/analyzers/intent';
import { computeFinalScore } from '@/lib/analyzers/scorer';
import { collectTrendScores } from '@/lib/analyzers/trend';
import { fetchNaverAdsKeywordMetrics } from '@/lib/providers/naverAds';
import { upstashGet, upstashSet } from '@/lib/providers/upstash';
import { classifyIntent } from '@/lib/utils/keywords';
import { logger } from '@/lib/utils/logger';
import { normalizeKeyword } from '@/lib/utils/normalize';
import type { AnalyzeDebugInfo, AnalyzeResponse, KeywordCandidate } from '@/types/keyword';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const CACHE_TTL_MS = 5 * 60_000;

const requestStore = new Map<string, number[]>();
const resultCache = new Map<string, { expireAt: number; value: AnalyzeResponse }>();

function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return 'unknown';
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const prev = requestStore.get(clientId) ?? [];
  const active = prev.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (active.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestStore.set(clientId, active);
    return false;
  }

  active.push(now);
  requestStore.set(clientId, active);
  return true;
}

async function getCached(keyword: string): Promise<AnalyzeResponse | null> {
  const cached = resultCache.get(keyword);
  if (cached && cached.expireAt >= Date.now()) {
    return cached.value;
  }

  if (cached && cached.expireAt < Date.now()) {
    resultCache.delete(keyword);
  }

  const remote = await upstashGet<AnalyzeResponse>(`analyze:${keyword}`);
  if (remote) {
    resultCache.set(keyword, { value: remote, expireAt: Date.now() + CACHE_TTL_MS });
    return remote;
  }

  return null;
}

async function setCached(keyword: string, value: AnalyzeResponse): Promise<void> {
  resultCache.set(keyword, {
    value,
    expireAt: Date.now() + CACHE_TTL_MS
  });

  await upstashSet(`analyze:${keyword}`, value, Math.floor(CACHE_TTL_MS / 1000));
}

function createBaseDebug(requestId: string, startedAt: number): AnalyzeDebugInfo {
  return {
    requestId,
    durationMs: Date.now() - startedAt,
    fromCache: false,
    stage: 'init',
    domesticCandidateCount: 0,
    trendCandidateCount: 0,
    globalCandidateCount: 0,
    recheckedCandidateCount: 0,
    finalNodeCount: 0
  };
}

function buildFallbackResponse(keyword: string, debug: AnalyzeDebugInfo, warning: string): AnalyzeResponse {
  const rootKeyword = keyword || '키워드';
  const fallbackKeywords = ['가격', '후기', '추천', '비교', '예약'].map((suffix, idx) => ({
    id: `${rootKeyword} ${suffix}`,
    group: classifyIntent(suffix),
    score: Number((0.8 - idx * 0.1).toFixed(2)),
    source: 'domestic' as const
  }));

  return {
    rootKeyword,
    nodes: [{ id: rootKeyword, group: '핵심', score: 1, source: 'root' }, ...fallbackKeywords],
    links: fallbackKeywords.map((item) => ({
      source: rootKeyword,
      target: item.id,
      weight: item.score
    })),
    insights: {
      topKeywords: fallbackKeywords.slice(0, 3).map((item) => item.id),
      topIntentGroups: ['정보탐색', '구매검토', '비교/후기'],
      domesticCount: fallbackKeywords.length,
      globalExpandedCount: 0,
      recheckedCount: 0,
      warning
    },
    debug
  };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = randomUUID().slice(0, 8);
  const debug = createBaseDebug(requestId, startedAt);
  let keyword = '';

  try {
    const body = (await req.json()) as { keyword?: string };
    keyword = normalizeKeyword(body.keyword ?? '');

    if (!keyword) {
      debug.stage = 'validate';
      debug.durationMs = Date.now() - startedAt;
      return NextResponse.json({ error: '키워드를 입력해주세요.', requestId, debug }, { status: 400 });
    }

    const clientId = getClientId(req);
    if (!checkRateLimit(clientId)) {
      debug.stage = 'rate_limit';
      debug.durationMs = Date.now() - startedAt;
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', requestId, debug },
        { status: 429 }
      );
    }

    const cached = await getCached(keyword);
    if (cached) {
      cached.debug = {
        ...(cached.debug ?? createBaseDebug(requestId, startedAt)),
        requestId,
        durationMs: Date.now() - startedAt,
        fromCache: true,
        stage: 'cache_hit'
      };

      return NextResponse.json(cached);
    }

    debug.stage = 'domestic_collect';
    const domesticMap = await collectDomesticCandidates(keyword);

    debug.stage = 'naver_ads_seed';
    const naverAdsSeedMetrics = await fetchNaverAdsKeywordMetrics([keyword]);
    for (const metric of naverAdsSeedMetrics.values()) {
      const boosted = metric.normalizedQueryVolume * 0.85 + metric.normalizedClickVolume * 0.1 + metric.normalizedCtr * 0.05;
      domesticMap.set(metric.relKeyword, Math.max(boosted, domesticMap.get(metric.relKeyword) ?? 0));
    }

    debug.domesticCandidateCount = domesticMap.size;

    debug.stage = 'trend_collect';
    const trendMap = await collectTrendScores(keyword, [...domesticMap.keys()]);
    debug.trendCandidateCount = trendMap.size;

    debug.stage = 'global_collect';
    const global = await collectGlobalCandidates(keyword);
    debug.globalCandidateCount = global.globalMap.size;
    debug.recheckedCandidateCount = global.recheckedMap.size;

    debug.stage = 'score_merge';
    const candidates: KeywordCandidate[] = [];

    domesticMap.forEach((domesticScore, candidateKeyword) => {
      const score = computeFinalScore({
        domesticScore,
        trendScore: trendMap.get(candidateKeyword) ?? 0,
        globalExpansionScore: 0,
        domesticRecheckScore: 0
      });

      candidates.push({
        keyword: candidateKeyword,
        source: 'domestic',
        intent: classifyIntent(candidateKeyword),
        score,
        relationStrength: score.finalScore
      });
    });

    global.recheckedMap.forEach((domesticRecheckScore, candidateKeyword) => {
      const score = computeFinalScore({
        domesticScore: domesticMap.get(candidateKeyword) ?? 0.1,
        trendScore: trendMap.get(candidateKeyword) ?? 0.05,
        globalExpansionScore: global.mappedGlobalScore.get(candidateKeyword) ?? 0.3,
        domesticRecheckScore
      });

      candidates.push({
        keyword: candidateKeyword,
        source: 'global+rechecked',
        intent: classifyIntent(candidateKeyword),
        score,
        relationStrength: score.finalScore,
        rechecked: true
      });
    });

    const deduped = new Map<string, KeywordCandidate>();
    candidates.forEach((candidate) => {
      const prev = deduped.get(candidate.keyword);
      if (!prev || prev.score.finalScore < candidate.score.finalScore) {
        deduped.set(candidate.keyword, candidate);
      }
    });

    debug.stage = 'llm_intent';
    const enrichedCandidates = await enrichIntentByLLM([...deduped.values()]);

    debug.stage = 'finalize';
    const finalCandidates = enrichedCandidates
      .filter((candidate) => candidate.score.finalScore >= ANALYZE_LIMITS.minScoreToInclude)
      .sort((a, b) => b.score.finalScore - a.score.finalScore)
      .slice(0, ANALYZE_LIMITS.maxFinalNodes);

    debug.stage = 'naver_ads_metrics';
    const naverAdsMetricMap = await fetchNaverAdsKeywordMetrics(finalCandidates.map((item) => item.keyword));

    const response: AnalyzeResponse = {
      rootKeyword: keyword,
      nodes: [
        { id: keyword, group: '핵심', score: 1, source: 'root' },
        ...finalCandidates.map((item) => ({
          id: item.keyword,
          group: item.intent,
          score: item.score.finalScore,
          source: item.source,
          rechecked: item.rechecked,
          searchVolume: naverAdsMetricMap.get(item.keyword)?.normalizedQueryVolume,
          ctr: naverAdsMetricMap.get(item.keyword)?.normalizedCtr,
          competition: naverAdsMetricMap.get(item.keyword)?.competition
        }))
      ],
      links: finalCandidates.map((item) => ({
        source: keyword,
        target: item.keyword,
        weight: Math.min(1, item.relationStrength + (naverAdsMetricMap.get(item.keyword)?.normalizedCtr ?? 0) * 0.15)
      })),
      insights: {
        ...buildInsights(finalCandidates),
        topOpportunities: [...naverAdsMetricMap.values()]
          .sort((a, b) => b.normalizedQueryVolume - a.normalizedQueryVolume)
          .slice(0, 5)
          .map((item) => ({
            keyword: item.relKeyword,
            reason: `검색량 ${Math.round(item.normalizedQueryVolume * 100)}점 / CTR ${Math.round(item.normalizedCtr * 100)}점 / 경쟁도 ${item.competition}`
          })),
        warning:
          finalCandidates.length < 5
            ? '후보가 부족합니다. 더 구체적인 키워드 또는 API 키 설정을 확인해주세요.'
            : undefined
      },
      debug: {
        ...debug,
        durationMs: Date.now() - startedAt,
        finalNodeCount: finalCandidates.length + 1,
        stage: 'done'
      }
    };

    await setCached(keyword, response);
    logger.info(`[analyze:${requestId}] completed`, response.debug);
    return NextResponse.json(response);
  } catch (error) {
    debug.stage = 'error';
    debug.durationMs = Date.now() - startedAt;
    debug.errorMessage = error instanceof Error ? error.message : 'unknown error';

    logger.error(`[analyze:${requestId}] failed`, error);

    const fallback = buildFallbackResponse(
      keyword,
      { ...debug, finalNodeCount: 6 },
      `서버 분석 오류로 fallback 결과를 표시합니다. requestId=${requestId}`
    );

    return NextResponse.json(fallback, { status: 200 });
  }
}
