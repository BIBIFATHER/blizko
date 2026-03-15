import { describe, expect, it } from 'vitest';
import { budgetScore, geoScore } from './geoAndBudget';

describe('geoScore', () => {
  it('returns strong score for exact district match', () => {
    expect(geoScore('Хамовники', undefined, 'Москва', 'Хамовники', undefined, 'Москва')).toEqual({
      score: 20,
      reason: 'Один район',
    });
  });

  it('falls back to same-city score when district and metro are absent', () => {
    expect(geoScore(undefined, undefined, 'Москва', undefined, undefined, 'Москва')).toEqual({
      score: 5,
      reason: 'Один город',
    });
  });
});

describe('budgetScore', () => {
  it('excludes candidates whose rate is more than 2x the budget', () => {
    expect(budgetScore('1500 ₽/час', '4000 ₽/час')).toEqual({
      score: 0,
      reason: null,
      exclude: true,
    });
  });

  it('rewards close budget fit', () => {
    expect(budgetScore('1500 ₽/час', '1600 ₽/час')).toMatchObject({
      score: 15,
      reason: 'Ставка точно в бюджете',
    });
  });
});
