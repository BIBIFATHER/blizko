import type {
  Language,
  MatchResult,
  NannyProfile,
  ParentRequest,
  SubmissionResult,
} from "../types";
import type { RiskFlag } from "./riskEngine";

export type MatchingRequest = Omit<ParentRequest, "id" | "createdAt" | "type">;

export type RankedCandidate = {
  nanny: NannyProfile;
  score: number;
  reasons: string[];
  riskFlags: RiskFlag[];
  factors: Record<string, number>;
};

export type MatchingAiResponse = {
  matchScore?: number;
  recommendations?: string[];
};

export type MatchResultBuilder = (
  ranked: RankedCandidate[],
  request: MatchingRequest,
  lang: Language
) => Promise<MatchResult>;

export type HeuristicFallbackBuilder = (
  ranked: RankedCandidate[],
  lang: Language
) => SubmissionResult;
