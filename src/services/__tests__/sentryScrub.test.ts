import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/react';
import { scrubText, scrubUrl, scrubBreadcrumb, scrubEvent } from '@/services/sentryScrub';

describe('scrubText', () => {
  it('redacts email, phone, long id and uuid; keeps benign text', () => {
    expect(scrubText('write elena@example.ru now')).toBe('write [email] now');
    expect(scrubText('call +7 999 123 45 67')).toBe('call [phone]');
    expect(scrubText('passport 4509123456')).toBe('passport [id]');
    expect(scrubText('id 550e8400-e29b-41d4-a716-446655440000')).toBe('id [uuid]');
    expect(scrubText('rendering NannyCard failed')).toBe('rendering NannyCard failed');
  });
});

describe('scrubUrl', () => {
  it('drops query string and fragment (addresses, tokens) and redacts base', () => {
    expect(scrubUrl('https://blizko.app/api/geocode?q=Москва, Хамовники')).toBe(
      'https://blizko.app/api/geocode',
    );
    expect(scrubUrl('https://blizko.app/profile#token=abc')).toBe('https://blizko.app/profile');
    expect(scrubUrl('https://blizko.app/u/550e8400-e29b-41d4-a716-446655440000')).toBe(
      'https://blizko.app/u/[uuid]',
    );
  });
});

describe('scrubBreadcrumb', () => {
  it('drops console breadcrumbs entirely', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'user elena@example.ru' })).toBeNull();
  });

  it('strips query from fetch/navigation urls and redacts message', () => {
    const out = scrubBreadcrumb({
      category: 'fetch',
      message: 'GET +7 999 123 45 67',
      data: { url: 'https://blizko.app/api/geocode?q=Тверская', method: 'GET' },
    });
    expect(out?.message).toBe('GET [phone]');
    expect((out?.data as Record<string, unknown>).url).toBe('https://blizko.app/api/geocode');
    expect((out?.data as Record<string, unknown>).method).toBe('GET');
  });

  it('strips navigation from/to urls', () => {
    const out = scrubBreadcrumb({
      category: 'navigation',
      data: { from: '/a?x=1', to: '/b?y=2' },
    });
    expect((out?.data as Record<string, unknown>).from).toBe('/a');
    expect((out?.data as Record<string, unknown>).to).toBe('/b');
  });
});

describe('scrubEvent', () => {
  it('redacts message/exception, strips request, minimizes user, scrubs breadcrumbs', () => {
    const event = {
      message: 'failed for elena@example.ru',
      exception: { values: [{ value: 'phone +7 999 123 45 67 invalid' }] },
      request: {
        url: 'https://blizko.app/api/geocode?q=Арбат',
        query_string: 'q=Арбат',
        data: { body: 'secret' },
        cookies: { sid: 'x' },
        headers: { authorization: 'Bearer t' },
      },
      user: { id: 'user-1', email: 'elena@example.ru', ip_address: '1.2.3.4' },
      breadcrumbs: [
        { category: 'console', message: 'leak elena@example.ru' },
        { category: 'fetch', data: { url: 'https://blizko.app/api/x?token=abc' } },
      ],
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);

    expect(out.message).toBe('failed for [email]');
    expect(out.exception?.values?.[0].value).toBe('phone [phone] invalid');
    expect(out.request?.url).toBe('https://blizko.app/api/geocode');
    expect(out.request?.query_string).toBeUndefined();
    expect(out.request?.data).toBeUndefined();
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.headers).toBeUndefined();
    expect(out.user).toEqual({ id: 'user-1' });
    expect(out.breadcrumbs).toHaveLength(1);
    expect((out.breadcrumbs?.[0].data as Record<string, unknown>).url).toBe(
      'https://blizko.app/api/x',
    );
  });

  it('empties user when there is no id', () => {
    const out = scrubEvent({ user: { email: 'a@b.ru' } } as unknown as ErrorEvent);
    expect(out.user).toEqual({});
  });
});
