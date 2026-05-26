import { describe, expect, it } from 'vitest';
import type { MatchingRequest } from './matchingAi.types';
import type { NannyProfile } from '../types';
import { getDefaultWeights } from './matchingWeights';
import { rankCandidates } from './matchingAiRanking';

function createRequest(overrides: Partial<MatchingRequest> = {}): MatchingRequest {
  return {
    city: 'Москва',
    district: 'Хамовники',
    metro: 'Парк Культуры',
    childAge: '3 года',
    schedule: '5/2',
    budget: '1500 ₽/час',
    requirements: ['мягкий подход', 'английский'],
    comment: 'Ищем спокойную няню на будни',
    riskProfile: {
      familyStyle: 'structured',
      communicationPreference: 'frequent',
      nannyStylePreference: 'gentle',
      childStress: 'cry',
      needs: ['Игра'],
      pcmType: 'harmonizer',
    },
    ...overrides,
  };
}

function createNanny(id: string, overrides: Partial<NannyProfile> = {}): NannyProfile {
  return {
    id,
    type: 'nanny',
    name: `Nanny ${id}`,
    city: 'Москва',
    district: 'Хамовники',
    metro: 'Парк Культуры',
    experience: '5 лет с детьми 2-6 лет',
    schedule: '5/2',
    expectedRate: '1500 ₽/час',
    childAges: ['3 года', '4 года'],
    skills: ['английский', 'творчество'],
    about: 'мягкий подход, структурированный режим, люблю игру и прогулки',
    contact: '+77001234567',
    isVerified: true,
    createdAt: Date.now(),
    softSkills: {
      method: 'rule_based_v1',
      rawScore: 92,
      dominantStyle: 'Empathetic',
      summary: 'summary',
      familySummary: 'familySummary',
      moderationSummary: 'moderationSummary',
      completedAt: Date.now(),
      coverage: 1,
      confidenceReason: 'full_answers',
      answeredItems: 10,
      totalItems: 10,
      traits: {
        empathy: 1,
        stability: 1,
        responsibility: 1,
        structure: 1,
      },
      signals: [],
    },
    riskProfile: {
      routineStyle: 'structured',
      disciplineStyle: 'gentle',
      communicationStyle: 'frequent',
      tantrumFirstStep: 'calm',
      strengths: ['Игра'],
      pcmType: 'harmonizer',
    },
    documents: [
      {
        type: 'medical_book',
        status: 'verified',
        aiConfidence: 90,
        aiNotes: 'ok',
        verifiedAt: Date.now(),
      },
    ],
    reviews: [{ id: 'r1', authorName: 'Parent', rating: 5, text: 'great', date: Date.now() }],
    isNannySharing: true,
    ...overrides,
  };
}

describe('rankCandidates', () => {
  it('deduplicates candidates and ranks the stronger fit first', () => {
    const request = createRequest({ isNannySharing: true });
    const strong = createNanny('nanny-1');
    const duplicate = createNanny('nanny-1', { name: 'Duplicate' });
    const weaker = createNanny('nanny-2', {
      district: 'Тверской',
      metro: 'Белорусская',
      expectedRate: '2200 ₽/час',
      about: 'спокойная няня, люблю прогулки и творчество',
      skills: ['рисование', 'прогулки'],
      childAges: ['7 лет'],
      softSkills: {
        ...createNanny('template').softSkills!,
        rawScore: 65,
        dominantStyle: 'Balanced',
      },
      riskProfile: {
        routineStyle: 'adaptive',
        disciplineStyle: 'strict',
        communicationStyle: 'minimal',
      },
      isNannySharing: false,
    });

    const ranked = rankCandidates(request, [weaker, strong, duplicate], getDefaultWeights());

    expect(ranked).toHaveLength(2);
    expect(ranked[0].nanny.id).toBe('nanny-1');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[0].reasons).toContain('Профиль верифицирован');
    expect(ranked[0].factors.nannySharing).toBeGreaterThan(0);
  });

  it('filters out low-quality and over-budget candidates before ranking', () => {
    const request = createRequest();
    const lowQuality = createNanny('low-quality', {
      isVerified: false,
      documents: [],
      reviews: [],
      softSkills: undefined,
      about: 'няня',
      experience: '1 год',
      skills: [],
      childAges: [],
      contact: '',
      riskProfile: undefined,
    });
    const tooExpensive = createNanny('too-expensive', {
      expectedRate: '4000 ₽/час',
    });
    const valid = createNanny('valid');

    const ranked = rankCandidates(request, [lowQuality, tooExpensive, valid], getDefaultWeights());

    expect(ranked.map((candidate) => candidate.nanny.id)).toEqual(['valid']);
  });
});
