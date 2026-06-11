import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

import {
  POSITIVE_OUTCOMES,
  NEGATIVE_OUTCOMES,
  LABELLED_OUTCOMES,
  COUNT_LABELLED_SQL,
  FACTOR_STATS_SQL,
} from './_update-matching-weights';

// The single source of truth: production enum `matching_outcome_type` labels.
const VALID_ENUM = ['hired', 'rejected', 'ghosted'] as const;

describe('matching-weights outcome classes', () => {
  it('positive = hired, negative = rejected/ghosted', () => {
    expect([...POSITIVE_OUTCOMES]).toEqual(['hired']);
    expect([...NEGATIVE_OUTCOMES]).toEqual(['rejected', 'ghosted']);
    expect([...LABELLED_OUTCOMES]).toEqual(['hired', 'rejected', 'ghosted']);
  });

  it('every labelled outcome is a valid enum value (no invalid literal)', () => {
    for (const o of LABELLED_OUTCOMES) {
      expect(VALID_ENUM).toContain(o);
    }
  });

  it("never references the non-existent 'interested' enum value", () => {
    expect([...LABELLED_OUTCOMES]).not.toContain('interested');
    expect(COUNT_LABELLED_SQL).not.toMatch(/interested/);
    expect(FACTOR_STATS_SQL).not.toMatch(/interested/);
  });
});

describe('matching-weights SQL against a real enum schema (PGlite)', () => {
  async function seed() {
    const db = await PGlite.create();
    await db.exec(`
      CREATE TYPE matching_outcome_type AS ENUM ('hired', 'rejected', 'ghosted');
      CREATE TABLE matching_outcomes (
        id serial PRIMARY KEY,
        outcome matching_outcome_type,
        factors jsonb
      );
    `);
    // 8 hired + 4 negative (3 rejected, 1 ghosted), all sharing factor "geo",
    // plus one interest row (outcome NULL) that must be excluded.
    for (let i = 0; i < 8; i++) {
      await db.query(
        `INSERT INTO matching_outcomes (outcome, factors) VALUES ('hired', '{"geo": 0.9}')`,
      );
    }
    for (let i = 0; i < 3; i++) {
      await db.query(
        `INSERT INTO matching_outcomes (outcome, factors) VALUES ('rejected', '{"geo": 0.2}')`,
      );
    }
    await db.query(
      `INSERT INTO matching_outcomes (outcome, factors) VALUES ('ghosted', '{"geo": 0.1}')`,
    );
    await db.query(
      `INSERT INTO matching_outcomes (outcome, factors) VALUES (NULL, '{"geo": 0.5}')`,
    );
    return db;
  }

  it('COUNT_LABELLED_SQL runs without an enum error and excludes NULL/interest rows', async () => {
    const db = await seed();
    const r = await db.query<{ n: string }>(COUNT_LABELLED_SQL);
    expect(Number(r.rows[0]!.n)).toBe(12); // 8 + 3 + 1, NULL excluded
  });

  it('FACTOR_STATS_SQL runs without an enum error and classifies positive/negative', async () => {
    const db = await seed();
    const r = await db.query<{
      factor: string;
      pos_mean: number | null;
      neg_mean: number | null;
      sample_count: string;
    }>(FACTOR_STATS_SQL);

    const geo = r.rows.find((x) => x.factor === 'geo');
    expect(geo).toBeDefined();
    expect(Number(geo!.sample_count)).toBe(12);
    // positive = hired (0.9); negative = rejected (0.2) + ghosted (0.1)
    expect(geo!.pos_mean).toBeCloseTo(0.9, 5);
    expect(geo!.neg_mean).toBeCloseTo((0.2 * 3 + 0.1) / 4, 5);
  });

  it("the old 'interested' literal really does break against this enum (regression guard)", async () => {
    const db = await seed();
    await expect(
      db.query(`SELECT count(*) FROM matching_outcomes WHERE outcome IN ('hired', 'interested')`),
    ).rejects.toThrow(/invalid input value for enum/i);
  });
});
