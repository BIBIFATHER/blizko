import { describe, expect, it } from 'vitest';
import { explainCompatibility, buildFamilyCompatibilityProfile } from './model';
import type { NannyProfile, ParentRequest } from '@/core/types';

const parent: ParentRequest = {
  id: 'parent-compat-1',
  type: 'parent',
  status: 'new',
  city: 'Москва',
  district: 'Хамовники',
  metro: 'Фрунзенская',
  childAge: '3 года',
  schedule: 'частичная занятость',
  budget: 'до 1200 ₽/час',
  requirements: ['бережная адаптация'],
  comment: 'Ребенок тревожится при резкой смене взрослого.',
  createdAt: 1,
  riskProfile: {
    familyStyle: 'warm',
    nannyStylePreference: 'gentle',
    communicationPreference: 'frequent',
    childStress: 'cry',
    needs: ['бережная адаптация'],
  },
};

const nanny: NannyProfile = {
  id: 'nanny-compat-1',
  type: 'nanny',
  name: 'Мария Соколова',
  city: 'Москва',
  district: 'Хамовники',
  metro: 'Фрунзенская',
  experience: '8',
  schedule: 'частичная занятость',
  expectedRate: '1200 ₽/час',
  childAges: ['3 года'],
  skills: ['адаптация'],
  about: 'Спокойная няня',
  contact: '+7',
  isVerified: true,
  documents: [
    {
      type: 'passport',
      status: 'verified',
      aiConfidence: 96,
      aiNotes: 'OK',
      verifiedAt: 1,
    },
  ],
  softSkills: {
    method: 'rule_based_v1',
    rawScore: 86,
    dominantStyle: 'Empathetic',
    summary: 'Спокойный поддерживающий стиль',
    familySummary: 'Подходит семьям, которым важны мягкость и регулярная обратная связь.',
    moderationSummary: 'Сильный профиль для тревожной адаптации.',
    completedAt: 1,
    coverage: 1,
    confidenceReason: 'full_answers',
    answeredItems: 8,
    totalItems: 8,
    traits: { empathy: 91, stability: 84, responsibility: 88, structure: 72 },
    signals: [],
  },
  riskProfile: {
    tantrumFirstStep: 'calm',
    routineStyle: 'balanced',
    disciplineStyle: 'gentle',
    communicationStyle: 'frequent',
    strengths: ['бережная адаптация'],
  },
  createdAt: 1,
};

describe('compatibility model v0', () => {
  it('builds a family compatibility profile from existing parent payload signals', () => {
    const profile = buildFamilyCompatibilityProfile(parent, 10);

    expect(profile.requestId).toBe(parent.id);
    expect(profile.locationSignals).toContain('Москва');
    expect(profile.communicationNeeds).toContain('frequent');
    expect(profile.explicitNeeds).toContain('бережная адаптация');
    expect(profile.generatedAt).toBe(10);
  });

  it('explains why a nanny fits without exposing a hard percent or diagnostic label', () => {
    const explanation = explainCompatibility(parent, nanny, 10);
    const text = [explanation.levelLabel, explanation.familySummary, explanation.curatorSummary].join(
      ' ',
    );

    expect(explanation.level).toBe('strong');
    expect(explanation.reasons.map((reason) => reason.title)).toEqual(
      expect.arrayContaining([
        'Близкая локация',
        'Опыт с возрастом ребёнка',
        'Совпадает формат связи',
        'Похожий подход к границам',
        'Попали в важные потребности семьи',
      ]),
    );
    expect(text).not.toMatch(/\d+%/);
    expect(text.toLowerCase()).not.toContain('диагноз');
  });

  it('keeps critical mismatches as curator-visible review items', () => {
    const strictNanny: NannyProfile = {
      ...nanny,
      id: 'nanny-strict',
      riskProfile: {
        ...nanny.riskProfile,
        disciplineStyle: 'strict',
      },
    };

    const explanation = explainCompatibility(parent, strictNanny, 10);

    expect(explanation.level).toBe('needs_review');
    expect(explanation.riskFlags.map((flag) => flag.code)).toContain('discipline_conflict');
    expect(
      explanation.reasons.some(
        (reason) => reason.kind === 'watchout' && reason.visibility === 'curator',
      ),
    ).toBe(true);
  });
});
