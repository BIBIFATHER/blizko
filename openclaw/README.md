# OpenClaw × Blizko

OpenClaw = отдельный инструмент (dev/ops assistant).
Blizko = отдельный продукт (source of truth).

Этот каталог хранит переносимую операционку: агенты/промты/политики/протоколы,
чтобы можно было восстановиться на новом ноуте/сервере.

Важно:
- Никаких секретов в git.
- ~/.openclaw — это локальный runtime (кеш/сессии). Не источник истины.

## Восстановление на новом устройстве (минимум)
1) Установить OpenClaw:
   npm i -g openclaw
2) Клонировать репо Blizko:
   git clone <repo>
3) Работать, используя этот каталог как эталон:
   openclaw/policies, openclaw/prompts, openclaw/agents, openclaw/core, etc.
