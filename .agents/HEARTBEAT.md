# Heartbeat Checklist

## 🔔 Напоминание на 2026-03-14

- [ ] **Cloudflare DNS** — доделать настройку blizko.app:
  1. Добавить 3 DNS записи (A @, CNAME www, CNAME api)
  2. SSL → Full (strict)
  3. Nameservers → скопировать в Timeweb
  4. Vercel env → SUPABASE_URL + VITE_SUPABASE_URL → https://api.blizko.app
  5. BotFather → Web App URL → https://blizko.app
  - Инструкция в MEMORY.md (секция "Доменная архитектура")
