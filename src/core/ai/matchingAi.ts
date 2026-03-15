import {
  ParentRequest,
  NannyProfile,
  SubmissionResult,
  MatchCandidate,
  MatchResult,
  TrustBadge,
  Language,
} from "../types";
import { aiText } from "./aiGateway";
import { getQualityScore } from "../../../services/qualityScore";
import { geoScore, budgetScore } from "./geoAndBudget";
import { detectRiskFlags, RiskFlag } from "./riskEngine";
import { getWeights, type MatchingWeights } from "./matchingWeights";
import { logShadowScores, applyEpsilonGreedy, type ScoredCandidate } from "./shadowScoring";
import { formatInsightsBlock } from "./insightsLoader";

type RankedCandidate = {
  nanny: NannyProfile;
  score: number;
  reasons: string[];
  riskFlags: RiskFlag[];
  factors: Record<string, number>;
};

const SchemaType = {
  OBJECT: 'OBJECT',
  INTEGER: 'INTEGER',
  ARRAY: 'ARRAY',
  STRING: 'STRING',
} as const;

function norm(v?: string): string {
  return String(v ?? "").trim().toLowerCase().replace(/ё/g, "е");
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => n && haystack.includes(n));
}

function rankCandidates(
  request: Omit<ParentRequest, "id" | "createdAt" | "type">,
  candidates: NannyProfile[],
  w: MatchingWeights = {} as MatchingWeights
): RankedCandidate[] {
  const city = norm(request.city);
  const childAge = norm(request.childAge);
  const schedule = norm(request.schedule);
  const reqs = request.requirements.map(norm).filter(Boolean);

  const familyStyle = request.riskProfile?.familyStyle;
  const communicationPreference = request.riskProfile?.communicationPreference;
  const nannyStylePref = request.riskProfile?.nannyStylePreference;
  const childStress = request.riskProfile?.childStress;
  const needs = request.riskProfile?.needs || [];
  const parentPcm = request.riskProfile?.pcmType;

  // Deduplicate by nanny ID (prevents same nanny appearing twice from localStorage + Supabase sync)
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return uniqueCandidates
    // Pre-filter: only approved nannies with Quality Score >= 50
    .filter((nanny) => getQualityScore(nanny) >= 50)
    // Pre-filter: budget hard filter (nanny rate > 2x parent budget = exclude)
    .filter((nanny) => !budgetScore(request.budget, nanny.expectedRate).exclude)
    .map((nanny) => {
      let score = w.base;
      const reasons: string[] = [];
      const factors: Record<string, number> = {};

      const nannyCity = norm(nanny.city);
      const about = norm(nanny.about);
      const experience = norm(nanny.experience);
      const skills = (nanny.skills || []).map(norm).join(" ");
      const childAges = (nanny.childAges || []).map(norm).join(" ");
      const profileText = [about, experience, skills, childAges].join(" ");

      // --- GEO SCORING (replaces old city matching) ---
      const geo = geoScore(
        request.district, request.metro, request.city,
        nanny.district, nanny.metro, nanny.city
      );
      if (geo.score > 0) {
        score += geo.score;
        factors.geo = geo.score;
        if (geo.reason) reasons.push(geo.reason);
      }

      // --- BUDGET SCORING ---
      const budget = budgetScore(request.budget, nanny.expectedRate);
      if (budget.score > 0) {
        score += budget.score;
        factors.budget = budget.score;
        if (budget.reason) reasons.push(budget.reason);
      }

      if (nanny.isVerified) {
        score += w.verification;
        factors.verification = w.verification;
        reasons.push("Профиль верифицирован");
      }

      if (childAge && (childAges.includes(childAge) || about.includes(childAge))) {
        score += w.childAge;
        factors.childAge = w.childAge;
        reasons.push("Есть релевантный опыт по возрасту ребёнка");
      }

      if (schedule && includesAny(profileText, [schedule])) {
        score += w.schedule;
        factors.schedule = w.schedule;
        reasons.push("Похожий график/доступность");
      }

      if (reqs.length) {
        const matchedReq = reqs.filter((r) => profileText.includes(r));
        if (matchedReq.length > 0) {
          const reqScore = Math.min(18, matchedReq.length * w.requirementMatch);
          score += reqScore;
          factors.requirements = reqScore;
          reasons.push(`Совпали требования: ${matchedReq.slice(0, 2).join(", ")}`);
        }
      }

      const nannyBehavior = nanny.riskProfile || {};
      let mirrorScore = 0;
      let growthScore = 0;

      if (familyStyle && nannyBehavior.routineStyle) {
        if (familyStyle === 'structured' && nannyBehavior.routineStyle === 'structured') mirrorScore += w.familyStyleMatch;
        if (familyStyle === 'balanced' && nannyBehavior.routineStyle === 'balanced') mirrorScore += Math.round(w.familyStyleMatch * 0.8);
        if (familyStyle === 'warm' && nannyBehavior.disciplineStyle === 'gentle') mirrorScore += w.familyStyleMatch;
      }

      if (nannyStylePref && nannyBehavior.disciplineStyle) {
        if (nannyStylePref === 'gentle' && nannyBehavior.disciplineStyle === 'gentle') mirrorScore += w.disciplineMatch;
        if (nannyStylePref === 'strict' && nannyBehavior.disciplineStyle === 'strict') mirrorScore += w.disciplineMatch;
        if (nannyStylePref === 'playful' && (nannyBehavior.strengths || []).includes('Игра')) mirrorScore += w.disciplineMatch;
      }

      if (communicationPreference && nannyBehavior.communicationStyle) {
        if (communicationPreference === nannyBehavior.communicationStyle) mirrorScore += w.communicationMatch;
      }

      if (childStress && nannyBehavior.tantrumFirstStep) {
        if (['tantrum', 'cry'].includes(childStress) && nannyBehavior.tantrumFirstStep === 'calm') mirrorScore += w.stressResponseMatch;
        if (childStress === 'aggressive' && nannyBehavior.tantrumFirstStep === 'boundaries') mirrorScore += w.stressResponseMatch;
        if (childStress === 'withdraw' && nannyBehavior.tantrumFirstStep === 'distract') mirrorScore += Math.round(w.stressResponseMatch * 0.67);
      }

      const strengths = nannyBehavior.strengths || [];
      if (needs.length && strengths.length) {
        const matched = needs.filter((x) => strengths.includes(x));
        if (matched.length) {
          growthScore += Math.min(w.growthMax, matched.length * w.growthPerNeed);
          reasons.push(`Учитывает потребности семьи: ${matched.slice(0, 2).join(", ")}`);
        }
      }

      if (parentPcm && nannyBehavior.pcmType && parentPcm === nannyBehavior.pcmType) {
        mirrorScore += w.pcmMatch;
        reasons.push("Совпадение по стилю общения (PCM)");
      }

      if (mirrorScore > 0) {
        const cappedMirror = Math.min(w.mirrorMax, mirrorScore);
        score += cappedMirror;
        factors.mirror = cappedMirror;
        reasons.push("Совпадение по стилю семьи");
      }

      if (nanny.softSkills?.rawScore) {
        const ssScore = Math.min(w.softSkillsMax, Math.round(nanny.softSkills.rawScore / 20));
        score += ssScore;
        factors.softSkills = ssScore;
        reasons.push("Есть AI-оценка soft skills");
      }

      score += growthScore;
      if (growthScore > 0) factors.growth = growthScore;

      // Nanny Sharing compatibility bonus
      if (request.isNannySharing && nanny.isNannySharing) {
        score += w.nannySharing;
        factors.nannySharing = w.nannySharing;
        reasons.push("Готова к совместному шерингу няни");
      }

      // Quality Score bonus (up to +10)
      const qs = getQualityScore(nanny);
      if (qs >= 85) { score += w.qualityPremium; factors.quality = w.qualityPremium; reasons.push("Премиум-рейтинг качества"); }
      else if (qs >= 70) { score += w.qualityGood; factors.quality = w.qualityGood; }

      // Risk flags
      const riskFlags = detectRiskFlags(request, nanny);

      score = Math.max(0, Math.min(100, score));
      return { nanny, score, reasons, riskFlags, factors };
    })
    .sort((a, b) => b.score - a.score);
}

