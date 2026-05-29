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

  it('notifyAdminNewRequest sends detailed Telegram card with admin deep-link', async () => {
    sendToWebhook.mockResolvedValue(true);

    await notifyAdminNewRequest(
      baseReq({
        id: 'a147df752222',
        city: 'Москва',
        district: 'Хамовники',
        metro: 'Парк культуры',
        childAge: '4 года',
        schedule: 'Будни после 17:00',
        budget: 'до 1200 ₽/час',
        requirements: ['английский', 'забрать из сада'],
        comment: 'Нужна спокойная няня <без давления>',
        requesterEmail: 'parent@example.com',
      }),
    );

    const payload = sendToWebhook.mock.calls[0][0];
    expect(payload.text).toContain('Новая заявка');
    expect(payload.text).toContain('#a147df75');
    expect(payload.text).toContain('Москва, Хамовники, м. Парк культуры');
    expect(payload.text).toContain('4 года');
    expect(payload.text).toContain('Будни после 17:00');
    expect(payload.text).toContain('до 1200 ₽/час');
    expect(payload.text).toContain('английский, забрать из сада');
    expect(payload.text).toContain('&lt;без давления&gt;');
    expect(payload.parse_mode).toBe('HTML');
    expect(payload.reply_markup.inline_keyboard[0][0].url).toBe(
      'https://www.blizko.app/admin/parents?q=a147df75',
    );
  });
});
