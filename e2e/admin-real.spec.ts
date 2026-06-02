import { expect, test, type Page } from '@playwright/test';

const now = Date.now();

const parentFixture = {
  id: 'parent-real-e2e-001',
  type: 'parent',
  status: 'new',
  city: 'Москва',
  district: 'Хамовники',
  metro: 'Фрунзенская',
  childAge: '3 года',
  schedule: 'частичная занятость',
  budget: 'до 1200 ₽/час',
  requirements: ['мягкая адаптация', 'ежедневная обратная связь'],
  comment: 'Ребенок тревожится при резкой смене взрослого.',
  requesterId: 'family-real-e2e-001',
  requesterEmail: 'family-real-e2e@example.com',
  riskProfile: {
    priorityStyle: 'warmth',
    reportingFrequency: 'daily',
    trustLevel: 4,
    familyStyle: 'warm',
    childStress: 'cry',
    nannyStylePreference: 'gentle',
    communicationPreference: 'frequent',
    needs: ['бережная адаптация'],
  },
  analysisNotes: 'Семье нужна спокойная няня с частой обратной связью.',
  createdAt: now - 86_400_000,
  updatedAt: now,
  changeLog: [
    {
      at: now - 86_400_000,
      type: 'created',
      by: 'user',
      note: 'Заявка создана',
    },
  ],
};

const nannyFixture = {
  id: 'nanny-real-e2e-001',
  type: 'nanny',
  userId: 'nanny-user-real-e2e-001',
  name: 'Мария Соколова',
  city: 'Москва',
  district: 'Хамовники',
  metro: 'Фрунзенская',
  experience: '8',
  schedule: 'частичная занятость',
  expectedRate: '1200 ₽/час',
  childAges: ['3 года', '4 года'],
  skills: ['адаптация', 'первая помощь', 'мягкие границы'],
  about: 'Спокойная няня с опытом бережной адаптации.',
  contact: '+7 900 000-00-00',
  isVerified: true,
  documents: [
    {
      type: 'passport',
      status: 'verified',
      aiConfidence: 96,
      aiNotes: 'Документ выглядит корректно',
      verifiedAt: now - 43_200_000,
    },
    {
      type: 'medical_book',
      status: 'pending',
      aiConfidence: 82,
      aiNotes: 'Нужно ручное подтверждение',
      verifiedAt: now - 21_600_000,
    },
  ],
  softSkills: {
    method: 'rule_based_v1',
    rawScore: 86,
    dominantStyle: 'Empathetic',
    summary: 'Спокойный поддерживающий стиль',
    familySummary: 'Подходит семьям, которым важны мягкость и регулярная обратная связь.',
    moderationSummary: 'Сильный профиль для тревожной адаптации.',
    completedAt: now - 60_000,
    coverage: 1,
    confidenceReason: 'full_answers',
    answeredItems: 8,
    totalItems: 8,
    traits: {
      empathy: 91,
      stability: 84,
      responsibility: 88,
      structure: 72,
    },
    signals: [
      {
        signal: 'empathy_first',
        strength: 0.9,
        direction: 'positive',
        evidence: ['Выбирает спокойное проговаривание'],
      },
    ],
  },
  riskProfile: {
    tantrumFirstStep: 'calm',
    routineStyle: 'balanced',
    conflictStyle: 'pause_then_discuss',
    emergencyReady: 'yes',
    disciplineStyle: 'gentle',
    communicationStyle: 'frequent',
    strengths: ['бережная адаптация', 'подробная обратная связь'],
    pcmType: 'harmonizer',
  },
  reviews: [
    {
      id: 'review-real-e2e-001',
      authorName: 'Анна',
      rating: 5,
      text: 'Няня спокойно помогла ребенку привыкнуть.',
      date: now - 172_800_000,
      bookingId: 'booking-real-e2e-001',
    },
  ],
  createdAt: now - 172_800_000,
};