function buildTrustBadges(nanny: NannyProfile): TrustBadge[] {
  const badges: TrustBadge[] = [];

  const hasVerifiedDocs = nanny.documents?.some(d => d.status === 'verified');
  if (hasVerifiedDocs || nanny.isVerified) badges.push('verified_docs');
  if (nanny.isVerified) badges.push('verified_moderation');
  if (nanny.softSkills) badges.push('soft_skills');
  if (nanny.reviews && nanny.reviews.length > 0) badges.push('has_reviews');
  // AI check badge always present since we run AI matching
  badges.push('ai_checked');

  return badges;
}

function buildHumanExplanationFallback(
  ranked: RankedCandidate,
  request: Omit<ParentRequest, "id" | "createdAt" | "type">,
  lang: Language
): string {
  const name = ranked.nanny.name || (lang === 'ru' ? 'Кандидат' : 'Candidate');
  const nanny = ranked.nanny;

  // Build a rich, specific explanation from available data
  const parts: string[] = [];

  if (nanny.experience) {
    parts.push(lang === 'ru' ? `опыт ${nanny.experience}` : `${nanny.experience} of experience`);
  }
  if (nanny.district || nanny.metro) {
    const loc = nanny.metro || nanny.district || '';
    if (loc) parts.push(lang === 'ru' ? `работает рядом (${loc})` : `nearby (${loc})`);
  }
  if (nanny.softSkills?.dominantStyle) {
    const styleMap: Record<string, string> = {
      'Empathetic': lang === 'ru' ? 'мягкий и эмпатичный подход' : 'empathetic approach',
      'Structured': lang === 'ru' ? 'структурированный подход к режиму' : 'structured routine approach',
      'Balanced': lang === 'ru' ? 'сбалансированный стиль воспитания' : 'balanced parenting style',
    };
    parts.push(styleMap[nanny.softSkills.dominantStyle] || '');
  }
  if (nanny.skills?.length) {
    const topSkills = nanny.skills.slice(0, 2).join(', ');
    parts.push(lang === 'ru' ? `умеет: ${topSkills}` : `skills: ${topSkills}`);
  }

  const validParts = parts.filter(Boolean);

  if (lang === 'ru') {
    if (validParts.length === 0) return `${name} может подойти вашей семье.`;
    return `${name} — ${validParts.join(', ')}.`;
  }
  if (validParts.length === 0) return `${name} could be a good match for your family.`;
  return `${name} — ${validParts.join(', ')}.`;
}

