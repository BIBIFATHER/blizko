import type { NannyProfile } from '../types';
import { getQualityScore } from '@/services/qualityScore';
import { geoScore, budgetScore } from './geoAndBudget';
import { detectRiskFlags } from './riskEngine';
import type { MatchingWeights } from './matchingWeights';
import type { MatchingRequest, RankedCandidate } from './matchingAi.types';

function norm(v?: string): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => n && haystack.includes(n));
}

function dedupeCandidates(candidates: NannyProfile[]): NannyProfile[] {
  const seen = new Set<string>();
  return candidates.filter((nanny) => {
    if (seen.has(nanny.id)) return false;
    seen.add(nanny.id);
    return true;
  });
}

function getMaxScore(
  request: MatchingRequest,
  w: MatchingWeights,
  requirementCount: number,
  needCount: number,
) {
  const requirementMax = requirementCount ? Math.min(18, requirementCount * w.requirementMatch) : 0;
  const growthPossible = needCount ? Math.min(w.growthMax, needCount * w.growthPerNeed) : 0;
  const sharingPossible = request.isNannySharing ? w.nannySharing : 0;

  return Math.max(
    1,
    w.base +
      20 +
      15 +
      w.verification +
      w.childAge +
      w.schedule +
      requirementMax +
      w.mirrorMax +
      w.softSkillsMax +
      growthPossible +
      sharingPossible +
      w.qualityPremium,
  );
}

