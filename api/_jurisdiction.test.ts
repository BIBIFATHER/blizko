import { describe, expect, it } from 'vitest';

import {
  inferPhoneCountryFromE164,
  resolveJurisdictionPolicy,
  resolveJurisdictionPolicyFromPhone,
} from './_jurisdiction.js';

describe('jurisdiction router MVP', () => {
  it('fails closed to UNKNOWN when verified signals are missing', () => {
    const decision = resolveJurisdictionPolicy(
      {},
      { ipCountry: 'RU', locale: 'ru-RU', timezone: 'Europe/Moscow' },
    );

    expect(decision.policy.jurisdiction).toBe('UNKNOWN');
    expect(decision.policy.dataPlane).toBe('none');
    expect(decision.policy.collection).toBe('minimal');
    expect(decision.policy.externalAiOnPersonalData).toBe('blocked');
    expect(decision.reasons).toContain('no_verified_country_signals');
    expect(decision.advisoryAudit).toEqual({
      ipCountry: 'RU',
      localeLanguage: 'ru',
      timezoneRegion: 'Europe',
    });
  });

  it('routes a verified RU-only signal to RU policy', () => {
    const decision = resolveJurisdictionPolicy({
      phoneCountry: 'ru',
      serviceCountry: 'RU',
    });

    expect(decision.policy.jurisdiction).toBe('RU');
    expect(decision.policy.dataPlane).toBe('ru-core');
    expect(decision.policy.collection).toBe('full_after_current_consent');
    expect(decision.policy.externalAiOnPersonalData).toBe('blocked_until_cross_border_gate');
    expect(decision.reasons).toEqual(['verified_ru_signal']);
  });

  it('fails closed when verified RU applicability conflicts with another country', () => {
    const decision = resolveJurisdictionPolicy({
      phoneCountry: 'RU',
      declaredResidencyCountry: 'DE',
    });

    expect(decision.policy.jurisdiction).toBe('UNKNOWN');
    expect(decision.policy.dataPlane).toBe('none');
    expect(decision.verifiedCountries).toEqual(['RU', 'DE']);
    expect(decision.reasons).toContain('conflicting_verified_country_signals');
    expect(decision.reasons).toContain('ru_applicability_not_excluded');
  });

  it('routes verified EU-only signals to the EU placeholder with no personal-data plane', () => {
    const decision = resolveJurisdictionPolicy({
      phoneCountry: 'DE',
      declaredResidencyCountry: 'FR',
      serviceCountry: 'DE',
    });

    expect(decision.policy.jurisdiction).toBe('EU');
    expect(decision.policy.dataPlane).toBe('none');
    expect(decision.policy.collection).toBe('none');
    expect(decision.policy.externalAiOnPersonalData).toBe('blocked');
    expect(decision.reasons).toEqual(['verified_eu_only_signals']);
  });

  it('fails closed for unsupported verified non-RU/non-EU countries', () => {
    const decision = resolveJurisdictionPolicy({ phoneCountry: 'US' });

    expect(decision.policy.jurisdiction).toBe('UNKNOWN');
    expect(decision.policy.dataPlane).toBe('none');
    expect(decision.reasons).toEqual(['unsupported_verified_country_signals']);
  });

  it('does not let advisory IP or locale downgrade a verified RU policy', () => {
    const decision = resolveJurisdictionPolicy(
      { phoneCountry: 'RU' },
      { ipCountry: 'DE', locale: 'en-US', timezone: 'America/New_York' },
    );

    expect(decision.policy.jurisdiction).toBe('RU');
    expect(decision.advisoryAudit).toEqual({
      ipCountry: 'DE',
      localeLanguage: 'en',
      timezoneRegion: 'America',
    });
  });

  it('infers RU from +7 E.164 phone numbers for server-side phone auth', () => {
    expect(inferPhoneCountryFromE164('+7 999 000 00 00')).toBe('RU');
    expect(inferPhoneCountryFromE164('79990000000')).toBeNull();
    expect(inferPhoneCountryFromE164('+12025550123')).toBeNull();

    const decision = resolveJurisdictionPolicyFromPhone({
      verifiedPhone: '+79990000000',
      verified: { serviceCountry: 'RU' },
    });

    expect(decision.policy.jurisdiction).toBe('RU');
  });
});
