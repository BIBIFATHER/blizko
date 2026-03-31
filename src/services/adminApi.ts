import { ParentRequest, NannyProfile } from '@/core/types';
import { supabase } from './supabase';

export interface AdminActionRecord {
  id?: string;
  action: string;
  meta?: Record<string, any>;
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
}

export async function adminUpdateNannyProfile(
  id: string,
  changes: Partial<NannyProfile>,
): Promise<NannyProfile | null> {
  const headers = await getAdminHeaders();
  if (!headers) return null;

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
}

export async function createAdminAction(
  action: string,
  meta?: Record<string, any>,
): Promise<AdminActionRecord | null> {
  const headers = await getAdminHeaders();
  if (!headers) return null;

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
}
