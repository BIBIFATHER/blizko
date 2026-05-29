import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * RED test pinning the C1 contract: a form submit must NEVER report unconditional
 * success when the remote (Supabase) write did not succeed.
 *
 * Desired contract (3-state):
 *   saveParentRequest(...) -> Promise<{ item: ParentRequest; sync: 'synced' | 'pending' | 'error' }>
 *     - 'synced'  : remote upsert succeeded
 *     - 'pending' : offline / not-yet-authed -> queued for retry (markPendingSync)
 *     - 'error'   : remote returned an error (RLS reject / constraint) -> hard failure
 *
 * Today saveParentRequest returns a bare ParentRequest with no sync signal, so these
 * assertions fail (red). The fix to storage.ts makes them green.
 */

type SingleResult = { data: unknown; error: unknown };

const mockState: {
  user: { id: string } | null;
  single: () => SingleResult;
} = {
  user: { id: 'user-1' },
  single: () => ({ data: null, error: null }),
};

const store = new Map<string, string>();

vi.mock('@/core/platform/storage', () => ({
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
}));

vi.mock('@/services/currentNannyProfile', () => ({
  findCurrentNannyProfile: () => null,
}));

vi.mock('@/services/supabase', () => {
  const builder = {
    upsert: () => builder,
    select: () => builder,
    single: () => Promise.resolve(mockState.single()),
  };
  return {
    supabase: {
      auth: { getUser: () => Promise.resolve({ data: { user: mockState.user } }) },
      from: () => builder,
    },
  };
});

const baseInput = {
  city: 'Москва',
  childAge: '1-3',
  schedule: 'full',
  budget: '—',
  comment: 'test',
  requirements: [],
  documents: [],
  riskProfile: undefined,
  isNannySharing: false,
  pdConsentAt: '2026-05-25T00:00:00.000Z',
} as unknown as Parameters<typeof import('@/services/storage').saveParentRequest>[0];

describe('saveParentRequest — persist contract (C1)', () => {
  beforeEach(() => {
    store.clear();
    mockState.user = { id: 'user-1' };
    mockState.single = () => ({ data: null, error: null });
    vi.resetModules();
  });

  it('returns sync=synced when the remote write succeeds', async () => {
    mockState.single = () => ({
      data: { id: 'x', payload: { id: 'x' }, created_at: new Date().toISOString() },
      error: null,
    });
    const { saveParentRequest } = await import('@/services/storage');
    const result = await saveParentRequest(baseInput);
    expect(result.sync).toBe('synced');
    expect(result.item).toBeTruthy();
  });

  it('returns sync=error (NOT synced) when the remote write is rejected', async () => {
    mockState.single = () => ({ data: null, error: { code: '42501', message: 'RLS denied' } });
    const { saveParentRequest } = await import('@/services/storage');
    const result = await saveParentRequest(baseInput);
    expect(result.sync).toBe('error');
  });

  it('returns sync=pending when the user is not authenticated (offline / queued)', async () => {
    mockState.user = null;
    const { saveParentRequest } = await import('@/services/storage');
    const result = await saveParentRequest(baseInput);
    expect(result.sync).toBe('pending');
  });
});

describe('mergeNannyPreservingMedia — re-submit не обнуляет медиа (BLI-68)', () => {
  const existing = {
    id: 'n1',
    documents: [{ type: 'passport' }],
    video: 'https://cdn/video.webm',
    photo: 'https://cdn/photo.jpg',
  } as never;

  it('сохраняет существующие documents/video/photo, если входящие пустые/без них', async () => {
    const { mergeNannyPreservingMedia } = await import('@/services/storage');
    const merged = mergeNannyPreservingMedia(existing, {
      about: 'обновил только текст',
      documents: [],
    } as never);
    expect(merged.documents).toHaveLength(1);
    expect(merged.video).toBe('https://cdn/video.webm');
    expect(merged.photo).toBe('https://cdn/photo.jpg');
    expect((merged as { about?: string }).about).toBe('обновил только текст');
  });

  it('перезаписывает медиа, когда новые значения реально пришли', async () => {
    const { mergeNannyPreservingMedia } = await import('@/services/storage');
    const merged = mergeNannyPreservingMedia(existing, {
      documents: [{ type: 'passport' }, { type: 'medical' }],
      video: 'https://cdn/new.webm',
    } as never);
    expect(merged.documents).toHaveLength(2);
    expect(merged.video).toBe('https://cdn/new.webm');
    expect(merged.photo).toBe('https://cdn/photo.jpg'); // photo не пришло → сохранено
  });
});
