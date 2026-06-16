export type Jurisdiction = 'RU' | 'EU' | 'UNKNOWN';
export type DataPlane = 'ru-core' | 'none';
export type CollectionMode = 'full_after_current_consent' | 'minimal' | 'none';
export type PersonalDataAiMode = 'blocked' | 'blocked_until_cross_border_gate';
export type SensitiveFlowMode = 'blocked' | 'blocked_until_separate_approval';

export type JurisdictionPolicy = {
  jurisdiction: Jurisdiction;
  policyVersion: 'jurisdiction-mvp-1';
  legalPolicy: 'ru-mvp' | 'unknown-ru-grade' | 'eu-placeholder';
  dataPlane: DataPlane;
  collection: CollectionMode;
  externalAiOnPersonalData: PersonalDataAiMode;
  sensitiveFlows: SensitiveFlowMode;
  consentVersion: 'ru-current' | 'none';
  retentionProfile: 'ru-core-default' | 'minimal-advisory-only' | 'no-personal-data';
  processors: readonly string[];
};

export type VerifiedJurisdictionSignals = {
  /**
   * ISO-3166 alpha-2 country of an OTP-verified phone, resolved server-side.
   * For phone-only auth this can be inferred from E.164 for supported codes.
   */
  phoneCountry?: string | null;
  declaredResidencyCountry?: string | null;
  declaredCitizenshipCountry?: string | null;
  serviceCountry?: string | null;
};

export type AdvisoryJurisdictionSignals = {
  ipCountry?: string | null;
  locale?: string | null;
  timezone?: string | null;
};

export type JurisdictionDecision = {
  policy: JurisdictionPolicy;
  verifiedCountries: readonly string[];
  advisoryAudit: {
    ipCountry?: string;
    localeLanguage?: string;
    timezoneRegion?: string;
  };
  reasons: readonly string[];
};

const POLICY_VERSION = 'jurisdiction-mvp-1' as const;
const EU_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
]);

export const JURISDICTION_POLICIES: Record<Jurisdiction, JurisdictionPolicy> = {
  RU: {
    jurisdiction: 'RU',
    policyVersion: POLICY_VERSION,
    legalPolicy: 'ru-mvp',
    dataPlane: 'ru-core',
    collection: 'full_after_current_consent',
    externalAiOnPersonalData: 'blocked_until_cross_border_gate',
    sensitiveFlows: 'blocked_until_separate_approval',
    consentVersion: 'ru-current',
    retentionProfile: 'ru-core-default',
    processors: ['ru-core'],
  },
  UNKNOWN: {
    jurisdiction: 'UNKNOWN',
    policyVersion: POLICY_VERSION,
    legalPolicy: 'unknown-ru-grade',
    dataPlane: 'none',
    collection: 'minimal',
    externalAiOnPersonalData: 'blocked',
    sensitiveFlows: 'blocked',
    consentVersion: 'none',
    retentionProfile: 'minimal-advisory-only',
    processors: [],
  },
  EU: {
    jurisdiction: 'EU',
    policyVersion: POLICY_VERSION,
    legalPolicy: 'eu-placeholder',
    dataPlane: 'none',
    collection: 'none',
    externalAiOnPersonalData: 'blocked',
    sensitiveFlows: 'blocked',
    consentVersion: 'none',
    retentionProfile: 'no-personal-data',
    processors: [],
  },
};

function normalizeCountry(value?: string | null): string | null {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function unique(values: Array<string | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function advisoryAudit(
  signals: AdvisoryJurisdictionSignals = {},
): JurisdictionDecision['advisoryAudit'] {
  const ipCountry = normalizeCountry(signals.ipCountry) || undefined;
  const localeLanguage = String(signals.locale || '')
    .trim()
    .split(/[-_]/)[0]
    ?.toLowerCase();
  const timezoneRegion = String(signals.timezone || '')
    .trim()
    .split('/')[0];

  return {
    ...(ipCountry ? { ipCountry } : {}),
    ...(localeLanguage && /^[a-z]{2,3}$/.test(localeLanguage) ? { localeLanguage } : {}),
    ...(timezoneRegion && /^[A-Za-z_]+$/.test(timezoneRegion) ? { timezoneRegion } : {}),
  };
}

function policyDecision(
  jurisdiction: Jurisdiction,
  verifiedCountries: string[],
  advisory: AdvisoryJurisdictionSignals,
  reasons: string[],
): JurisdictionDecision {
  return {
    policy: JURISDICTION_POLICIES[jurisdiction],
    verifiedCountries,
    advisoryAudit: advisoryAudit(advisory),
    reasons,
  };
}

export function inferPhoneCountryFromE164(phone?: string | null): string | null {
  const value = String(phone || '').replace(/[^\d+]/g, '');
  if (!value.startsWith('+')) return null;
  if (/^\+7\d{8,14}$/.test(value)) return 'RU';
  return null;
}

export function resolveJurisdictionPolicy(
  verified: VerifiedJurisdictionSignals = {},
  advisory: AdvisoryJurisdictionSignals = {},
): JurisdictionDecision {
  const countries = unique([
    normalizeCountry(verified.phoneCountry),
    normalizeCountry(verified.declaredResidencyCountry),
    normalizeCountry(verified.declaredCitizenshipCountry),
    normalizeCountry(verified.serviceCountry),
  ]);

  if (countries.length === 0) {
    return policyDecision('UNKNOWN', countries, advisory, ['no_verified_country_signals']);
  }

  if (countries.includes('RU')) {
    if (countries.length > 1) {
      return policyDecision('UNKNOWN', countries, advisory, [
        'conflicting_verified_country_signals',
        'ru_applicability_not_excluded',
      ]);
    }

    return policyDecision('RU', countries, advisory, ['verified_ru_signal']);
  }

  if (countries.every((country) => EU_COUNTRIES.has(country))) {
    return policyDecision('EU', countries, advisory, ['verified_eu_only_signals']);
  }

  return policyDecision('UNKNOWN', countries, advisory, ['unsupported_verified_country_signals']);
}

export function resolveJurisdictionPolicyFromPhone(params: {
  verifiedPhone?: string | null;
  verified?: Omit<VerifiedJurisdictionSignals, 'phoneCountry'>;
  advisory?: AdvisoryJurisdictionSignals;
}): JurisdictionDecision {
  return resolveJurisdictionPolicy(
    {
      ...params.verified,
      phoneCountry: inferPhoneCountryFromE164(params.verifiedPhone),
    },
    params.advisory,
  );
}
