import { NextRequest, NextResponse } from 'next/server';
import { ANALYZE_LIMITS } from '@/config/weights';
import { buildInsights } from '@/lib/analyzers/cluster';
import { collectDomesticCandidates } from '@/lib/analyzers/domestic';
import { collectGlobalCandidates } from '@/lib/analyzers/global';
import { computeFinalScore } from '@/lib/analyzers/scorer';
import { collectTrendScores } from '@/lib/analyzers/trend';
import { classifyIntent } from '@/lib/utils/keywords';
import { normalizeKeyword } from '@/lib/utils/normalize';
import { logger } from '@/lib/utils/logger';
import type { AnalyzeResponse, KeywordCandidate } from '@/types/keyword';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { keyword?: string };
    const keyword = normalizeKeyword(body.keyword ?? '');

    if (!keyword) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    }

    const domesticMap = await collectDomesticCandidates(keyword);
    const trendMap = await collectTrendScores(keyword, [...domesticMap.keys()]);
    const global = await collectGlobalCandidates(keyword);

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
        globalExpansionScore: global.globalMap.get(candidateKeyword) ?? 0.45,
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
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('analyze route failed', error);
    return NextResponse.json(
      {
        error: '분석 중 오류가 발생했습니다.',
        fallback: true
      },
      { status: 500 }
    );
  }
}
