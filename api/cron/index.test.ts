import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const ghostedOutcomes = vi.fn(async (_req: unknown, _res: unknown) => undefined);
const reconcileAccountDeletions = vi.fn(async (_req: unknown, _res: unknown) => undefined);
const updateMatchingWeights = vi.fn(async (_req: unknown, _res: unknown) => undefined);

vi.mock('./_ghosted-outcomes.js', () => ({
  default: (req: unknown, res: unknown) => ghostedOutcomes(req, res),
}));

vi.mock('./_update-matching-weights.js', () => ({
  default: (req: unknown, res: unknown) => updateMatchingWeights(req, res),
}));

vi.mock('./_reconcile-account-deletions.js', () => ({
  default: (req: unknown, res: unknown) => reconcileAccountDeletions(req, res),
}));

import handler from './index';
import { createMockResponse } from '../_testUtils';

function makeReq(job?: string | string[]): VercelRequest {
  return {
    method: 'GET',
    headers: {},
    query: job === undefined ? {} : { job },
  } as unknown as VercelRequest;
}

describe('api/cron router', () => {
  beforeEach(() => {
    ghostedOutcomes.mockReset();
    reconcileAccountDeletions.mockReset();
    updateMatchingWeights.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches ?job=ghosted-outcomes to the ghosted-outcomes job', async () => {
    const req = makeReq('ghosted-outcomes');
    const res = createMockResponse();

    await handler(req, res);

    expect(ghostedOutcomes).toHaveBeenCalledTimes(1);
    expect(ghostedOutcomes).toHaveBeenCalledWith(req, res);
    expect(updateMatchingWeights).not.toHaveBeenCalled();
  });

  it('dispatches ?job=update-matching-weights to the weights job', async () => {
    const req = makeReq('update-matching-weights');
    const res = createMockResponse();

    await handler(req, res);

    expect(updateMatchingWeights).toHaveBeenCalledTimes(1);
    expect(updateMatchingWeights).toHaveBeenCalledWith(req, res);
    expect(ghostedOutcomes).not.toHaveBeenCalled();
  });

  it('dispatches ?job=reconcile-account-deletions to the deletion reconciler', async () => {
    const req = makeReq('reconcile-account-deletions');
    const res = createMockResponse();

    await handler(req, res);

    expect(reconcileAccountDeletions).toHaveBeenCalledTimes(1);
    expect(reconcileAccountDeletions).toHaveBeenCalledWith(req, res);
    expect(ghostedOutcomes).not.toHaveBeenCalled();
    expect(updateMatchingWeights).not.toHaveBeenCalled();
  });

  it('normalizes an array job param to its first value', async () => {
    const req = makeReq(['ghosted-outcomes', 'update-matching-weights']);
    const res = createMockResponse();

    await handler(req, res);

    expect(ghostedOutcomes).toHaveBeenCalledTimes(1);
    expect(updateMatchingWeights).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown job', async () => {
    const req = makeReq('does-not-exist');
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Unknown cron job', job: 'does-not-exist' });
    expect(ghostedOutcomes).not.toHaveBeenCalled();
    expect(updateMatchingWeights).not.toHaveBeenCalled();
  });

  it('returns 400 with job:null when no job param is provided', async () => {
    const req = makeReq();
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Unknown cron job', job: null });
  });
});
