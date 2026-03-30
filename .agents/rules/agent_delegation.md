---
description: Force agent delegation for non-trivial Blizko tasks in Antigravity.
---

# Agent Delegation Rule

Для задач сложнее одной очевидной правки не работай в одиночку.

## Mandatory behavior

1. Сначала классифицируй задачу: product / architecture / implementation / trust / research / QA
2. Выбери подходящих агентов
3. Сформулируй им чёткие подзадачи
4. Только после этого собирай ответ

Не отвечай длинным объяснением "как ты собираешься работать". Вместо этого сразу выдай краткий orchestration block и начинай выполнение.

## Required response format for non-trivial tasks

Всегда начинай так:

```text
Objective
[1 строка]

Delegation plan
- [agent]: [subtask]
- [agent]: [subtask]

Starting with
1. [first agent / first lane]
2. [second agent / second lane]
```

Если нужен model switch, вставляй короткий блок ДО `Starting with`, но не растягивай ответ.

## One active task rule

Не веди несколько активных задач в одном ответе.

- если пользователь дал 2-3 разных задачи, выбери главную и обработай её первой
- остальные зафиксируй одной строкой как `Pending`
- не строй подробный delegation plan для всех задач сразу

## Missing input rule

Если для задачи не хватает входных данных:

- не придумывай план "вчерне"
- не симулируй orchestration
- запроси недостающий input одной короткой строкой

Пример:

```text
Жду описание бага.
```

## Minimum agent combinations

- feature work -> `product-lead` + `tech-arch` + `qa-release`
- UI feature -> `product-lead` + `joe` + `frontend-vibe-engineer`
- risky flow -> `tech-arch` + `trust-safety` + `qa-release`
- research-backed decision -> `research-analyst` + `product-lead`
- onboarding / form UX -> `product-lead` + `joe` + `tech-arch` + `frontend-vibe-engineer` + `qa-release`

## Do not delegate when

- задача тривиальна
- ответ можно дать из одного файла без риска
- overhead delegation выше пользы

## If delegation is skipped

Явно объясни одной строкой, почему задача слишком мала для агентного режима.

## Anti-patterns

Не делай так:

- длинное объяснение процесса вместо запуска работы
- "я могу подключить..." без фактического delegation plan
- один агент делает product + architecture + implementation + QA
- неопределённые формулировки вроде "или joe, или frontend-vibe-engineer" для UI feature
- несколько полноценных планов в одном ответе
- bugfix plan без конкретного описания бага
- фраза "запустил" или "уже сделал", если дальше идёт ожидание подтверждения или переключения модели

Для UI feature по умолчанию:
- `joe` = UI/UX direction
- `frontend-vibe-engineer` = implementation

Для onboarding, forms и funnel UX:
- `joe` обязателен
- `product-lead` отвечает за KPI/scope/business rules
- `joe` отвечает за UX structure / hierarchy / copy direction
- `tech-arch` отвечает за data / architecture / risk
