import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchingRequest, RankedCandidate } from './matchingAi.types';

const { aiText } = vi.hoisted(() => ({
  aiText: vi.fn(),
}));

vi.mock('./aiGateway', () => ({
  aiText,
}));

import { buildHeuristicFallback, buildMatchResult } from './matchingAiResult';

function createRequest(overrides: Partial<MatchingRequest> = {}): MatchingRequest {
  return {
    city: 'Москва',
    district: 'Хамовники',
    metro: 'Парк Культуры',
    childAge: '3 года',
    schedule: '5/2',
    budget: '1500 ₽/час',
    requirements: ['английский'],
    comment: 'Ищем няню',
    riskProfile: {},
    ...overrides,
  };
}

function createRankedCandidate(
  id: string,
  score: number,
  overrides: Partial<RankedCandidate> = {},
): RankedCandidate {
  return {
    nanny: {
      id,
      type: 'nanny',
      name: `Nanny ${id}`,
      city: 'Москва',
      district: 'Хамовники',
      metro: 'Парк Культуры',
      experience: '5 лет',
      childAges: ['3 года'],
      skills: ['английский', 'игры'],
      about: 'Спокойная и тёплая няня',
      contact: '+77001234567',
      isVerified: true,
      createdAt: Date.now(),
      softSkills: {
        method: 'rule_based_v1',
        rawScore: 90,
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
      documents: [
        {
          type: 'medical_book',
          status: 'verified',
          aiConfidence: 95,
          aiNotes: 'ok',
          verifiedAt: Date.now(),
        },
      ],
      reviews: [
        {
          id: `review-${id}`,
          authorName: 'Parent',
          rating: 5,
          text: 'great',
          date: Date.now(),
        },
      ],
    },
    score,
    reasons: ['Есть релевантный опыт'],
    riskFlags: [],
    factors: { quality: 10 },
    ...overrides,
  };
}

describe('buildMatchResult', () => {
  beforeEach(() => {
    aiText.mockReset();
  });

  it('caps output to top three eligible candidates and builds trust badges', async () => {
    aiText.mockResolvedValue('Очень тёплое объяснение для семьи.');

    const ranked = [
      createRankedCandidate('n1', 99),
      createRankedCandidate('n2', 85),
      createRankedCandidate('n3', 74),
      createRankedCandidate('n4', 65),
      createRankedCandidate('n5', 32),
    ];

    const result = await buildMatchResult(ranked, createRequest(), 'ru');

    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0].score).toBe(98);
    expect(result.candidates[0].trustBadges).toEqual([
      'verified_docs',
      'verified_moderation',
      'soft_skills',
      'has_reviews',
    ]);
    expect(result.candidates[0].trustBadges).not.toContain('ai_checked');
    expect(result.overallAdvice).toContain('3 няни');
  });

  it('falls back to deterministic explanation when ai result is unusable', async () => {
    aiText.mockResolvedValue('short');

    const candidate = createRankedCandidate('n1', 88, {
      nanny: {
        ...createRankedCandidate('n1', 88).nanny,
        name: 'Анна',
        district: 'Хамовники',
        skills: ['английский', 'творчество'],
      },
      riskFlags: [
        {
          level: 'warning',
          factor: 'communication_gap',
          message: 'Нужно обсудить отчёты',
          advice: 'Согласуйте частоту сообщений',
        },
      ],
    });

    const result = await buildMatchResult([candidate], createRequest(), 'ru');

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].humanExplanation).toContain('Анна');
    expect(result.candidates[0].humanExplanation).toContain('работает рядом');
    expect(result.candidates[0].riskFlags).toEqual([
      {
        level: 'warning',
        message: 'Нужно обсудить отчёты',
        advice: 'Согласуйте частоту сообщений',
      },
    ]);
  });
});

describe('buildHeuristicFallback', () => {
  it('returns generic recommendations when there are no ranked candidates', () => {
    expect(buildHeuristicFallback([], 'en')).toEqual({
      matchScore: 72,
      recommendations: [
        'No exact matches found in the current database',
        'Broaden requirements or budget to increase matches',
        'Add more details for schedule and responsibilities',
      ],
    });
  });

  it('uses the top ranked candidate for fallback recommendations', () => {
    const result = buildHeuristicFallback([createRankedCandidate('n1', 88)], 'ru');

    expect(result).toEqual({
      matchScore: 88,
      recommendations: [
        'Лучший текущий вариант: Nanny n1 (88%)',
        'Есть релевантный опыт',
        'Проведите короткое пробное знакомство и сверку графика',
      ],
    });
  });
});
