import { ParentRequest, NannyProfile } from '../types';
import { supabase } from './supabase';

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
