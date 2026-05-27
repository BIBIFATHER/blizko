import { ParentRequest, NannyProfile } from '@/core/types';
import { supabase } from './supabase';

export interface AdminActionRecord {
  id?: string;
  action: string;
  meta?: Record<string, unknown>;
  adminId?: string | null;
  at: number;
}

export interface FetchAdminActionsResult {
  items: AdminActionRecord[];
  hasMore: boolean;
  nextCursor: number | null;
}

async function getAdminHeaders(): Promise<Record<string, string> | null> {
  const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseJsonSafe(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  return response.json().catch(() => null);
}

export async function adminUpdateParentRequest(params: {
  id: string;
  changes: Partial<ParentRequest>;
  note?: string;
  forceStatusEvent?: boolean;
}): Promise<ParentRequest | null> {
  const headers = await getAdminHeaders();
  if (!headers) return null;

  try {
    const response = await fetch('/api/data?resource=parents', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(params),
    });
    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      console.warn('adminUpdateParentRequest failed:', response.status, payload);
      return null;
    }
    return payload?.item ?? null;
  } catch (e) {
    console.warn('adminUpdateParentRequest network error:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function adminUpdateNannyProfile(
  id: string,
  changes: Partial<NannyProfile>,
): Promise<NannyProfile | null> {
  const headers = await getAdminHeaders();
  if (!headers) return null;

  try {
    const response = await fetch('/api/data?resource=nannies', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ id, changes }),
    });
    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      console.warn('adminUpdateNannyProfile failed:', response.status, payload);
      return null;
    }
    return payload?.item ?? null;
  } catch (e) {
    console.warn('adminUpdateNannyProfile network error:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function fetchAdminActions(params?: {
  limit?: number;
  beforeAt?: number | null;
  days?: number | 'all';
}): Promise<FetchAdminActionsResult | null> {
  const headers = await getAdminHeaders();
  if (!headers) return null;
  const search = new URLSearchParams();
  search.set('resource', 'admin-actions');
  search.set('limit', String(params?.limit ?? 50));
  if (params?.beforeAt) search.set('beforeAt', String(params.beforeAt));
  if (typeof params?.days !== 'undefined') search.set('days', String(params.days));

  try {
    const response = await fetch(`/api/data?${search.toString()}`, {
      method: 'GET',
      headers,
    });
    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      console.warn('fetchAdminActions failed:', response.status, payload);
      return null;
    }
    return {
      items: Array.isArray(payload?.items) ? payload.items : [],
      hasMore: Boolean(payload?.hasMore),
      nextCursor: typeof payload?.nextCursor === 'number' ? payload.nextCursor : null,
    };
  } catch (e) {
    console.warn('fetchAdminActions network error:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function adminSendNotification(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const headers = await getAdminHeaders();
  if (!headers) return { ok: false, error: 'Нет авторизации' };

  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: 'user.parent_request_status_changed',
        to: params.to,
        subject: params.subject,
        text: params.text,
      }),
    });
    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, error: payload?.error || `Ошибка ${response.status}` };
    }
    if (payload?.skipped) return { ok: false, error: 'Получатель не задан' };
    return { ok: true };
  } catch (e) {
    console.warn('adminSendNotification network error:', e instanceof Error ? e.message : e);
    return { ok: false, error: 'Ошибка сети. Проверьте соединение.' };
  }
}

export async function createAdminAction(
  action: string,
  meta?: Record<string, unknown>,
): Promise<AdminActionRecord | null> {
  const headers = await getAdminHeaders();
  if (!headers) return null;

  try {
    const response = await fetch('/api/data?resource=admin-actions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, meta: meta || {} }),
    });
    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      console.warn('createAdminAction failed:', response.status, payload);
      return null;
    }
    return payload?.item ?? null;
  } catch (e) {
    console.warn('createAdminAction network error:', e instanceof Error ? e.message : e);
    return null;
  }
}

// Signed URL для документа няни из private-бакета (куратор ≠ owner → server-side).
export async function getNannyDocSignedUrl(path: string): Promise<string | null> {
  const headers = await getAdminHeaders();
  if (!headers) return null;
  try {
    const response = await fetch(`/api/data?action=sign-doc&path=${encodeURIComponent(path)}`, {
      method: 'GET',
      headers,
    });
    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      console.warn('getNannyDocSignedUrl failed:', response.status, payload);
      return null;
    }
    return payload?.url ?? null;
  } catch (e) {
    console.warn('getNannyDocSignedUrl network error:', e instanceof Error ? e.message : e);
    return null;
  }
}
