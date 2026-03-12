import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Minimize2, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { Language, User } from '../types';
import { t } from '../src/core/i18n/translations';
import {
  getOrCreateTicket,
  fetchTicketMessages,
  sendUserMessage,
  callConcierge,
  subscribeToTicketMessages,
  type SupportMessage,
  type SupportTicket,
} from '../services/supportEngine';

interface SupportChatProps {
  lang: Language;
  user: User | null;
  hideLauncher?: boolean;
}

export const SupportChat: React.FC<SupportChatProps> = ({ lang, user, hideLauncher = false }) => {
  const text = t[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      const t = await getOrCreateTicket(user.id as string);
      if (!t) return;
      setTicket(t);
      setIsEscalated(t.status === 'human_escalated');

      const existing = await fetchTicketMessages(t.id);
      setMessages(existing);

      // If no messages yet, show a proactive welcome
      if (existing.length === 0) {
        setMessages([{
          id: 'welcome',
          ticket_id: t.id,
          sender_type: 'ai_concierge',
          text: lang === 'ru'
            ? 'Привет! 👋 Я — AI-помощник Blizko. Спрашивайте что угодно о подборе няни, верификации или работе сервиса. Если понадобится человек — я сразу позову Антона.'
            : 'Hi! 👋 I\'m the Blizko AI assistant. Ask me anything about nanny matching, verification, or how the service works. If you need a human — I\'ll connect you with Anton right away.',
          created_at: new Date().toISOString(),
        }]);
      }

      unsubscribe = subscribeToTicketMessages(t.id, (m) => {
        setMessages((prev) => {
          // Avoid duplicates (we already add AI messages optimistically)
          if (prev.some(p => p.id === m.id)) return prev;
          return [...prev, m];
        });
        if (m.sender_type === 'human_agent') {
          setIsEscalated(false); // Human responded, reset escalation
        }
      });
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, user?.id, lang]);

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
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[70] bg-stone-900 hover:bg-stone-800 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95 animate-fade-in flex items-center justify-center group"
      >
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  // ============================================
  // Render: Not Logged In
  // ============================================
  if (!user?.id) {
    return (
      <div className="fixed bottom-6 right-6 z-[70] w-full max-w-[340px] flex flex-col items-end animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden w-full h-[220px] flex flex-col p-4">
          <div className="text-sm text-stone-700">{lang === 'ru' ? 'Для чата нужна авторизация.' : 'Please sign in to use support chat.'}</div>
          <button onClick={() => setIsOpen(false)} className="mt-4 text-stone-500">{lang === 'ru' ? 'Закрыть' : 'Close'}</button>
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
        return { label: 'AI Concierge', icon: <Sparkles size={12} className="text-amber-500" />, bubbleClass: 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 text-stone-700 rounded-tl-sm' };
      case 'human_agent':
        return { label: 'Антон', icon: <UserCheck size={12} className="text-green-500" />, bubbleClass: 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 text-stone-700 rounded-tl-sm' };
      default:
        return { label: 'Вы', icon: null, bubbleClass: 'bg-amber-100 text-stone-900 rounded-tr-sm' };
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70] w-full max-w-[360px] flex flex-col items-end animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden w-full h-[520px] flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center gap-3 z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-200 to-amber-500 rounded-full flex items-center justify-center text-stone-900 font-bold text-sm shadow-inner">
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
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2">
            <UserCheck size={14} className="text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">
              {lang === 'ru' ? 'Антон уже в курсе и скоро подключится лично' : 'Anton has been notified and will join shortly'}
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
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
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
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
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex gap-2 items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={lang === 'ru' ? 'Напишите сообщение...' : 'Type a message...'}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all"
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
