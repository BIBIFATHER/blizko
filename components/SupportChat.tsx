import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Minimize2, Loader2 } from 'lucide-react';
import { Language, ChatMessage, User } from '../types';
import { t } from '../src/core/i18n/translations';
import {
  fetchSupportMessages,
  getOrCreateSupportThread,
  sendSupportMessage,
  subscribeToSupportMessages,
} from '../services/supportChat';

interface SupportChatProps {
  lang: Language;
  user: User | null;
  hideLauncher?: boolean;
}

export const SupportChat: React.FC<SupportChatProps> = ({ lang, user, hideLauncher = false }) => {
  const text = t[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      const thread = await getOrCreateSupportThread(user.id as string);
      if (!thread) return;
      setThreadId(thread.id);

      const existing = await fetchSupportMessages(thread.id);
      setMessages(
        existing.map((m) => ({
          id: m.id,
          text: m.text,
          sender: m.sender_id === user.id ? 'user' : 'agent',
          senderId: m.sender_id,
          timestamp: new Date(m.created_at).getTime(),
        }))
      );

      unsubscribe = subscribeToSupportMessages(thread.id, (m) => {
        setMessages((prev) => [
          ...prev,
          {
            id: m.id,
            text: m.text,
            sender: m.sender_id === user.id ? 'user' : 'agent',
            senderId: m.sender_id,
            timestamp: new Date(m.created_at).getTime(),
          },
        ]);
      });
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !user?.id || !threadId) return;

    setIsTyping(true);
    const text = inputValue.trim();
    setInputValue('');

    const sent = await sendSupportMessage(threadId, user.id, text);
    if (!sent) {
      setIsTyping(false);
      return;
    }
    setIsTyping(false);
  };

  // Attachments are disabled for MVP.

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

  return (
    <div className="fixed bottom-6 right-6 z-[70] w-full max-w-[360px] flex flex-col items-end animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden w-full h-[480px] flex flex-col">
        <div className="bg-stone-900 text-white p-4 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center gap-3 z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-200 to-amber-500 rounded-full flex items-center justify-center text-stone-900 font-bold text-sm shadow-inner">
              <MessageCircle size={18} />
            </div>
            <div>
              <span className="font-bold block text-sm tracking-wide">Support</span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider">{lang === 'ru' ? 'Команда Blizko' : 'Blizko Team'}</span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white transition-colors">
            <Minimize2 size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-amber-100 text-stone-900 rounded-tr-sm'
                    : 'bg-white border border-stone-100 text-stone-700 rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex gap-2 items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={text.chatPlaceholder}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all"
          />
          {/* Attachments disabled for MVP */}
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="bg-stone-900 text-white p-2.5 rounded-xl hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md"
          >
            {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};
