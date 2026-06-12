import { test, expect } from '@playwright/test';

import { attachConsoleGuard, assertNoProductErrors } from './support/console-guard';
import { PARENT_STATE, runMarker } from './support/env';

// Authenticated parent (storageState from the real UI OTP flow in global-setup).
test.use({ storageState: PARENT_STATE });

test('parent flow reaches /success and survives a reload', async ({ page }, testInfo) => {
  const issues = attachConsoleGuard(page);
  const marker = runMarker();

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('cta-start-matching').click();

  // Step 1 — family story carries the unique run marker for exact cleanup.
  await page
    .getByTestId('find-story')
    .fill(`E2E parent smoke. marker ${marker}. Малыш 2 лет, будни днём.`);
  await page
    .getByRole('button', { name: 'Малыши (1–3)', exact: true })
    .click()
    .catch(() => {});
  await page
    .getByRole('button', { name: 'Дневной', exact: true })
    .click()
    .catch(() => {});
  await page.getByTestId('find-continue').click();

  // Intermediate steps (district etc.) — advance until the budget step's submit.
  for (let i = 0; i < 4; i++) {
    if (await page.getByTestId('find-start-search').count()) break;
    const continueBtn = page.getByTestId('find-continue');
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    } else {
      break;
    }
  }

  await page.getByTestId('find-start-search').click();
  await page.getByTestId('summary-confirm').click();

  // Consent gate.
  await page.getByTestId('consent-terms').click();
  await page.getByTestId('consent-pd').click();
  await page.getByTestId('consent-submit').click();

  // Authenticated session => straight to /success (no OTP in the spec).
  await expect(page).toHaveURL(/\/success/, { timeout: 30_000 });
  await expect(page.getByTestId('success-screen')).toBeVisible();

  // Reload must keep a valid success screen.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('success-screen')).toBeVisible();

  await assertNoProductErrors(issues, testInfo);
});
