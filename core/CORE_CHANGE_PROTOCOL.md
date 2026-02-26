# CORE_CHANGE_PROTOCOL

## Назначение
Этот протокол фиксирует, как вносить изменения в core/* и связанные системные правила.

## Общие принципы
- core/* — только orchestrator.
- Любое изменение core/* проходит через RFC: предложение → review → APPROVED → applied.
- Все применения фиксируются в memory/YYYY-MM-DD.md и статусных файлах.

## Rule: Approved content (жёсткое)
**Approved content = любой артефакт/правило, помеченный как APPROVED.**

Правило:
1) Approved content считается **замороженным** (locked). Редактирование/перезапись запрещены.
2) Любое изменение Approved content требует нового RFC и повторного статуса **APPROVED**.
3) После применения изменения обязательны записи:
   - memory/STATUS/current_wip.md (RFC applied)
   - memory/YYYY-MM-DD.md (APPROVED + applied)
   - memory/STATUS/system_snapshot_YYYY-MM-DD.md

## Мини-чеклист применения
- [ ] RFC сформулирован и утверждён (APPROVED)
- [ ] Изменение внесено в core/*
- [ ] Обновлены memory/* записи (wip + daily + snapshot)
