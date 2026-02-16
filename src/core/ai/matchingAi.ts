import { Type } from "@google/genai";
import {
  ParentRequest,
  NannyProfile,
  SubmissionResult,
  Language,
} from "../types";
import { aiText } from "./aiGateway";

type RankedCandidate = {
  nanny: NannyProfile;
  score: number;
  reasons: string[];
};

function norm(v?: string): string {
  return String(v ?? "").trim().toLowerCase();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => n && haystack.includes(n));
}

function rankCandidates(
  request: Omit<ParentRequest, "id" | "createdAt" | "type">,
  candidates: NannyProfile[]
): RankedCandidate[] {
  const city = norm(request.city);
  const childAge = norm(request.childAge);
  const schedule = norm(request.schedule);
  const reqs = request.requirements.map(norm).filter(Boolean);

  const familyStyle = request.riskProfile?.familyStyle;
  const communicationPreference = request.riskProfile?.communicationPreference;
  const nannyStylePref = request.riskProfile?.nannyStylePreference;
  const childStress = request.riskProfile?.childStress;
  const deficitNeeds = request.riskProfile?.deficitNeeds || [];
  const parentPcm = request.riskProfile?.pcmType;

  return candidates
    .map((nanny) => {
      let score = 40;
      const reasons: string[] = [];

      const nannyCity = norm(nanny.city);
      const about = norm(nanny.about);
      const experience = norm(nanny.experience);
      const skills = (nanny.skills || []).map(norm).join(" ");
      const childAges = (nanny.childAges || []).map(norm).join(" ");
      const profileText = [about, experience, skills, childAges].join(" ");

      if (city && nannyCity && (nannyCity.includes(city) || city.includes(nannyCity))) {
        score += 20;
        reasons.push("Локация совпадает");
      }

      if (nanny.isVerified) {
        score += 12;
        reasons.push("Профиль верифицирован");
      }

      if (childAge && (childAges.includes(childAge) || about.includes(childAge))) {
        score += 10;
        reasons.push("Есть релевантный опыт по возрасту ребёнка");
      }

      if (schedule && includesAny(profileText, [schedule])) {
        score += 6;
        reasons.push("Похожий график/доступность");
      }

      if (reqs.length) {
        const matchedReq = reqs.filter((r) => profileText.includes(r));
        if (matchedReq.length > 0) {
          score += Math.min(18, matchedReq.length * 6);
          reasons.push(`Совпали требования: ${matchedReq.slice(0, 2).join(", ")}`);
        }
      }

      const nannyBehavior = nanny.riskProfile || {};
      let mirrorScore = 0;
      let growthScore = 0;

      if (familyStyle && nannyBehavior.routineStyle) {
        if (familyStyle === 'structured' && nannyBehavior.routineStyle === 'structured') mirrorScore += 10;
        if (familyStyle === 'balanced' && nannyBehavior.routineStyle === 'balanced') mirrorScore += 8;
        if (familyStyle === 'warm' && nannyBehavior.disciplineStyle === 'gentle') mirrorScore += 10;
      }

      if (nannyStylePref && nannyBehavior.disciplineStyle) {
        if (nannyStylePref === 'gentle' && nannyBehavior.disciplineStyle === 'gentle') mirrorScore += 6;
        if (nannyStylePref === 'strict' && nannyBehavior.disciplineStyle === 'strict') mirrorScore += 6;
        if (nannyStylePref === 'playful' && (nannyBehavior.strengths || []).includes('Игра')) mirrorScore += 6;
      }

      if (communicationPreference && nannyBehavior.communicationStyle) {
        if (communicationPreference === nannyBehavior.communicationStyle) mirrorScore += 6;
      }

      if (childStress && nannyBehavior.tantrumFirstStep) {
        if (['tantrum', 'cry'].includes(childStress) && nannyBehavior.tantrumFirstStep === 'calm') mirrorScore += 6;
        if (childStress === 'aggressive' && nannyBehavior.tantrumFirstStep === 'boundaries') mirrorScore += 6;
        if (childStress === 'withdraw' && nannyBehavior.tantrumFirstStep === 'distract') mirrorScore += 4;
      }

      const strengths = nannyBehavior.strengths || [];
      if (deficitNeeds.length && strengths.length) {
        const matched = deficitNeeds.filter((x) => strengths.includes(x));
        if (matched.length) {
          growthScore += Math.min(12, matched.length * 6);
          reasons.push(`Дополняет семью: ${matched.slice(0, 2).join(", ")}`);
        }
      }

      if (parentPcm && nannyBehavior.pcmType && parentPcm === nannyBehavior.pcmType) {
        mirrorScore += 6;
        reasons.push("Совпадение по стилю общения (PCM)");
      }

      if (mirrorScore > 0) {
        score += Math.min(18, mirrorScore);
        reasons.push("Совпадение по стилю семьи");
      }

      if (nanny.softSkills?.rawScore) {
        score += Math.min(8, Math.round(nanny.softSkills.rawScore / 20));
        reasons.push("Есть AI-оценка soft skills");
      }

      score += growthScore;

      score = Math.max(0, Math.min(100, score));
      return { nanny, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

function buildHeuristicFallback(
  ranked: RankedCandidate[],
  lang: Language
): SubmissionResult {
  if (!ranked.length) {
    return {
      matchScore: 72,
      recommendations:
        lang === "ru"
          ? [
              "В базе пока нет кандидатов с точным совпадением",
              "Расширьте требования или бюджет для большего выбора",
              "Добавьте детали по графику и обязанностям",
            ]
          : [
              "No exact candidates found in the current database",
              "Broaden requirements or budget to increase matches",
              "Add more details for schedule and responsibilities",
            ],
    };
  }

  const top = ranked[0];
  const score = Math.max(55, Math.min(98, top.score));

  const recsRu = [
    `Лучший текущий матч: ${top.nanny.name || "кандидат"} (${score}%)`,
    top.reasons[0] || "Проверьте опыт по вашему возрасту ребёнка",
    "Проведите короткое пробное знакомство и сверку графика",
  ];

  const recsEn = [
    `Best current match: ${top.nanny.name || "candidate"} (${score}%)`,
    top.reasons[0] || "Validate relevant childcare experience",
    "Run a short trial meeting and confirm schedule fit",
  ];

  return {
    matchScore: score,
    recommendations: lang === "ru" ? recsRu : recsEn,
  };
}

export const findBestMatch = async (
  request: Omit<ParentRequest, "id" | "createdAt" | "type">,
  candidates: NannyProfile[],
  lang: Language
): Promise<SubmissionResult> => {
  const ranked = rankCandidates(request, candidates);
  const topCandidates = ranked.slice(0, 25); // keep prompt compact for large datasets (e.g. 120+)
  const heuristicFallback = buildHeuristicFallback(ranked, lang);

  const candidateData =
    topCandidates.length > 0
      ? JSON.stringify(
          topCandidates.map((r) => ({
            id: r.nanny.id,
            name: r.nanny.name,
            city: r.nanny.city,
            about: r.nanny.about,
            experience: r.nanny.experience,
            skills: r.nanny.skills || [],
            childAges: r.nanny.childAges || [],
            softSkills: r.nanny.softSkills?.dominantStyle || "Unknown",
            verified: r.nanny.isVerified,
            heuristicScore: r.score,
          }))
        )
      : "No candidates in database. Provide recommendations to improve request quality.";

  const prompt = `
Role: You are an expert HR matching algorithm for a Nanny Matching Service.

Task:
Analyze PARENT REQUEST and TOP CANDIDATES shortlist.
Return realistic compatibility score and practical recommendations for parent.

PARENT REQUEST:
City: ${request.city}
Child Age: ${request.childAge}
Schedule: ${request.schedule}
Budget: ${request.budget}
Requirements: ${request.requirements.join(", ")}
Comment: ${request.comment}

TOP CANDIDATES (already pre-ranked heuristically):
${candidateData}

Rules:
- Keep matchScore realistic (0-100).
- Do not output generic advice; make it specific to this request.
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
        type: Type.OBJECT,
        properties: {
          matchScore: { type: Type.INTEGER },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["matchScore", "recommendations"],
      },
    });

    if (!responseText) {
      return heuristicFallback;
    }

    const result = JSON.parse(responseText || "{}") as any;
    const safeScore = Number.isFinite(result?.matchScore)
      ? Math.max(0, Math.min(100, Math.round(result.matchScore)))
      : heuristicFallback.matchScore;

    const safeRecommendations = Array.isArray(result?.recommendations)
      ? result.recommendations.filter(Boolean).slice(0, 3)
      : [];

    return {
      matchScore: safeScore,
      recommendations:
        safeRecommendations.length === 3
          ? safeRecommendations
          : heuristicFallback.recommendations,
    };
  } catch (error) {
    console.error("AI Matching Failed:", error);
    return heuristicFallback;
  }
};
