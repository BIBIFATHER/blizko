# RU-first data-plane (multi-region later) — architecture draft (DRAFT, read-only)

> **Не внедрять. Код/production не меняются.** Переработано после независимого review (2026-06-12).
> Связано с BLI-87 и BLI-104…108. Источник связности — аудит кода 2026-06-12.

## 0. Что изменилось после review (и почему)
Проверено по коду:
- **RLS завязан на Supabase JWT** — `auth.uid()` встречается 8× в `supabase/migrations`. Свой OTP/Auth ломает RLS → дорого. **Вывод: сохраняем Supabase-контракты (GoTrue JWT + RLS), но в РФ.**
- Прежний draft оставлял профиль+токен в EU → юр-неопределённость + dual-write. **Убрано.**
Решения:
- **Phase 1 = RU-only, всё в РФ.** Нет Supabase EU, нет dual-write, нет токенов в EU, нет shared aggregate store.
- **Self-hosted Supabase в РФ** как способ сохранить текущие **Auth/JWT/RLS/Postgres/Storage** контракты с минимальной правкой кода.
- **Доменные repositories** вместо универсального `DbProvider`.
- **Регион назначается при регистрации по продуктовой юрисдикции** (не телефон/IP).
- **EU/multi-region — Phase 2**, только после успешного RU-запуска.

## 1. Phase 1 — RU-only (целевая)

```
        ┌───────────────────────────┐
        │  Единый frontend (SPA)      │   per-region build/env:
        │  + matching-код (1 impl)    │   VITE_SUPABASE_URL → RF instance
        └─────────────┬───────────────┘
                      │  Supabase JS (тот же контракт)
                      ▼
        ┌───────────────────────────────────────────┐
        │  Self-hosted Supabase в РФ (один VM/k8s)    │
        │  • GoTrue (Auth → JWT, SMS-hook → SMSAero)  │
        │  • Postgres + RLS (auth.uid() как сейчас)   │
        │  • PostgREST (REST) / Kong gateway          │
        │  • Storage API (S3-бэкенд РФ Object Storage)│
        │  • Realtime (по необходимости)              │
        └───────────────────────────────────────────┘
        RF CDN для статики (без VPN; лечит BLI-85)
```

**Ключ:** клиент остаётся прежним Supabase-клиентом, просто `VITE_SUPABASE_URL`/anon и серверные `SUPABASE_URL`/service-role указывают на **РФ-инстанс**. RLS `auth.uid()` работает, потому что JWT выдаёт тот же GoTrue. ПДн граждан РФ пишутся первично в РФ (ст.18 ч.5). EU не участвует.

**Трейд-офф (честно):** self-host = вы сами эксплуатируете стек (патчи, HA, бэкапы, S3-бэкенд Storage, SMS-hook) — теряете «managed». Зато **контракты Auth/RLS/Postgres/Storage не переписываются** → самый быстрый легальный путь. SMS: Supabase официально поддерживает **Send SMS Hook** для регионального провайдера → SMSAero подключается небольшим адаптером (сверено владельцем по офиц. докам 2026-06-12). **На self-hosted это обязательный PoC, не доказанная совместимость — см. §9.**

## 2. Доменные repositories (вместо универсального DbProvider)

```ts
export interface ParentRepository {
  getOwn(ownerId: string): Promise<ParentRequest[]>;
  byId(id: string): Promise<ParentRequest | null>;
  save(p: ParentRequest): Promise<ParentRequest>;
  remove(id: string): Promise<boolean>;
}
export interface NannyRepository {
  getOwn(ownerId: string): Promise<NannyProfile[]>;
  byId(id: string): Promise<NannyProfile | null>;
  save(n: NannyProfile): Promise<NannyProfile>;
  remove(id: string): Promise<boolean>;
}
export interface ChatRepository {
  listThreads(userId: string): Promise<ChatThread[]>;
  listMessages(threadId: string): Promise<ChatMessage[]>;
  postMessage(threadId: string, msg: NewMessage): Promise<ChatMessage>;
}
export interface MatchingRepository {
  recordOutcome(o: MatchingOutcome): Promise<void>;
  getWeights(): Promise<MatchingWeights>;
}
export interface BookingRepository { /* create, confirm, listForUser */ }
export interface SupportRepository { /* openTicket, postMessage, list */ }
```

