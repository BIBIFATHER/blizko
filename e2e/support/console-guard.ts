import type { Page, TestInfo } from '@playwright/test';

/**
 * Console / network guard for the BLI-103 smoke.
 *
 * Collects console errors and failed/4xx-5xx responses, but only FAILS the run
 * on *product* errors. Known, separately-tracked non-product noise is allow-listed:
 *  - CSP `worker-src` blob violation  -> BLI-99
 *  - `mc.yandex.*` (Yandex Metrika)   -> BLI-102
 *  - Sentry / analytics envelopes
 */
const ALLOWLIST = [
  /worker-src/i, // BLI-99
  /mc\.yandex\./i, // BLI-102
  /yandex/i,
  /sentry/i,
  /cloudflareinsights/i,
  /doubleclick/i,
];

// Any of these in a console message or response url => hard product failure.
const HARD_FAIL = [
  /matching_outcomes/i,
  /PGRST\d+/i,
  /\b42703\b/i,
  /invalid input value for enum/i,
  /column .* does not exist/i,
];

const isNoise = (s: string) => ALLOWLIST.some((re) => re.test(s));

export interface CollectedIssues {
  consoleErrors: string[];
  apiErrors: string[]; // 4xx/5xx on /api/* or /rest/v1/*
  hardFailures: string[];
}

export function attachConsoleGuard(page: Page): CollectedIssues {
  const issues: CollectedIssues = { consoleErrors: [], apiErrors: [], hardFailures: [] };

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (HARD_FAIL.some((re) => re.test(text))) issues.hardFailures.push(`console: ${text}`);
    else if (!isNoise(text)) issues.consoleErrors.push(text);
  });

  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    if (HARD_FAIL.some((re) => re.test(url))) issues.hardFailures.push(`net ${status}: ${url}`);
    if (status >= 400 && /\/api\/|\/rest\/v1\//.test(url) && !isNoise(url)) {
      issues.apiErrors.push(`${status} ${url}`);
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (HARD_FAIL.some((re) => re.test(url))) issues.hardFailures.push(`requestfailed: ${url}`);
  });

  return issues;
}

/** Assert no product errors were collected. Attaches detail to the test report. */
export async function assertNoProductErrors(
  issues: CollectedIssues,
  testInfo: TestInfo,
): Promise<void> {
  const { expect } = await import('@playwright/test');
  await testInfo.attach('console-network-issues', {
    body: JSON.stringify(issues, null, 2),
    contentType: 'application/json',
  });
  expect(
    issues.hardFailures,
    `schema/PGRST hard failures: ${issues.hardFailures.join(' | ')}`,
  ).toEqual([]);
  expect(issues.apiErrors, `core API 4xx/5xx: ${issues.apiErrors.join(' | ')}`).toEqual([]);
  expect(
    issues.consoleErrors,
    `unexpected product console errors: ${issues.consoleErrors.join(' | ')}`,
  ).toEqual([]);
}
