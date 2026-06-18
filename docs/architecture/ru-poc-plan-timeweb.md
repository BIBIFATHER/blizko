# RU data-plane PoC plan — Timeweb (Phase 3) — DRAFT

Дата: 2026-06-18. **План для ревью владельца.** Операционализирует memo §C
(T1-T10) под выбранного провайдера **Timeweb** для пилота на ОБЫЧНЫХ данных.

**Стоп-условие (operating model):** PoC НЕ стартует до закрытия A′/C/privacy +
legal-драфтов И **BLI-121** (закрытая регистрация). На синтетике — можно начинать
после этого. Спецкатегории/высокий УЗ → Yandex Cloud позже (RISK-008).

## Цель PoC
Доказать на СИНТЕТИКЕ, что self-hosted Supabase-стек на Timeweb работает (а не
только заявлен): Auth/RLS/Storage/backup/restore/Realtime/ротация/latency/
миграция/удаление. Без реальных ПДн.

## Целевой стек (Timeweb)
- **Compute:** Timeweb Cloud VM (Docker) — self-hosted Supabase (GoTrue, PostgREST,
  Realtime, Storage API, Studio) ИЛИ managed-компоненты, где доступны.
- **БД:** PostgreSQL (Timeweb managed или self-hosted в составе Supabase).
- **Объектное хранилище:** Timeweb S3 (S3-совместимое) для документов/фото/видео,
  приватные бакеты + server-issued signed URLs.
- **OTP:** SMSAero (РФ) — Send SMS Hook.
- **Frontend/API:** остаётся на Vercel (публичная статика) ИЛИ переносится позже;
  личный data plane — РФ. Браузер→Supabase читает напрямую → клиентский endpoint
  должен указывать на РФ-Supabase.
- **Backup:** РФ, зашифрованные.

## T1-T10 (acceptance-тесты, синтетика)
| # | Тест | Критерий PASS |
|---|---|---|
| T1 | SMSAero → регистрация → сессия → refresh | OTP доходит, сессия выдаётся, refresh работает |
| T2 | GoTrue JWT → PostgREST → `auth.uid()` → RLS | RLS пускает владельца строки, чужому — deny |
| T3 | private Storage → upload → signed URL → expiry | загрузка ок, URL подписан сервером, истекает |
| T4 | Timeweb S3 как Storage backend | Supabase Storage работает на Timeweb S3, signed URLs |
| T5 | Realtime для chat/support | подписка/публикация доходит |
| T6 | backup → удаление тестовой БД → restore → сверка | данные восстановлены, count/контрольные суммы совпали |
| T7 | ротация JWT/секретов без потери доступа | после ротации сессии/доступ сохранены или контролируемо переавторизованы |
| T8 | latency/доступность с РФ-мобильных | приемлемый отклик из РФ без VPN |
| T9 | миграция тестового пользователя + повторный вход | пользователь перенесён, стратегия re-login работает |
| T10 | удаление аккаунта во всех таблицах/объектах | ПДн удалены из БД И Storage; остатков нет |

## Порядок (после разблокировки)
1. Timeweb: VM + S3 + (managed) Postgres подняты (нужен доступ/бюджет — владелец).
2. Развернуть self-hosted Supabase (Docker compose), подключить SMSAero hook.
3. Прогнать T1-T10 на синтетике, зафиксировать evidence pack.
4. По результатам — план миграции (memo §D): экспорт EU→импорт РФ→сверка→
   переключение env/DNS→переавторизация→read-only EU на срок→удаление EU.

## Что НЕ в этом PoC
- Реальные ПДн (только синтетика).
- Спецкатегории/документы (RISK-008, до юриста + высокий УЗ → Yandex).
- Production-переключение (отдельный гейт + approve + release-gate).
- Jurisdiction Router НЕ ломаем — RU→ru-core (Timeweb), EU=placeholder.

## Зависимости / блокеры
- **Владелец:** доступ Timeweb + бюджет; BLI-121; ревью legal-драфтов.
- **ИБ:** уровень защищённости ИСПДн (для спецкатегорий, позже).
- Memo: docs/ru-data-contour-decision-memo.md §C/§D.

**Статус:** план-черновик. Старт PoC — после BLI-121 + Timeweb-доступа. На выходе
каждого T# — evidence pack (`.context/EVIDENCE_PACK_TEMPLATE.md`).
