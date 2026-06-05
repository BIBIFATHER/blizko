import { expect, test, type Page } from '@playwright/test';

const adminTabs = [
  { view: 'parents', marker: /Заявки родителей/i },
  { view: 'nannies', marker: /Анкеты нянь/i },
  { view: 'bookings', marker: 'Ожидают старта или подтверждения' },
  { view: 'curator', marker: /Ручной подбор/i },
  { view: 'support', marker: 'Чаты с семьями' },
  { view: 'journal', marker: /Журнал действий/i },
];

async function openAdminPreview(page: Page) {
  await page.goto('/admin-preview?view=parents', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Заявки родителей/i).first()).toBeVisible();
  await page.waitForTimeout(700);
}

async function openAdminTab(page: Page, view: string, marker: string | RegExp) {
  await page.goto(`/admin-preview?view=${view}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(marker).first()).toBeVisible();
  await page.waitForTimeout(300);
}

async function expectOperationalAdminSurface(page: Page) {
  const surface = await page.evaluate(() => ({
    hasSplash: Boolean(document.getElementById('blizko-splash')),
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    fixedButtons: [...document.querySelectorAll('button')].filter(
      (button) => getComputedStyle(button).position === 'fixed',
    ).length,
  }));

  expect(surface).toEqual({
    hasSplash: false,
    hasHorizontalOverflow: false,
    fixedButtons: 0,
  });
}

test('admin preview tabs render without splash, overlay, or horizontal overflow', async ({
  page,
}) => {
  await openAdminPreview(page);

  for (const tab of adminTabs) {
    await openAdminTab(page, tab.view, tab.marker);
    await expectOperationalAdminSurface(page);
  }
});

test('curator matching flow explains why a nanny fits', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Covered once on desktop.');

  await openAdminPreview(page);
  await openAdminTab(page, 'curator', /Ручной подбор/i);
  await page.locator('button:has-text("Москва")').first().click();

  await expect(page.getByText('ПОЧЕМУ ПОДХОДИТ').first()).toBeVisible();
  await expect(page.getByText('Частичное совпадение').first()).toBeVisible();
  await expect(page.getByText('Есть сигналы доверия').first()).toBeVisible();
  await expect(page.getByText('Понятно, как семье принять решение').first()).toBeVisible();
  await expectOperationalAdminSurface(page);
});

test('parent card shows optional family compatibility profile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Covered once on desktop.');

  await openAdminPreview(page);
  await page.getByText('Москва, Хамовники').first().waitFor();
  await page.getByRole('button', { name: 'Открыть карточку' }).first().click();

  await expect(page.getByText('Профиль совместимости семьи')).toBeVisible();
  await expect(page.getByText('спокойный дом')).toBeVisible();
  await expect(page.getByText('нужны подробности')).toBeVisible();
  await expect(page.getByText('Уточнить до подбора')).toBeVisible();
  await expectOperationalAdminSurface(page);
});

test('mobile nanny cards keep the name readable before readiness status', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile layout contract.');

  await openAdminPreview(page);
  await page.getByRole('link', { name: 'Няни' }).first().click();

  const firstCard = page.locator('button:has-text("Мария Соколова")').first();
  await expect(firstCard.getByText('Мария Соколова')).toBeVisible();
  await expect(firstCard.getByText('Нужно ревью')).toBeVisible();
  await expectOperationalAdminSurface(page);
});
