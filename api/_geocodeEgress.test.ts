import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const { rateLimit } = vi.hoisted(() => ({ rateLimit: vi.fn(() => ({ ok: true })) }));
vi.mock('./_cors.js', () => ({ setCors: vi.fn() }));
vi.mock('./_rate-limit.js', () => ({ rateLimit }));
vi.mock('./_nannies.js', () => ({ default: vi.fn() }));

import { geocodeExternalEgressDecision } from './_geocodeEgress.js';
import handler from './geocode';
import nanniesHandler from './_nannies.js';
import { createMockResponse } from './_testUtils';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('geocodeExternalEgressDecision (BLI-110)', () => {
  it('allows egress in the synthetic-only contour (default ON)', () => {
    const d = geocodeExternalEgressDecision();
    expect(d.closed).toBe(false);
    expect(d.reason).toBe('synthetic_only_test_contour');
  });

  it('fails closed outside the synthetic contour when the gate is closed', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    const d = geocodeExternalEgressDecision();
    expect(d.closed).toBe(true);
    expect(d.status).toBe(403);
    expect(d.reason).toBe('geocode_egress_gate_closed');
  });

  it('allows egress only when the explicit gate is open', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    vi.stubEnv('BLIZKO_GEOCODE_EGRESS_GATE_OPEN', 'true');
    const d = geocodeExternalEgressDecision();
    expect(d.closed).toBe(false);
    expect(d.reason).toBe('geocode_egress_gate_open');
  });
});

describe('api/geocode handler — fail-closed egress', () => {
  it('does not call external geocoders when blocked (synthetic off, gate closed)', async () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'GET',
      query: { q: 'Москва, Хамовники' },
      headers: {},
    } as unknown as VercelRequest;
    const res = createMockResponse();
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ items: [], blocked: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call external geocoders on the reverse lat/lon path when blocked', async () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'GET',
      query: { lat: '55.75', lon: '37.61' },
      headers: {},
    } as unknown as VercelRequest;
    const res = createMockResponse();
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ items: [], blocked: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks before Yandex even when a Yandex key is configured', async () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    vi.stubEnv('YANDEX_GEOCODER_API_KEY', 'test-key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'GET',
      query: { q: 'Москва, Хамовники' },
      headers: {},
    } as unknown as VercelRequest;
    const res = createMockResponse();
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('delegates resource=nannies to the nannies handler without the geocode guard or any fetch', async () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(nanniesHandler).mockClear();

    const req = {
      method: 'GET',
      query: { resource: 'nannies' },
      headers: {},
    } as unknown as VercelRequest;
    const res = createMockResponse();
    await handler(req, res);

    expect(nanniesHandler).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reaches the geocoders in the synthetic contour (egress allowed)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    const req = { method: 'GET', query: { q: 'Москва' }, headers: {} } as unknown as VercelRequest;
    const res = createMockResponse();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });
});