export function rankCandidates(
  request: MatchingRequest,
  candidates: NannyProfile[],
  w: MatchingWeights,
): RankedCandidate[] {
  const childAge = norm(request.childAge);
  const schedule = norm(request.schedule);
  const reqs = request.requirements.map(norm).filter(Boolean);

  const familyStyle = request.riskProfile?.familyStyle;
  const communicationPreference = request.riskProfile?.communicationPreference;
  const nannyStylePref = request.riskProfile?.nannyStylePreference;
  const childStress = request.riskProfile?.childStress;
  const needs = request.riskProfile?.needs || [];
  const parentPcm = request.riskProfile?.pcmType;
  const maxScore = getMaxScore(request, w, reqs.length, needs.length);

  return dedupeCandidates(candidates)
    .filter((nanny) => getQualityScore(nanny) >= 50)
    .filter((nanny) => !budgetScore(request.budget, nanny.expectedRate).exclude)
    .map((nanny) => {
      let rawScore = w.base;
      const reasons: string[] = [];
      const factors: Record<string, number> = {};

      const about = norm(nanny.about);
      const experience = norm(nanny.experience);
      const skills = (nanny.skills || []).map(norm).join(' ');
      const childAges = (nanny.childAges || []).map(norm).join(' ');
      const profileText = [about, experience, skills, childAges].join(' ');

      const geo = geoScore(
        request.district,
        request.metro,
        request.city,
        nanny.district,
        nanny.metro,
        nanny.city,
      );
      if (geo.score > 0) {
        rawScore += geo.score;
        factors.geo = geo.score;
        if (geo.reason) reasons.push(geo.reason);
      }

      const budget = budgetScore(request.budget, nanny.expectedRate);
      if (budget.score > 0) {
        rawScore += budget.score;
        factors.budget = budget.score;
        if (budget.reason) reasons.push(budget.reason);
      }

      if (nanny.isVerified) {
        rawScore += w.verification;
        factors.verification = w.verification;
        reasons.push('Профиль верифицирован');
      }

      if (childAge && (childAges.includes(childAge) || about.includes(childAge))) {
        rawScore += w.childAge;
        factors.childAge = w.childAge;
        reasons.push('Есть релевантный опыт по возрасту ребёнка');
      }

      if (schedule && includesAny(profileText, [schedule])) {
        rawScore += w.schedule;
        factors.schedule = w.schedule;
        reasons.push('Похожий график/доступность');
      }

      if (reqs.length) {
        const matchedReq = reqs.filter((requirement) => profileText.includes(requirement));
        if (matchedReq.length > 0) {
          const reqScore = Math.min(18, matchedReq.length * w.requirementMatch);
          rawScore += reqScore;
          factors.requirements = reqScore;
          reasons.push(`Совпали требования: ${matchedReq.slice(0, 2).join(', ')}`);
        }
      }

      const nannyBehavior = nanny.riskProfile || {};
      let mirrorScore = 0;
      let growthScore = 0;

      if (familyStyle && nannyBehavior.routineStyle) {
        if (familyStyle === 'structured' && nannyBehavior.routineStyle === 'structured')
          mirrorScore += w.familyStyleMatch;
        if (familyStyle === 'balanced' && nannyBehavior.routineStyle === 'balanced')
          mirrorScore += Math.round(w.familyStyleMatch * 0.8);
        if (familyStyle === 'warm' && nannyBehavior.disciplineStyle === 'gentle')
          mirrorScore += w.familyStyleMatch;
      }

      if (nannyStylePref && nannyBehavior.disciplineStyle) {
        if (nannyStylePref === 'gentle' && nannyBehavior.disciplineStyle === 'gentle')
          mirrorScore += w.disciplineMatch;
        if (nannyStylePref === 'strict' && nannyBehavior.disciplineStyle === 'strict')
          mirrorScore += w.disciplineMatch;
        if (nannyStylePref === 'playful' && (nannyBehavior.strengths || []).includes('Игра'))
          mirrorScore += w.disciplineMatch;
      }

      if (communicationPreference && nannyBehavior.communicationStyle) {
        if (communicationPreference === nannyBehavior.communicationStyle)
          mirrorScore += w.communicationMatch;
      }

      if (childStress && nannyBehavior.tantrumFirstStep) {
        if (['tantrum', 'cry'].includes(childStress) && nannyBehavior.tantrumFirstStep === 'calm')
          mirrorScore += w.stressResponseMatch;
        if (childStress === 'aggressive' && nannyBehavior.tantrumFirstStep === 'boundaries')
          mirrorScore += w.stressResponseMatch;
        if (childStress === 'withdraw' && nannyBehavior.tantrumFirstStep === 'distract')
          mirrorScore += Math.round(w.stressResponseMatch * 0.67);
      }

      const strengths = nannyBehavior.strengths || [];
      if (needs.length && strengths.length) {
        const matched = needs.filter((need) => strengths.includes(need));
        if (matched.length) {
          growthScore += Math.min(w.growthMax, matched.length * w.growthPerNeed);
          reasons.push(`Учитывает потребности семьи: ${matched.slice(0, 2).join(', ')}`);
        }
      }

      if (parentPcm && nannyBehavior.pcmType && parentPcm === nannyBehavior.pcmType) {
        mirrorScore += w.pcmMatch;
        reasons.push('Совпадение по стилю общения (PCM)');
      }

      if (mirrorScore > 0) {
        const cappedMirror = Math.min(w.mirrorMax, mirrorScore);
        rawScore += cappedMirror;
        factors.mirror = cappedMirror;
        reasons.push('Совпадение по стилю семьи');
      }

      if (nanny.softSkills?.rawScore) {
        const softSkillsScore = Math.min(
          w.softSkillsMax,
          Math.round(nanny.softSkills.rawScore / 20),
        );
        rawScore += softSkillsScore;
        factors.softSkills = softSkillsScore;
        reasons.push('Есть AI-оценка soft skills');
      }

      rawScore += growthScore;
      if (growthScore > 0) factors.growth = growthScore;

      if (request.isNannySharing && nanny.isNannySharing) {
        rawScore += w.nannySharing;
        factors.nannySharing = w.nannySharing;
        reasons.push('Готова к совместному шерингу няни');
      }

      const qualityScore = getQualityScore(nanny);
      if (qualityScore >= 85) {
        rawScore += w.qualityPremium;
        factors.quality = w.qualityPremium;
        reasons.push('Премиум-рейтинг качества');
      } else if (qualityScore >= 70) {
        rawScore += w.qualityGood;
        factors.quality = w.qualityGood;
      }

      const riskFlags = detectRiskFlags(request, nanny);
      const score = Math.max(0, Math.min(100, Math.round((rawScore / maxScore) * 100)));

      return { nanny, score, reasons, riskFlags, factors };
    })
    .sort((a, b) => b.score - a.score);
}
