// Blizko Push Notification Service
// Handles SW registration, permission requests, and sending push notifications

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
        console.warn('[Push] Service Worker not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[Push] SW registered:', registration.scope);
        return registration;
    } catch (error) {
        console.error('[Push] SW registration failed:', error);
        return null;
    }
}

export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.warn('[Push] Notifications not supported');
        return false;
    }

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

// Send a local notification (no server needed)
export async function sendLocalNotification(
    title: string,
    body: string,
    options?: {
        url?: string;
        tag?: string;
        icon?: string;
    }
): Promise<void> {
    const registration = await navigator.serviceWorker?.ready;
    if (!registration) return;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
        body,
        icon: options?.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        tag: options?.tag || 'blizko-local',
        data: { url: options?.url || '/' },
    };

    await registration.showNotification(title, notificationOptions);
}

// Pre-built notification templates for Blizko
export const BlizkoNotifications = {
    // T-24h booking reminder for nanny
    bookingReminder24h: (nannyName: string, familyName: string, date: string) =>
        sendLocalNotification(
            '⏰ Напоминание о выходе',
            `${nannyName}, завтра (${date}) вас ждёт семья ${familyName}. Подтвердите выход.`,
            { url: '/bookings', tag: 'booking-reminder-24h' }
        ),

    // T-3h booking reminder
    bookingReminder3h: (nannyName: string, address: string) =>
        sendLocalNotification(
            '🏠 Выход через 3 часа',
            `${nannyName}, не забудьте: ${address}. Удачного дня!`,
            { url: '/bookings', tag: 'booking-reminder-3h' }
        ),

    // New chat message
    newMessage: (senderName: string, preview: string) =>
        sendLocalNotification(
            `💬 ${senderName}`,
            preview.slice(0, 100),
            { url: '/chat', tag: 'chat-message' }
        ),

    // Match found
    matchFound: (count: number) =>
        sendLocalNotification(
            '🎉 Найдены подходящие няни!',
            `Мы подобрали ${count} ${count === 1 ? 'кандидата' : 'кандидатов'} для вашей семьи. Посмотрите результаты.`,
            { url: '/match-results', tag: 'match-found' }
        ),

    // Booking confirmed
    bookingConfirmed: (nannyName: string, date: string) =>
        sendLocalNotification(
            '✅ Бронирование подтверждено',
            `${nannyName} подтвердила выход ${date}. Всё будет хорошо!`,
            { url: '/bookings', tag: 'booking-confirmed' }
        ),

    // Nanny approved (for nanny)
    nannyApproved: () =>
        sendLocalNotification(
            '🎊 Профиль одобрен!',
            'Поздравляем! Ваш профиль прошёл верификацию. Вы теперь в системе подбора.',
            { url: '/profile', tag: 'nanny-approved' }
        ),
};
