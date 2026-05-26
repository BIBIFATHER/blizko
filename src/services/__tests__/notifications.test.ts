import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParentRequest } from '@/core/types';

/**
 * M1: notifications must report delivery as a boolean so the curator UI can warn
 * when a family was NOT notified, instead of always showing success.
 */

const { sendToWebhook } = vi.hoisted(() => ({ sendToWebhook: vi.fn() }));
vi.mock('@/services/api', () => ({ sendToWebhook }));

import { notifyUserStatusChanged, notifyAdminNewRequest } from '@/services/notifications';

const baseReq = (over: Partial<ParentRequest>): ParentRequest =>
  ({ id: 'abcdef1234', city: 'Москва', status: 'approved', ...over }) as ParentRequest;

beforeEach(() => {
  sendToWebhook.mockReset();
});

describe('notifications — delivery boolean (M1)', () => {
  it('notifyUserStatusChanged returns false when there is no email (not sent)', async () => {
    const res = await notifyUserStatusChanged(baseReq({ requesterEmail: undefined }));
    expect(res).toBe(false);
    expect(sendToWebhook).not.toHaveBeenCalled();
  });

  it('notifyUserStatusChanged propagates delivery failure', async () => {
    sendToWebhook.mockResolvedValue(false);
    const res = await notifyUserStatusChanged(baseReq({ requesterEmail: 'a@b.c' }));
    expect(res).toBe(false);
    expect(sendToWebhook).toHaveBeenCalledTimes(1);
  });

  it('notifyUserStatusChanged returns true on successful delivery', async () => {
    sendToWebhook.mockResolvedValue(true);
    const res = await notifyUserStatusChanged(baseReq({ requesterEmail: 'a@b.c' }));
    expect(res).toBe(true);
  });

  it('notifyAdminNewRequest propagates the webhook boolean', async () => {
    sendToWebhook.mockResolvedValue(false);
    expect(await notifyAdminNewRequest(baseReq({}))).toBe(false);
  });
});
