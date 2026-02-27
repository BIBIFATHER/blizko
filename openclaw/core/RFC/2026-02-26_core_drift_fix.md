# core/RFC/2026-02-26_core_drift_fix.md
# RFC: Restore AI Roadmap and Metrics Glossary content

## Context
core/AI_ROADMAP.md and core/METRICS_GLOSSARY.md содержали правки без APPROVED RFC. Изменения откатены до HEAD.

## Decision
При необходимости восстановить содержимое AI roadmap и metrics glossary через RFC‑процедуру.

## Options Considered
Option A: Оставить файлы пустыми. Риск: потеря ключевых определений и дорожной карты.
Option B: Восстановить содержимое через RFC (выбран).

## Risks
- Риск устаревшей информации. Митигация: подтвердить актуальность перед применением.
- Риск повторного дрейфа. Митигация: строгий RFC‑процесс.

## Acceptance Criteria
- Есть APPROVED решение на восстановление содержимого.
- Восстановленные тексты совпадают с утверждённой версией.

## Implementation Plan
1. Подтвердить актуальный текст для AI_ROADMAP и METRICS_GLOSSARY.
2. После APPROVED — применить изменения в core/.
3. Обновить memory/STATUS/current_wip.md и snapshot.

## Files Touched
- core/AI_ROADMAP.md
- core/METRICS_GLOSSARY.md

## Approved content

### core/AI_ROADMAP.md
# BLIZKO — AI ROADMAP

## Phase A (1–2 months)
• NLP-анализ анкет/ответов (стиль, эмпатия, структура)  
• Умный скоринг (перевод в features)  
• Авто-объяснимость матча  

---

## Phase B (2–3 months)
• Видео-интервью + CV-сигналы (с согласия)  
• Risk-engine 2.0 (конфликтные сочетания)  
• Поведенческие микрокейсы  

---

## Phase C (3–4 months)
• Ранжирование на фидбэке (ML-ranking)  
• Персональные сценарии под семью  
• Авто-оптимизация стабильности  

---

## Phase Readiness Criteria
- Наличие стабильных сделок  
- Валидированные KPI  
- Низкий complaint rate  

### core/METRICS_GLOSSARY.md
# BLIZKO — METRICS & STATUS GLOSSARY

## Funnel
contacted → responded → approved → matched → deal_done

---

## KPI Definitions
response % = responded / contacted  
approved % = approved / responded  
match % = matched / approved  
deal conversion = deal_done / matched  
complaint rate = complaints / deal_done  
time-to-match = время от approved до matched  

---

## SLA
Ответ ≤ 24 часа  
Решение ≤ 48 часов  

## Rollback Plan
- Вернуть файлы к HEAD (пустые) при выявлении несоответствий.
