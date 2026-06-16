# Blizko Nanny Warm Pool

Status: operational MVP before RU-core
Decision date: 2026-06-13
Owner: Anton with Claude/Codex support

## What We Present Now

Blizko is inviting a small first group of nannies into an early,
curator-led service.

The honest promise:

- fewer random conversations and clearer family requests;
- a curator who helps clarify schedule, location, expectations, and next step;
- an opportunity to join the first closed pilot;
- no fee, activation payment, or promise of regular work at this stage;
- no document upload until the approved verification contour exists.

Do not promise a stable flow of orders, completed verification within 24–48
hours, guaranteed matching or income, AI assessment, insurance, or payment
protection that is not operating.

Do not send the current `/for-nannies` landing page as the primary pitch until
its activation fee, document flow, and 24–48 hour claims match reality.

## We Never Replied

```text
Здравствуйте, [Имя]. Вы откликались на вакансию Blizko по работе няней.
Извините, что возвращаемся только сейчас: мы переработали формат сервиса и
собираем небольшую первую группу нянь для закрытого запуска.

Blizko помогает не разбирать десятки случайных предложений, а получать более
понятные запросы от семей по району, графику и формату помощи. На старте всё
ведет куратор вручную.

Если поиск работы еще актуален, можно я задам здесь 3 коротких вопроса и
вернусь к вам, когда начнем приглашать семьи?
```

## We Replied and Then Disappeared

```text
Здравствуйте, [Имя]. Мы раньше общались после вашего отклика в Blizko и затем
надолго пропали. Это наша ошибка, извините.

За это время мы пересобрали сервис: сейчас готовим небольшой закрытый запуск,
где куратор знакомит нянь только с понятными запросами семей по району,
графику и ожиданиям.

Если для вас поиск еще актуален, предлагаю возобновить общение без длинной
анкеты: уточню 3 пункта и добавлю вас в список первых приглашений. Актуально?
```

## Three Questions After “Yes”

```text
Спасибо. Тогда коротко:

1. В каком городе и районе вы сейчас ищете работу?
2. Какой график вам подходит?
3. С детьми какого возраста и сколько лет вы работали?

Документы сейчас присылать не нужно. Перед полноценной регистрацией мы
отдельно объясним условия и попросим подтвердить актуальные данные.
```

## Permission to Return Later

```text
Спасибо, зафиксировал. Можно сохранить минимальную отметку о вашем интересе и
вернуться к вам, когда начнем приглашать нянь в закрытый пилот? Полное резюме
и переписка пока остаются здесь, в [HH/источнике]. У себя мы сохраним только
ваше имя, район, общий опыт, подходящий график и отметку о согласии связаться.
Можно в любой момент попросить удалить эту запись. Политика:
https://www.blizko.app/privacy
```

Record `permissionToRecontact=yes` only after an affirmative answer.

If the nanny is no longer interested:

```text
Понял, спасибо, что ответили. Не будем больше писать по этому набору. Удачи в
поиске подходящей семьи.
```

Set status to `declined` and `permissionToRecontact=no`.

## Registry Boundary

Allowed:

- source and response/profile reference;
- first name only;
- city and broad area;
- experience band;
- schedule and rate summary;
- pipeline status and permission to recontact;
- last contact and next action dates;
- short operational note.

Keep inside the source platform:

- surname, phone, email, messenger handle, and full resume;
- exact address and detailed employment history;
- passport, medical book, certificates, photos, and video;
- health, criminal-record, family, or child information;
- psychological, risk, or AI scoring.

Never paste real resumes or conversations into Gemini, ChatGPT, Claude, Sentry,
analytics, Telegram bots, or the current Supabase EU project.

## Local Registry

The registry is encrypted with AES-256-GCM. Its key is stored in macOS
Keychain; the encrypted file is ignored by Git.

Initialize once:

```bash
npm run leads -- init
```

Add a nanny:

```bash
npm run leads -- add
```

For the source reference, paste the HH response URL or stable ID. Do not copy a
phone or email.

View the queue and update a record:

```bash
npm run leads -- list
npm run leads -- followups
npm run leads -- update nwl_12345678
```

Use `followups`, not the general `list`, when deciding whom to contact again.
It returns only records with explicit `permissionToRecontact=yes`. The CLI
rejects `intro_scheduled` and `pilot_waitlist` without that permission.

View the funnel:

```bash
npm run leads -- stats
```

Delete a record immediately after an objection or erasure request:

```bash
npm run leads -- delete nwl_12345678
```

Run retention cleanup at least weekly:

```bash
npm run leads -- purge
```

It deletes refusals and records not updated for 90 days.

## Daily Workflow

1. Open HH and process no more than 10–15 conversations.
2. Send the matching first message.
3. Add the candidate after opening the conversation.
4. After a reply, update status and recontact permission.
5. Use only `npm run leads -- followups` for later outreach.
6. Run `npm run leads -- purge` weekly.
7. Stop after 30–45 minutes; do not create an unmanageable queue.

Initial target:

- 10–20 warm contacts;
- 5–10 with explicit permission to recontact;
- 3–5 ready for an introductory call when the closed pilot opens.

## Status Meaning

- `new`: source found, no message sent;
- `contacted`: first message sent;
- `responded`: meaningful reply;
- `interested`: confirmed current interest;
- `intro_scheduled`: curator call arranged;
- `pilot_waitlist`: agreed to be contacted for the closed pilot;
- `declined`: no longer interested or asked not to continue;
- `archived`: stale, duplicate, or not currently actionable.

## Migration to RU-Core

Migration is a separate approved action:

1. Build the RU-core candidate table and access policy.
2. Export locally only during the migration window.
3. Import and verify exact counts and fields.
4. Ask each nanny to confirm current data and consent version.
5. Delete the plaintext export immediately.
6. Verify that the plaintext export no longer exists.
7. Confirm that no migration write reached the EU project.
8. Keep source references for deduplication, not full HH resumes.

The export command is disabled by default and requires an explicit environment
flag so it cannot be triggered accidentally.

## Current Decision

**Conditional Go:** start personal outreach and maintain the minimized encrypted
warm pool.

Conditions:

- no documents, direct contacts, full resumes, health data, or AI scoring;
- no import to Supabase EU;
- no bulk scraping or automated messaging;
- later outreach is selected only through records with explicit
  `permissionToRecontact=yes`;
- refusals are deleted immediately and stale records are purged after 90 days;
- privacy/notification/retention and RU-core migration remain tracked under
  `BLI-108`.
