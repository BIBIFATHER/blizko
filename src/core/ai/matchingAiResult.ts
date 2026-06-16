import type {
  Language,
  MatchCandidate,
  MatchResult,
  NannyProfile,
  TrustBadge,
  SubmissionResult,
} from '../types';
import { aiText } from './aiGateway';
import { pluralizeRu } from '../i18n/plural';
import type { MatchingRequest, RankedCandidate } from './matchingAi.types';

function buildTrustBadges(nanny: NannyProfile): TrustBadge[] {
  const badges: TrustBadge[] = [];

  const hasVerifiedDocs = nanny.documents?.some((document) => document.status === 'verified');
  if (hasVerifiedDocs || nanny.isVerified) badges.push('verified_docs');
  if (nanny.isVerified) badges.push('verified_moderation');
  if (nanny.softSkills) badges.push('soft_skills');
  if (nanny.reviews && nanny.reviews.length > 0) badges.push('has_reviews');
  // No unconditional `ai_checked` trust claim — an AI gloss is not verification
  // evidence and must not be shown as a trust badge. (memo §9.4)

  return badges;
}

function buildHumanExplanationFallback(
  ranked: RankedCandidate,
  _request: MatchingRequest,
  lang: Language,
): string {
  const name = ranked.nanny.name || (lang === 'ru' ? 'Няня' : 'Nanny');
  const nanny = ranked.nanny;
  const parts: string[] = [];

  if (nanny.experience) {
    parts.push(lang === 'ru' ? `опыт ${nanny.experience}` : `${nanny.experience} of experience`);
  }
  if (nanny.district || nanny.metro) {
    const location = nanny.metro || nanny.district || '';
    if (location)
      parts.push(lang === 'ru' ? `работает рядом (${location})` : `nearby (${location})`);
  }
  if (nanny.softSkills?.dominantStyle) {
    const styleMap: Record<string, string> = {
      Empathetic: lang === 'ru' ? 'мягкий и эмпатичный подход' : 'empathetic approach',
      Structured:
        lang === 'ru' ? 'структурированный подход к режиму' : 'structured routine approach',
      Balanced: lang === 'ru' ? 'сбалансированный стиль воспитания' : 'balanced parenting style',
    };
    parts.push(styleMap[nanny.softSkills.dominantStyle] || '');
  }
  if (nanny.skills?.length) {
    const topSkills = nanny.skills.slice(0, 2).join(', ');
    parts.push(lang === 'ru' ? `умеет: ${topSkills}` : `skills: ${topSkills}`);
  }

  const validParts = parts.filter(Boolean);
  if (lang === 'ru') {
    return validParts.length === 0
      ? `${name} может подойти вашей семье.`
      : `${name} — ${validParts.join(', ')}.`;
  }

  return validParts.length === 0
    ? `${name} could be a good match for your family.`
    : `${name} — ${validParts.join(', ')}.`;
}

async function buildHumanExplanationAI(
  ranked: RankedCandidate,
  request: MatchingRequest,
  lang: Language,
): Promise<string> {
  const name = ranked.nanny.name || 'Няня';
  const fallback = buildHumanExplanationFallback(ranked, request, lang);

  try {
    const prompt =
      lang === 'ru'
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
    // Fall back to deterministic explanation.
  }

  return fallback;
}

export async function buildMatchResult(
  ranked: RankedCandidate[],
  request: MatchingRequest,
  lang: Language,
): Promise<MatchResult> {
  const top3 = ranked.slice(0, 3).filter((candidate) => candidate.score >= 40);
  const explanations = await Promise.all(
    top3.map((candidate) => buildHumanExplanationAI(candidate, request, lang)),
  );

  const candidates: MatchCandidate[] = top3.map((candidate, index) => ({
    nanny: candidate.nanny,
    score: Math.max(0, Math.min(98, candidate.score)),
    reasons: candidate.reasons,
    humanExplanation: explanations[index],
    trustBadges: buildTrustBadges(candidate.nanny),
    riskFlags:
      candidate.riskFlags.length > 0
        ? candidate.riskFlags.map((flag) => ({
            level: flag.level,
            message: flag.message,
            advice: flag.advice,
          }))
        : undefined,
  }));

  const overallAdvice =
    lang === 'ru'
      ? candidates.length > 0
        ? `Мы подобрали ${candidates.length} ${pluralizeRu(candidates.length, ['няню', 'няни', 'нянь'])} для вашей семьи. Напишите понравившейся — это ни к чему не обязывает.`
        : 'Пока нянь нет, но мы расширим поиск. Попробуйте скорректировать бюджет или график.'
      : candidates.length > 0
        ? `We found ${candidates.length} nann${candidates.length === 1 ? 'y' : 'ies'} for your family. Message the one you like — no obligation.`
        : "No matches yet, but we'll expand the search. Try adjusting your budget or schedule.";

  return { candidates, overallAdvice };
}

export function buildHeuristicFallback(
  ranked: RankedCandidate[],
  lang: Language,
): SubmissionResult {
  if (!ranked.length) {
    return {
      matchScore: 72,
      recommendations:
        lang === 'ru'
          ? [
              'В базе пока нет нянь с точным совпадением',
              'Расширьте требования или бюджет для большего выбора',
              'Добавьте детали по графику и обязанностям',
            ]
          : [
              'No exact matches found in the current database',
              'Broaden requirements or budget to increase matches',
              'Add more details for schedule and responsibilities',
            ],
    };
  }

  const top = ranked[0];
  const score = Math.max(0, Math.min(98, top.score));

  return {
    matchScore: score,
    recommendations:
      lang === 'ru'
        ? [
            `Лучший текущий вариант: ${top.nanny.name || 'няня'} (${score}%)`,
            top.reasons[0] || 'Проверьте опыт по вашему возрасту ребёнка',
            'Проведите короткое пробное знакомство и сверку графика',
          ]
        : [
            `Best current match: ${top.nanny.name || 'nanny'} (${score}%)`,
            top.reasons[0] || 'Validate relevant childcare experience',
            'Run a short trial meeting and confirm schedule fit',
          ],
  };
}
