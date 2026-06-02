import { expect, test, type Page } from '@playwright/test';

const adminTabs = [
  { label: 'Родители', marker: /Заявки родителей/i },
  { label: 'Няни', marker: /Анкеты нянь/i },
  { label: 'Бронирования', marker: 'Ожидают старта или подтверждения' },
  { label: 'Куратор', marker: /Ручной подбор/i },
  { label: 'Чаты', marker: 'Чаты с семьями' },
  { label: 'Журнал', marker: /Журнал действий/i },
];

async function openAdminPreview(page: Page) {
  await page.goto('/admin-preview?view=parents', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Заявки родителей/i).first()).toBeVisible();
  await page.waitForTimeout(700);
}

async function openAdminTab(page: Page, label: string, marker: string | RegExp) {
  await page.getByRole('link', { name: label }).first().click();
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

test('admin preview tabs render without splash, overlay, or horizontal overflow', async ({ page }) => {
  await openAdminPreview(page);

  for (const tab of adminTabs) {
    await openAdminTab(page, tab.label, tab.marker);
    await expectOperationalAdminSurface(page);
  }
});

test('curator matching flow explains why a nanny fits', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Covered once on desktop.');

  await openAdminPreview(page);
  await openAdminTab(page, 'Куратор', /Ручной подбор/i);
  await page.locator('button:has-text("Москва")').first().click();

  await expect(page.getByText('ПОЧЕМУ ПОДХОДИТ').first()).toBeVisible();
  await expect(page.getByText('Сильное совпадение').first()).toBeVisible();
  await expect(page.getByText('Личность подтверждена').first()).toBeVisible();
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
