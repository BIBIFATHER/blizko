import { describe, expect, it } from 'vitest';
import { canSend, isValidE164, normalizePhone } from './phone';

describe('phone OTP helpers', () => {
  it('normalizes Russian local and domestic formats to E.164', () => {
    expect(normalizePhone('8 (777) 123-45-67')).toBe('+77771234567');
    expect(normalizePhone('7771234567')).toBe('+77771234567');
    expect(normalizePhone('+7 (777) 123-45-67')).toBe('+77771234567');
  });

  it('validates only proper E.164 numbers', () => {
    expect(isValidE164('+77771234567')).toBe(true);
    expect(isValidE164('77771234567')).toBe(false);
    expect(isValidE164('+0123')).toBe(false);
  });

  it('allows sends for a fresh window and blocks after five attempts within the hour', () => {
    const now = Date.parse('2026-04-07T12:00:00.000Z');

    expect(canSend(now, null)).toEqual({
      ok: true,
      windowStart: now,
      sendCount: 0,
    });

    expect(
      canSend(now, {
        phone: '+77771234567',
        code: '123456',
        expires_at: '2026-04-07T12:05:00.000Z',
        attempts: 0,
        sent_at: '2026-04-07T11:59:00.000Z',
        window_start: '2026-04-07T11:10:00.000Z',
        send_count: 5,
      }),
    ).toEqual({
      ok: false,
      windowStart: Date.parse('2026-04-07T11:10:00.000Z'),
      sendCount: 5,
    });
  });

  it('resets the hourly window after one hour has passed', () => {
    const now = Date.parse('2026-04-07T12:00:00.000Z');

    expect(
      canSend(now, {
        phone: '+77771234567',
        code: '123456',
        expires_at: '2026-04-07T10:05:00.000Z',
        attempts: 0,
        sent_at: '2026-04-07T10:00:00.000Z',
        window_start: '2026-04-07T10:00:00.000Z',
        send_count: 5,
      }),
    ).toEqual({
      ok: true,
      windowStart: now,
      sendCount: 0,
    });
  });
});
