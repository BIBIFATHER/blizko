import { test, expect } from '@playwright/test';

import { attachConsoleGuard, assertNoProductErrors } from './support/console-guard';
import { ADMIN_STATE } from './support/env';

// Real admin session (server-side magiclink in global-setup; never service-role in the browser).
test.use({ storageState: ADMIN_STATE });

test('admin can open /admin/parents and see the parents list', async ({ page }, testInfo) => {
  const issues = attachConsoleGuard(page);

  await page.goto('/admin/parents', { waitUntil: 'domcontentloaded' });

  // Real admin route renders the parents tab under the real admin JWT.
  await expect(page.getByTestId('admin-parents-list')).toBeVisible({ timeout: 30_000 });
  // At least the list surface is present; rows depend on data in the env.
  await expect(page.getByTestId('parent-row').first()).toBeVisible({ timeout: 30_000 });

  await assertNoProductErrors(issues, testInfo);
});