async function buildHumanExplanationAI(
  ranked: RankedCandidate,
  request: Omit<ParentRequest, "id" | "createdAt" | "type">,
  lang: Language
): Promise<string> {
  const name = ranked.nanny.name || 'Кандидат';
  const fallback = buildHumanExplanationFallback(ranked, request, lang);

  try {
    const prompt = lang === 'ru'
      ? `Напиши 1-2 тёплых предложения, почему няня "${name}" подходит этой семье.
Няня: опыт ${ranked.nanny.experience || '?'}, навыки: ${(ranked.nanny.skills || []).join(', ')}, район: ${ranked.nanny.district || ranked.nanny.metro || 'Москва'}, стиль: ${ranked.nanny.softSkills?.dominantStyle || '?'}.
Родитель: ребёнок ${request.childAge || '?'}, график ${request.schedule || '?'}, район ${request.district || request.metro || 'Москва'}.
Отвечай ТОЛЬКО текстом объяснения, без кавычек, без вступлений.`
      : `Write 1-2 warm sentences about why nanny "${name}" fits this family.
Nanny: ${ranked.nanny.experience || '?'} exp, skills: ${(ranked.nanny.skills || []).join(', ')}, area: ${ranked.nanny.district || 'Moscow'}.
Parent: child age ${request.childAge || '?'}, schedule ${request.schedule || '?'}.
Respond ONLY with the explanation text.`;

    const result = await aiText(prompt, { temperature: 0.7 });
    if (result && result.trim().length > 10 && result.trim().length < 300) {
      return result.trim();
    }
  } catch {
    // AI failed, use fallback
  }

  return fallback;
}

