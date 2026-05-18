import { aiText } from "./aiGateway";
import { formatInsightsBlock } from "./insightsLoader";
import type { MatchingAiResponse, MatchingRequest, RankedCandidate } from "./matchingAi.types";

const schemaType = {
  OBJECT: "OBJECT",
  INTEGER: "INTEGER",
  ARRAY: "ARRAY",
  STRING: "STRING",
} as const;

function buildCandidateData(topCandidates: RankedCandidate[]): string {
  if (topCandidates.length === 0) {
    return "No candidates in database. Provide recommendations to improve request quality.";
  }

  return JSON.stringify(
    topCandidates.map((candidate) => ({
      id: candidate.nanny.id,
      name: candidate.nanny.name,
      city: candidate.nanny.city,
      about: candidate.nanny.about,
      experience: candidate.nanny.experience,
      skills: candidate.nanny.skills || [],
      childAges: candidate.nanny.childAges || [],
      softSkills: candidate.nanny.softSkills?.dominantStyle || "Unknown",
      verified: candidate.nanny.isVerified,
      heuristicScore: candidate.score,
    }))
  );
}

function sanitizeRecommendations(
  recommendations: MatchingAiResponse["recommendations"],
  fallback: string[]
): string[] {
  const safeRecommendations = Array.isArray(recommendations)
    ? recommendations.filter(Boolean).slice(0, 3)
    : [];

  return safeRecommendations.length === 3 ? safeRecommendations : fallback;
}

export async function getAiMatchSummary(
  request: MatchingRequest,
  ranked: RankedCandidate[],
  lang: "ru" | "en",
  fallback: { matchScore: number; recommendations: string[] }
): Promise<{ matchScore: number; recommendations: string[] }> {
  const insightsBlock = await formatInsightsBlock();
  const candidateData = buildCandidateData(ranked.slice(0, 25));

  const prompt = `
Role: You are an expert HR matching algorithm for a Nanny Matching Service called Blizko.
${insightsBlock}
Task:
Analyze PARENT REQUEST and TOP CANDIDATES shortlist.
Return realistic compatibility score and 3 practical, SPECIFIC recommendations for the parent.

PARENT REQUEST:
City: ${request.city}
District: ${request.district || "не указан"}
Metro: ${request.metro || "не указана"}
Child Age: ${request.childAge}
Schedule: ${request.schedule}
Budget: ${request.budget}
Requirements: ${request.requirements.join(", ")}
Comment: ${request.comment}
Family Style: ${request.riskProfile?.familyStyle || "не указан"}
Communication: ${request.riskProfile?.communicationPreference || "не указана"}

TOP CANDIDATES (already pre-ranked by heuristic scoring):
${candidateData}

Rules:
- matchScore must be realistic (0-100). If top candidate has heuristicScore 80+, matchScore should be 75-95.
- Each recommendation MUST reference specific candidate names or specific aspects of the request.
- Do NOT give generic advice like "check references" — be specific.
- recommendations must be exactly 3 short strings in ${lang === "ru" ? "Russian" : "English"}.

Output JSON only:
{
  "matchScore": <integer>,
  "recommendations": ["...", "...", "..."]
}
`;

  try {
    const responseText = await aiText(prompt, {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: schemaType.OBJECT,
        properties: {
          matchScore: { type: schemaType.INTEGER },
          recommendations: {
            type: schemaType.ARRAY,
            items: { type: schemaType.STRING },
          },
        },
        required: ["matchScore", "recommendations"],
      },
    });

    if (!responseText) return fallback;

    const result = JSON.parse(responseText || "{}") as MatchingAiResponse;
    const matchScore = Number.isFinite(result?.matchScore)
      ? Math.max(0, Math.min(100, Math.round(result.matchScore as number)))
      : fallback.matchScore;

    return {
      matchScore,
      recommendations: sanitizeRecommendations(result?.recommendations, fallback.recommendations),
    };
  } catch (error) {
    console.error("AI Matching Failed:", error);
    return fallback;
  }
}
