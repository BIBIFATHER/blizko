import { isSyntheticOnly } from './_synthetic.js';
import { resolveJurisdictionPolicyFromPhone } from './_jurisdiction.js';

type AuthenticatedIdentity = {
  email?: string | null;
};

export type ExternalNotificationEgressDecision = {
  closed: boolean;
  status: number;
  error: string;
  jurisdiction: 'RU' | 'EU' | 'UNKNOWN' | 'SYNTHETIC_TEST';
  reason: string;
};

function phoneFromPlaceholderEmail(email?: string | null): string | null {
  const match = /^phone_(\d+)@blizko\.local$/i.exec(String(email || '').trim());
  return match ? `+${match[1]}` : null;
}

function notificationGateOpen(): boolean {
  return process.env.BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN === 'true';
}

/**
 * Stateless jurisdiction guard for external notification processors such as
 * Resend and Telegram. It does not persist jurisdiction state; until RU-core
 * exists, real notification egress must be opened explicitly.
 */
export function externalPersonalDataNotificationEgressDecision(
  identity: AuthenticatedIdentity | null,
): ExternalNotificationEgressDecision {
  if (isSyntheticOnly()) {
    return {
      closed: false,
      status: 200,
      error: '',
      jurisdiction: 'SYNTHETIC_TEST',
      reason: 'synthetic_only_test_contour',
    };
  }

  const decision = resolveJurisdictionPolicyFromPhone({
    verifiedPhone: phoneFromPlaceholderEmail(identity?.email),
  });
  const jurisdiction = decision.policy.jurisdiction;

  if (jurisdiction !== 'RU') {
    return {
      closed: true,
      status: 403,
      error: 'External notifications on personal data are blocked by jurisdiction policy.',
      jurisdiction,
      reason: decision.reasons[0] || 'jurisdiction_policy_blocks_external_notifications',
    };
  }

  if (!notificationGateOpen()) {
    return {
      closed: true,
      status: 403,
      error:
        'External notifications on personal data are blocked until the notification gate is approved.',
      jurisdiction,
      reason: 'external_notification_gate_closed',
    };
  }

  return {
    closed: false,
    status: 200,
    error: '',
    jurisdiction,
    reason: 'external_notification_gate_open',
  };
}
