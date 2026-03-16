import { describe, expect, it } from 'vitest';
import { buildRuleBasedAssessment } from '../services/assessment';
import { calculateQualityScore } from '../services/qualityScore';
import type { NannyProfile } from '../types';

describe('buildRuleBasedAssessment', () => {
  it('produces a rule-based profile with explainable signals', () => {
    const result = buildRuleBasedAssessment({
      l1: '4',
      l2: '5',
      l3: '5',
      l4: '4',
      l5: '4',
      l6: '4',
      l7: '5',
      l8: '4',
      l9: '4',
      l10: '5',
      s1: 'a',
      s2: 'b',
      s3: 'a',
      t1: 'После сложного дня иду гулять и восстанавливаю ресурс в тишине.',
      t2: 'Моя суперсила — спокойствие и мягкая деэскалация.',
    }, 'ru');

    expect(result.method).toBe('rule_based_v1');
    expect(result.coverage).toBe(1);
    expect(result.confidenceReason).toBe('full_answers');
    expect(result.signals.map((signal) => signal.signal)).toContain('calm_deescalation');
    expect(result.signals.map((signal) => signal.signal)).toContain('transparent_reporting');
    expect(result.familySummary).toContain('По ответам анкеты');
  });

  it('marks partial coverage when not all questions are answered', () => {
    const result = buildRuleBasedAssessment({
      l3: '5',
      s2: 'b',
      t1: 'Люблю восстанавливаться через сон.',
      t2: 'Сильная сторона — прозрачность с родителями.',
    }, 'ru');

    expect(result.coverage).toBeLessThan(1);
    expect(result.confidenceReason).toBe('partial_answers');
    expect(result.signals.some((signal) => signal.signal === 'transparent_reporting')).toBe(true);
  });
});

describe('calculateQualityScore', () => {
  it('discounts soft-skills bonus when assessment coverage is partial', () => {
    const nanny: NannyProfile = {
      id: 'n1',
      type: 'nanny',
      name: 'Анна',
      city: 'Москва',
      experience: '5 лет',
      childAges: ['1-3'],
      skills: ['Игры'],
      about: 'Опытная няня с мягким стилем работы и понятной коммуникацией.',
      contact: '+79999999999',
      isVerified: false,
      createdAt: Date.now(),
      softSkills: {
        method: 'rule_based_v1',
        rawScore: 100,
        dominantStyle: 'Balanced',
        summary: 'summary',
        familySummary: 'family',
        moderationSummary: 'moderation',
        completedAt: Date.now(),
        coverage: 0.5,
        confidenceReason: 'partial_answers',
        answeredItems: 7,
        totalItems: 14,
        traits: {
          empathy: 80,
          stability: 80,
          responsibility: 80,
          structure: 80,
        },
        signals: [],
      },
    };

    expect(calculateQualityScore(nanny).softSkills).toBe(10);
  });
});
