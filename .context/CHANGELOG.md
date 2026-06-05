# Blizko — CHANGELOG

---

## 2026-06-05 (Fri)

### fix(db): TYPE mismatch + атомарное удаление аккаунта

- `20260101000000`: `chat_threads.match_id TEXT→UUID` (FK был невалиден, блокировал `db reset`)
- `delete-account.ts`: SQL в транзакции BEGIN/ROLLBACK/COMMIT; auth.delete до COMMIT — откат при ошибке

### BLI-94: In Progress (не Done)

`supabase db reset` не верифицирован — требует Docker Desktop.
После запуска Docker:
```bash
supabase start && supabase db reset && supabase db diff --linked
```
Закрывать BLI-94 только после чистого `db reset`.

---

## 2026-06-04 (Thu) — BLI-97: revoke client grants на service-only таблицах

### Security

- Все `public.*` имели дефолтные anon/authenticated гранты (вкл. INSERT/UPDATE/
  DELETE) и держались только на RLS. Пять служебных таблиц, которые клиент
  **никогда** не читает (verified: 0 supabase-обращений в `src/`; realtime только
  на support/chat), захардненены: `REVOKE ALL` с anon/authenticated.
  - `phone_otps` (OTP-коды), `admin_actions`, `support_agents`,
    `analytics_events`, `referrals`.
- API ходит service-ключом (bypass) → нулевое влияние на работу; defense in depth
  поверх RLS. Совпадает с acceptance BLI-20.
- `supabase/migrations/20260604140000_revoke_service_only_table_grants.sql`.
  **Применено в прод** (MCP), verified: гранты сняты у всех 5; anon →
  `permission denied for table phone_otps`.

### Follow-up (вне scope, заведены отдельно)

- `nannies_public` SECURITY DEFINER (ERROR) — флип на `security_invoker` с
  проверкой RLS на `nannies`.
- `function_search_path_mutable`, `auth_leaked_password_protection`.

---

## 2026-06-04 (Thu) — BLI-93/96/95: cleanup + восстановление аудита

Follow-up из BLI-64. (BLI-94 — baseline reconciliation — **остаётся открытым**:
сюда по ошибке попал security_audit_log фикс, он вынесен в BLI-96.)

### BLI-93 — Dev Supabase URL

- `.env.local` (local-only): `VITE_SUPABASE_URL` и `SUPABASE_URL` указывали на
  `blizko-seo-worker.blizko-ai.workers.dev` (SEO-воркер, отдаёт HTML-404 на
  `/rest/v1/*`) → локальная разработка била supabase через сломанный прокси.
  Исправлено на канонический хост `geomyyfjvemdphaeimkz.supabase.co`.
- `.env.example` — добавлен документированный блок client-side `VITE_SUPABASE_URL`
  / `VITE_SUPABASE_ANON_KEY` с предупреждением «канон-хост, не прокси».

### BLI-96 — security_audit_log отсутствовал в проде

- Проверка прод-БД (MCP): таблицы `security_audit_log` **не существовало**
  (`to_regclass = null`), хотя `api/_audit.ts` пишет в неё (fire-and-forget,
  silent `.catch()`) и `api/data.ts` читает как источник product-аналитики.
  Итог: **все аудит-события в проде молча терялись**, часть аналитики битая.
  Определена только в `migrations_legacy/`, в прод не накатывалась.
- `supabase/migrations/20260604130000_create_security_audit_log.sql` — создаёт
  таблицу (схема из legacy), RLS service-role only, индексы; `REVOKE ALL` с
  anon/authenticated (sensitive: IP/phone/user_id, API ходит service-ключом).
  **Применено в прод** (MCP), verified: таблица есть, RLS on, anon доступа нет,
  advisors без новых ERROR.

### BLI-95 — CI format-gate

