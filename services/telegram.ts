/**
 * Blizko Telegram Notification Service (Client-safe)
 * 
 * Sends notifications via server-side API endpoint.
 * BOT_TOKEN is NEVER exposed to the client.
 * 
 * Setup:
 * 1. Create a bot via @BotFather → get BOT_TOKEN
 * 2. Set TELEGRAM_BOT_TOKEN in server env (NOT VITE_ prefixed!)
 * 3. Set NOTIFY_TOKEN in server env for auth
 */

const NOTIFY_TOKEN = import.meta.env.VITE_NOTIFY_TOKEN || '';

// Core send function — calls server-side API
async function sendTelegramMessage(chatId: string, text: string, options?: {
    parse_mode?: 'HTML' | 'Markdown';
    reply_markup?: Record<string, unknown>;
}): Promise<boolean> {
    if (!chatId) {
        console.warn('[Telegram] No chat_id, skipping notification');
        return false;
    }

    try {
        const res = await fetch('/api/telegram/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(NOTIFY_TOKEN ? { 'x-notify-token': NOTIFY_TOKEN } : {}),
            },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: options?.parse_mode || 'HTML',
                reply_markup: options?.reply_markup,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('[Telegram] Send failed:', err);
            return false;
        }

        return true;
    } catch (e) {
        console.error('[Telegram] Network error:', e);
        return false;
    }
}

// ========= Notification Templates =========

// New match found
export async function notifyNewMatch(chatId: string, data: {
    parentName: string;
    nannyName: string;
    matchReason: string;
}): Promise<boolean> {
    const text = `🎯 <b>Новый подбор!</b>

${data.parentName}, мы нашли няню для вашей семьи:

👤 <b>${data.nannyName}</b>
💬 ${data.matchReason}

<i>Откройте Blizko, чтобы начать чат →</i>`;

    return sendTelegramMessage(chatId, text, {
        reply_markup: {
            inline_keyboard: [[
                { text: '💬 Открыть чат', url: 'https://blizko.app/match-results' }
            ]]
        }
    });
}

// Booking confirmed
export async function notifyBookingConfirmed(chatId: string, data: {
    nannyName: string;
    date: string;
}): Promise<boolean> {
    const text = `✅ <b>Бронирование подтверждено!</b>

Няня <b>${data.nannyName}</b> подтвердила выход на <b>${data.date}</b>.

📋 За 24 часа мы пришлём напоминание с контактами.

<i>Спасибо, что доверяете Blizko 💛</i>`;

    return sendTelegramMessage(chatId, text);
}

// T-24h reminder for nanny
export async function notifyT24hNanny(chatId: string, data: {
    parentName: string;
    date: string;
    address?: string;
}): Promise<boolean> {
    const text = `⏰ <b>Напоминание: выход завтра!</b>

Семья <b>${data.parentName}</b> ждёт вас завтра, <b>${data.date}</b>.
${data.address ? `📍 Адрес: ${data.address}` : ''}

Пожалуйста, подтвердите выход 👇`;

    return sendTelegramMessage(chatId, text, {
        reply_markup: {
            inline_keyboard: [[
                { text: '✅ Подтверждаю выход', callback_data: 'confirm_t24h' },
            ], [
                { text: '❌ Не смогу прийти', callback_data: 'cancel_t24h' },
            ]]
        }
    });
}

// T-24h reminder for parent
export async function notifyT24hParent(chatId: string, data: {
    nannyName: string;
    date: string;
}): Promise<boolean> {
    const text = `⏰ <b>Завтра приходит няня!</b>

<b>${data.nannyName}</b> подтвердила выход на <b>${data.date}</b>.

✅ Всё идёт по плану. Если возникнут вопросы — напишите в чат Blizko.

<i>Хорошего дня! 💛</i>`;

    return sendTelegramMessage(chatId, text);
}

// New message in chat
export async function notifyNewMessage(chatId: string, data: {
    senderName: string;
    preview: string;
}): Promise<boolean> {
    const text = `💬 <b>Новое сообщение</b>

<b>${data.senderName}</b>: ${data.preview.slice(0, 100)}${data.preview.length > 100 ? '...' : ''}`;

    return sendTelegramMessage(chatId, text, {
        reply_markup: {
            inline_keyboard: [[
                { text: '📱 Открыть чат', url: 'https://blizko.app' }
            ]]
        }
    });
}

// Booking cancelled
export async function notifyBookingCancelled(chatId: string, data: {
    reason?: string;
}): Promise<boolean> {
    const text = `😔 <b>Бронирование отменено</b>

${data.reason ? `Причина: ${data.reason}\n\n` : ''}Мы уже подбираем замену. Вы получите уведомление, как только найдём подходящую няню.

<i>Гарантия Blizko: замена в течение 2 часов</i>`;

    return sendTelegramMessage(chatId, text);
}

// Admin: new parent request
export async function notifyAdminNewParentRequest(chatId: string, data: {
    parentName: string;
    city: string;
    childAge: string;
}): Promise<boolean> {
    const text = `📥 <b>Новая заявка от родителя</b>

👤 ${data.parentName}
📍 ${data.city}
👶 Возраст ребёнка: ${data.childAge}

<i>Откройте админ-панель для обработки</i>`;

    return sendTelegramMessage(chatId, text, {
        reply_markup: {
            inline_keyboard: [[
                { text: '🔧 Админ-панель', url: 'https://blizko.app' }
            ]]
        }
    });
}
