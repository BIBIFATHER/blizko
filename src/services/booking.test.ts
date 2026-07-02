import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn(async () => ({ data: { session: { access_token: 'tok' } } }));
vi.mock('./supabase', () => ({
  hasSupabaseClient: true,
  supabase: { auth: { getSession: () => getSession() }, from: vi.fn() },
}));

const trackBookingCreated = vi.fn();
vi.mock('./analytics', () => ({
  trackBookingCreated: (...a: unknown[]) => trackBookingCreated(...a),
}));
const recordMatchOutcome = vi.fn();
vi.mock('./matchingFeedback', () => ({
  recordMatchOutcome: (...args: unknown[]) => recordMatchOutcome(...args),
}));

import { createBooking, getAllBookings, getBookingsForUser, updateBookingStatus } from './booking';

describe('createBooking → server endpoint', () => {
  beforeEach(() => {
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

describe('getAllBookings → admin GET endpoint', () => {
  afterEach(() => vi.restoreAllMocks());

  it('GETs /api/bookings with bearer, returns bookings array', async () => {
    const bookings = [{ id: 'b1' }, { id: 'b2' }];
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ bookings }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getAllBookings();
    expect(result).toEqual(bookings);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/bookings');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('throws on non-2xx (no silent empty-array fallback)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Unauthorized' }),
      })),
    );

    await expect(getAllBookings()).rejects.toThrow(/Unauthorized/i);
  });
});

describe('getBookingsForUser → participant SELECT (Supabase RLS)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns bookings for parent-or-nanny, sorted by created_at desc', async () => {
    const { supabase: sb } = await import('./supabase');
    const order = vi.fn(async () => ({
      data: [
        { id: 'b2', created_at: '2026-02-01T00:00:00Z' },
        { id: 'b1', created_at: '2026-01-01T00:00:00Z' },
      ],
      error: null,
    }));
    const or = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ or }));
    (sb!.from as unknown as ReturnType<typeof vi.fn>) = vi.fn(() => ({ select }));

    const result = await getBookingsForUser('u1');
    expect(result.map((booking) => booking.id)).toEqual(['b2', 'b1']);
    expect(or).toHaveBeenCalledWith('parent_id.eq.u1,nanny_id.eq.u1');
  });

  it('throws on Supabase error (no local fallback)', async () => {
    const { supabase: sb } = await import('./supabase');
    const order = vi.fn(async () => ({ data: null, error: { message: 'RLS denied' } }));
    const or = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ or }));
    (sb!.from as unknown as ReturnType<typeof vi.fn>) = vi.fn(() => ({ select }));

    await expect(getBookingsForUser('u1')).rejects.toThrow(/RLS denied/i);
  });

  it('accepts a row with anonymized null parent_id', async () => {
    const { supabase: sb } = await import('./supabase');
    const order = vi.fn(async () => ({
      data: [
        {
          id: 'b1',
          parent_id: null,
          nanny_id: 'n1',
          status: 'cancelled',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      error: null,
    }));
    const or = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ or }));
    (sb!.from as unknown as ReturnType<typeof vi.fn>) = vi.fn(() => ({ select }));

    const result = await getBookingsForUser('n1');
    expect(result[0].parent_id).toBeNull();
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
