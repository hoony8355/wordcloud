import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ANALYZE_LIMITS } from '@/config/weights';
import { buildInsights } from '@/lib/analyzers/cluster';
import { collectDomesticCandidates } from '@/lib/analyzers/domestic';
import { collectGlobalCandidates } from '@/lib/analyzers/global';
import { computeFinalScore } from '@/lib/analyzers/scorer';
import { collectTrendScores } from '@/lib/analyzers/trend';
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

function getCached(keyword: string): AnalyzeResponse | null {
  const cached = resultCache.get(keyword);
  if (!cached) return null;
  if (cached.expireAt < Date.now()) {
    resultCache.delete(keyword);
    return null;
  }
  return cached.value;
}

function setCached(keyword: string, value: AnalyzeResponse): void {
  resultCache.set(keyword, {
    value,
    expireAt: Date.now() + CACHE_TTL_MS
  });
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

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = randomUUID().slice(0, 8);
  const debug = createBaseDebug(requestId, startedAt);

  try {
    const body = (await req.json()) as { keyword?: string };
    const keyword = normalizeKeyword(body.keyword ?? '');

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

    const cached = getCached(keyword);
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

    debug.stage = 'finalize';
    const finalCandidates = [...deduped.values()]
      .filter((candidate) => candidate.score.finalScore >= ANALYZE_LIMITS.minScoreToInclude)
      .sort((a, b) => b.score.finalScore - a.score.finalScore)
      .slice(0, ANALYZE_LIMITS.maxFinalNodes);

    const response: AnalyzeResponse = {
      rootKeyword: keyword,
      nodes: [
        { id: keyword, group: '핵심', score: 1, source: 'root' },
        ...finalCandidates.map((item) => ({
          id: item.keyword,
          group: item.intent,
          score: item.score.finalScore,
          source: item.source,
          rechecked: item.rechecked
        }))
      ],
      links: finalCandidates.map((item) => ({
        source: keyword,
        target: item.keyword,
        weight: item.relationStrength
      })),
      insights: {
        ...buildInsights(finalCandidates),
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

    setCached(keyword, response);
    logger.info(`[analyze:${requestId}] completed`, response.debug);
    return NextResponse.json(response);
  } catch (error) {
    debug.stage = 'error';
    debug.durationMs = Date.now() - startedAt;
    debug.errorMessage = error instanceof Error ? error.message : 'unknown error';

    logger.error(`[analyze:${requestId}] failed`, error);
    return NextResponse.json(
      {
        error: '분석 중 오류가 발생했습니다.',
        fallback: true,
        requestId,
        debug
      },
      { status: 500 }
    );
  }
}