async function buildMatchResult(
  ranked: RankedCandidate[],
  request: Omit<ParentRequest, "id" | "createdAt" | "type">,
  lang: Language
): Promise<MatchResult> {
  // Paradox of Choice: max 3 candidates
  const top3 = ranked.slice(0, 3).filter(r => r.score >= 40);

  // Generate AI explanations in parallel for speed
  const explanations = await Promise.all(
    top3.map(r => buildHumanExplanationAI(r, request, lang))
  );

  const candidates: MatchCandidate[] = top3.map((r, i) => ({
    nanny: r.nanny,
    score: Math.max(0, Math.min(98, r.score)),
    reasons: r.reasons,
    humanExplanation: explanations[i],
    trustBadges: buildTrustBadges(r.nanny),
    riskFlags: r.riskFlags.length > 0 ? r.riskFlags.map(f => ({
      level: f.level,
      message: f.message,
      advice: f.advice,
    })) : undefined,
  }));

  const overallAdvice = lang === 'ru'
    ? candidates.length > 0
      ? `Мы подобрали ${candidates.length} ${candidates.length === 1 ? 'кандидата' : 'кандидатов'} для вашей семьи. Напишите понравившейся няне — это ни к чему не обязывает.`
      : 'Пока кандидатов нет, но мы расширим поиск. Попробуйте скорректировать бюджет или график.'
    : candidates.length > 0
      ? `We found ${candidates.length} candidate${candidates.length === 1 ? '' : 's'} for your family. Message the one you like — no obligation.`
      : 'No candidates yet, but we\'ll expand the search. Try adjusting your budget or schedule.';

  return { candidates, overallAdvice };
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
  const score = Math.max(0, Math.min(98, top.score));

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
  lang: Language,
  parentId?: string,
): Promise<SubmissionResult> => {
  // Load dynamic weights (cached, falls back to defaults)
  const w = await getWeights();
  const ranked = rankCandidates(request, candidates, w);

  // Shadow Mode: log scores for RLHF training (fire-and-forget)
  logShadowScores(ranked.slice(0, 10) as ScoredCandidate[], undefined, parentId);

  // ε-Greedy: inject wildcard candidate (10% chance)
  const { candidates: greedyRanked, wildcardId } = applyEpsilonGreedy(ranked);
  if (wildcardId) {
    console.log(`[ε-Greedy] Wildcard injected: ${wildcardId}`);
  }

  const topCandidates = greedyRanked.slice(0, 25);
  const heuristicFallback = buildHeuristicFallback(greedyRanked, lang);
  const matchResult = await buildMatchResult(greedyRanked, request, lang);

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

  // Этап 1: Inject Learned Insights into prompt
  const insightsBlock = await formatInsightsBlock();

  const prompt = `
Role: You are an expert HR matching algorithm for a Nanny Matching Service called Blizko.
${insightsBlock}
Task:
Analyze PARENT REQUEST and TOP CANDIDATES shortlist.
Return realistic compatibility score and 3 practical, SPECIFIC recommendations for the parent.

PARENT REQUEST:
City: ${request.city}
District: ${request.district || 'не указан'}
Metro: ${request.metro || 'не указана'}
Child Age: ${request.childAge}
Schedule: ${request.schedule}
Budget: ${request.budget}
Requirements: ${request.requirements.join(", ")}
Comment: ${request.comment}
Family Style: ${request.riskProfile?.familyStyle || 'не указан'}
Communication: ${request.riskProfile?.communicationPreference || 'не указана'}

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
        type: SchemaType.OBJECT,
        properties: {
          matchScore: { type: SchemaType.INTEGER },
          recommendations: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["matchScore", "recommendations"],
      },
    });

    if (!responseText) {
      return { ...heuristicFallback, matchResult };
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
      matchResult,
    };
  } catch (error) {
    console.error("AI Matching Failed:", error);
    return { ...heuristicFallback, matchResult };
  }
};
