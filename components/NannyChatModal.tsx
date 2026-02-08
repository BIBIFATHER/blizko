import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { Language, ChatMessage } from '../types';
import { t } from '../src/core/i18n/translations';
import { appendChatMessage, getChatMessages } from '../services/chat';

interface NannyChatModalProps {
  bookingId: string;
  nannyName: string;
  currentUserName?: string;
  currentUserId?: string;
  onClose: () => void;
  lang: Language;
}

export const NannyChatModal: React.FC<NannyChatModalProps> = ({ bookingId, nannyName, currentUserName, currentUserId, onClose, lang }) => {
  const text = t[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(getChatMessages(bookingId));
  }, [bookingId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === `blizko_chat_${bookingId}`) {
        setMessages(getChatMessages(bookingId));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      senderId: currentUserId,
      senderName: currentUserName,
      timestamp: Date.now(),
    };

    const next = appendChatMessage(bookingId, userMsg);
    setMessages(next);
    setInputValue('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full h-full sm:h-[600px] sm:max-w-md sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col relative">
        <div className="bg-white border-b border-stone-100 p-4 flex items-center gap-3 shadow-sm z-10">
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800 p-1">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                {nannyName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-stone-800 text-sm leading-none">{nannyName}</h3>
                <span className="text-xs text-green-500 font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EFEAE2]">
          {messages.map((msg) => {
            const isMine = !!currentUserId && msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMine ? 'bg-[#E7FFDB] text-stone-800 rounded-tr-sm' : 'bg-white text-stone-800 rounded-tl-sm'
                  }`}
                >
                  {msg.senderName && !isMine && <div className="text-[10px] opacity-60 mb-0.5">{msg.senderName}</div>}
                  {msg.text}
                  <div className={`text-[10px] text-right mt-1 opacity-50 ${isMine ? 'text-green-900' : 'text-stone-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={text.nannyChatPlaceholder}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="bg-amber-400 text-stone-900 p-2.5 rounded-full hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
