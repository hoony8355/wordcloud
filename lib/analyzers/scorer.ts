import { SCORE_WEIGHTS } from '@/config/weights';
import type { KeywordScore } from '@/types/keyword';

export function computeFinalScore(input: Omit<KeywordScore, 'finalScore'>): KeywordScore {
  const finalScore =
    SCORE_WEIGHTS.domesticScore * input.domesticScore +
    SCORE_WEIGHTS.trendScore * input.trendScore +
    SCORE_WEIGHTS.globalExpansionScore * input.globalExpansionScore +
    SCORE_WEIGHTS.domesticRecheckScore * input.domesticRecheckScore;

  return {
    ...input,
    finalScore: Number(finalScore.toFixed(4))
  };
}
