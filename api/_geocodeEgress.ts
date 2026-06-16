import { isSyntheticOnly } from './_synthetic.js';

export type GeocodeEgressDecision = {
  closed: boolean;
  status: number;
  error: string;
  reason: string;
};

function geocodeGateOpen(): boolean {
  return process.env.BLIZKO_GEOCODE_EGRESS_GATE_OPEN === 'true';
}

/**
 * Stateless fail-closed guard for the unauthenticated `/api/geocode` endpoint.
 *
 * Geocoding forwards free-text address queries and reverse GPS coordinates to
 * external providers (Yandex, Nominatim). The endpoint is unauthenticated, so
 * there is no caller identity to resolve a jurisdiction from — the identity-based
 * AI/notification guards do not apply here.
 *
 * In the synthetic-only closed contour all input is synthetic test data, so
 * external geocode egress is allowed and the feature keeps working. Once the
 * contour is opened (synthetic-only off) real address/GPS data could be sent, so
 * egress fails closed until an explicit gate is approved. No DB, no persistence,
 * no jurisdiction pin.
 */
export function geocodeExternalEgressDecision(): GeocodeEgressDecision {
  if (isSyntheticOnly()) {
    return { closed: false, status: 200, error: '', reason: 'synthetic_only_test_contour' };
  }

  if (!geocodeGateOpen()) {
    return {
      closed: true,
      status: 403,
      error:
        'Geocoding is blocked outside the synthetic contour until the geocode egress gate is approved.',
      reason: 'geocode_egress_gate_closed',
    };
  }

  return { closed: false, status: 200, error: '', reason: 'geocode_egress_gate_open' };
}
