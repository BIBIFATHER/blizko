import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * H5: adminApi calls must never let a network/CORS rejection escape. A thrown
 * fetch previously became an unhandled rejection, leaving the admin "Отправка..."
 * button stuck. These pin the typed-failure contract.
 */

vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
  },
}));

import {
  adminSendNotification,
  adminSendSupportReply,
  adminUpdateParentRequest,
  createAdminAction,
  fetchAdminSupportInbox,
} from '@/services/adminApi';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('adminApi — no unhandled throw on network failure (H5)', () => {
  it('adminSendNotification resolves {ok:false} instead of rejecting', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('CORS')) as unknown as typeof fetch;
    const res = await adminSendNotification({ to: 'a@b.c', subject: 's', text: 't' });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it('adminUpdateParentRequest resolves null instead of rejecting', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(adminUpdateParentRequest({ id: 'x', changes: {} })).resolves.toBeNull();
  });

  it('createAdminAction resolves null instead of rejecting', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    await expect(createAdminAction('viewed', {})).resolves.toBeNull();
  });

  it('fetchAdminSupportInbox resolves null instead of rejecting', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('support offline')) as unknown as typeof fetch;
    await expect(fetchAdminSupportInbox('ticket-1')).resolves.toBeNull();
  });

  it('adminSendSupportReply resolves null instead of rejecting', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('reply offline')) as unknown as typeof fetch;
    await expect(adminSendSupportReply('ticket-1', 'Ответ')).resolves.toBeNull();
  });
});
