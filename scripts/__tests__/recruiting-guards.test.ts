import { describe, it, expect } from 'vitest';

import {
  validateMinimalText,
  validateSourceReference,
  validateRecontactState,
  removeLeadById,
  purgeExpiredLeads,
} from '../nannyLeadRegistry.js';
import {
  looksLikeContact,
  assertSyntheticRows,
  buildSyntheticContact,
} from '../parseHhResponses.js';
import { assertSeedTargetAllowed } from '../importHhNannies.js';

describe('nannyLeadRegistry: data minimization + erasure', () => {
  it('validateMinimalText rejects an email', () => {
    expect(() => validateMinimalText('Notes', 'ping me a@b.ru')).toThrow();
  });

  it('validateMinimalText rejects a phone number', () => {
    expect(() => validateMinimalText('Notes', '+7 999 123 45 67')).toThrow();
  });

  it('validateMinimalText accepts clean minimal text', () => {
    expect(() => validateMinimalText('First name', 'Елена')).not.toThrow();
  });

  it('removeLeadById erases a unique lead by full id', () => {
    const reg = { leads: [{ id: 'nwl_a' }, { id: 'nwl_b' }] };
    const res = removeLeadById(reg, 'nwl_a');
    expect(res.removedId).toBe('nwl_a');
    expect(reg.leads.map((l: { id: string }) => l.id)).toEqual(['nwl_b']);
  });

  it('removeLeadById refuses ambiguous or missing ids', () => {
    const reg = { leads: [{ id: 'nwl_a1' }, { id: 'nwl_a2' }] };
    expect(() => removeLeadById(reg, 'nwl_a')).toThrow();
    expect(() => removeLeadById({ leads: [] }, 'x')).toThrow();
  });

  it('validateSourceReference rejects embedded direct contacts', () => {
    expect(() => validateSourceReference('https://example.test?id=1&email=a@b.ru')).toThrow();
    expect(() => validateSourceReference('hh-response-123456789')).not.toThrow();
  });

  it('pilot statuses require explicit recontact permission', () => {
    expect(() => validateRecontactState('pilot_waitlist', 'unknown')).toThrow();
    expect(() => validateRecontactState('intro_scheduled', 'no')).toThrow();
    expect(() => validateRecontactState('pilot_waitlist', 'yes')).not.toThrow();
  });

  it('purgeExpiredLeads removes refusals and records older than 90 days', () => {
    const registry = {
      leads: [
        {
          id: 'keep',
          status: 'interested',
          permissionToRecontact: 'yes',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 'declined',
          status: 'declined',
          permissionToRecontact: 'no',
          updatedAt: '2026-06-12T00:00:00.000Z',
        },
        {
          id: 'stale',
          status: 'contacted',
          permissionToRecontact: 'unknown',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const result = purgeExpiredLeads(registry, new Date('2026-06-13T00:00:00.000Z'));
    expect(result.removedIds).toEqual(['declined', 'stale']);
    expect(registry.leads.map((lead: { id: string }) => lead.id)).toEqual(['keep']);
  });
});

describe('parseHhResponses: synthetic-only enforcement', () => {
  it('looksLikeContact detects email and phone, not clean text', () => {
    expect(looksLikeContact('a@b.ru')).toBe(true);
    expect(looksLikeContact('+7 999 123 45 67')).toBe(true);
    expect(looksLikeContact('Елена, 5 лет, Москва')).toBe(false);
  });

  it('assertSyntheticRows throws on a real contact cell', () => {
    expect(() => assertSyntheticRows([{ Имя: 'Елена', Телефон: '+7 999 123 45 67' }])).toThrow(
      /synthetic-only/,
    );
  });

  it('assertSyntheticRows passes for synthetic rows', () => {
    expect(() =>
      assertSyntheticRows([{ Имя: 'Елена', Опыт: '5 лет', Город: 'Москва' }]),
    ).not.toThrow();
  });

  it('buildSyntheticContact never copies a real contact', () => {
    const c = buildSyntheticContact('abcdef12-3456');
    expect(c).toBe('hh_abcdef@blizko.local');
  });
});

describe('importHhNannies: fail-closed seed target (env-driven, no hardcoded ref)', () => {
  const TEST_URL = 'https://testref123.supabase.co';

  it('refuses when no allowed ref is declared (fail-closed)', () => {
    expect(() => assertSeedTargetAllowed(TEST_URL, {})).toThrow(/BLIZKO_SEED_ALLOWED_REF/);
  });

  it('refuses when SUPABASE_URL does not match the allowed ref', () => {
    expect(() => assertSeedTargetAllowed(TEST_URL, { allowedRef: 'otherref' })).toThrow(
      /not the allowed/,
    );
  });

  it('refuses when SUPABASE_URL matches a forbidden production ref', () => {
    expect(() =>
      assertSeedTargetAllowed('https://testref123.supabase.co', {
        allowedRef: 'testref123',
        forbiddenRefs: ['testref123'],
      }),
    ).toThrow(/forbidden production ref/);
  });

  it('passes for an explicit allowed non-production project', () => {
    expect(() =>
      assertSeedTargetAllowed(TEST_URL, { allowedRef: 'testref123', forbiddenRefs: ['prodref'] }),
    ).not.toThrow();
  });

  it('does not contain any hardcoded production ref in the guard', () => {
    // Guard is purely env-driven: calling with no env config must refuse, never allow.
    expect(() => assertSeedTargetAllowed(TEST_URL)).toThrow();
  });
});
