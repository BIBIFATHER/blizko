import { supabase } from './supabase';

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

const ensureParticipant = async (threadId: string, userId: string, role: 'family' | 'nanny') => {
  if (!supabase) return;
  await supabase
    .from('chat_participants')
    .upsert({ thread_id: threadId, user_id: userId, role });
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
    await ensureParticipant(existing.id, currentUserId, currentUserRole);
    if (otherUserId) {
      await ensureParticipant(existing.id, otherUserId, currentUserRole === 'family' ? 'nanny' : 'family');
    }
    return existing as MatchThread;
  }

  const familyId = currentUserRole === 'family' ? currentUserId : otherUserId || currentUserId;
  const nannyId = currentUserRole === 'nanny' ? currentUserId : otherUserId || null;

  const { data: created } = await supabase
    .from('chat_threads')
    .insert({ type: 'match', family_id: familyId, nanny_id: nannyId, match_id: matchId })
    .select('id,type,family_id,nanny_id,match_id,created_at')
    .single();

  if (!created) return null;

  await ensureParticipant(created.id, currentUserId, currentUserRole);
  if (otherUserId) {
    await ensureParticipant(created.id, otherUserId, currentUserRole === 'family' ? 'nanny' : 'family');
  }

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

export async function sendMatchMessage(threadId: string, senderId: string, text: string): Promise<MatchMessage | null> {
  if (!supabase) return null;
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
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
      (payload) => onMessage(payload.new as MatchMessage)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
