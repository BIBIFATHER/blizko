import { supabase } from './supabase';
import { detectContactSharing, notifyContactSharing } from './contactSharing';

export type MatchThread = {
  id: string;
  type: 'match';
  family_id: string;
  nanny_id: string | null;
  match_id: string;
  created_at: string;
};

export type MatchMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

// A client may only add ITSELF as a participant, and only to a thread it
// legitimately belongs to (BLI-124 / RISK-009: participants_insert_v2 +
// can_current_user_join_thread). Adding the counterparty is intentionally NOT
// attempted here — the other side self-joins on its own first open, authorized
// by chat_threads.family_id / nanny_id. Surface the RLS failure instead of
// swallowing it (DB protocol Phase 3), without logging the user id.
const ensureSelfParticipant = async (
  threadId: string,
  userId: string,
  role: 'family' | 'nanny',
): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase
    .from('chat_participants')
    .upsert({ thread_id: threadId, user_id: userId, role });
  if (error) {
    console.warn('[matchChat] self-participant join denied', {
      threadId,
      role,
      code: error.code,
    });
    return false;
  }
  return true;
};

export async function getOrCreateMatchThread(params: {
  matchId: string;
  currentUserId: string;
  currentUserRole: 'family' | 'nanny';
  otherUserId?: string | null;
}): Promise<MatchThread | null> {
  if (!supabase) return null;

  const { matchId, currentUserId, currentUserRole, otherUserId } = params;

  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id,type,family_id,nanny_id,match_id,created_at')
    .eq('type', 'match')
    .eq('match_id', matchId)
    .maybeSingle();

  if (existing) {
    await ensureSelfParticipant(existing.id, currentUserId, currentUserRole);
    return existing as MatchThread;
  }

  // ⚠️ BLI-134 (pre-deploy blocker for BLI-124): callers currently do not pass a
  // verified otherUserId auth uid, so the counterparty id is NULL here. After the
  // BLI-124 hardening migration, a thread created with nanny_id=NULL blocks the
  // nanny's self-join (can_current_user_join_thread requires nanny_id=auth.uid()).
  // Provisioning must set BOTH family_id and nanny_id to correct auth uids
  // (entity id != auth.users.id) before that migration is deployed / real users open.
  const familyId = currentUserRole === 'family' ? currentUserId : otherUserId || currentUserId;
  const nannyId = currentUserRole === 'nanny' ? currentUserId : otherUserId || null;

  const { data: created } = await supabase
    .from('chat_threads')
    .insert({ type: 'match', family_id: familyId, nanny_id: nannyId, match_id: matchId })
    .select('id,type,family_id,nanny_id,match_id,created_at')
    .single();

  if (!created) return null;

  await ensureSelfParticipant(created.id, currentUserId, currentUserRole);

  return created as MatchThread;
}

export async function fetchMatchMessages(threadId: string): Promise<MatchMessage[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('chat_messages')
    .select('id,thread_id,sender_id,text,created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  return (data as MatchMessage[]) || [];
}

export async function sendMatchMessage(
  threadId: string,
  senderId: string,
  text: string,
  options?: { bookingId?: string; senderRole?: 'family' | 'nanny' },
): Promise<MatchMessage | null> {
  if (!supabase) return null;

  const detection = detectContactSharing(text);
  if (detection.hasContact && options?.bookingId && options?.senderRole) {
    void notifyContactSharing({
      bookingId: options.bookingId,
      senderRole: options.senderRole,
      detection,
    });
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ thread_id: threadId, sender_id: senderId, text })
    .select('id,thread_id,sender_id,text,created_at')
    .single();
  if (error) return null;
  return data as MatchMessage;
}

export function subscribeToMatchMessages(threadId: string, onMessage: (m: MatchMessage) => void) {
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel(`match-thread-${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => onMessage(payload.new as MatchMessage),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
