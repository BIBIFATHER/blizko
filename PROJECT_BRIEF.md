# Blizko — Project Brief

## 1) Что это

Blizko — технологичное приложение для подбора нянь и помощников по уходу за детьми.

Цель: соединять семьи и нянь напрямую (без агентств), с упором на доверие, безопасность и качество подбора.

## 2) Роли и основные сценарии

### Родитель (parent)
- Создаёт запрос (город/район, возраст ребёнка, график, бюджет, требования, комментарий).
- Получает результат подбора (match score + рекомендации/подходящие профили).
- Может общаться с поддержкой (чат).

### Няня (nanny)
- Создаёт профиль (опыт, возраст детей, навыки, about, контакты).
- Может иметь “верификацию” и статусы документов.
- В будущем: видео/ревью/софт-скиллы.

### Админ/поддержка
- Помогает пользователю через SupportChat.
- Может проверять/видеть статусы документов и выдавать рекомендации.

## 3) Ключевая бизнес-логика

### 3.1 Матчинг
Матчинг выдаёт:
- `matchScore` (0–100)
- `recommendations: string[]` (почему подходит / что улучшить)

Матчинг учитывает:
- город/район (релевантность по локации)
- график/доступность
- опыт и навыки
- возраст ребёнка
- доп. требования

Реализация: `src/core/ai/matchingAi.ts` (AI-ассистированный текст/объяснения).

### 3.2 Верификация документов (trust/safety)
Документ имеет:
- `type`: `passport | medical_book | police_record`
- `status`: `verified | rejected | pending`
- `aiConfidence` (0–100)
- `aiNotes` (пояснения)
- даты/номер (опционально)

Реализация: `src/core/ai/documentAi.ts` (AI-анализ изображения/документа).

### 3.3 Чат поддержки
SupportChat — чатовый помощник/агент, который:
- отвечает на вопросы пользователя
- учитывает system prompt (инструкция для тона/политики)
- настраиваемая температура

Реализация: `components/SupportChat.tsx` (вызов `aiText`).

## 4) Архитектура проекта (что где лежит)

### Core (домен/логика)
- `src/core/types/types.ts` — основные типы (`Language`, `NannyProfile`, `ParentRequest`, `DocumentVerification` и т.д.)
- `src/core/ai/aiGateway.ts` — единая точка входа в AI (text + image) через `/api/ai`
- `src/core/ai/matchingAi.ts` — AI-логика матчинг-ответов
- `src/core/ai/documentAi.ts` — AI-анализ документов (image)

### Web/UI
- `src/web/pwa/InstallPwaPrompt.tsx` — PWA prompt
- `src/components/UI.tsx` — UI компоненты (например `Button`)
- Entry: `src/main.tsx` / `src/App.tsx` (см. фактическую структуру)

### API / Proxy
- `api/ai.ts` — серверный endpoint `/api/ai`
- ВАЖНО: секреты и ключи модели должны быть только здесь, не в клиенте.

## 5) AI-контракт (критично для сборки и работы)

### 5.1 Клиентский контракт (обязателен)
Файл: `src/core/ai/aiGateway.ts`

Должны существовать экспорты:
- `aiText(prompt: string, options?: { systemPrompt?: string; temperature?: number; model?: string }): Promise<string>`
- `aiImage(prompt: string, image: string, options?: { systemPrompt?: string; temperature?: number; model?: string }): Promise<string>`

`aiText` вызывается с options минимум в:
- `components/SupportChat.tsx`
- `src/core/ai/matchingAi.ts`

`aiImage` импортируется и нужен в:
- `src/core/ai/documentAi.ts`

### 5.2 Серверный контракт (пример)
Endpoint: `POST /api/ai`

Ожидаемый payload (примерный):
- `{ mode: "text", prompt: string, systemPrompt?: string, temperature?: number, model?: string }`
- `{ mode: "image", prompt: string, image: string, systemPrompt?: string, temperature?: number, model?: string }`

Ответ:
- `{ text: string }`

Ошибка:
- `{ error: string }` + HTTP status != 200

## 6) Текущие блокеры / что чинить первым

Сейчас сборка падает из-за несоответствия контракта `aiGateway`:
- `aiImage` не экспортируется из `src/core/ai/aiGateway.ts`
- `aiText` принимает 1 аргумент, но вызывается с 2 (`prompt + options`)

Цель ближайшего коммита:
- привести `aiGateway.ts` к контракту выше,
- прогнать `npx tsc --noEmit` и `npm run build` без ошибок.

## 7) Запуск и проверки
- Установка: `npm install`
- Типы: `npx tsc --noEmit`
- Build: `npm run build`
- Dev: `npm run dev`

Важно:
- `.env` не коммитим и не отправляем; вместо этого — `.env.example`.

## 8) Нельзя делать (охранные правила)
- Не хранить ключи AI/секреты в клиенте (Vite).
- Не менять публичные типы без явной миграции (если они используются в UI).
- Не коммитить `.env` и любые секреты.
- Если меняются пути/регистры (`UI` vs `ui`) — привести к реальному регистру на диске (CI/Linux может упасть).
