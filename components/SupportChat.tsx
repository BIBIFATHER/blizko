import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Minimize2, Loader2, Sparkles } from 'lucide-react';
import { Language, ChatMessage, User } from '../types';
import { t } from '../src/core/i18n/translations';
import { aiText } from '../src/core/ai/aiGateway';
import { getNannyProfiles, getParentRequests } from '../services/storage';

interface SupportChatProps {
  lang: Language;
  user: User | null;
}

export const SupportChat: React.FC<SupportChatProps> = ({ lang, user }) => {
  const text = t[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const systemInstructionRef = useRef<string | null>(null);

  // --- CONTEXT GATHERING (The "Self-Learning" Part) ---
  const gatherAppContext = (): string => {
    if (!user) return "User is a guest (not logged in).";

    const nannies = getNannyProfiles();
    const parents = getParentRequests();
    
    // Find current user data in storage
    const nannyProfile = nannies.find(n => n.name === user.name || (user.email && n.contact?.includes(user.email)));
    const parentReq = parents.find(p => p.id); // In a real app we'd match ID, here we grab the latest for demo
    
    let contextStr = `\n--- LIVE APP DATA FOR CONTEXT ---\n`;
    contextStr += `User Role: ${user.role}\n`;
    contextStr += `User Name: ${user.name}\n`;

    if (user.role === 'nanny' && nannyProfile) {
      contextStr += `[Profile Status]\n`;
      contextStr += `- City: ${nannyProfile.city}\n`;
      contextStr += `- Experience: ${nannyProfile.experience} years\n`;
      contextStr += `- Verified Identity: ${nannyProfile.isVerified ? 'YES (GosUslugi)' : 'NO'}\n`;
      
      if (nannyProfile.softSkills) {
        contextStr += `[AI Soft Skills Analysis Result]\n`;
        contextStr += `- Dominant Style: ${nannyProfile.softSkills.dominantStyle}\n`;
        contextStr += `- Raw Score: ${nannyProfile.softSkills.rawScore}/100\n`;
        contextStr += `- AI Summary: ${nannyProfile.softSkills.summary}\n`;
      } else {
        contextStr += `[Soft Skills]: Test NOT taken yet. Encourge them to take it.\n`;
      }

      if (nannyProfile.documents && nannyProfile.documents.length > 0) {
        contextStr += `[AI Document Verification]\n`;
        nannyProfile.documents.forEach(doc => {
          contextStr += `- ${doc.type}: ${doc.status} (Confidence: ${doc.aiConfidence}%)\n`;
        });
      } else {
        contextStr += `[Documents]: None uploaded yet.\n`;
      }

      if (nannyProfile.video) {
        contextStr += `[Video Intro]: Uploaded and analyzed.\n`;
      }
    }

    if (user.role === 'parent' && parentReq) {
      contextStr += `[Parent Request Data]\n`;
      contextStr += `- Looking for nanny in: ${parentReq.city}\n`;
      contextStr += `- Child age: ${parentReq.childAge}\n`;
      contextStr += `- Budget: ${parentReq.budget}\n`;
    }

    contextStr += `---------------------------------\n`;
    return contextStr;
  };

  // Recompute system instruction when chat opens or user/lang changes.
  useEffect(() => {
    if (!isOpen) return;

    const dynamicContext = gatherAppContext();
    systemInstructionRef.current = `
You are Anna, the intelligent, self-learning Care Manager for "Blizko".

CORE MISSION:
Help parents and nannies by connecting them with our AI tools. You are NOT just a chatbot; you have access to the app's neural network results.

SELF-LEARNING CAPABILITY:
I have injected the LIVE application state below. You must use this data to personalize your answers.
If the data shows the user has completed a test (Soft Skills) or uploaded documents, REFER TO IT specifically.

${dynamicContext}

KNOWLEDGE BASE:
1. Document AI: We verify docs using computer vision.
2. Behavioral AI: We analyze psychotypes (Empathetic, Structured, Balanced).
3. Video AI: We analyze non-verbal cues.

TONE:
Warm, professional, concise.
Current User Language: ${lang === 'ru' ? 'Russian' : 'English'}.
ALWAYS reply in ${lang === 'ru' ? 'Russian' : 'English'}.
    `.trim();
  }, [isOpen, user, lang]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        text: text.chatWelcome,
        sender: 'agent',
        timestamp: Date.now()
      }]);
    }
  }, [lang]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
  e?.preventDefault();

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  console.log("VITE_GEMINI_API_KEY:", apiKey ? apiKey.slice(0, 6) : "undefined");

  if (!inputValue.trim()) return;



  

    const userText = inputValue;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const recent = messages.slice(-10).map(m => {
        const role = m.sender === 'user' ? 'User' : 'Anna';
        return `${role}: ${m.text}`;
      }).join('\n');

      const userPrompt = `${recent ? `Conversation so far:\n${recent}\n\n` : ''}User: ${userText}\nAnna:`;
console.log(
  "VITE_GEMINI_API_KEY:",
  import.meta.env.VITE_GEMINI_API_KEY?.slice(0, 6),
  "MODE:",
  import.meta.env.MODE
);

      const aiResponseText = await aiText(userPrompt, {
        systemPrompt: systemInstructionRef.current || undefined,
        temperature: 0.7,
      });

      if (aiResponseText) {
        const agentMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: aiResponseText || "...",
          sender: 'agent',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, agentMsg]);
      } else {
        // Demo / missing key fallback (keep behavior)
        setTimeout(() => {
          const agentMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: lang === 'ru' ? "Связь с AI сервером устанавливается..." : "Connecting to AI server...",
            sender: 'agent',
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, agentMsg]);
        }, 1000);
      }
    } catch (error) {
      console.error("Chat error:", error);

      const message = error instanceof Error ? error.message : String(error ?? '');
      const isRateLimit = message.includes('RATE_LIMIT') || message.includes('429') || message.includes('RESOURCE_EXHAUSTED');

      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: isRateLimit
          ? (lang === 'ru'
              ? 'Анна сейчас перегружена (лимит AI-запросов временно исчерпан). Попробуйте снова через минуту.'
              : 'Anna is temporarily overloaded (AI quota reached). Please try again in about a minute.')
          : (lang === 'ru'
              ? 'Не удалось связаться с Анной. Попробуйте ещё раз чуть позже.'
              : 'Error connecting to Anna. Please try again later.'),
        sender: 'agent',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-stone-900 hover:bg-stone-800 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95 animate-fade-in flex items-center justify-center group"
      >
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-full max-w-[340px] flex flex-col items-end animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden w-full h-[480px] flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 flex justify-between items-center relative overflow-hidden">
          {/* Decorative AI Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="flex items-center gap-3 z-10">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 border border-stone-900 animate-pulse absolute -bottom-0.5 -right-0.5" />
              <div className="w-10 h-10 bg-gradient-to-br from-amber-200 to-amber-500 rounded-full flex items-center justify-center text-stone-900 font-bold text-sm shadow-inner">
                <Sparkles size={18} />
              </div>
            </div>
            <div>
              <span className="font-bold block text-sm tracking-wide">Anna AI</span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider flex items-center gap-1">
                {user ? (lang === 'ru' ? 'Персональный менеджер' : 'Personal Manager') : (lang === 'ru' ? 'Ассистент' : 'Assistant')}
              </span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white transition-colors z-10">
            <Minimize2 size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
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

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={text.chatPlaceholder}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all"
          />
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