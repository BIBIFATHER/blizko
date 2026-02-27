# DEPLOY_FROM_SCRATCH (Blizko)

Цель: поднять проект на новом ноуте/сервере без потерь.

## 0) Prerequisites
- Node.js (версия как в текущем проекте)
- git
- (опционально) Supabase CLI, Vercel CLI

## 1) Clone
git clone <repo>
cd blizko

## 2) Env
1) Скопировать пример:
   cp .env.example .env.local
2) Заполнить .env.local значениями (НЕ коммитить).
3) Проверить ENV_REQUIRED.md

## 3) Install
npm ci

## 4) Local run
npm run dev

## 5) Build / Smoke
npm run build
npm run test (если есть)

## 6) Database / SQL
Источники истины по БД:
- папка SQL/ (каноничные запросы/схемы)
- документация BLIZKO_DB_RLS.md / DATA_MODEL.md
- (если используются миграции Supabase — держать их в репо)

## 7) Release / Deploy
Смотри:
- RELEASE_CHECKLIST.md
- RUNBOOK.md
- TECH_READINESS_CHECKLIST.md

## 8) Recovery notes
- .env.local хранить в password manager / secure vault
- критичные документы: openclaw/ + ops/ + tech/ + recruiting/ + SQL/ должны быть в git
