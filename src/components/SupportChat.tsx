import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Minimize2, Loader2, Sparkles, UserCheck, X } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { Language, User } from '@/core/types';
import { t } from '@/core/i18n/translations';
import { trackChatOpen } from '@/services/analytics';
import {
  getOrCreateTicket,
  fetchTicketMessages,
  sendUserMessage,
  callConcierge,
  subscribeToTicketMessages,
  type SupportMessage,
  type SupportTicket,
} from '@/services/supportEngine';

interface SupportChatProps {
  lang: Language;
  user: User | null;
  hideLauncher?: boolean;
  openOnMount?: boolean;
}

const SupportChatInner: React.FC<SupportChatProps> = ({ lang, user, hideLauncher = false, openOnMount = false }) => {
  const text = t[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openOnMount) return;

    setIsOpen(true);
    trackChatOpen('deferred_open');
  }, [openOnMount]);

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      setIsLoading(true);
      try {
        const tk = await getOrCreateTicket(user.id as string);
        if (!tk) return;
        setTicket(tk);
        setIsEscalated(tk.status === 'human_escalated');

        const existing = await fetchTicketMessages(tk.id);
        setMessages(existing);

        // If no messages yet, show a proactive welcome
        if (existing.length === 0) {
          setMessages([{
            id: 'welcome',
            ticket_id: tk.id,
            sender_type: 'ai_concierge',
            text: lang === 'ru'
              ? 'Привет! 👋 Я — AI-помощник Blizko. Спрашивайте что угодно о подборе няни, верификации или работе сервиса. Если понадобится человек — я сразу позову Антона.'
              : 'Hi! 👋 I\'m the Blizko AI assistant. Ask me anything about nanny matching, verification, or how the service works. If you need a human — I\'ll connect you with Anton right away.',
            created_at: new Date().toISOString(),
          }]);
        }

        unsubscribe = subscribeToTicketMessages(tk.id, (m) => {
          setMessages((prev) => {
            // Avoid duplicates (we already add AI messages optimistically)
            if (prev.some(p => p.id === m.id)) return prev;
            return [...prev, m];
          });
          if (m.sender_type === 'human_agent') {
            setIsEscalated(false); // Human responded, reset escalation
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, user?.id, lang]);

  useEffect(() => {
    const openFromEvent = () => {
      setIsOpen(true);
      trackChatOpen('custom_event');
    };

    window.addEventListener('blizko:open-support-chat', openFromEvent);
    return () => window.removeEventListener('blizko:open-support-chat', openFromEvent);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isAiThinking]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !user?.id || !ticket) return;

    const userText = inputValue.trim();
    setInputValue('');

    // 1. Save user message to DB
    const sent = await sendUserMessage(ticket.id, user.id, userText);
    if (!sent) return;

    // 2. Add user message to local state
    setMessages(prev => [...prev, sent]);

    // 3. Call AI Concierge
    setIsAiThinking(true);
    const result = await callConcierge(ticket.id, user.id, userText);
    setIsAiThinking(false);

    // 4. Add AI response to local state (will also arrive via Realtime)
    setMessages(prev => [...prev, {
      id: `ai-${Date.now()}`,
      ticket_id: ticket.id,
      sender_type: 'ai_concierge',
      text: result.reply,
      created_at: new Date().toISOString(),
    }]);

    // 5. Check if escalated
    if (result.escalated) {
      setIsEscalated(true);
    }
  };

  // ============================================
  // Render: Closed State (Launcher Button)
  // ============================================
  if (!isOpen) {
    if (hideLauncher) return null;
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          trackChatOpen('launcher');
        }}
        className="fixed bottom-20 right-4 z-70 flex items-center justify-center rounded-full bg-stone-900 p-3.5 text-white shadow-2xl transition-transform animate-fade-in group hover:scale-105 hover:bg-stone-800 active:scale-95"
        aria-label={lang === 'ru' ? 'Открыть чат поддержки' : 'Open support chat'}
      >
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        <MessageCircle size={24} className="group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  // ============================================
  // Render: Not Logged In
  // ============================================
  if (!user?.id) {
    return (
      <div className="fixed bottom-4 right-4 z-70 w-full max-w-[340px] flex flex-col items-end animate-slide-up">
        <div className="card-cloud w-full overflow-hidden rounded-[1.7rem] p-5 flex flex-col">
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm font-medium text-stone-700">{lang === 'ru' ? 'Для чата нужна авторизация' : 'Please sign in to use chat'}</div>
            <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-600 transition-colors p-1" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">{lang === 'ru' ? 'Войдите в аккаунт, чтобы написать нам. Мы ответим за пару секунд!' : 'Sign in to chat with us. We respond in seconds!'}</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('blizko:open-auth-modal', { detail: { source: 'support_chat_gate' } }))}
            className="mt-4 w-full bg-stone-900 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            {lang === 'ru' ? 'Войти и написать' : 'Sign in to chat'}
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Chat Window
  // ============================================

  const getSenderInfo = (msg: SupportMessage) => {
    switch (msg.sender_type) {
      case 'ai_concierge':
        return { label: 'AI Concierge', icon: <Sparkles size={12} className="text-amber-500" />, bubbleClass: 'bg-linear-to-br from-amber-50 to-orange-50 border border-amber-100 text-stone-700 rounded-tl-sm' };
      case 'human_agent':
        return { label: 'Антон', icon: <UserCheck size={12} className="text-green-500" />, bubbleClass: 'bg-linear-to-br from-green-50 to-emerald-50 border border-green-100 text-stone-700 rounded-tl-sm' };
      default:
        return { label: 'Вы', icon: null, bubbleClass: 'bg-amber-100 text-stone-900 rounded-tr-sm' };
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-70 w-full max-w-[360px] flex flex-col items-end animate-slide-up">
      <div className="card-cloud w-full overflow-hidden rounded-[1.8rem] flex flex-col border border-white/70" style={{ height: 'min(520px, calc(100vh - 100px))' }}>
        {/* Header */}
        <div className="relative flex items-center justify-between overflow-hidden border-b border-[color:var(--cloud-border)] bg-stone-950 p-4 text-white">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 z-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-amber-200 to-amber-500 text-sm font-bold text-stone-900 shadow-inner">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="font-bold block text-sm tracking-wide">AI Concierge</span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                {isEscalated
                  ? (lang === 'ru' ? '🔴 Антон подключается...' : '🔴 Anton is joining...')
                  : (lang === 'ru' ? '🟢 Онлайн' : '🟢 Online')
                }
              </span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white transition-colors">
            <Minimize2 size={18} />
          </button>
        </div>

        {/* Escalation Banner */}
        {isEscalated && (
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2">
            <UserCheck size={14} className="text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">
              {lang === 'ru' ? 'Антон уже в курсе и скоро подключится лично' : 'Anton has been notified and will join shortly'}
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[rgba(252,248,241,0.78)] p-4">
          {/* Skeleton loader */}
          {isLoading && (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[75%]">
                    <div className="h-2.5 w-16 bg-stone-200 rounded mb-2" />
                    <div className="bg-stone-200 rounded-2xl rounded-tl-sm h-12 w-48" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {messages.map((msg) => {
            const info = getSenderInfo(msg);
            const isUser = msg.sender_type === 'user';

            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  {!isUser && (
                    <div className="flex items-center gap-1 mb-1 ml-1">
                      {info.icon}
                      <span className="text-[10px] text-stone-400 font-medium">{info.label}</span>
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${info.bubbleClass}`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}

          {/* AI Thinking Indicator */}
          {isAiThinking && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <div className="flex items-center gap-1 mb-1 ml-1">
                  <Sparkles size={12} className="text-amber-500 animate-pulse" />
                  <span className="text-[10px] text-stone-400 font-medium">
                    {lang === 'ru' ? 'Думаю...' : 'Thinking...'}
                  </span>
                </div>
                <div className="bg-linear-to-br from-amber-50 to-orange-50 border border-amber-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-[color:var(--cloud-border)] bg-white/92 p-3 backdrop-blur-sm">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={lang === 'ru' ? 'Напишите сообщение...' : 'Type a message...'}
            className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-amber-300"
            disabled={isAiThinking}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isAiThinking}
            className="bg-stone-900 text-white p-2.5 rounded-xl hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md"
          >
            {isAiThinking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

// Wrapped with ErrorBoundary
export const SupportChat: React.FC<SupportChatProps> = (props) => (
  <ErrorBoundary fallbackMessage="Чат временно недоступен. Попробуйте обновить страницу или напишите нам на help@blizko.app">
    <SupportChatInner {...props} />
  </ErrorBoundary>
);
