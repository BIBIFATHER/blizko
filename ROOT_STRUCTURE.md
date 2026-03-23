# Root Structure

Цель: держать корень репозитория коротким и предсказуемым.

## Что должно жить в корне
- `src/` — основной frontend/runtime код
- `src/components/` — UI-слой, пока не слитый в `src/`
- `api/` — server/api handlers
- `src/services/` — прикладная логика и integrations
- `public/` — статические ассеты
- `scripts/` — инженерные скрипты
- `supabase/` — миграции и локальная инфраструктура Supabase
- `android/`, `ios/` — мобильные проекты Capacitor
- `docs/` — актуальная документация
- `core/` — системные правила и orchestration docs
- `ops/` — операционные регламенты
- `memory/` — журнал и состояние
- `.context/` — проектная память
- `cloudflare/` — edge/runtime infra, пока используется отдельно
- `figma-autobot/` — отдельный tooling-модуль
- `agents/`, `AGENT_PROFILES/`, `.agent/`, `.agents/`, `skills/` — агентская/tooling зона

## Что не должно жить в корне
- build output: `dist/`
- package install artifacts: `node_modules/`
- local deploy metadata: `.vercel/`
- temporary test output: `output/`
- tool state / caches: `.openclaw/`, `.qodo/`
- ad-hoc experiments, архивы, старые стратегии, побочные материалы

## Куда складывать не-runtime материалы
- `archive/` — старые, стратегические, исследовательские и побочные каталоги
- `archive/.quarantine/` — временно убранные локальные папки перед окончательным удалением

## Решение по текущему репо
- `archive/tech/`, `archive/trust/`, `archive/design/`, `archive/recruiting/`, `archive/analytics/`, `archive/backups/` — не runtime, поэтому вынесены из корня
- `.venv/` пока оставлен: там есть рабочее Python-окружение и `playwright`

## Правило на будущее
Если новая папка не участвует в runtime, build, deploy или ежедневной разработке, она не должна появляться в корне без явной причины.