- `.prettierignore` — корневые `*.md` (рукописные доки) выведены из-под prettier;
  раньше `npm run format` тянул 100+ доков (и мог снести `BOOTSTRAP.md` из diff'а).
- Одноразово отформатирован накопленный код-долг (17 файлов: src/api/scripts/
  config, `index.html`, `vercel.json` и пр.).
- `.github/workflows/ci.yml` — добавлен шаг `Format check` (`npm run format:check`)
  после Lint → формат-долг больше не копится молча.

### Verified

- ✅ `npm run format:check` / `lint` / `typecheck` / `build`

---

## 2026-06-04 (Thu) — BLI-64: починка production matching-chain

Симптомы в проде: `/api/ai` aborted, `matching_weights`/`matching_insights` 404,
`matching_outcomes` 400. Код фронта корректен и деградирует мягко — отказы были
на уровне schema/permissions/таймаут-бюджета, не TS-логики.

### Root cause

- **`/api/ai` aborted** — `api/ai.ts`: 2 модели × (1+`MAX_RETRIES`=3) попытки ×
  `REQUEST_TIMEOUT_MS=20s` ≈ до 120s, без `config.maxDuration`. После BLI-85 сайт
  за Cloudflare (~100s proxy timeout) → длинные вызовы Gemini обрывались апстримом
  до ответа; клиент (`aiGateway.ts`, без AbortController) видел aborted.
- **weights/insights 404** — проверка прод-БД через Supabase MCP: таблиц
  `matching_weights` / `matching_insights` **не существует вообще**
  (`to_regclass = null`). `prod_baseline` числится applied, но эти таблицы там
  не накатились — локальный baseline.sql рассинхронен с реально применённым.
  PostgREST на missing relation → 404. Лоадеры (`matchingWeights.ts`,
  `insightsLoader.ts`) читают client-side под anon-ключом → молчаливый фолбэк на
  дефолты, learning-слой мёртв. (Первоначальная гипотеза «RLS service_role only»
  оказалась неполной — таблиц нет.)
- **`matching_outcomes` 400** — upsert `onConflict:'parent_id,nanny_id'` без
  unique-constraint. По факту в проде constraint
  `matching_outcomes_parent_nanny_key UNIQUE(parent_id,nanny_id)` **уже применён**
  (`20260529091537`) → 400 **уже закрыт**, отдельных действий не требует.

### Changed

- `api/ai.ts` — добавлен `export const config = { maxDuration: 60 }`;
  `REQUEST_TIMEOUT_MS` 20s→12s; глобальный дедлайн `TOTAL_DEADLINE_MS=45s` в
  retry-цикле — новые upstream-вызовы не стартуют, если выйдут за бюджет.
  Worst case ~45s < 60s maxDuration < ~100s CF. Нормальный путь (flash <10s) не задет.

### Added

- `supabase/migrations/20260604120000_matching_weights_insights_client_read.sql` —
  **создаёт** таблицы `matching_weights` (+seed 17 весов = текущие
  `DEFAULT_WEIGHTS`) и `matching_insights`, включает RLS, оставляет записи
  service-role only, даёт read-only (`*_client_read` SELECT + GRANT) для
  anon/authenticated. Таблицы non-PII. Идемпотентно (`IF NOT EXISTS` + guard'ы).

### Verified

- ✅ `npm run typecheck`
- ✅ `npx vitest run` (AI + matching: 18 passed)
- ✅ `npm run build`

### Applied to prod (Supabase MCP, project geomyyfjvemdphaeimkz)

- ✅ Миграция `matching_weights_insights_client_read` применена (`apply_migration`).
- ✅ Проверено: обе таблицы существуют, `matching_weights` = 17 строк, политики
  `*_client_read` + `*_service_only` на месте; чтение под ролью `anon` возвращает
  17 строк → **404 закрыт**.
- ✅ `400` уже был закрыт ранее (constraint `matching_outcomes_parent_nanny_key`).
- ✅ `get_advisors security` — новых ERROR нет; weights/insights попадают в
  `pg_graphql_anon_table_exposed` (WARN) **намеренно** (non-PII, нужен client read).
- `/api/ai` abort-фикс — во фронт-деплое (merge в `main`), едет через Vercel.

### Follow-up (отдельные мелкие задачи, не BLI-64)

- `prod_baseline.sql` рассинхронен с реальным продом (декларирует таблицы, которых
  нет) — выверить baseline.
- CI не гоняет `format:check` → формат-долг копится молча (см. 5 неформатированных
  файлов из BLI-85/88). Добавить шаг в CI.

---

## 2026-06-03 (Wed) — BLI-88: optional parent compatibility layer

### Changed

- ✅ Added optional parent compatibility signals for curator matching: home rhythm, adaptation style, boundary style, parent support needs, and decision style.
- ✅ Extended the v0 compatibility explanation model with family-profile reasons for rhythm, first shift, boundaries, parent support, and decision format.
- ✅ Added an admin parent-card panel for the optional family compatibility profile and curator follow-up prompts.
- ✅ Hardened the parent form state so skipped optional compatibility answers are not auto-filled with defaults.
- ✅ Added regression and e2e coverage for optional profile behavior and admin preview visibility.

### Verified

- ✅ `npm run typecheck`
- ✅ `npm run lint`
- ✅ `npm test -- --run`
- ✅ `npm run build`
- ✅ `npm run test:e2e` (`8 passed / 4 skipped`)

---

## 2026-06-03 (Wed) — BLI-85: доступность из РФ без VPN (Вариант A)

### Changed

- `vercel.json` — добавлены явные `Cache-Control` заголовки:
  - `/assets/*` → `public, max-age=31536000, immutable` (Vite content-hash → long cache безопасен; CF кеширует на российских edge-узлах)
  - `*.png|ico|svg|woff2` → `public, max-age=604800, stale-while-revalidate=86400`
  - `/` → `public, max-age=0, must-revalidate`
- `index.html` — Google Fonts загружается асинхронно (`preload` → `onload`); страница рендерится с системными шрифтами если Google Fonts недоступен на сети
- `public/sw.js` — убран `/` из `PRE_CACHE`; SW не кеширует HTML-документ и не блокирует обновление при новом деплое

### Added

- `infra/nginx-rf-proxy.conf` — готовый Nginx-конфиг для российского VPS (Timeweb/Selectel); использовать как Вариант B если CF edge кеша недостаточно
- `docs/adr/001-rf-availability.md` — зафиксировано архитектурное решение и критерии перехода к VPS

---

## 2026-05-26 (Tue) — DEV DEBT: vite proxy мисроутит весь /api в AI worker

### Tech debt (dev-experience, prod НЕ затронут)

- `vite.config.ts` server.proxy: `'/api'` → `https://ai-proxy.blizko-ai.workers.dev`
  ловит **все** `/api/*` в dev → не-AI эндпоинты (data/notify/payments/auth/nannies)
  мисроутятся в AI-воркер.
  - Симптомы в dev: `POST /api/data?resource=analytics` → 400 `{"error":"Empty prompt"}`;
    `GET /api/nannies?id=...` → 405.
  - **Prod не затронут:** vite-прокси только в dev; в проде `/api/*` идёт в реальные
    serverless-функции (`api/data.ts`, `api/nannies.ts` существуют и работают).
- **Решение позже (отдельно):** сузить прокси — только AI-роут на ai-proxy, остальной
  `/api/*` на `vercel dev` или задеплоенный preview. Не делать сейчас.

---

## 2026-05-24 (Sun) — ProfileTab: удаление мёртвого кода и редизайн

### Deleted

- ✅ **`src/components/referral/ReferralWidget.tsx`** — хардкод «0 приглашений / 0 бонусов», бэкенда нет
- ✅ **`src/services/referral.ts`** — localStorage-заглушка без реального бэкенда

### Changed (`src/components/profile/ProfileTab.tsx`)

- Удалены: `ReferralWidget`, платёжная карточка (`isRegistrationPaid`), UUID-чип «User ID», импорты `Wallet`/`Lock`
- Дизайн: все карточки переведены на `section-shell rounded-[1.5rem]` (единый токен)
- Верификация телефона вынесена в отдельный `section-shell`-блок
- Статистика няни показывается только при наличии реальных данных (`hasNannyStats`)
- Карточки запросов родителей → `section-shell rounded-[1.5rem]` вместо `Card p-4!`
- Асинхронные вызовы (`sendPhoneCode`, `verifyPhoneCode`, `handleResubmit`) правильно помечены `void`

---

## 2026-05-24 (Sun) — BLI-20: Supabase RLS smoke audit

### Findings

- ⚠️ **`nannies_public` view**: GRANT был только `authenticated`, не `anon`.
  Анонимные родители не могли читать список нянь — потенциальный product-баг.
- ✅ `nannies` raw table: только owner + service_role — ок.
- ✅ `parents`: только owner + service_role — ок.
- ✅ `admin_actions`, `analytics_events`, `payments`: service_role only — ок.

### Fixed

- ✅ **`supabase/migrations/20260524000000_rls_smoke_fixes.sql`**:
  - `GRANT SELECT ON nannies_public TO anon`
  - Пересоздаёт view с `security_invoker = false` (explicit)
  - Idempotent `ALTER TABLE … ENABLE ROW LEVEL SECURITY`
    для `analytics_events`, `admin_actions`, `payments`
- ✅ **`scripts/check_nannies_rls.sh`** — добавлены
  `check_service_only` проверки для `admin_actions`,
  `analytics_events`, `payments` (anon + authenticated).

### How to run smoke tests

Нужен прямой URL Supabase проекта (не через CF Worker):

```bash
SUPABASE_URL="https://<project>.supabase.co" \
ANON_KEY="<anon_key>" \
USER_JWT="<session_token>" \
OWNER_USER_ID="<user_id>" \
bash scripts/check_nannies_rls.sh
```

---

## 2026-05-24 (Sun) — BLI-27: Документы и фото нянь → Supabase Storage

### Done

- ✅ **`src/services/storageUpload.ts`** — новый сервис: `uploadDocumentFile` и
  `uploadPhotoFile`. Загружают в бакеты `nanny-documents` и `nanny-photos`.
  Graceful fallback: если Supabase недоступен — возвращает `null`, компонент
  сам решает что делать.
- ✅ **`DocumentUploadModal`** — параллельный вызов `analyzeDocument` +
  `uploadDocumentFile`; `fileDataUrl` — permanent Storage URL.
  Fallback на `objectUrl` если Storage off.
- ✅ **`Step1_BasicInfo`** — `handlePhotoUpload` стал async; пробует
  `uploadPhotoFile`, fallback на `readAsDataURL` (base64) если недоступен.
- ✅ **`.env.example`** — добавлены `VITE_SUPABASE_DOCS_BUCKET` и
  `VITE_SUPABASE_PHOTOS_BUCKET`.

### Что создать в Supabase Dashboard

Нужно создать два публичных бакета вручную (или через миграцию):

- `nanny-documents` — public, mime: image/\*, application/pdf
- `nanny-photos` — public, mime: image/\*

---

## 2026-05-24 (Sun) — BLI-39: Убрать платёжный гейт (временно бесплатно)

### Done

- ✅ **Удалён `PaymentModal.tsx`** — мёртвый мок с Tochka Bank-брендингом,
  нигде не использовался.
- ✅ **Удалены переводы Tochka/payment-mock** — 16 ключей (ru + en),
  `payTitle`, `tochkaBank`, `methodCard`, `methodSBP` и т.д.
- ✅ Бэкенд YooKassa (`api/payments/`) сохранён без изменений — вернём
  к нему когда выберем провайдера.
- ✅ **Все 44 теста зелёные.**

---

## 2026-05-24 (Sun) — BLI-34: Журнал аудита с adminId

### Done

- ✅ **`AdminPage`** — получает `currentAdminId` из Supabase-сессии при монтировании.
- ✅ **Локальные записи** — `logAdminAction` и `logWorkflowEvent` теперь включают
  `adminId` в кеш localStorage.
- ✅ **Серверные записи** — `admin_id` уже сохранялся в `admin_actions`,
  теперь отображается.
- ✅ **`AdminJournalTab`** — каждая строка показывает `admin:xxxxxxxx` (первые 8 символов
  UUID); `title` содержит полный ID; adminId добавлен в поиск.

---

## 2026-05-24 (Sun) — BLI-33: Отправка уведомлений из админки

### Done

- ✅ **`adminSendNotification`** — новая функция в `adminApi.ts` (POST /api/notify).
- ✅ **Детальная модалка родителя** — секция «Уведомления»:
  - кнопка «Повторить уведомление о статусе» (notifyUserStatusChanged);
  - compose-форма: тема + текст → кастомный email родителю.
- ✅ Скрывается если `requesterEmail` не задан.

---

## 2026-05-24 (Sun) — BLI-32: Куратор-таб для ручного матчинга

### Done

- ✅ **`AdminCuratorTab`** — новый компонент: сплит-вью «заявки | няни».
- ✅ **Совместимость** — скоринг по городу, графику, возрасту, верификации (0–100%).
- ✅ **Назначение** — диалог подтверждения → `createBooking` → toast + `onDataChanged`.
- ✅ **Таб «Куратор»** добавлен в `AdminPage` (иконка `Blend`, роут `/admin/curator`).

---

## 2026-05-24 (Sun) — BLI-31: analysisNotes в карточке родителя

### Done

- ✅ **`ParentRequest.analysisNotes?: string`** — добавлено поле в тип.
- ✅ **Карточка в списке** — если `analysisNotes` задан, показывается янтарный блок «Заметка: ...».
- ✅ **Детальная модалка** — секция «Заметки куратора» с inline-редактированием: textarea + кнопки «Сохранить» / «Отмена».
- ✅ **Сохранение** — через `adminUpdateParentRequest`, после сохранения обновляется `selectedParent` и вызывается `onDataChanged`.

---

## 2026-05-24 (Sun) — BLI-18: Release gate passed

### Done

- ✅ **`npm run build`** — чистая сборка, 0 ошибок.
- ✅ **`npm run lint`** — 0 ошибок (устранён unused `toggleLanguage` + `setLang` в App.tsx).
- ✅ **`npm test`** — 44/44 тестов прошли.
- ✅ **Smoke routes (локально)**: `/`, `/find-nanny`, `/success`, `/match-results`, `/nanny/:slug?mock=1` — все 5/5.
- ✅ **Vercel preview** — `blizko-3-6qpjg4jws-blizkos-projects.vercel.app` — 4/4 маршрутов.

---

## 2026-05-24 (Sun) — BLI-17: Accessibility and reduced-motion pass

### Done

- ✅ **Глобальный `:focus-visible` ринг** — `2px solid var(--color-primary)` + `outline-offset: 2px` для всех интерактивных элементов (кнопки, ссылки, чипы).
- ✅ **`.btn-honey:focus-visible`** — усиленный ринг с box-shadow для главного CTA.
- ✅ **`prefers-reduced-motion` усилен** — `.animate-fade-in`, `.animate-slide-up`, `.animate-fade-up`, `.animate-pop-in`, `.animate-scale-in`, `.animate-slide-down` сбрасываются в `opacity: 1; transform: none` (без мигания от промежуточных keyframe состояний). `.btn-honey-pulse` также отключён.
- ✅ **Splash экран** — уже корректно обрабатывал `prefers-reduced-motion` (`animation: none; opacity: 1`).
- ✅ **Иконочные кнопки** — AppHeader back button имеет `aria-label`. Все форм-чипы — правильные `<button type="button">`.
- ✅ **`outline-none`** — в публичных компонентах нет голого `outline-none` без замены.

---

## 2026-05-24 (Sun) — CI: test expectations after brand voice pass

### Done

- ✅ **Unit tests fixed** — `matchingAiResult.test.ts` ожидания обновлены под BLI-19 vocabulary: `няни`, `вариант`, `matches` вместо старых `кандидат/матч`.
- ✅ **Smoke E2E fixed** — `e2e_test.py` теперь проходит актуальный story-first ParentForm: textarea → `Малыши` → `Продолжить`.

### Effect

- GitHub Actions quality failure на run `26359085953` устранён локально.
- Smoke E2E больше не сломается после прохождения quality job.

---

## 2026-05-24 (Sun) — BLI-13: NannyPublicProfile trust architecture

### Done

- ✅ **Убран collapsible** — About, Work Style, Skills+Ages теперь всегда видны, не скрыты под toggle.
- ✅ **Новый раздел "Что обсудить при знакомстве"** — static copy куратора о первой встрече (ru+en).
- ✅ **CTA переработан** — "Начать подбор" → "Познакомиться с [firstName]" + подпись "Куратор поможет организовать встречу".
- ✅ **Badge labels** — "Модерация пройдена" → "Профиль проверен"; "Soft skills оценены" → "Характер и стиль изучены"; "Есть отзывы" → "Есть отзывы семей".
- ✅ **profileOpenWhyTitle/Body** — переписано с meta-UX-описания на куратора-голос: "Почему именно эта няня".
- ✅ **profileStyleTitle** — "Стиль работы с детьми" → "Характер и стиль работы".
- ✅ **profileSkillsTitle** — "Навыки" → "Навыки и занятия".
- ✅ **Порядок секций**: Hero → About → Work Style → Reviews → "Что обсудить" → Skills+Ages → CTA.

---

## 2026-05-24 (Sun) — BLI-12: MatchResults as curated shortlist

### Done

- ✅ **h1 динамический** — "Куратор подобрал N вариантов для вашей семьи" (ru) / "Your curator found N matches for your family" (en), вместо статичного заголовка.
- ✅ **Ограничение до 3 карточек** — `candidates.slice(0, 3)`.
- ✅ **CTA** — "Открыть профиль" → "Познакомиться" / "Meet this nanny".
- ✅ **Eyebrow** — "Подборка куратора" / "Curated by Blizko".
- ✅ **Текст секции** — курatorский голос: "Куратор поставил сначала тех, кто точнее всего совпал...".

---

## 2026-05-24 (Sun) — BLI-19: Brand Voice copy pass

### Done

- ✅ **translations.ts** — убраны все "shortlist", "кандидат", "Humanity+" из пользовательских строк. `heroSubtitle`, `homeProofChips`, `trust2Title/Detail`, `explainText`, `shortlist*`, `parentEtaLine`, `successDesc`, `recsTitle`, `successMatchingTitle`, `successProcessingNote` — полный перевод на язык куратора (RU + EN).
- ✅ **SuccessScreen.tsx** — "Готовим shortlist" → "Готовим варианты"; subtitle "подготовит 2–3 варианта".
- ✅ **CompatibilityModal.tsx** — "shortlist" → "подборка"; "кандидат" → "няня"; "Shortlist" → "Подборка".
- ✅ **MatchResultsScreen.tsx** — "Кандидат N" → "Вариант N"; "Shortlist" → "Подборка/Your options"; "вернуться к shortlist" → "вернуться к списку"; hardcoded "Пока кандидатов нет" → "Пока нянь нет".
- ✅ **AppHeader.tsx** — "/match-results" title "Ваш shortlist" → "Подборка от куратора".
- ✅ **Step1_Requirements.tsx** — описание "для shortlist" → "куратор понял, кого именно искать".
- ✅ **Step2_Calendar.tsx** — "список кандидатов" → "куратор найдёт подходящий вариант".
- ✅ **matchingAiResult.ts** — "Кандидат/Candidate" → "Няня/Nanny"; pluralize "кандидатов" → "нянь"; overallAdvice и рекомендации.
- ✅ **pushNotifications.ts** — "кандидатов" → "нянь".
- ✅ **assessment.ts** — поведенческие описания "кандидат" → "няня".
- ✅ **SeoPages.tsx** — schema "кандидат попал в shortlist" → "эта няня подошла".
- ✅ **LegalPages.tsx** — "shortlist" → "2–3 подходящих варианта".

---

## 2026-05-24 (Sun) — BLI-7/8: ParentForm story flow + budget

### Done

- ✅ **BLI-7 Step1_FamilyStory** — textarea + story chips (6 эмоц. фраз) + опциональные чипы возраста и графика. City удалён из Step 1.
- ✅ **BLI-7 Step2_Calendar** — Город перенесён в Step 2 (с Nominatim autocomplete и GPS кнопкой). `locationError` выводится inline (alert убран).
- ✅ **Геолокация починена** — удалён запрещённый `User-Agent` заголовок, `alert()` заменён на inline state.
- ✅ **BLI-8 Step3_FamilyProfile** — добавлены RangeSlider бюджета (hourly + monthly), Nanny Sharing toggle, requirements chips в collapsed extras. Все поля из старого Step1_Requirements теперь присутствуют в flow.

---

## 2026-05-23 (Sat) — Animated splash screen + Blizko logo mark

### Done

- ✅ **Logo SVG** — `public/logo.svg`: two overlapping circles (teal #2A6B6E + copper #C4744A) on warm paper background `#F9F6F2`, rounded-rect format, ready for icon export.
- ✅ **Inline HTML splash** — `index.html`: pure CSS/HTML splash renders before React boots. Left circle slides in from left (delay 0.25s), right from right (delay 0.45s), wordmark fades up (delay 0.95s). `prefers-reduced-motion` respected.
- ✅ **React exit hook** — `App.tsx` `useEffect`: tracks `window.__splashStart` (set at page load), waits minimum 2200ms, then adds `splash-exiting` class (0.45s fade), removes element. Verified correct timing in production build (exits at ~2.2s from app load for fast users, or whenever React mounts for slow connections).

---

## 2026-05-22 (Fri) — Full-width forms + fixed CTA + chip UX

### Done

- ✅ **StepWizardShell полная ширина** — все шаги (включая 1-й) теперь без карточного контейнера, `w-full px-4 py-5`. Home не затронут.
- ✅ **Кнопка «Продолжить» fixed** — `position: fixed; bottom: 0` + градиент-фейд. `pb-32` (128px) в каждом step-компоненте обеспечивает скролл последнего элемента выше кнопки. `flow-frame` обнуляет лишний `padding-bottom` у `app-main-frame` на flow-экранах.
- ✅ **Чипы не пишут в textarea** — `selectAge` / `selectSchedule` только устанавливают структурированные поля. Extra-чипы — toggle с визуальным выделением, фразы уходят в `extraPhrases[]` и добавляются к description при сабмите в блоке `[Пожелания]`.

### Effect

- Форма на телефоне: полная ширина, кнопка всегда видна внизу, textarea чистая для пользовательского ввода.

---

## 2026-05-21 (Thu) — Footer + RLHF Этап 1 + manifest

### Done

- ✅ **AppFooter скрыт на flow-экранах** — `/find-nanny`, `/become-nanny`, `/match-results` больше не рендерят footer. Одно условие в `App.tsx`. QA 9/9 (390/393/430px): нет перекрытия sticky CTA, нет hscroll.
- ✅ **RLHF Этап 1** — `api/cron/update-matching-weights.ts`: еженедельный cron (пн 4:00 UTC), читает `matching_outcomes`, нудирует `matching_weights` к факторам, коррелирующим с hired/interested. Guard: пропуск при <50 сигналов. Байесовская сдвижка alpha=N/(N+200), зажим [prior×0.5, prior×2.0].
- ✅ **manifest.json** — `theme_color` `#6C5CE7` → `#2A6B6E`, `background_color` → `#F9F6F2` (Warm Trust).

### Effect

- Flow-экраны: один путь — без конкурирующей навигации внизу
- RLHF loop замкнут end-to-end: shown → outcome → weight update
- PWA theme совпадает с дизайн-системой

---

## 2026-05-20 (Wed) — CI fixes

### Done

- ✅ **e2e_test.py** — локатор `"Малыши (1-3 года)"` → `"Тоддлеры (1–3)"` (чип был переименован в ParentForm, тест не обновили)
- ✅ **ci.yml: порт** — healthcheck и `BASE_URL` исправлены с 5173 → 3000 (совпадает с `vite.config.ts server.port`)
- ✅ **ci.yml: actions** — `actions/checkout`, `actions/setup-node` → v5, `actions/setup-python` → v6 (Node.js 24 runtime, убраны deprecation warnings)

### Effect

- CI зелёный без warnings на всех трёх jobs: Lint/Test/Build + Smoke E2E

---

## 2026-05-19 (Tue) — QA + Prod deploy

### Done — Release gate passed

- ✅ **CRON_SECRET** — добавлен в Vercel Production env
- ✅ **Vercel deploy** — задеплоен
- ✅ **Supabase миграции применены в prod**:
  - `matching_outcomes_update_rls` — UPDATE RLS policy для authenticated parents (критичный фикс upsert)
  - `matching_outcomes_display_position` — колонка `display_position INTEGER`
- ✅ **QA pass 20/20** — все проверки прошли на 390px:
  - Home: hero, CTA
  - NannyForm 4 шага: no AES, no fake 28 семей, no AI theater, no countdown CTAs, no PCM jargon, no quality funnel
  - MatchResultsScreen: no score %, no "ИИ подобрал"

### Effect

- RLHF learning loop полностью замкнут и работает в проде
- NannyForm соответствует Warm Trust tone guide
- MatchResultsScreen не показывает числовой score родителю

---

## 2026-05-19 (Tue) — NannyForm tone reframe

### Done — NannyForm: Warm Trust palette + tone cleanup (all 4 steps)

- ✅ **Step1_BasicInfo** — Removed fake "28 семей" social proof from aha-moment banner; rewritten to warm, honest copy. Replaced violet-50/violet-100 aha-moment with Warm Trust (#EFF3F2 / #2A6B6E). Replaced emerald photo security badge with Warm Trust colors + non-jargon copy ("Данные защищены и не передаются"). CTA "Осталось 3 шага" → "Продолжить".
- ✅ **Step2_Experience** — Removed AI theater copy ("поможет нашему AI найти лучшие совпадения"). About textarea placeholder rewritten from generic "Люблю детей, добрая..." to a real conversational prompt. Hint block → Warm Trust surface. CTA "Осталось 2 шага" → "Продолжить".
- ✅ **Step3_Verification** — All sky-*/green-* colors → Warm Trust (#EFF3F2 / #2A6B6E / #7FA99B). Removed internal label "Статус quality funnel" → "Готовность профиля". Removed "Score X/100" technical score from parent-facing text. amber/emerald quality card → petrol/copper palette. CTA "Остался 1 шаг" → "Продолжить".
- ✅ **Step4_Psychology** — amber-50/amber-200 cards → Warm Trust. violet border on "notBestAt" input → petrol. Section label "Психологический профиль" → "Как вы работаете с детьми". PCM jargon removed from chip label → "Стиль общения". Signal chips → #EFF3F2 / #2A6B6E.

### Effect

- No more countdown pressure framing ("Осталось N шагов") — replaced with neutral "Продолжить" across all steps
- No more fake numbers or AI theater in copy visible to nanny
- All 4 steps now use the Warm Trust palette consistently
- Build clean, lint 0 errors

---

## 2026-05-19 (Tue)

### Done — RLHF loop: race condition fix, display_position, hired outcome

- ✅ **Race condition removed** — `logWildcardFlag()` удалена. `wildcardId` теперь передаётся в `logShadowScores()` и пишется атомарно в том же upsert-ряду как `explore_flag`. Отдельный UPDATE невозможен до INSERT.
- ✅ **display_position** — добавлен в `matching_outcomes` (миграция `20260519000001`). Логируется как 1-based позиция кандидата в выдаче **после** ε-greedy, т.е. то, что реально видел пользователь. Нужен для propensity estimation.
- ✅ **Порядок вызовов** — `applyEpsilonGreedy` теперь вызывается до `logShadowScores`, чтобы позиции были post-greedy, а не pre-greedy.
- ✅ **Hired outcome** — `updateBookingStatus('confirmed'|'completed')` вызывает `recordMatchOutcome(..., 'hired')`. Повторный вызов безопасен (upsert). Самый сильный сигнал в learning loop теперь записывается.
- ⚠️ **CRON_SECRET** — должен быть задан в Vercel env, иначе ghosted cron возвращает 401.

### Done — RLHF outcome loop closed end-to-end

- ✅ **Fix 1 (RLS CRITICAL)** — `supabase/migrations/20260519000000_matching_outcomes_update_rls.sql`: UPDATE RLS policy added for authenticated parents on `matching_outcomes`. Without this, upserts in `recordMatchOutcome()` silently failed on existing shadow rows.
- ✅ **Fix 2 (wildcardId)** — `src/core/ai/shadowScoring.ts`: added `logWildcardFlag(parentId, nannyId)` → sets `explore_flag=true`. `matchingAi.ts`: captures `wildcardId` from `applyEpsilonGreedy` and calls it.
- ✅ **Fix 3 (UI wiring)** — `MatchResultsScreen.tsx`: open profile → `recordMatchOutcome(..., 'interested')`; new "Не подходит" ghost button → `'rejected'`. parentId from `supabase.auth.getUser()` on mount.
- ✅ **Fix 4 (ghosted cron)** — `api/cron/ghosted-outcomes.ts` + `vercel.json` cron at `0 3 * * *`. Sets `outcome='ghosted'` for rows with `outcome IS NULL` older than 7 days. `CRON_SECRET` env var required.

### Effect

- Full loop: shown → interested/rejected → hired/ghosted → future weight training
- ε-greedy wildcards now measurable via `explore_flag`

---

## 2026-05-18 (Mon)

### Done

- ✅ Created `.context/FRONTEND_RELAUNCH_HANDOFF.md` as the shared source of truth for Codex, Claude, Antigravity, and other agents
- ✅ Captured current frontend relaunch context: Linear project/docs, tired-parent principle, Home direction, Warm Trust palette, Fraunces/Inter typography, preview URLs, and next task order
- ✅ Documented external-agent preview workflow with Cloudflare Tunnel and Vite `allowedHosts`

### Effect

- Future agent sessions can start from a common project memory instead of reconstructing decisions from chat history
- Claude and Codex can now stay aligned by reading the same handoff before making or reviewing UI changes

---

## 2026-04-10 (Fri)

### Done

- ✅ Added `.context/BLIZKO_UI_CODEX.md` as the durable UI art-direction system for Blizko
- ✅ Captured the approved visual direction: editorial typography, paper-layer surfaces, tonal separation, curated coral CTA, and trust-first microcopy rules
- ✅ Converted one-off design feedback into reusable rules for Lovable, Figma, and implementation work

### Effect

- Future UI work can now be steered by a stable brand codex instead of ad hoc "make it prettier" prompting
- Blizko now has a shared visual standard that should reduce generic AI-generated UI drift

## 2026-03-28 (Fri)

### Done

- ✅ Added a durable proactive plugin-prompting rule to `.context/WORKING_CONTRACT.md`
- ✅ Defined default trigger cases for `Linear`, `Notion`, `Figma`, `GitHub`, `Sentry`, `Vercel`, `Google Calendar`, and `Gmail`
- ✅ Updated `HEARTBEAT.md` so periodic checks can suggest one exact plugin shortcut when it removes real friction

### Effect

- Codex should now nudge toward the right external system of record at the right moment instead of listing plugins generically
- Plugin suggestions are now constrained to one concrete tool and one concrete reason
## 2026-03-26 (Thu)

### Done

- ✅ Workspace bootstrap pass completed for operating-system hygiene
- ✅ `TOOLS.md` upgraded from template to structured local environment sheet
- ✅ `TOOLS.md` enriched with real machine facts: browsers, host machine, shortcuts, and SSH status
- ✅ `MEMORY.md` created as curated long-term memory for this main-session workspace
- ✅ Added `.context/AI_STACK.md` for model routing and AI operating rules
- ✅ Added `.context/MCP_STACK.md` for integration priorities and policy
- ✅ Added `.context/BOOTSTRAP_CHECKLIST.md` with current-state audit and next actions
- ✅ `HEARTBEAT.md` upgraded from empty placeholder to useful periodic checklist
- ✅ `WORKING_CONTRACT.md` extended with routing and context-maintenance rules
- ✅ Daily memory file for `2026-03-26` created to record this bootstrap session
- ✅ Audited global Codex MCP config: `figma`, `notion`, `linear` already present
- ✅ Added `github` remote MCP to global Codex config
- ✅ Added `supabase` remote MCP to global Codex config in read-only limited mode
- ✅ Upgraded global `codex` CLI and re-audited MCP auth modes
- ✅ Verified product contour: `npm test` passes, `npm run build` passes
- ✅ Reduced lint from `37 errors / 97 warnings` to `0 errors / 101 warnings`
- ✅ Added GitHub Actions CI workflow for `lint`, `test`, and `build`
- ✅ Added `.context/CODEX_OPERATING_PROTOCOL.md` to mirror the Antigravity operating layer for Codex
- ✅ Added strict Codex review protocol, release gate, and decision logging docs
- ✅ Strengthened zero-exception research escalation rule for current-information work
- ✅ Hardened Antigravity routing for `full codebase analysis` requests: these now map to review mode instead of generic analytics/static-analysis summaries

### Found

- ⚠️ `npm run lint` is now non-blocking but still has 101 warnings
- ⚠️ GitHub Actions now exist, but still need first run validation in GitHub
- ⚠️ Sentry is only partially active: build-time integration exists, but runtime DSN is missing from current `.env.local`

## 2026-03-22 (Sun)

### Done

- ✅ Full technical audit of codebase (18 SQL files, types, services, API layer)
- ✅ `.context/DNA.md` created with real data (13 tables, RLS map, design tokens, patterns)
- ✅ `.context/` memory system established
- ✅ **Security audit**: 9 vulnerabilities found (3🔴 3🟠 3🟡), 7 areas solid
- ✅ **C1 FIXED**: `analytics_events` RLS → `service_role` only (new migration `20260322_lock_analytics_events_rls.sql`)
- ✅ **C2 FIXED**: `api/ai.ts` → `verifyBearerUser()` added, 401 on unauthenticated
- ✅ **C3 FIXED**: `data.ts` POST → `extractOwnedUserId()`, rejects missing `user_id`
- ✅ **M2 FIXED**: `admin_actions` → `service_role` only (new migration `20260322_harden_admin_actions_policy.sql`)
- ✅ Added server-side confirmation guard for destructive admin `DELETE` on `/api/data`
- ✅ Audited `matching_outcomes` consumers: nullable `outcome` is intentional, current dashboards do not read this table
- ✅ Prod security hotfix applied directly to Supabase for `nannies_public`, `analytics_events`, `admin_actions`
- ✅ Migration normalization started: legacy daily migrations archived, new baseline migration created
- ✅ React 19 optimization proposals (useActionState, useOptimistic, use())
- ✅ Figma MCP configured (from yesterday)
- ✅ Added `scripts/check_nannies_rls.sh` + `npm run check:nannies-rls` for post-migration RLS smoke testing

---

## 2026-03-21 (Sat)

### Done

- ✅ Initial `.context/` setup (later lost, recreated today)
- ✅ Weekly plan created (Mon-Fri time-blocked)
- ✅ Project audit: 75% MVP, 12/12 core screens

---

## 2026-03-19 (Wed)

- Updated landing page copy (honest service guarantees)
- Tailwind CSS upgrade investigation

## 2026-03-18 (Tue)

- Design reference analysis (Apple Design Awards → Blizko)
- Redesign art direction analysis

## 2026-03-14 (Fri)

- Pre-launch audit started
- 12/12 core features confirmed implemented

## 2026-03-13 (Thu)

- Pre-launch system audit: 75% MVP status
- Critical gaps: Risk Flags UI, Payments (mock), node_modules EPERM
