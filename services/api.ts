// Универсальная отправка событий уведомлений
export const sendToWebhook = async (payload: any): Promise<void> => {
  try {
    const r = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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