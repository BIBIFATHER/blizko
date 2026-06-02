import type { NannyProfile, ParentRequest } from '@/core/types';
import { detectRiskFlags } from '@/core/ai/riskEngine';

export type CompatibilityVisibility = 'family' | 'curator' | 'internal';
export type CompatibilitySource =
  | 'family_profile'
  | 'nanny_profile'
  | 'documents'
  | 'soft_skills'
  | 'risk_engine'
  | 'curator';

export interface FamilyCompatibilityProfile {
  source: 'family';
  requestId: string;
  locationSignals: string[];
  careContext: string[];
  communicationNeeds: string[];
  childStressSignals: string[];
  stylePreferences: string[];
  explicitNeeds: string[];
  generatedAt: number;
}

export interface NannyCompatibilityProfile {
  source: 'nanny';
  nannyId: string;
  locationSignals: string[];
  careStrengths: string[];
  communicationStyle?: string;
  childStressApproach?: string;
  workStyleSignals: string[];
  trustSignals: string[];
  watchSignals: string[];
  generatedAt: number;
}

export interface CompatibilityReason {
  id: string;
  kind: 'match' | 'watchout' | 'discussion';
  title: string;
  familyText: string;
  curatorText: string;
  evidence: string[];
  source: CompatibilitySource;
  visibility: CompatibilityVisibility;
}

export interface RiskFlag {
  level: 'watch' | 'critical';
  code: string;
  title: string;
  familyText?: string;
  curatorText: string;
  advice?: string;
  source: 'risk_engine';
}

export interface CuratorNote {
  id: string;
  pairId: string;
  authorId?: string;
  text: string;
  reasonIds?: string[];
  createdAt: number;
  visibility: 'curator_only' | 'family_safe';
}

export type CompatibilityLevel = 'strong' | 'partial' | 'needs_review' | 'low_signal';

export interface CompatibilityExplanation {
  familyProfile: FamilyCompatibilityProfile;
  nannyProfile: NannyCompatibilityProfile;
  level: CompatibilityLevel;
  levelLabel: string;
  reasons: CompatibilityReason[];
  riskFlags: RiskFlag[];
  curatorSummary: string;
  familySummary: string;
  nextQuestions: string[];
}

