import { supabase } from './supabase';

export type TrackingEventName =
  | 'nanny_profile_started'
  | 'nanny_profile_completed'
  | 'nanny_registered'
  | 'nanny_verified'
  | 'nanny_matched'
  | 'deal_done';

export type TrackingPayload = Record<string, any>;

export async function trackEvent(name: TrackingEventName, props: TrackingPayload = {}) {
  try {
    if (!supabase) return false;

    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id || null;

    const payload = {
      event_name: name,
      event_ts: new Date().toISOString(),
      user_id: userId,
      properties: props,
      source: 'web',
    };

    const { error } = await supabase.from('tracking_events').insert(payload);
    return !error;
  } catch {
    return false;
  }
}
