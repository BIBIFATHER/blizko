/**
 * Blizko Support Engine — Client Service
 * 
 * Works with support_tickets and support_messages tables.
 * Calls /api/ai-support for AI Concierge responses.
 */
import { supabase } from './supabase';
import { getTmaHeaders } from '../src/core/auth/tma-validate';

export type SupportTicket = {
  id: string;
  family_id: string;
  nanny_id?: string;
  match_id?: string;
  status: 'open' | 'resolved' | 'human_escalated';
  sentiment_score: number;
  summary?: string;
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'ai_concierge' | 'human_agent';
  sender_id?: string;
  text: string;
  created_at: string;
};

// ============================================
// Ticket Management
// ============================================

export async function getOrCreateTicket(userId: string): Promise<SupportTicket | null> {
  if (!supabase) return null;

  // Try to find existing open ticket
  const { data: existing, error: findError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('family_id', userId)
    .in('status', ['open', 'human_escalated'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!findError && existing) return existing as SupportTicket;

  // Create new ticket
  const { data: created, error: createError } = await supabase
    .from('support_tickets')
    .insert({ family_id: userId, status: 'open', sentiment_score: 0.0 })
    .select('*')
    .single();

  if (createError) {
    console.error('getOrCreateTicket: createError:', createError);
    return null;
  }

  return created as SupportTicket;
}

// ============================================
// Message Handling
// ============================================

export async function fetchTicketMessages(ticketId: string): Promise<SupportMessage[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  return (data as SupportMessage[]) || [];
}

export async function sendUserMessage(
  ticketId: string,
  userId: string,
  text: string
): Promise<SupportMessage | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticketId,
      sender_type: 'user',
      sender_id: userId,
      text,
    })
    .select('*')
    .single();

  if (error) {
    console.error('sendUserMessage error:', error);
    return null;
  }

  return data as SupportMessage;
}

// ============================================
// AI Concierge Call
// ============================================

export type ConciergeResponse = {
  reply: string;
  sentiment: number;
  escalated: boolean;
};

export async function callConcierge(
  ticketId: string,
  userId: string,
  message: string
): Promise<ConciergeResponse> {
  try {
    const res = await fetch('/api/ai-support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getTmaHeaders() },
      body: JSON.stringify({ ticketId, userId, message }),
    });

    if (!res.ok) {
      console.error('AI Concierge error:', await res.text());
      return {
        reply: 'Извините, я сейчас не могу ответить. Антон скоро подключится 💛',
        sentiment: 0,
        escalated: false,
      };
    }

    return await res.json();
  } catch (e) {
    console.error('AI Concierge network error:', e);
    return {
      reply: 'Извините, произошла ошибка. Антон скоро подключится 💛',
      sentiment: 0,
      escalated: false,
    };
  }
}

// ============================================
// Realtime Subscription
// ============================================

export function subscribeToTicketMessages(
  ticketId: string,
  onMessage: (m: SupportMessage) => void
) {
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel(`support-ticket-${ticketId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => onMessage(payload.new as SupportMessage)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
