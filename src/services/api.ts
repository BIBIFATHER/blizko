import { supabase } from './supabase';

// Универсальная отправка событий уведомлений.
// payload — любой сериализуемый объект (событие уведомления или доменная сущность),
// который уходит в /api/notify как JSON.
export const sendToWebhook = async (payload: object): Promise<boolean> => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    const r = await fetch('/api/notify', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);

    if (!r.ok) {
      const err = await r.text().catch(() => '');
      console.warn('notify failed:', r.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('notify error:', e);
    return false;
  }
};
