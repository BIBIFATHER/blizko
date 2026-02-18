import { ParentRequest, NannyProfile, Review } from '../types';
import { getItem, setItem, removeItem } from '../src/core/platform/storage';
import { supabase } from './supabase';

const STORAGE_KEY_PARENTS = 'blizko_parents';
const STORAGE_KEY_NANNIES = 'blizko_nannies';

const safeJsonParse = <T>(value: string, fallback: T): T => {
  try {
    const parsed = JSON.parse(value) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const getLocalParents = (): ParentRequest[] => {
  const data = getItem(STORAGE_KEY_PARENTS);
  if (!data) return [];
  const parsed = safeJsonParse<ParentRequest[]>(data, []);
  return Array.isArray(parsed) ? parsed : [];
};

const getLocalNannies = (): NannyProfile[] => {
  const data = getItem(STORAGE_KEY_NANNIES);
  if (!data) return [];
  const parsed = safeJsonParse<NannyProfile[]>(data, []);
  return Array.isArray(parsed) ? parsed : [];
};

const setLocalParents = (items: ParentRequest[]) => setItem(STORAGE_KEY_PARENTS, JSON.stringify(items));
const setLocalNannies = (items: NannyProfile[]) => setItem(STORAGE_KEY_NANNIES, JSON.stringify(items));

async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

async function remoteGet(table: 'parents' | 'nannies'): Promise<any[] | null> {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(table)
      .select('id,payload,created_at')
      .order('created_at', { ascending: false });

    if (error) return null;
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function remoteSave(table: 'parents' | 'nannies', item: any): Promise<any | null> {
  try {
    if (!supabase) return null;
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const row = {
      id: item.id,
      user_id: userId,
      payload: item,
    };

    const { data, error } = await supabase
      .from(table)
      .upsert(row, { onConflict: 'id' })
      .select('id,payload,created_at')
      .single();

    if (error) return null;
    return data?.payload ?? item;
  } catch {
    return null;
  }
}

async function remoteClear(table: 'parents' | 'nannies', testOnly = false): Promise<boolean> {
  try {
    if (!supabase) return false;
    let query = supabase.from(table).delete();
    query = testOnly ? query.like('id', 'test-%') : query.neq('id', '__none__');
    const { error } = await query;
    return !error;
  } catch {
    return false;
  }
}

const fromRow = <T extends { id: string; createdAt: number }>(row: any): T => {
  const payload = row?.payload ?? {};
  const createdAt = payload?.createdAt ?? (row?.created_at ? new Date(row.created_at).getTime() : Date.now());
  return {
    ...payload,
    id: payload?.id ?? row?.id,
    createdAt: Number(createdAt),
  } as T;
};

export const saveParentRequest = async (
  data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'>
): Promise<ParentRequest> => {
  const now = Date.now();
  const newRequest: ParentRequest = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    type: 'parent',
    status: 'new',
    changeLog: [{ at: now, type: 'created', by: 'user', note: 'Заявка создана' }],
  };

  const existing = getLocalParents();
  const next = [newRequest, ...existing];
  setLocalParents(next);

  const remote = await remoteSave('parents', newRequest);
  return (remote as ParentRequest) || newRequest;
};

export const updateParentRequest = async (
  data: Partial<ParentRequest> & { id: string },
  options?: { actor?: 'user' | 'admin'; note?: string; allowApprovedEdit?: boolean; forceStatusEvent?: boolean }
): Promise<ParentRequest | null> => {
  const existing = getLocalParents();
  const index = existing.findIndex((p) => p.id === data.id);
  if (index === -1) return null;

  const prev = existing[index];
  if (prev.status === 'approved' && !options?.allowApprovedEdit) return null;

  const now = Date.now();
  const statusChanged = typeof data.status !== 'undefined' && data.status !== prev.status;
  const eventType = (statusChanged || options?.forceStatusEvent) ? 'status_changed' : 'updated';

  const updated = {
    ...prev,
    ...data,
    updatedAt: now,
    changeLog: [
      ...(prev.changeLog || []),
      {
        at: now,
        type: eventType,
        by: options?.actor || 'user',
        note: options?.note || (statusChanged ? `Статус: ${prev.status || 'new'} → ${data.status}` : 'Заявка обновлена'),
      },
    ],
  } as ParentRequest;

  existing[index] = updated;
  setLocalParents(existing);

  const remote = await remoteSave('parents', updated);
  return (remote as ParentRequest) || updated;
};

export const resubmitParentRequest = async (id: string): Promise<ParentRequest | null> => {
  const existing = getLocalParents();
  const index = existing.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const prev = existing[index];
  const now = Date.now();
  const updated: ParentRequest = {
    ...prev,
    status: 'in_review',
    updatedAt: now,
    rejectionInfo: undefined,
    changeLog: [
      ...(prev.changeLog || []),
      { at: now, type: 'resubmitted', by: 'user', note: 'Повторно отправлено на одобрение' },
    ],
  };

  existing[index] = updated;
  setLocalParents(existing);

  const remote = await remoteSave('parents', updated);
  return (remote as ParentRequest) || updated;
};

export const saveNannyProfile = async (data: Partial<NannyProfile>): Promise<NannyProfile> => {
  const existing = getLocalNannies();

  if (data.id) {
    const index = existing.findIndex((p) => p.id === data.id);
    if (index !== -1) {
      const updatedProfile = { ...existing[index], ...data } as NannyProfile;
      existing[index] = updatedProfile;
      setLocalNannies(existing);
      const remote = await remoteSave('nannies', updatedProfile);
      return (remote as NannyProfile) || updatedProfile;
    }
  }

  const newProfile: NannyProfile = {
    reviews: [],
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    type: 'nanny',
  } as NannyProfile;

  setLocalNannies([newProfile, ...existing]);
  const remote = await remoteSave('nannies', newProfile);
  return (remote as NannyProfile) || newProfile;
};

export const getParentRequests = async (): Promise<ParentRequest[]> => {
  const remote = await remoteGet('parents');
  if (remote) {
    const items = remote.map((r) => fromRow<ParentRequest>(r));
    setLocalParents(items);
    return items;
  }
  return getLocalParents();
};

export const getNannyProfiles = async (): Promise<NannyProfile[]> => {
  const remote = await remoteGet('nannies');
  if (remote) {
    const items = remote.map((r) => fromRow<NannyProfile>(r));
    setLocalNannies(items);
    return items;
  }
  return getLocalNannies();
};

export const addReview = async (review: Review): Promise<void> => {
  const nannies = await getNannyProfiles();
  if (nannies.length === 0) return;

  nannies[0].reviews = [review, ...(nannies[0].reviews || [])];
  setLocalNannies(nannies);
  await remoteSave('nannies', nannies[0]);
};

export const clearAllData = async () => {
  removeItem(STORAGE_KEY_PARENTS);
  removeItem(STORAGE_KEY_NANNIES);
  await Promise.all([remoteClear('parents'), remoteClear('nannies')]);
};

export const clearTestData = async () => {
  const localParents = getLocalParents().filter((p) => !String(p.id || '').startsWith('test-'));
  const localNannies = getLocalNannies().filter((n) => !String(n.id || '').startsWith('test-'));
  setLocalParents(localParents);
  setLocalNannies(localNannies);
  await Promise.all([remoteClear('parents', true), remoteClear('nannies', true)]);
};
