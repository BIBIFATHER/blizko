import { ParentRequest, NannyProfile, Review, User } from '@/core/types';
import { getItem, setItem, removeItem } from '@/core/platform/storage';
import { supabase } from './supabase';
import { findCurrentNannyProfile } from './currentNannyProfile';

const STORAGE_KEY_PARENTS = 'blizko_parents';
const STORAGE_KEY_NANNIES = 'blizko_nannies';
const STORAGE_KEY_PENDING_PARENTS = 'blizko_parents_pending_sync';
const STORAGE_KEY_PENDING_NANNIES = 'blizko_nannies_pending_sync';

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

const getPendingIds = (key: string): string[] => {
  const data = getItem(key);
  if (!data) return [];
  const parsed = safeJsonParse<string[]>(data, []);
  return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
};

const setPendingIds = (key: string, ids: string[]) => {
  if (ids.length === 0) {
    removeItem(key);
    return;
  }

  setItem(key, JSON.stringify(Array.from(new Set(ids))));
};

function replaceById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index === -1) {
    return [item, ...items];
  }

  const next = [...items];
  next[index] = item;
  return next;
}

function syncLocalParents(item: ParentRequest) {
  setLocalParents(replaceById(getLocalParents(), item));
}

function syncLocalNannies(item: NannyProfile) {
  setLocalNannies(replaceById(getLocalNannies(), item));
}

function markPendingSync(table: 'parents' | 'nannies', id: string) {
  const key = table === 'parents' ? STORAGE_KEY_PENDING_PARENTS : STORAGE_KEY_PENDING_NANNIES;
  setPendingIds(key, [...getPendingIds(key), id]);
}

function clearPendingSync(table: 'parents' | 'nannies', id: string) {
  const key = table === 'parents' ? STORAGE_KEY_PENDING_PARENTS : STORAGE_KEY_PENDING_NANNIES;
  setPendingIds(key, getPendingIds(key).filter((pendingId) => pendingId !== id));
}

function getPendingSyncIds(table: 'parents' | 'nannies') {
  const key = table === 'parents' ? STORAGE_KEY_PENDING_PARENTS : STORAGE_KEY_PENDING_NANNIES;
  return getPendingIds(key);
}

function syncLocalItem(table: 'parents', item: ParentRequest): void;
function syncLocalItem(table: 'nannies', item: NannyProfile): void;
function syncLocalItem(table: 'parents' | 'nannies', item: ParentRequest | NannyProfile) {
  if (table === 'parents') {
    syncLocalParents(item as ParentRequest);
    return;
  }

  syncLocalNannies(item as NannyProfile);
}

function mergeRemoteWithPending<T extends { id: string }>(
  remoteItems: T[],
  localItems: T[],
  pendingIds: string[],
): T[] {
  if (pendingIds.length === 0) return remoteItems;
  const merged = new Map(remoteItems.map((item) => [item.id, item] as const));
  const pendingItems = localItems.filter((item) => pendingIds.includes(item.id));
  pendingItems.forEach((item) => {
    merged.set(item.id, item);
  });
  return Array.from(merged.values());
}

async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

async function getCurrentUserIdentity(): Promise<Partial<Pick<User, 'id' | 'name' | 'email' | 'phone'>>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;

  return {
    id: authUser?.id || undefined,
    email: authUser?.email || undefined,
    phone: String(authUser?.user_metadata?.phone_e164 || authUser?.phone || '') || undefined,
    name: String(authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || '') || undefined,
  };
}