Каждый repository реализуется поверх Supabase (сейчас EU, после миграции — RF-инстанс). Бизнес-код зависит от доменного интерфейса, не от `supabase.from('table')`. Это и есть развязка «Supabase/Vercel не зашиты в логику», но с сильной типизацией и доменными границами.

## 3. Регион — назначается при регистрации по юрисдикции

```ts
export type Jurisdiction = 'ru' | 'eu';
// Назначается ОДИН раз при регистрации продуктовым правилом (явный выбор/рынок),
// сохраняется на идентичности. НЕ выводится из телефона/IP при каждом запросе.
export function assignJurisdictionAtSignup(input: SignupContext): Jurisdiction;
```

В Phase 1 значение всегда `ru` (один контур). Поле сохраняется заранее, чтобы Phase 2 (EU) подключался без миграции схемы.

## 4. Файлы под изменение (по аудиту) — для Phase 1 минимально
- **env / инфра:** `SUPABASE_URL`, `VITE_SUPABASE_URL`, anon/service-role, `*_BUCKET` → на РФ-инстанс; `.env.example`.
- `src/services/supabase.ts` — указывает на RF-инстанс; постепенно прячется за repositories.
- `src/services/storage.ts` — `remoteSave/remoteGet` → `ParentRepository`/`NannyRepository`.
- `src/services/{matchChat,matchingFeedback,booking,confirmations,supportEngine}.ts` → соответствующие repositories.
- `api/auth/_supabase.ts`, `api/_db.ts`, `api/auth/phone.ts`, `api/data.ts` → на RF-инстанс (контракты те же).
- `api/_gemini.ts`, `api/_nannies.ts` — для RU: AI off / обезличенный вход (BLI-106).
- **Новое:** `src/repositories/` (+ серверные impl), поле `jurisdiction` на идентичности.

> В Phase 1 RegionProvider **не нужен** — один контур. Repositories дают seam; региональную фабрику вводим только в Phase 2.

## 5. Миграция без остановки (Phase 1, RU)
- **P1.0** — поднять self-hosted Supabase в РФ + RF CDN (без трафика).
- **P1.1** — рефактор на доменные repositories поверх **текущего** Supabase (поведение не меняется, чистый seam).
- **P1.2** — `pg_dump`/restore EU→RF (вкл. `auth.users` → user-id сохраняются → RLS цел), копия Storage-объектов, проверка.
- **P1.3** — cutover env на RF-инстанс; EU переводим в read-only/архив; verify; откат = вернуть env.
Каждый шаг shippable и обратим. Нет dual-write — нет класса рисков рассинхрона.

## 6. Риски (Phase 1)
**Стабильность:** self-host = ваша ответственность за HA/бэкапы/патчи; одиночный инстанс — точка отказа → бэкапы/PITR/реплика. RF-хостинг/сеть без VPN — заложить CDN.
**Безопасность:** RF-инстанс держит **все** ПДн → жёсткий доступ, секреты, аудит, шифрование; не логировать ПДн в EU-Sentry (или Sentry self-host/scrub).
**Контракты:** Send SMS Hook под SMSAero и Storage на S3-бэкенде (`GLOBAL_S3_ENDPOINT`) — официально поддерживаются платформой (§8), но конкретно SMSAero-на-self-hosted и Yandex-S3-signed-URL — **обязательный PoC, не доказанная совместимость (§9)**.
**Рассинхрон:** в Phase 1 **исключён** (один контур, нет dual-write).

## 7. Оценки (раздельно)
**RU migration (Phase 1, RU-only, self-hosted Supabase):**
- P1.0 stand-up + CDN: ~1–2 нед.
- P1.1 repositories-seam рефактор: ~1–2 нед.
- P1.2 миграция данных + verify: ~1 нед.
- P1.3 cutover: ~2–3 дня.
- **Итого RU ≈ 3–5 нед** (быстрее прежних 7–11, т.к. нет dual-plane и своего auth).

