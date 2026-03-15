import { describe, expect, it } from 'vitest';
import { detectRiskFlags } from './riskEngine';

describe('detectRiskFlags', () => {
  it('returns a critical discipline mismatch flag', () => {
    const flags = detectRiskFlags(
      {
        city: 'Москва',
        childAge: '3 года',
        schedule: '5/2',
        budget: '1500 ₽/час',
        requirements: [],
        comment: '',
        riskProfile: {
          nannyStylePreference: 'gentle',
          communicationPreference: 'frequent',
        },
      } as any,
      {
        id: 'nanny-1',
        name: 'Анна',
        type: 'nanny',
        createdAt: Date.now(),
        riskProfile: {
          disciplineStyle: 'strict',
          communicationStyle: 'minimal',
        },
      } as any
    );

    expect(flags.map((flag) => flag.factor)).toContain('discipline_conflict');
    expect(flags.some((flag) => flag.level === 'critical')).toBe(true);
  });

  it('flags missing medical book for infant care', () => {
    const flags = detectRiskFlags(
      {
        city: 'Москва',
        childAge: 'до 1 года',
        schedule: '5/2',
        budget: '1500 ₽/час',
        requirements: [],
        comment: '',
        riskProfile: {},
      } as any,
      {
        id: 'nanny-2',
        name: 'Мария',
        type: 'nanny',
        createdAt: Date.now(),
        childAges: ['1-3 года'],
        documents: [],
        riskProfile: {},
      } as any
    );

    expect(flags.map((flag) => flag.factor)).toContain('no_medical_book');
    expect(flags.map((flag) => flag.factor)).toContain('infant_experience');
  });
});