async function remoteGet(table: 'parents' | 'nannies'): Promise<any[] | null> {
  try {
    if (!supabase) return null;
    // For nannies: read from nannies_public view (PII stripped)
    // For parents: read from parents table directly
    const source = table === 'nannies' ? 'nannies_public' : table;
    const { data, error } = await supabase
      .from(source)
      .select('id,payload,created_at')
      .order('created_at', { ascending: false });

    if (error) return null;
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// Owner reads their own full nanny profile (includes PII for editing)
async function remoteGetOwnNanny(): Promise<any | null> {
  try {
    if (!supabase) return null;
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('nannies')
      .select('id,payload,created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

async function remoteGetOwnParents(): Promise<any[] | null> {
  try {
    if (!supabase) return null;
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('parents')
      .select('id,payload,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return null;
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function remoteGetById(table: 'parents' | 'nannies', id: string): Promise<any | null> {
  try {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from(table)
      .select('id,payload,created_at')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return data;
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

async function saveWithFallback(table: 'parents', item: ParentRequest): Promise<ParentRequest>;
async function saveWithFallback(table: 'nannies', item: NannyProfile): Promise<NannyProfile>;
async function saveWithFallback(
  table: 'parents' | 'nannies',
  item: ParentRequest | NannyProfile,
): Promise<ParentRequest | NannyProfile> {
  const remote = await remoteSave(table, item);
  const canonical = (remote as ParentRequest | NannyProfile) || item;

  if (table === 'parents') {
    syncLocalItem(table, canonical as ParentRequest);
  } else {
    syncLocalItem(table, canonical as NannyProfile);
  }

  if (remote) {
    clearPendingSync(table, canonical.id);
  } else {
    markPendingSync(table, canonical.id);
  }

  return canonical;
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

  return saveWithFallback('parents', newRequest);
};

export const updateParentRequest = async (
  data: Partial<ParentRequest> & { id: string },
  options?: { actor?: 'user' | 'admin'; note?: string; allowApprovedEdit?: boolean; forceStatusEvent?: boolean }
): Promise<ParentRequest | null> => {
  const existing = getLocalParents();
  const localPrev = existing.find((p) => p.id === data.id);
  const remotePrev = localPrev ? null : await remoteGetById('parents', data.id);
  const prev = localPrev || (remotePrev ? fromRow<ParentRequest>(remotePrev) : null);
  if (!prev) return null;
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

  return saveWithFallback('parents', updated);
};

export const resubmitParentRequest = async (id: string): Promise<ParentRequest | null> => {
  const existing = getLocalParents();
  const localPrev = existing.find((p) => p.id === id);
  const remotePrev = localPrev ? null : await remoteGetById('parents', id);
  const prev = localPrev || (remotePrev ? fromRow<ParentRequest>(remotePrev) : null);
  if (!prev) return null;
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

  return saveWithFallback('parents', updated);
};

export const saveNannyProfile = async (data: Partial<NannyProfile>): Promise<NannyProfile> => {
  const existing = getLocalNannies();
  const currentUserId = await getCurrentUserId();

  if (data.id) {
    const index = existing.findIndex((p) => p.id === data.id);
    if (index !== -1) {
      const updatedProfile = { ...existing[index], ...data, userId: currentUserId || existing[index].userId } as NannyProfile;
      return saveWithFallback('nannies', updatedProfile);
    }
  }

  const remoteOwn = await remoteGetOwnNanny();
  if (remoteOwn) {
    const remoteOwnProfile = fromRow<NannyProfile>(remoteOwn);
    const updatedProfile = {
      ...remoteOwnProfile,
      ...data,
      id: remoteOwnProfile.id,
      userId: currentUserId || remoteOwnProfile.userId,
    } as NannyProfile;
    return saveWithFallback('nannies', updatedProfile);
  }

  const newProfile: NannyProfile = {
    reviews: [],
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    type: 'nanny',
    userId: currentUserId || data.userId,
  } as NannyProfile;

  return saveWithFallback('nannies', newProfile);
};

export const getParentRequests = async (): Promise<ParentRequest[]> => {
  // Remote is the preferred source of truth.
  // Pending local-only writes stay visible until they are synced remotely.
  const remote = await remoteGet('parents');
  if (remote) {
    const remoteItems = remote.map((r) => fromRow<ParentRequest>(r));
    const pendingIds = getPendingSyncIds('parents');
    const localItems = getLocalParents();
    const merged = mergeRemoteWithPending(remoteItems, localItems, pendingIds);
    const syncedIds = remoteItems.map((item) => item.id);

    setLocalParents(merged);
    setPendingIds(
      STORAGE_KEY_PENDING_PARENTS,
      pendingIds.filter((id) => !syncedIds.includes(id)),
    );
    return merged;
  }
  return getLocalParents();
};

export const getNannyProfiles = async (): Promise<NannyProfile[]> => {
  // Remote is the preferred source of truth.
  // Pending local-only writes stay visible until they are synced remotely.
  const remote = await remoteGet('nannies');
  if (remote) {
    const remoteItems = remote.map((r) => fromRow<NannyProfile>(r));
    const pendingIds = getPendingSyncIds('nannies');
    const localItems = getLocalNannies();
    const merged = mergeRemoteWithPending(remoteItems, localItems, pendingIds);
    const syncedIds = remoteItems.map((item) => item.id);

    setLocalNannies(merged);
    setPendingIds(
      STORAGE_KEY_PENDING_NANNIES,
      pendingIds.filter((id) => !syncedIds.includes(id)),
    );
    return merged;
  }
  return getLocalNannies();
};

function filterLocalParentsForUser(
  items: ParentRequest[],
  user: Partial<Pick<User, 'id' | 'email'>>,
): ParentRequest[] {
  const userId = String(user.id || '').trim();
  const userEmail = String(user.email || '').trim().toLowerCase();

  return items.filter((item) => {
    if (userId && item.requesterId === userId) return true;
    if (userEmail && String(item.requesterEmail || '').trim().toLowerCase() === userEmail) return true;
    return false;
  });
}

export const getMyParentRequests = async (
  user?: Partial<Pick<User, 'id' | 'email'>>,
): Promise<ParentRequest[]> => {
  const identity = { ...(await getCurrentUserIdentity()), ...(user || {}) };
  const localItems = filterLocalParentsForUser(getLocalParents(), identity);
  const pendingIds = getPendingSyncIds('parents');
  const remote = await remoteGetOwnParents();

  if (remote) {
    const remoteItems = remote.map((row) => fromRow<ParentRequest>(row));
    return mergeRemoteWithPending(remoteItems, localItems, pendingIds);
  }

  return localItems;
};

export const getMyNannyProfile = async (
  user?: Partial<Pick<User, 'id' | 'name' | 'email' | 'phone'>>,
): Promise<NannyProfile | undefined> => {
  const identity = { ...(await getCurrentUserIdentity()), ...(user || {}) };
  const localItems = getLocalNannies();
  const pendingIds = getPendingSyncIds('nannies');
  const remoteOwn = await remoteGetOwnNanny();

  if (remoteOwn) {
    const remoteProfile = fromRow<NannyProfile>(remoteOwn);
    const pendingLocal = pendingIds.includes(remoteProfile.id)
      ? localItems.find((item) => item.id === remoteProfile.id)
      : undefined;

    if (pendingLocal) return pendingLocal;

    syncLocalNannies(remoteProfile);
    clearPendingSync('nannies', remoteProfile.id);
    return remoteProfile;
  }

  return findCurrentNannyProfile(localItems, identity);
};

export const addReview = async (review: Review, nannyId?: string): Promise<void> => {
  const nannies = await getNannyProfiles();
  if (nannies.length === 0) return;

  const targetNannyId = nannyId || (review as Review & { nannyId?: string }).nannyId;
  if (!targetNannyId) return;

  const nanny = nannies.find((item) => item.id === targetNannyId);
  if (!nanny) return;

  const updated = {
    ...nanny,
    reviews: [review, ...(nanny.reviews || [])],
  };

  syncLocalNannies(updated);
  await saveWithFallback('nannies', updated);
};

export const clearAllData = async () => {
  removeItem(STORAGE_KEY_PARENTS);
  removeItem(STORAGE_KEY_NANNIES);
  removeItem(STORAGE_KEY_PENDING_PARENTS);
  removeItem(STORAGE_KEY_PENDING_NANNIES);
  await Promise.all([remoteClear('parents'), remoteClear('nannies')]);
};

export const clearTestData = async () => {
  const localParents = getLocalParents().filter((p) => !String(p.id || '').startsWith('test-'));
  const localNannies = getLocalNannies().filter((n) => !String(n.id || '').startsWith('test-'));
  setLocalParents(localParents);
  setLocalNannies(localNannies);
  setPendingIds(STORAGE_KEY_PENDING_PARENTS, getPendingSyncIds('parents').filter((id) => !String(id).startsWith('test-')));
  setPendingIds(STORAGE_KEY_PENDING_NANNIES, getPendingSyncIds('nannies').filter((id) => !String(id).startsWith('test-')));
  await Promise.all([remoteClear('parents', true), remoteClear('nannies', true)]);
};
