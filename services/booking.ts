import { supabase, hasSupabaseClient } from './supabase';
import { getItem, removeItem, setItem } from '../src/core/platform/storage';
import { trackBookingCreated } from './analytics';

// Types
export interface Booking {
    id: string;
    parent_id: string;
    nanny_id: string;
    request_id: string;
    date: string;
    status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
    amount?: string;
    created_at: string;
}

const STORAGE_KEY = 'blizko_bookings';
const STORAGE_KEY_PENDING = 'blizko_bookings_pending_sync';

function safeJsonParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw) as T;
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

// Local storage helpers
function getLocalBookings(): Booking[] {
    return safeJsonParse<Booking[]>(getItem(STORAGE_KEY), []);
}

function setLocalBookings(items: Booking[]): void {
    setItem(STORAGE_KEY, JSON.stringify(items));
}

function getPendingBookingIds(): string[] {
    return safeJsonParse<string[]>(getItem(STORAGE_KEY_PENDING), []);
}

function setPendingBookingIds(ids: string[]): void {
    const next = Array.from(new Set(ids.filter(Boolean)));
    if (next.length === 0) {
        removeItem(STORAGE_KEY_PENDING);
        return;
    }
    setItem(STORAGE_KEY_PENDING, JSON.stringify(next));
}

function markPendingBooking(id: string): void {
    setPendingBookingIds([...getPendingBookingIds(), id]);
}

function clearPendingBooking(id: string): void {
    setPendingBookingIds(getPendingBookingIds().filter((pendingId) => pendingId !== id));
}

function replaceBooking(items: Booking[], booking: Booking): Booking[] {
    const index = items.findIndex((item) => item.id === booking.id);
    if (index === -1) return [booking, ...items];

    const next = [...items];
    next[index] = booking;
    return next;
}

function upsertLocalBookings(items: Booking[]): void {
    const next = items.reduce((acc, booking) => replaceBooking(acc, booking), getLocalBookings());
    setLocalBookings(next);
}

function sortBookings(items: Booking[]): Booking[] {
    return [...items].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

function mergeRemoteWithPending(remoteItems: Booking[], localItems: Booking[], pendingIds: string[]): Booking[] {
    if (pendingIds.length === 0) return sortBookings(remoteItems);

    const merged = new Map(remoteItems.map((item) => [item.id, item] as const));
    const pendingItems = localItems.filter((item) => pendingIds.includes(item.id));

    pendingItems.forEach((item) => {
        merged.set(item.id, item);
    });

    return sortBookings(Array.from(merged.values()));
}

async function remoteSaveBooking(booking: Booking): Promise<Booking | null> {
    if (!hasSupabaseClient || !supabase) return null;

    const { data, error } = await supabase
        .from('bookings')
        .upsert(booking, { onConflict: 'id' })
        .select('*')
        .single();

    if (error || !data) return null;
    return data as Booking;
}

async function remoteFetchBookingById(bookingId: string): Promise<Booking | null> {
    if (!hasSupabaseClient || !supabase) return null;

    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();

    if (error || !data) return null;
    return data as Booking;
}

// Create booking
export async function createBooking(data: {
    parent_id: string;
    nanny_id: string;
    request_id: string;
    date: string;
    amount?: string;
}): Promise<Booking> {
    const booking: Booking = {
        id: crypto.randomUUID(),
        ...data,
        status: 'pending',
        created_at: new Date().toISOString(),
    };

    upsertLocalBookings([booking]);
    trackBookingCreated(booking.parent_id, booking.nanny_id);

    try {
        const remote = await remoteSaveBooking(booking);
        if (remote) {
            upsertLocalBookings([remote]);
            clearPendingBooking(remote.id);
            return remote;
        }
    } catch (e) {
        console.error('[Booking] remote save failed:', e);
    }

    markPendingBooking(booking.id);
    return booking;
}

// Update booking status
export async function updateBookingStatus(
    bookingId: string,
    status: Booking['status']
): Promise<Booking | null> {
    const local = getLocalBookings();
    const localPrev = local.find((booking) => booking.id === bookingId);
    const remotePrev = localPrev ? null : await remoteFetchBookingById(bookingId);
    const prev = localPrev || remotePrev;
    if (!prev) return null;

    const updated: Booking = { ...prev, status };
    upsertLocalBookings([updated]);

    try {
        const remote = await remoteSaveBooking(updated);
        if (remote) {
            upsertLocalBookings([remote]);
            clearPendingBooking(remote.id);
            return remote;
        }
    } catch (e) {
        console.error('[Booking] status update failed:', e);
    }

    markPendingBooking(updated.id);
    return updated;
}

// Get bookings for a user (as parent or nanny)
export async function getBookingsForUser(userId: string): Promise<Booking[]> {
    const local = getLocalBookings();
    const localUserBookings = local.filter(
        (booking) => booking.parent_id === userId || booking.nanny_id === userId
    );

    if (hasSupabaseClient && supabase) {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .or(`parent_id.eq.${userId},nanny_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const remoteBookings = data as Booking[];
                const merged = mergeRemoteWithPending(remoteBookings, localUserBookings, getPendingBookingIds());
                upsertLocalBookings(merged);
                return merged;
            }
        } catch (e) {
            console.error('[Booking] remote fetch failed:', e);
        }
    }

    return sortBookings(localUserBookings);
}

// Get all bookings (admin)
export async function getAllBookings(): Promise<Booking[]> {
    if (hasSupabaseClient && supabase) {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                const remoteBookings = data as Booking[];
                const merged = mergeRemoteWithPending(remoteBookings, getLocalBookings(), getPendingBookingIds());
                setLocalBookings(merged);
                return merged;
            }
        } catch (e) {
            console.error('[Booking] admin fetch failed:', e);
        }
    }

    return sortBookings(getLocalBookings());
}
