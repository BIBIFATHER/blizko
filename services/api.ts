// Универсальная отправка событий уведомлений
export const sendToWebhook = async (payload: any): Promise<void> => {
  try {
    const token = import.meta.env.VITE_NOTIFY_TOKEN as string | undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['x-notify-token'] = token;

    const r = await fetch('/api/notify', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const err = await r.text().catch(() => '');
      console.warn('notify failed:', r.status, err);
    }
  } catch (e) {
    console.warn('notify error:', e);
  }
};