const bookingFixture = {
  id: 'booking-real-e2e-001',
  parent_id: parentFixture.requesterId,
  nanny_id: nannyFixture.userId,
  request_id: parentFixture.id,
  date: new Date(now + 86_400_000).toISOString().slice(0, 10),
  status: 'pending',
  amount: '4800',
  created_at: new Date(now - 3_600_000).toISOString(),
};

async function seedAdminBuffer(page: Page) {
  await page.addInitScript(
    ({ parent, nanny, booking }) => {
      window.localStorage.setItem('blizko_parents', JSON.stringify([parent]));
      window.localStorage.setItem('blizko_nannies', JSON.stringify([nanny]));
      window.localStorage.setItem('blizko_bookings', JSON.stringify([booking]));
      window.localStorage.setItem(
        'blizko_admin_actions',
        JSON.stringify([
          {
            action: 'curator_note_saved',
            at: Date.now() - 10_000,
            adminId: 'mock-admin',
            meta: { parentId: parent.id },
          },
        ]),
      );
    },
    { parent: parentFixture, nanny: nannyFixture, booking: bookingFixture },
  );
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

async function openRealAdmin(page: Page, path = '/admin') {
  await seedAdminBuffer(page);
  await page.goto(`${path}?mockAdmin=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: /Родители/i })).toBeVisible();
  await expect(page.getByText(/Заявки родителей/i).first()).toBeVisible();
  await page.waitForTimeout(500);
}

test('real admin uses local buffer fallback and keeps dev admin navigation stable', async ({
  page,
}) => {
  await openRealAdmin(page);
  await expectOperationalAdminSurface(page);

  await page.getByRole('link', { name: /Няни/i }).click();
  await expect(page).toHaveURL(/\/admin\/nannies\?mockAdmin=1$/);
  await expect(page.getByRole('button', { name: /Мария Соколова/i })).toBeVisible();
  await expect(page.getByText('Личность подтверждена').first()).toBeVisible();
  await expect(page.getByText('Документы на проверке').first()).toBeVisible();
  await expectOperationalAdminSurface(page);

  await page.getByRole('link', { name: /Бронирования/i }).click();
  await expect(page).toHaveURL(/\/admin\/bookings\?mockAdmin=1$/);
  await expect(page.getByText(/Ожидают старта или подтверждения/i).first()).toBeVisible();
  await expect(page.getByText(/Мария Соколова|booking-real-e2e-001/i).first()).toBeVisible();
  await expectOperationalAdminSurface(page);
});

test('real admin parent card and curator assignment expose trust decisions', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Covered once on desktop.');

  await openRealAdmin(page, '/admin/parents');
  await expect(page.getByText('family-real-e2e@example.com')).toBeVisible();

  await page.getByRole('button', { name: 'Открыть карточку' }).first().click();
  await expect(page.getByText('Карточка заявки')).toBeVisible();
  await expect(page.getByText('Следующее действие:').first()).toBeVisible();
  await expect(page.getByText('Заметки куратора')).toBeVisible();
  await expect(page.getByText(parentFixture.analysisNotes).first()).toBeVisible();
  await page.getByRole('button', { name: 'Отклонить' }).click();
  await expect(page.getByText('Причина отклонения')).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).last().click();
  await page.getByRole('button', { name: 'Закрыть карточку заявки' }).click();

  await page.getByRole('link', { name: /Куратор/i }).click();
  await expect(page).toHaveURL(/\/admin\/curator\?mockAdmin=1$/);
  await page.locator('button').filter({ hasText: 'Москва' }).first().click();
  await expect(page.getByText('Почему подходит').first()).toBeVisible();
  await expect(page.getByText('Сильное совпадение').first()).toBeVisible();
  await expect(page.getByText('Личность подтверждена').first()).toBeVisible();

  await page.getByRole('button', { name: 'Назначить' }).first().click();
  await expect(page.getByText('Подтверждение')).toBeVisible();
  await expect(page.getByText(/Создастся бронирование/i)).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expectOperationalAdminSurface(page);
});
