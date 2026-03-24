export type KeywordSource = 'root' | 'domestic' | 'global+rechecked' | 'global';

export type IntentGroup =
  | '핵심'
  | '정보탐색'
  | '구매검토'
  | '행동유도'
  | '세부니즈'
  | '브랜드/지역'
  | '비교/후기';

export interface KeywordScore {
  domesticScore: number;
  trendScore: number;
  globalExpansionScore: number;
  domesticRecheckScore: number;
  finalScore: number;
}

export interface KeywordCandidate {
  keyword: string;
  source: KeywordSource;
  intent: IntentGroup;
  score: KeywordScore;
  relationStrength: number;
  rechecked?: boolean;
}

export interface GraphNode {
  id: string;
  group: IntentGroup;
  score: number;
  source: KeywordSource;
  rechecked?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

export interface AnalyzeInsights {
  topKeywords: string[];
  topIntentGroups: IntentGroup[];
  domesticCount: number;
  globalExpandedCount: number;
  recheckedCount: number;
  warning?: string;
}

export interface AnalyzeResponse {
  rootKeyword: string;
  nodes: GraphNode[];
  links: GraphLink[];
  insights: AnalyzeInsights;
}
