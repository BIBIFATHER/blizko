# Настройка Telegram-бота для Blizko

## Шаг 1: Создайте бота

1. Откройте **@BotFather** в Telegram
2. Отправьте `/newbot`
3. Введите имя: `Blizko Подбор Нянь`
4. Введите username: `blizko_nanny_bot` (или любой свободный)
5. Скопируйте **BOT_TOKEN** (выглядит как `1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ`)

## Шаг 2: Настройте бота

Отправьте @BotFather следующие команды:

```
/setdescription
Бот сервиса Blizko — подбор проверенных нянь с AI. Уведомления о матчах, бронированиях и подтверждениях.

/setabouttext
🤝 Blizko — безопасный AI-подбор нянь
📱 blizko.app

/setcommands
start - Привязать аккаунт Blizko
help - Помощь
status - Статус моих заявок
```

## Шаг 3: Добавьте токен в .env

```bash
# .env
VITE_TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_ADMIN_CHAT_ID=ваш_chat_id
```

Чтобы узнать свой chat_id:

1. Напишите боту `/start`
2. Откройте `https://api.telegram.org/bot{TOKEN}/getUpdates`
3. Найдите `"chat":{"id": 123456789}` — это ваш chat_id

## Шаг 4: Уведомления

Сервис `src/services/telegram.ts` содержит готовые шаблоны:

| Функция | Когда отправляется |
|---|---|
| `notifyNewMatch` | Найдена подходящая няня |
| `notifyBookingConfirmed` | Бронирование подтверждено |
| `notifyT24hNanny` | За 24ч до выхода (няне) |
| `notifyT24hParent` | За 24ч до выхода (родителю) |
| `notifyNewMessage` | Новое сообщение в чате |
| `notifyBookingCancelled` | Отмена бронирования |
| `notifyAdminNewParentRequest` | Новая заявка (админу) |

## Шаг 5: Интеграция

Добавьте вызовы в нужных местах:

```typescript
// В matchingAi.ts после успешного матча:
import { notifyNewMatch } from '@/services/telegram';
await notifyNewMatch(parentChatId, {
  parentName: 'Мария',
  nannyName: 'Анна',
  matchReason: 'Совпадение по стилю воспитания и графику',
});

// В booking.ts после подтверждения:
import { notifyBookingConfirmed } from '@/services/telegram';
await notifyBookingConfirmed(parentChatId, {
  nannyName: 'Анна',
  date: '15 марта, 09:00',
});
```