function norm(value?: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function present(values: Array<string | undefined | null>) {
  return values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
}

function hasOverlap(left: string[], right: string[]) {
  const normalizedRight = right.map(norm).filter(Boolean);
  return left.some((item) => {
    const n = norm(item);
    return normalizedRight.some((candidate) => n.includes(candidate) || candidate.includes(n));
  });
}

function pairId(parent: ParentRequest, nanny: NannyProfile) {
  return `${parent.id}:${nanny.id}`;
}

function reason(
  id: string,
  kind: CompatibilityReason['kind'],
  title: string,
  familyText: string,
  curatorText: string,
  evidence: string[],
  source: CompatibilitySource,
  visibility: CompatibilityVisibility = 'family',
): CompatibilityReason {
  return { id, kind, title, familyText, curatorText, evidence, source, visibility };
}

export function buildFamilyCompatibilityProfile(
  parent: ParentRequest,
  generatedAt = Date.now(),
): FamilyCompatibilityProfile {
  const risk = parent.riskProfile;
  return {
    source: 'family',
    requestId: parent.id,
    locationSignals: present([parent.city, parent.district, parent.metro]),
    careContext: present([parent.childAge, parent.schedule, parent.budget, parent.comment]),
    communicationNeeds: present([risk?.communicationPreference, risk?.reportingFrequency]),
    childStressSignals: present([risk?.childStress, ...(risk?.triggers || [])]),
    stylePreferences: present([risk?.familyStyle, risk?.priorityStyle, risk?.nannyStylePreference]),
    explicitNeeds: present([...(parent.requirements || []), ...(risk?.needs || [])]),
    generatedAt,
  };
}

export function buildNannyCompatibilityProfile(
  nanny: NannyProfile,
  generatedAt = Date.now(),
): NannyCompatibilityProfile {
  const verifiedDocs = (nanny.documents || []).filter((doc) => doc.status === 'verified');
  const pendingDocs = (nanny.documents || []).filter((doc) => doc.status === 'pending');
  const rejectedDocs = (nanny.documents || []).filter((doc) => doc.status === 'rejected');

  return {
    source: 'nanny',
    nannyId: nanny.id,
    locationSignals: present([nanny.city, nanny.district, nanny.metro]),
    careStrengths: present([
      ...(nanny.skills || []),
      ...(nanny.riskProfile?.strengths || []),
      nanny.softSkills?.familySummary,
    ]),
    communicationStyle: nanny.riskProfile?.communicationStyle,
    childStressApproach: nanny.riskProfile?.tantrumFirstStep,
    workStyleSignals: present([
      nanny.schedule,
      nanny.riskProfile?.routineStyle,
      nanny.riskProfile?.disciplineStyle,
      nanny.softSkills?.dominantStyle,
    ]),
    trustSignals: present([
      nanny.isVerified ? 'identity_verified' : undefined,
      verifiedDocs.length ? 'documents_verified' : undefined,
      nanny.reviews?.length ? 'real_reviews' : undefined,
      nanny.softSkills ? 'behavior_profile_ready' : undefined,
    ]),
    watchSignals: present([
      pendingDocs.length ? 'documents_pending' : undefined,
      rejectedDocs.length ? 'documents_rejected' : undefined,
      nanny.riskProfile?.notBestAt,
    ]),
    generatedAt,
  };
}

function toCompatibilityRiskFlags(parent: ParentRequest, nanny: NannyProfile): RiskFlag[] {
  return detectRiskFlags(parent, nanny).map((flag) => ({
    level: flag.level === 'critical' ? 'critical' : 'watch',
    code: flag.factor,
    title: flag.message,
    familyText: flag.level === 'critical' ? undefined : flag.message,
    curatorText: flag.message,
    advice: flag.advice,
    source: 'risk_engine',
  }));
}

function levelFrom(reasonCount: number, riskFlags: RiskFlag[]): CompatibilityLevel {
  if (riskFlags.some((flag) => flag.level === 'critical')) return 'needs_review';
  if (reasonCount >= 5) return 'strong';
  if (reasonCount >= 2) return 'partial';
  return 'low_signal';
}

export function compatibilityLevelLabel(level: CompatibilityLevel) {
  if (level === 'strong') return 'Сильное совпадение';
  if (level === 'partial') return 'Частичное совпадение';
  if (level === 'needs_review') return 'Нужно обсудить риски';
  return 'Мало сигналов';
}

export function explainCompatibility(
  parent: ParentRequest,
  nanny: NannyProfile,
  generatedAt = Date.now(),
): CompatibilityExplanation {
  const familyProfile = buildFamilyCompatibilityProfile(parent, generatedAt);
  const nannyProfile = buildNannyCompatibilityProfile(nanny, generatedAt);
  const reasons: CompatibilityReason[] = [];
  const risks = toCompatibilityRiskFlags(parent, nanny);
  const pair = pairId(parent, nanny);

  if (hasOverlap(familyProfile.locationSignals, nannyProfile.locationSignals)) {
    reasons.push(
      reason(
        `${pair}:location`,
        'match',
        'Близкая локация',
        'Няня работает рядом с вашей семьёй.',
        'Локация снижает риск опозданий и упрощает первый выход.',
        [...familyProfile.locationSignals, ...nannyProfile.locationSignals],
        'nanny_profile',
      ),
    );
  }

  if (hasOverlap([parent.childAge], nanny.childAges || [])) {
    reasons.push(
      reason(
        `${pair}:child-age`,
        'match',
        'Опыт с возрастом ребёнка',
        'У няни есть опыт с похожим возрастом.',
        'Возраст ребёнка совпадает с заявленным опытом няни.',
        [parent.childAge, ...(nanny.childAges || [])],
        'nanny_profile',
      ),
    );
  }

  if (parent.riskProfile?.communicationPreference && nanny.riskProfile?.communicationStyle) {
    if (parent.riskProfile.communicationPreference === nanny.riskProfile.communicationStyle) {
      reasons.push(
        reason(
          `${pair}:communication`,
          'match',
          'Совпадает формат связи',
          'Няня привыкла к похожему формату обратной связи.',
          'Коммуникационные ожидания семьи совпадают со стилем няни.',
          [parent.riskProfile.communicationPreference, nanny.riskProfile.communicationStyle],
          'family_profile',
        ),
      );
    }
  }

  if (parent.riskProfile?.nannyStylePreference && nanny.riskProfile?.disciplineStyle) {
    const gentleMatch =
      parent.riskProfile.nannyStylePreference === 'gentle' &&
      nanny.riskProfile.disciplineStyle === 'gentle';
    const strictMatch =
      parent.riskProfile.nannyStylePreference === 'strict' &&
      nanny.riskProfile.disciplineStyle === 'strict';
    if (gentleMatch || strictMatch) {
      reasons.push(
        reason(
          `${pair}:care-style`,
          'match',
          'Похожий подход к границам',
          'Подход няни близок к ожиданиям семьи.',
          'Стиль дисциплины няни совпадает с предпочтением семьи.',
          [parent.riskProfile.nannyStylePreference, nanny.riskProfile.disciplineStyle],
          'family_profile',
        ),
      );
    }
  }

  if (parent.riskProfile?.needs?.length && nanny.riskProfile?.strengths?.length) {
    const matched = parent.riskProfile.needs.filter((need) =>
      nanny.riskProfile?.strengths?.some((strength) => norm(strength) === norm(need)),
    );
    if (matched.length) {
      reasons.push(
        reason(
          `${pair}:needs`,
          'match',
          'Попали в важные потребности семьи',
          'У няни есть сильные стороны, которые важны именно вашей семье.',
          `Совпали потребности: ${matched.join(', ')}`,
          matched,
          'family_profile',
        ),
      );
    }
  }

  if (nanny.isVerified || nannyProfile.trustSignals.length > 0) {
    reasons.push(
      reason(
        `${pair}:trust`,
        'match',
        'Есть сигналы доверия',
        'Профиль няни уже содержит проверенные сигналы.',
        'В подборе есть подтверждённые trust-сигналы: документы, отзывы или поведенческий профиль.',
        nannyProfile.trustSignals,
        'documents',
      ),
    );
  }

  if (nanny.softSkills?.familySummary || nanny.softSkills?.moderationSummary) {
    reasons.push(
      reason(
        `${pair}:behavior`,
        'discussion',
        'Понятен стиль общения',
        nanny.softSkills.familySummary || 'Стиль общения няни уже описан.',
        nanny.softSkills.moderationSummary || nanny.softSkills.summary,
        [nanny.softSkills.dominantStyle, String(nanny.softSkills.coverage)],
        'soft_skills',
      ),
    );
  }

  for (const risk of risks) {
    reasons.push(
      reason(
        `${pair}:risk:${risk.code}`,
        risk.level === 'critical' ? 'watchout' : 'discussion',
        risk.level === 'critical' ? 'Нужно проверить до встречи' : 'Что обсудить до встречи',
        risk.familyText || 'Куратор проверит этот момент до встречи.',
        risk.curatorText,
        present([risk.code, risk.advice]),
        'risk_engine',
        risk.level === 'critical' ? 'curator' : 'family',
      ),
    );
  }

  const level = levelFrom(
    reasons.filter((item) => item.kind === 'match').length,
    risks,
  );
  const familyReasons = reasons.filter((item) => item.visibility === 'family');
  const nextQuestions = reasons
    .filter((item) => item.kind !== 'match')
    .map((item) => item.familyText)
    .slice(0, 3);

  return {
    familyProfile,
    nannyProfile,
    level,
    levelLabel: compatibilityLevelLabel(level),
    reasons,
    riskFlags: risks,
    curatorSummary:
      reasons.length > 0
        ? reasons
            .slice(0, 4)
            .map((item) => item.curatorText)
            .join(' ')
        : 'Недостаточно сигналов: куратору нужно уточнить детали семьи и няни.',
    familySummary:
      familyReasons.length > 0
        ? familyReasons
            .slice(0, 3)
            .map((item) => item.familyText)
            .join(' ')
        : 'Куратор уточнит детали и подберёт спокойный вариант для знакомства.',
    nextQuestions:
      nextQuestions.length > 0
        ? nextQuestions
        : ['Обсудить формат первого выхода и ожидания по обратной связи.'],
  };
}
