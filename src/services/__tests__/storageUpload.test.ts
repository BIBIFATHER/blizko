import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * H2: upload helpers must return a typed result, never a silent null. Identity
 * documents rely on { ok: false } to block the "success" path, so these contracts
 * are load-bearing — pin them.
 */

const mockState: { client: unknown } = { client: null };

vi.mock('@/services/supabase', () => ({
  get supabase() {
    return mockState.client;
  },
}));

import {
  uploadDocumentFile,
  uploadPhotoFile,
  getDocumentSignedUrl,
} from '@/services/storageUpload';

const file = { name: 'passport.jpg', type: 'image/jpeg' } as unknown as File;

function makeClient(opts: {
  uploadError?: unknown;
  publicUrl?: string | null;
  throwOnUpload?: boolean;
}) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    storage: {
      from: () => ({
        upload: async () => {
          if (opts.throwOnUpload) throw new Error('network down');
          return { error: opts.uploadError ?? null };
        },
        getPublicUrl: () => ({ data: { publicUrl: opts.publicUrl ?? 'https://cdn/doc' } }),
        createSignedUrl: async () => ({
          data: { signedUrl: 'https://cdn/sign/doc?token=abc' },
          error: null,
        }),
      }),
    },
  };
}

beforeEach(() => {
  mockState.client = null;
});

describe('storageUpload — typed result, no silent null (H2)', () => {
  it('returns {ok:false, reason:disabled} when storage is not configured', async () => {
    mockState.client = null;
    await expect(uploadDocumentFile(file, 'passport')).resolves.toEqual({
      ok: false,
      reason: 'disabled',
    });
    await expect(uploadPhotoFile(file)).resolves.toEqual({ ok: false, reason: 'disabled' });
  });

  it('returns {ok:false, reason:error} when the bucket upload is rejected', async () => {
    mockState.client = makeClient({ uploadError: { message: 'RLS denied' } });
    const res = await uploadDocumentFile(file, 'passport');
    expect(res).toEqual({ ok: false, reason: 'error' });
    expect((res as { url?: string }).url).toBeUndefined();
  });

  it('returns {ok:false, reason:error} when the upload throws', async () => {
    mockState.client = makeClient({ throwOnUpload: true });
    await expect(uploadDocumentFile(file, 'medical_book')).resolves.toEqual({
      ok: false,
      reason: 'error',
    });
  });

  it('returns {ok:true, path} (private bucket — путь, не public URL) on success', async () => {
    mockState.client = makeClient({});
    const res = await uploadDocumentFile(file, 'passport');
    expect(res.ok).toBe(true);
    expect((res as { path: string }).path).toMatch(/^u1\/\d+-passport\.jpg$/);
    expect((res as { url?: string }).url).toBeUndefined();
  });

  it('getDocumentSignedUrl returns a signed URL for the owner', async () => {
    mockState.client = makeClient({});
    await expect(getDocumentSignedUrl('u1/doc.jpg')).resolves.toBe(
      'https://cdn/sign/doc?token=abc',
    );
  });
});
