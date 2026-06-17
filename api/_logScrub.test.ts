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

  it('drops credential/PD/content keys wholesale and scrubs the rest deeply', () => {
    const out = redactForLog({
      authorization: 'Bearer abc',
      phone: '+79991234567',
      email: 'a@b.ru',
      description: 'Иван Петров, Москва',
      inn: '7707083893',
      status: 'canceled',
      amount: 990,
      nested: { receipt: { items: [1] }, city: 'Москва' },
    });
    expect(out).toEqual({
      authorization: '[redacted]',
      phone: '[redacted]',
      email: '[redacted]',
      description: '[redacted]',
      inn: '[redacted]',
      status: 'canceled',
      amount: 990,
      nested: { receipt: '[redacted]', city: 'Москва' },
    });
  });

  it('does not throw on a throwing getter (fails closed)', () => {
    const evil = {};
    Object.defineProperty(evil, 'boom', {
      enumerable: true,
      get() {
        throw new Error('trap');
      },
    });
    // redactForLog may throw internally, but the logError wrapper must not.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => logError('x', evil)).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
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

  it('scrubs PD interpolated into the label', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logWarn('Paid parent request not found: 550e8400-e29b-41d4-a716-446655440000');
    expect(spy).toHaveBeenCalledWith('Paid parent request not found: [uuid]');
  });
});
