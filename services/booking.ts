import { supabase, hasSupabaseClient } from './supabase';
import { getItem, setItem } from '../src/core/platform/storage';

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

// Local storage helpers
function getLocalBookings(): Booking[] {
    const raw = getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as Booking[]; } catch { return []; }
}

function setLocalBookings(items: Booking[]): void {
    setItem(STORAGE_KEY, JSON.stringify(items));
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

    // Local
    const local = getLocalBookings();
    setLocalBookings([booking, ...local]);

    // Remote
    if (hasSupabaseClient && supabase) {
        try {
            await supabase.from('bookings').insert(booking);
        } catch (e) {
            console.error('[Booking] remote save failed:', e);
        }
    }

    return booking;
}

// Update booking status
export async function updateBookingStatus(
    bookingId: string,
    status: Booking['status']
): Promise<Booking | null> {
    const local = getLocalBookings();
    const idx = local.findIndex(b => b.id === bookingId);
    if (idx === -1) return null;

    local[idx] = { ...local[idx], status };
    setLocalBookings(local);

    if (hasSupabaseClient && supabase) {
        try {
            await supabase.from('bookings').update({ status }).eq('id', bookingId);
        } catch (e) {
            console.error('[Booking] status update failed:', e);
        }
    }

    return local[idx];
}

// Get bookings for a user (as parent or nanny)
export async function getBookingsForUser(userId: string): Promise<Booking[]> {
    if (hasSupabaseClient && supabase) {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .or(`parent_id.eq.${userId},nanny_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setLocalBookings(data as Booking[]);
                return data as Booking[];
            }
        } catch (e) {
            console.error('[Booking] remote fetch failed:', e);
        }
    }

    return getLocalBookings().filter(
        b => b.parent_id === userId || b.nanny_id === userId
    );
}

// Get all bookings (admin)
export async function getAllBookings(): Promise<Booking[]> {
    if (hasSupabaseClient && supabase) {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) return data as Booking[];
        } catch (e) {
            console.error('[Booking] admin fetch failed:', e);
        }
    }

    return getLocalBookings();
}
