import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Storage — in-memory mock (node env, нет localStorage).
const store = new Map<string, string>();
vi.mock('@/core/platform/storage', () => ({
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
}));

const getSession = vi.fn(async () => ({ data: { session: { access_token: 'tok' } } }));
vi.mock('./supabase', () => ({
  hasSupabaseClient: true,
  supabase: { auth: { getSession: () => getSession() } },
}));

const trackBookingCreated = vi.fn();
vi.mock('./analytics', () => ({
  trackBookingCreated: (...a: unknown[]) => trackBookingCreated(...a),
}));
const recordMatchOutcome = vi.fn();
vi.mock('./matchingFeedback', () => ({
  recordMatchOutcome: (...args: unknown[]) => recordMatchOutcome(...args),
}));

import { createBooking, updateBookingStatus } from './booking';

describe('createBooking → server endpoint', () => {
  beforeEach(() => {
    store.clear();
    trackBookingCreated.mockReset();
    getSession.mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  const args = {
    request_id: 'req-1',
    nanny_entity_id: 'nanny-1',
    idempotency_key: '11111111-1111-4111-8111-111111111111',
    date: '2026-07-10',
  };

  it('POSTs to /api/bookings?op=create with bearer + body, returns booking (201)', async () => {
    const booking = { id: 'b1', parent_id: 'p', nanny_id: 'n', status: 'pending' };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({ booking }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createBooking(args);
    expect(result).toEqual(booking);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/bookings?op=create');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toMatchObject({
      request_id: 'req-1',
      nanny_entity_id: 'nanny-1',
      idempotency_key: args.idempotency_key,
      date: '2026-07-10',
    });
    expect(trackBookingCreated).toHaveBeenCalledOnce();
  });

  it('throws on non-2xx and does NOT track', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 409,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'active booking for this pair already exists' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createBooking(args)).rejects.toThrow(/pair/i);
    expect(trackBookingCreated).not.toHaveBeenCalled();
  });

  it('throws when no session token (no false local success)', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } } as never);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(createBooking(args)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('updateBookingStatus → server endpoint', () => {
  beforeEach(() => {
    getSession.mockClear();
    recordMatchOutcome.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('POSTs to /api/bookings?op=status with bearer + body, returns booking (200)', async () => {
    const booking = { id: 'b1', parent_id: 'p', nanny_id: 'n', status: 'confirmed' };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ booking }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await updateBookingStatus('b1', 'pending', 'confirmed');
    expect(result).toEqual(booking);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/bookings?op=status');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual({
      booking_id: 'b1',
      expected_status: 'pending',
      to_status: 'confirmed',
    });
  });

  it('throws on non-2xx (stale/403/etc — no false success)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 409,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'stale status: booking is not in expected_status' }),
      })),
    );

    await expect(updateBookingStatus('b1', 'pending', 'confirmed')).rejects.toThrow(/stale/i);
    expect(recordMatchOutcome).not.toHaveBeenCalled();
  });

  it('calls recordMatchOutcome("hired") only after success, on confirmed transition', async () => {
    const booking = { id: 'b1', parent_id: 'p', nanny_id: 'n', status: 'confirmed' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ booking }),
      })),
    );

    await updateBookingStatus('b1', 'pending', 'confirmed');
    expect(recordMatchOutcome).toHaveBeenCalledWith('p', 'n', 'hired');
  });

  it('throws when no session token', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } } as never);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateBookingStatus('b1', 'pending', 'confirmed')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
