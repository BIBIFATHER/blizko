# SECURITY_RULES

— Least Privilege.
— Secrets never in repo, prompts, memory.
— Prod is sacred.
— Опасные изменения только через Two-Key.

## Запрещено
— хранить ключи в файлах агентов, memory, репозитории
— логировать PII (телефоны, паспорта, адреса) без маскирования
— destructive SQL / изменения RLS без change_request + approve

## Two-Key Protocol
Опасные действия:
— миграции БД, RLS, роли
— платежи, OTP, webhooks
— удаление данных

Процесс:
1) TECH создаёт change_request_created
2) MAIN подтверждает approve
3) только после этого выполнение
4) всё фиксируется как событие + запись в decision log
