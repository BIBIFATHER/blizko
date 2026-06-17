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
 * external providers (Yandex, Nominatim). The endpoint is unauthenticated and
 * publicly reachable, so a real visitor on the live site can type a real address
 * regardless of `BLIZKO_SYNTHETIC_ONLY` — synthetic-only does NOT make this
 * input synthetic (BLI-119). Egress is therefore CLOSED by default and allowed
 * only when the explicit gate `BLIZKO_GEOCODE_EGRESS_GATE_OPEN=true` is set
 * (local dev / after legal acceptance of the public path). No DB, no
 * persistence, no jurisdiction pin. When closed, the form degrades gracefully:
 * no autocomplete suggestions, manual city/district entry still works.
 */
export function geocodeExternalEgressDecision(): GeocodeEgressDecision {
  if (geocodeGateOpen()) {
    return { closed: false, status: 200, error: '', reason: 'geocode_egress_gate_open' };
  }

  return {
    closed: true,
    status: 403,
    error:
      'Geocoding is disabled: address/GPS is not sent to external providers until the geocode egress gate is approved.',
    reason: 'geocode_egress_gate_closed',
  };
}
