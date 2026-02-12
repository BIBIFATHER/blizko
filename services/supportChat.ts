import { supabase } from './supabase';

export type SupportThread = {
  id: string;
  family_id: string;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

export type SupportAttachment = {
  id: string;
  message_id: string;
  url: string;
  type: 'image' | 'file';
  size?: number | null;
  created_at: string;
};

export async function getOrCreateSupportThread(userId: string): Promise<SupportThread | null> {
  if (!supabase) return null;

  const { data: existing, error: existingError } = await supabase
    .from('chat_threads')
    .select('id,family_id,created_at')
    .eq('family_id', userId)
    .eq('type', 'support')
    .maybeSingle();

  if (!existingError && existing) return existing as SupportThread;

  const { data: created, error: createError } = await supabase
    .from('chat_threads')
    .insert({ type: 'support', family_id: userId })
    .select('id,family_id,created_at')
    .single();

  if (createError) return null;

  // Ensure family is a participant
  await supabase
    .from('chat_participants')
    .insert({ thread_id: created.id, user_id: userId, role: 'family' });

  return created as SupportThread;
}

export async function fetchSupportMessages(threadId: string): Promise<SupportMessage[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('chat_messages')
    .select('id,thread_id,sender_id,text,created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  return (data as SupportMessage[]) || [];
}

export async function sendSupportMessage(threadId: string, senderId: string, text: string): Promise<SupportMessage | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ thread_id: threadId, sender_id: senderId, text })
    .select('id,thread_id,sender_id,text,created_at')
    .single();
  if (error) return null;
  return data as SupportMessage;
}

export async function uploadSupportAttachment(
  threadId: string,
  messageId: string,
  file: File
): Promise<SupportAttachment | null> {
  if (!supabase) return null;

  const path = `${threadId}/${messageId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, { upsert: false });

  if (error || !data?.path) return null;

  const { data: publicUrl } = supabase.storage.from('chat-attachments').getPublicUrl(data.path);

  const { data: inserted, error: insertError } = await supabase
    .from('chat_attachments')
    .insert({
      message_id: messageId,
      url: publicUrl.publicUrl,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      size: file.size,
    })
    .select('id,message_id,url,type,size,created_at')
    .single();

  if (insertError) return null;
  return inserted as SupportAttachment;
}

export function subscribeToSupportMessages(threadId: string, onMessage: (m: SupportMessage) => void) {
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel(`support-thread-${threadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
      (payload) => onMessage(payload.new as SupportMessage)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
