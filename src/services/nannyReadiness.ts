import { DocumentVerification, Language, NannyProfile, NormalizedResume } from '@/core/types';
import { getQualityScore } from './qualityScore';

export type NannyQualityStage =
  | 'lead'
  | 'profile_started'
  | 'docs_uploaded'
  | 'resume_parsed'
  | 'ready_for_review'
  | 'quality_approved';

export type NannyReadinessInput = Partial<
  Pick<
    NannyProfile,
    | 'id'
    | 'name'
    | 'city'
    | 'experience'
    | 'schedule'
    | 'expectedRate'
    | 'about'
    | 'contact'
    | 'isVerified'
    | 'childAges'
    | 'skills'
    | 'riskProfile'
    | 'documents'
    | 'resumeNormalized'
    | 'reviews'
    | 'softSkills'
  >
> & {
  documents?: DocumentVerification[];
  resumeNormalized?: NormalizedResume;
};

export interface NannyReadinessSnapshot {
  stage: NannyQualityStage;
  qualityScore: number;
  readyForReview: boolean;
  qualityApproved: boolean;
  hasResume: boolean;
  hasTrustDocs: boolean;
  hasVerifiedTrust: boolean;
  completionRatio: number;
  missingFields: string[];
}

function buildProfileForScoring(input: NannyReadinessInput): NannyProfile {
  return {
    id: input.id || 'draft',
    type: 'nanny',
    name: input.name || '',
    city: input.city || '',
    experience: input.experience || '',
    schedule: input.schedule || '',
    expectedRate: input.expectedRate || '',
    childAges: input.childAges || [],
    skills: input.skills || [],
    about: input.about || '',
    contact: input.contact || '',
    isVerified: Boolean(input.isVerified),
    documents: input.documents || [],
    reviews: input.reviews || [],
    softSkills: input.softSkills,
    resumeNormalized: input.resumeNormalized,
    riskProfile: input.riskProfile,
    createdAt: Date.now(),
  };
}

function getMissingFields(input: NannyReadinessInput, hasResume: boolean, hasTrustDocs: boolean, hasVerifiedTrust: boolean): string[] {
  const missing: string[] = [];

  if (!input.name) missing.push('имя');
  if (!input.city) missing.push('город');
  if (!input.contact) missing.push('контакт');
  if (!input.experience) missing.push('опыт');
  if (!input.schedule) missing.push('график');
  if (!input.expectedRate) missing.push('ставка');
  if (!input.about) missing.push('о себе');
  if (!input.childAges || input.childAges.length === 0) missing.push('возраст детей');
  if (!hasResume) missing.push('резюме');
  if (!hasTrustDocs) missing.push('документы доверия');
  if (!hasVerifiedTrust) missing.push('проверка/верификация');

  return missing;
}

export function getNannyReadinessSnapshot(input: NannyReadinessInput): NannyReadinessSnapshot {
  const docs = input.documents || [];
  const hasResume = docs.some((doc) => doc.type === 'resume' && !!doc.fileDataUrl) || Boolean(input.resumeNormalized);
  const hasTrustDocs = docs.some((doc) => doc.type !== 'resume' && !!doc.fileDataUrl);
  const hasVerifiedTrust = Boolean(input.isVerified) || docs.some((doc) => doc.status === 'verified');
  const missingFields = getMissingFields(input, hasResume, hasTrustDocs, hasVerifiedTrust);

  const profile = buildProfileForScoring(input);
  const qualityScore = getQualityScore(profile);

  const coreReady = missingFields.filter((field) => !['резюме', 'документы доверия', 'проверка/верификация'].includes(field)).length === 0;
  const readyForReview = coreReady && hasResume && hasTrustDocs;
  const qualityApproved = readyForReview && hasVerifiedTrust && qualityScore >= 70;

  let stage: NannyQualityStage = 'lead';
  if (qualityApproved) {
    stage = 'quality_approved';
  } else if (readyForReview) {
    stage = 'ready_for_review';
  } else if (hasResume) {
    stage = 'resume_parsed';
  } else if (docs.length > 0) {
    stage = 'docs_uploaded';
  } else if (profile.name || profile.city || profile.contact || profile.about) {
    stage = 'profile_started';
  }

  const totalChecks = 11;
  const completionRatio = Math.round(((totalChecks - missingFields.length) / totalChecks) * 100);

  return {
    stage,
    qualityScore,
    readyForReview,
    qualityApproved,
    hasResume,
    hasTrustDocs,
    hasVerifiedTrust,
    completionRatio: Math.max(0, Math.min(100, completionRatio)),
    missingFields,
  };
}

export function getNannyReadinessLabel(snapshot: NannyReadinessSnapshot, lang: Language): string {
  const labels: Record<NannyQualityStage, { ru: string; en: string }> = {
    lead: { ru: 'Лид', en: 'Lead' },
    profile_started: { ru: 'Анкета начата', en: 'Profile started' },
    docs_uploaded: { ru: 'Документы загружены', en: 'Docs uploaded' },
    resume_parsed: { ru: 'Резюме распознано', en: 'Resume parsed' },
    ready_for_review: { ru: 'Готова к ручной проверке', en: 'Ready for review' },
    quality_approved: { ru: 'Готова к показу семье', en: 'Ready for match' },
  };

  return labels[snapshot.stage][lang];
}

export function getNannySuccessRecommendations(snapshot: NannyReadinessSnapshot, lang: Language): string[] {
  if (snapshot.qualityApproved) {
    return lang === 'ru'
      ? ['Профиль готов к показу семьям', 'Поддерживайте календарь и контакты актуальными', 'Добавьте видеовизитку для более тёплого первого впечатления']
      : ['Profile is ready to be shown to families', 'Keep availability and contact details up to date', 'Add a video intro for a warmer first impression'];
  }

  const recsRu: string[] = [];
  const recsEn: string[] = [];

  if (!snapshot.hasResume) {
    recsRu.push('Загрузите резюме, чтобы ускорить модерацию');
    recsEn.push('Upload a resume to speed up moderation');
  }
  if (!snapshot.hasTrustDocs) {
    recsRu.push('Добавьте паспорт или рекомендательное письмо');
    recsEn.push('Add a passport or a recommendation letter');
  }
  if (!snapshot.hasVerifiedTrust) {
    recsRu.push('Пройдите верификацию или дождитесь проверки документов');
    recsEn.push('Complete verification or wait for document review');
  }
  if (snapshot.qualityScore < 70) {
    recsRu.push('Заполните профиль подробнее: опыт, график, о себе');
    recsEn.push('Complete your profile: experience, schedule, about');
  }

  return lang === 'ru' ? recsRu : recsEn;
}
