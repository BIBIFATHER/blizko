import { isSyntheticOnly } from './_synthetic.js';
import { resolveJurisdictionPolicyFromPhone } from './_jurisdiction.js';

type AuthenticatedIdentity = {
  email?: string | null;
};

type ExternalAiEgressOptions = {
  sensitiveFlow?: boolean;
};

export type ExternalAiEgressDecision = {
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

function crossBorderAiGateOpen(): boolean {
  return process.env.BLIZKO_CROSS_BORDER_AI_GATE_OPEN === 'true';
}

function sensitiveAiFlowGateOpen(): boolean {
  return process.env.BLIZKO_SENSITIVE_AI_FLOW_GATE_OPEN === 'true';
}

/**
 * Stateless jurisdiction egress guard for external AI calls that may contain
 * personal data. It deliberately does not persist a jurisdiction pin: until the
 * RU data-plane decision exists, persistence would itself create a new PD store.
 */
export function externalPersonalDataAiEgressDecision(
  identity: AuthenticatedIdentity | null,
  options: ExternalAiEgressOptions = {},
): ExternalAiEgressDecision {
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

  if (decision.policy.externalAiOnPersonalData === 'blocked') {
    return {
      closed: true,
      status: 403,
      error: 'External AI on personal data is blocked by jurisdiction policy.',
      jurisdiction,
      reason: decision.reasons[0] || 'jurisdiction_policy_blocks_external_ai',
    };
  }

  if (
    decision.policy.externalAiOnPersonalData === 'blocked_until_cross_border_gate' &&
    !crossBorderAiGateOpen()
  ) {
    return {
      closed: true,
      status: 403,
      error: 'External AI on personal data is blocked until the cross-border AI gate is approved.',
      jurisdiction,
      reason: 'cross_border_ai_gate_closed',
    };
  }

  if (
    options.sensitiveFlow &&
    decision.policy.sensitiveFlows === 'blocked_until_separate_approval' &&
    !sensitiveAiFlowGateOpen()
  ) {
    return {
      closed: true,
      status: 403,
      error: 'External AI on sensitive personal data is blocked until separate approval.',
      jurisdiction,
      reason: 'sensitive_ai_flow_gate_closed',
    };
  }

  return {
    closed: false,
    status: 200,
    error: '',
    jurisdiction,
    reason: 'cross_border_ai_gate_open',
  };
}
