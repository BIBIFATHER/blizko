import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/react';
import {
  scrubText,
  scrubUrl,
  scrubBreadcrumb,
  scrubEvent,
  filterSentryIntegrations,
} from '@/services/sentryScrub';

describe('scrubText', () => {
  it('redacts email, phone, long id and uuid; keeps benign text', () => {
    expect(scrubText('write elena@example.ru now')).toBe('write [email] now');
    expect(scrubText('call +7 999 123 45 67')).toBe('call [phone]');
    expect(scrubText('compact +79991234567 here')).toBe('compact [phone] here');
    expect(scrubText('id 550e8400-e29b-41d4-a716-446655440000')).toBe('id [uuid]');
    expect(scrubText('rendering NannyCard failed')).toBe('rendering NannyCard failed');
  });

  it('redacts a bare long digit run (no leftover punctuation)', () => {
    // PHONE runs before the bare-id pass: a compact number is fully consumed.
    expect(scrubText('num 4509123456 end')).toBe('num [phone] end');
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

  it('strips query from fetch urls and redacts message', () => {
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
    const out = scrubBreadcrumb({ category: 'navigation', data: { from: '/a?x=1', to: '/b?y=2' } });
    expect((out?.data as Record<string, unknown>).from).toBe('/a');
    expect((out?.data as Record<string, unknown>).to).toBe('/b');
  });
});

describe('scrubEvent', () => {
  it('redacts message/exception/transaction, strips request, drops user, scrubs metadata + breadcrumbs', () => {
    const event = {
      message: 'failed for elena@example.ru',
      transaction: '/nanny/ekaterina-550e8400-e29b-41d4-a716-446655440000?ref=x',
      exception: { values: [{ value: 'phone +7 999 123 45 67 invalid' }] },
      request: {
        url: 'https://blizko.app/api/geocode?q=Арбат',
        query_string: 'q=Арбат',
        data: { body: 'secret' },
        cookies: { sid: 'x' },
        headers: { authorization: 'Bearer t' },
      },
      user: { id: 'user-1', email: 'elena@example.ru', ip_address: '1.2.3.4' },
      server_name: 'host-1',
      tags: { contact: 'elena@example.ru', screen: 'parent_form' },
      extra: { note: 'call +7 999 123 45 67', count: 3 },
      contexts: {
        react: { componentStack: 'at NannyCard' },
        custom: { addr: 'Москва, Арбат elena@example.ru' },
        trace: { trace_id: 'abc', span_id: 'def' },
      },
      fingerprint: ['elena@example.ru', 'boundary'],
      breadcrumbs: [
        { category: 'console', message: 'leak elena@example.ru' },
        { category: 'fetch', data: { url: 'https://blizko.app/api/x?token=abc' } },
      ],
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);

    expect(out.message).toBe('failed for [email]');
    expect(out.transaction).toBe('/nanny/ekaterina-[uuid]');
    expect(out.exception?.values?.[0].value).toBe('phone [phone] invalid');
    expect(out.request?.url).toBe('https://blizko.app/api/geocode');
    expect(out.request?.query_string).toBeUndefined();
    expect(out.request?.data).toBeUndefined();
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.headers).toBeUndefined();
    expect(out.user).toBeUndefined();
    expect(out.server_name).toBeUndefined();
    expect(out.tags).toEqual({ contact: '[email]', screen: 'parent_form' });
    expect(out.extra).toEqual({ note: 'call [phone]', count: 3 });
    expect((out.contexts as Record<string, Record<string, unknown>>).custom.addr).toBe(
      'Москва, Арбат [email]',
    );
    expect((out.contexts as Record<string, Record<string, unknown>>).trace).toEqual({
      trace_id: 'abc',
      span_id: 'def',
    });
    expect(out.fingerprint).toEqual(['[email]', 'boundary']);
    expect(out.breadcrumbs).toHaveLength(1);
    expect((out.breadcrumbs?.[0].data as Record<string, unknown>).url).toBe(
      'https://blizko.app/api/x',
    );
  });

  it('scrubs object KEYS in deep metadata and logentry + stack frames', () => {
    const event = {
      tags: { 'elena@example.ru': 'value' },
      logentry: { message: 'user 4509123456 failed', params: ['+7 999 123 45 67', 7] },
      exception: {
        values: [
          {
            value: 'boom',
            stacktrace: {
              frames: [{ filename: 'https://blizko.app/app.js?token=abc', function: 'render' }],
            },
          },
        ],
      },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);
    expect(out.tags).toEqual({ '[email]': 'value' });
    expect(out.logentry?.message).toBe('user [phone] failed');
    expect(out.logentry?.params).toEqual(['[phone]', 7]);
    expect(out.exception?.values?.[0].stacktrace?.frames?.[0].filename).toBe(
      'https://blizko.app/app.js',
    );
  });
});

describe('filterSentryIntegrations', () => {
  it('drops BrowserSession / Replay / BrowserTracing, keeps error integrations', () => {
    const defaults = [
      { name: 'GlobalHandlers' },
      { name: 'Breadcrumbs' },
      { name: 'HttpContext' },
      { name: 'BrowserSession' },
      { name: 'Replay' },
      { name: 'BrowserTracing' },
    ];
    const kept = filterSentryIntegrations(defaults).map((i) => i.name);
    expect(kept).toEqual(['GlobalHandlers', 'Breadcrumbs', 'HttpContext']);
  });
});
