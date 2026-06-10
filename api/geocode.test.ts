import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

// The public nanny lookup is delegated; mock it so we test only the dispatch.
const nanniesHandler = vi.fn(async (_req: unknown, _res: unknown) => undefined);

vi.mock('./_nannies.js', () => ({
  default: (req: unknown, res: unknown) => nanniesHandler(req, res),
}));

import handler from './geocode';
import { createMockResponse, type MockVercelResponse } from './_testUtils';

function makeReq(query: Record<string, unknown> = {}, method = 'GET'): VercelRequest {
  return {
    method,
    headers: {},
    query,
  } as unknown as VercelRequest;
}

// The geocoder branch calls setCors(), which needs setHeader; the mock response
// doesn't provide one, so add a stub.
function makeRes(): MockVercelResponse {
  const res = createMockResponse();
  (res as unknown as { setHeader: unknown }).setHeader = vi.fn();
  return res;
}

describe('api/geocode — public-read dispatcher', () => {
  beforeEach(() => {
    nanniesHandler.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches ?resource=nannies to the nannies handler', async () => {
    const req = makeReq({ resource: 'nannies', id: 'abc123' });
    const res = makeRes();

    await handler(req, res);

    expect(nanniesHandler).toHaveBeenCalledTimes(1);
    expect(nanniesHandler).toHaveBeenCalledWith(req, res);
  });

  it('dispatches the nannies resource before any method guard (delegate owns its own checks)', async () => {
    // Even a non-GET method must reach the delegate untouched — the geocoder's
    // 405 guard must not pre-empt the nanny route.
    const req = makeReq({ resource: 'nannies', id: 'abc123' }, 'POST');
    const res = makeRes();

    await handler(req, res);

    expect(nanniesHandler).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeUndefined(); // geocoder never wrote a response
  });

  it('does NOT touch the nannies handler for a normal geocode request', async () => {
    // No resource param + no query → geocoder short-circuits with empty items,
    // no network call.
    const req = makeReq({});
    const res = makeRes();

    await handler(req, res);

    expect(nanniesHandler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });

  it('ignores an unrelated resource value and runs the geocoder', async () => {
    const req = makeReq({ resource: 'something-else' });
    const res = makeRes();

    await handler(req, res);

    expect(nanniesHandler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });
});
