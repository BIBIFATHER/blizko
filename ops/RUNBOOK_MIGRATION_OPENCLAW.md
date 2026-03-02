# RUNBOOK — Migration-ready OpenClaw

Цель — перенести OpenClaw на сервер без сюрпризов.

## Требования
— все секреты только в env/secret manager
— единая команда запуска
— healthcheck
— логирование в stdout
— deploy/ содержит Dockerfile и .env.example

## Шаги переноса (план)
1) Подготовить env в хостинге
2) Собрать контейнер
3) Запустить сервис + авто-рестарт
4) Проверить healthcheck
5) Проверить TG webhook/polling
6) Включить cron/worker (если есть)
