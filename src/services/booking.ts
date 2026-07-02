import { supabase, hasSupabaseClient } from './supabase';
import { trackBookingCreated } from './analytics';
import { recordMatchOutcome } from './matchingFeedback';

// Types
export interface Booking {
  id: string;
  parent_id: string | null;
  nanny_id: string | null;
  request_id: string;
  date: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  amount?: string;
  created_at: string;
}

// Create booking — server-authoritative (BLI-141 Plan B). Клиент шлёт entity-id'ы +
// idempotency_key; сервер выводит auth-uid сторон, применяет инварианты, возвращает истинный
// результат. НЕТ local-first / ложного success: при ошибке — throw.
export async function createBooking(data: {
  request_id: string;
  nanny_entity_id: string;
  idempotency_key: string;
  date: string;
  amount?: string;
}): Promise<Booking> {
  const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('/api/bookings?op=create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok || !payload?.booking) {
    throw new Error((payload?.error as string) || `create failed (${response.status})`);
  }

  const booking = payload.booking as Booking;
  if (booking.parent_id && booking.nanny_id) {
    trackBookingCreated(booking.parent_id, booking.nanny_id);
  }
  return booking;
}

// Update booking status — server-authoritative (BLI-141 Plan C). The server
// validates the actor role, expected status and transition matrix.
export async function updateBookingStatus(
  bookingId: string,
  expectedStatus: Booking['status'],
  toStatus: Booking['status'],
): Promise<Booking> {
  const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('/api/bookings?op=status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      booking_id: bookingId,
      expected_status: expectedStatus,
      to_status: toStatus,
    }),
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok || !payload?.booking) {
    throw new Error((payload?.error as string) || `status update failed (${response.status})`);
  }

  const booking = payload.booking as Booking;
  if (
    (toStatus === 'confirmed' || toStatus === 'completed') &&
    expectedStatus !== toStatus &&
    booking.parent_id &&
    booking.nanny_id
  ) {
    void recordMatchOutcome(booking.parent_id, booking.nanny_id, 'hired');
  }
  return booking;
}

// Get bookings for a user (as parent or nanny)
export async function getBookingsForUser(userId: string): Promise<Booking[]> {
  if (!hasSupabaseClient || !supabase) throw new Error('Supabase client unavailable');

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .or(`parent_id.eq.${userId},nanny_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'failed to load bookings');
  return (data ?? []) as Booking[];
}

// Get all bookings (admin)
export async function getAllBookings(): Promise<Booking[]> {
  const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('/api/bookings', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok || !payload?.bookings) {
    throw new Error((payload?.error as string) || `list failed (${response.status})`);
  }
  return payload.bookings as Booking[];
}