**EU expansion (Phase 2, позже, после стабильного RU):**
- RegionProvider как вторая реализация поверх repositories + маршрутизация по `jurisdiction`: ~1–2 нед.
- GDPR-контур (lawful basis, согласия, DPA, DSAR, сроки, SCC при необходимости): ~2–3 нед (юр-зависимо).
- Анонимные агрегаты между контурами (если понадобятся): ~1 нед.
- **Итого EU ≈ 3–5 нед**, не на критическом пути пилота.

## 8. RF-стек (для self-hosted Supabase) — проверенные факты + источники
Сверено владельцем по официальной документации 2026-06-12:
- **SMS (Auth):** Supabase поддерживает **Send SMS Hook** для регионального SMS-провайдера → SMSAero через небольшой адаптер. Источник: Supabase «Send SMS Hook» (`supabase.com/docs/guides/auth/auth-hooks/send-sms-hook`). → **PoC на self-hosted обязателен (§9).**
- **Storage:** self-hosted Supabase официально работает с **любым S3-совместимым backend** через `GLOBAL_S3_ENDPOINT`; SDK, buckets, RLS и signed URL остаются на уровне Supabase Storage API. Источник: Supabase self-hosting Storage (S3 backend). → совместимость **конкретно с Yandex Object Storage** — **PoC обязателен (§9).**
- **Хостинг — Yandex Cloud (primary):** официально заявлены размещение в РФ и соответствие **УЗ-1**, ПП РФ **№1119**, приказу ФСТЭК **№21**. Источник: Yandex Cloud «Соответствие 152-ФЗ». ⚠️ Аттестация платформы **не снимает** с оператора (Blizko) обязанностей: классификация ИСПДн, модель угроз, разграничение доступа, организационные документы.
- **Альтернативы:** Timeweb Cloud (дешевле/проще, валиден для пилота, если спец.категория не в облаке); VK Cloud (DR-кандидат). Их аттестации/фича-матрица — **[не сверены — проверить отдельно]**.
- **CDN:** Yandex/VK (Cloudflare не закладывать — риск без VPN).
- **Object Storage:** Yandex Object Storage (S3-совм.) под Supabase Storage `GLOBAL_S3_ENDPOINT`.

## 9. Обязательные PoC до фиксации архитектуры
Архитектура **не фиксируется окончательно**, пока не пройдут (каждый — отдельный proof-of-concept на self-hosted стеке):
1. **OTP через SMSAero** — Send SMS Hook на self-hosted отправляет код через SMSAero; verify проходит; выдаётся валидный GoTrue JWT.
2. **Yandex S3 через Supabase Storage** — `upload` → `private download` → `signed URL` (TTL) → `delete`, всё через Supabase Storage API на `GLOBAL_S3_ENDPOINT` Yandex; RLS соблюдается.
3. **Backup/restore** — `pg_dump` → restore в РФ-инстанс; данные и `auth.users` (user-id) сохраняются.
4. **JWT/RLS** — после восстановления `auth.uid()`-политики работают: владелец видит своё, чужое — нет.
Зелёные PoC → можно фиксировать стек. Любой красный → пересмотр.

---
## Примечание про ACTIVE_TASK
Канонический путь — `.context/ACTIVE_TASK.md` (вводит **PR #23**, сейчас **OPEN/не merged**). Конкурирующий root `ACTIVE_TASK.md` **удалён**. Указатель на этот draft добавить в `.context/ACTIVE_TASK.md` **после merge PR #23**.
⚠️ PR #23 и PR #25 оба правят `CLAUDE.md` и `.context/CODEX_OPERATING_PROTOCOL.md` → возможен конфликт при мёрже; согласовать порядок.

*Внедрять только отдельным решением; код и production при подготовке не менялись. Юр-модель (что необходимо в РФ, что — в Phase 2) — [подтверждает юрист].*
