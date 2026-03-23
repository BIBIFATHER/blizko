import { supabase, hasSupabaseClient } from './supabase';
import { getItem, setItem } from '@/core/platform/storage';

// Types
export interface BookingConfirmation {
    id: string;
    booking_id: string;
    type: 't_24h';
    status: 'pending' | 'confirmed' | 'missed';
    due_at: string;
    responded_at?: string;
    created_at: string;
}

const STORAGE_KEY = 'blizko_confirmations';

function getLocalConfirmations(): BookingConfirmation[] {
    const raw = getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as BookingConfirmation[]; } catch { return []; }
}

function setLocalConfirmations(items: BookingConfirmation[]): void {
    setItem(STORAGE_KEY, JSON.stringify(items));
}

// Create T-24h confirmation when booking is created
export async function createT24hConfirmation(
    bookingId: string,
    bookingDate: string
): Promise<BookingConfirmation> {
    const dueAt = new Date(new Date(bookingDate).getTime() - 24 * 60 * 60 * 1000);

    const confirmation: BookingConfirmation = {
        id: crypto.randomUUID(),
        booking_id: bookingId,
        type: 't_24h',
        status: 'pending',
        due_at: dueAt.toISOString(),
        created_at: new Date().toISOString(),
    };

    // Local
    const local = getLocalConfirmations();
    setLocalConfirmations([confirmation, ...local]);

    // Remote
    if (hasSupabaseClient && supabase) {
        try {
            await supabase.from('booking_confirmations').insert(confirmation);
        } catch (e) {
            console.error('[Confirmation] remote save failed:', e);
        }
    }

    return confirmation;
}

// Nanny confirms T-24h
export async function confirmT24h(confirmationId: string): Promise<BookingConfirmation | null> {
    const local = getLocalConfirmations();
    const idx = local.findIndex(c => c.id === confirmationId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    local[idx] = { ...local[idx], status: 'confirmed', responded_at: now };
    setLocalConfirmations(local);

    if (hasSupabaseClient && supabase) {
        try {
            await supabase
                .from('booking_confirmations')
                .update({ status: 'confirmed', responded_at: now })
                .eq('id', confirmationId);
        } catch (e) {
            console.error('[Confirmation] confirm failed:', e);
        }
    }

    return local[idx];
}

// Mark as missed (auto or manual)
export async function markConfirmationMissed(confirmationId: string): Promise<void> {
    const local = getLocalConfirmations();
    const idx = local.findIndex(c => c.id === confirmationId);
    if (idx !== -1) {
        local[idx] = { ...local[idx], status: 'missed' };
        setLocalConfirmations(local);
    }

    if (hasSupabaseClient && supabase) {
        try {
            await supabase
                .from('booking_confirmations')
                .update({ status: 'missed' })
                .eq('id', confirmationId);
        } catch (e) {
            console.error('[Confirmation] mark missed failed:', e);
        }
    }
}

// Get confirmations for a booking
export async function getConfirmationsForBooking(bookingId: string): Promise<BookingConfirmation[]> {
    if (hasSupabaseClient && supabase) {
        try {
            const { data, error } = await supabase
                .from('booking_confirmations')
                .select('*')
                .eq('booking_id', bookingId)
                .order('created_at', { ascending: false });

            if (!error && data) return data as BookingConfirmation[];
        } catch (e) {
            console.error('[Confirmation] fetch failed:', e);
        }
    }

    return getLocalConfirmations().filter(c => c.booking_id === bookingId);
}

// Get pending confirmations (for nanny dashboard)
export async function getPendingConfirmations(): Promise<BookingConfirmation[]> {
    if (hasSupabaseClient && supabase) {
        try {
            const { data, error } = await supabase
                .from('booking_confirmations')
                .select('*')
                .eq('status', 'pending')
                .order('due_at', { ascending: true });

            if (!error && data) return data as BookingConfirmation[];
        } catch (e) {
            console.error('[Confirmation] pending fetch failed:', e);
        }
    }

    return getLocalConfirmations().filter(c => c.status === 'pending');
}
