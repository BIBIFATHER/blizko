import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrubLogText, redactForLog, logError, logWarn } from './_logScrub';

describe('scrubLogText', () => {
  it('redacts email/phone/uuid/long-id; keeps benign text', () => {
    expect(scrubLogText('user elena@example.ru +7 999 123 45 67')).toBe('user [email] [phone]');
    expect(scrubLogText('row 550e8400-e29b-41d4-a716-446655440000')).toBe('row [uuid]');
    expect(scrubLogText('passport 4509123456')).toBe('passport [phone]');
    expect(scrubLogText('connection refused')).toBe('connection refused');
  });

  it('clips very long strings', () => {
    const out = scrubLogText('x'.repeat(600));
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(501);
  });
});

describe('redactForLog', () => {
  it('reduces an Error to name + scrubbed message', () => {
    expect(redactForLog(new Error('failed for elena@example.ru'))).toEqual({
      name: 'Error',
      message: 'failed for [email]',
    });
  });

  it('drops sensitive keys wholesale and scrubs the rest deeply', () => {
    const out = redactForLog({
      authorization: 'Bearer abc',
      phone: '+79991234567',
      email: 'a@b.ru',
      note: 'call elena@example.ru',
      status: 'canceled',
      amount: 990,
      nested: { receipt: { items: [1] }, city: 'Москва' },
    });
    expect(out).toEqual({
      authorization: '[redacted]',
      phone: '[redacted]',
      email: '[redacted]',
      note: 'call [email]',
      status: 'canceled',
      amount: 990,
      nested: { receipt: '[redacted]', city: 'Москва' },
    });
  });

  it('redacts sensitive-looking object keys', () => {
    expect(redactForLog({ 'elena@example.ru': 'x' })).toEqual({ '[email]': 'x' });
  });
});

describe('logError / logWarn', () => {
  afterEach(() => vi.restoreAllMocks());

  it('passes a redacted value to console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('YooKassa error:', { email: 'a@b.ru', status: 'pending' });
    expect(spy).toHaveBeenCalledWith('YooKassa error:', {
      email: '[redacted]',
      status: 'pending',
    });
  });

  it('logs only the label when no value is given', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logWarn('credentials missing');
    expect(spy).toHaveBeenCalledWith('credentials missing');
  });
});
