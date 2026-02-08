import React, { useState, useRef, useEffect } from 'react';
import { Send, X, ArrowLeft, Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';
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

  // Call State
  const [callStatus, setCallStatus] = useState<'idle' | 'dialing' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  
  // Media Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

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

  // Call Timer Logic
  useEffect(() => {
    let interval: number;
    if (callStatus === 'connected') {
      interval = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Connect Simulation
  useEffect(() => {
    if (callStatus === 'dialing') {
      const timeout = setTimeout(() => {
        setCallStatus('connected');
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [callStatus]);

  // Handle Media Stream for Video Call
  useEffect(() => {
    if (callStatus === 'connected' && callType === 'video') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [callStatus, callType]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error("Camera permission failed", e);
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
      timestamp: Date.now()
    };

    const next = appendChatMessage(bookingId, userMsg);
    setMessages(next);
    setInputValue('');
  };

  const handleStartAudioCall = () => {
    setCallType('audio');
    setCallStatus('dialing');
    setCallDuration(0);
    setIsMuted(false);
  };

  const handleStartVideoCall = () => {
    setCallType('video');
    setCallStatus('dialing');
    setCallDuration(0);
    setIsMuted(false);
    setIsCamOff(false);
  };

  const handleEndCall = () => {
    setCallStatus('idle');
    setCallDuration(0);
    stopCamera();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full h-full sm:h-[600px] sm:max-w-md sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col relative">
        
        {/* Header */}
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
          
          <div className="flex gap-2">
             <button 
               onClick={handleStartAudioCall}
               className="p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors"
               title={text.audioAction}
             >
               <Phone size={18} />
             </button>
             <button 
               onClick={handleStartVideoCall}
               className="p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-sky-100 hover:text-sky-600 transition-colors"
               title={text.videoAction}
             >
               <VideoIcon size={18} />
             </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EFEAE2]">
          {messages.map(msg => {
            const isMine = !!currentUserId && msg.senderId === currentUserId;
            return (
            <div 
              key={msg.id} 
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  isMine
                    ? 'bg-[#E7FFDB] text-stone-800 rounded-tr-sm' 
                    : 'bg-white text-stone-800 rounded-tl-sm'
                }`}
              >
                {msg.senderName && !isMine && <div className="text-[10px] opacity-60 mb-0.5">{msg.senderName}</div>}
                {msg.text}
                <div className={`text-[10px] text-right mt-1 opacity-50 ${isMine ? 'text-green-900' : 'text-stone-400'}`}>
                   {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          )})}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
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

        {/* CALL OVERLAY */}
        {callStatus !== 'idle' && (
          <div className="absolute inset-0 z-50 bg-stone-900 text-white animate-fade-in flex flex-col">
             
             {/* VIDEO MODE MAIN VIEW */}
             {callType === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  {/* Remote Video (Simulated by blurred background + Avatar) */}
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
                     <div className="text-center">
                        <div className="w-32 h-32 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 text-4xl font-bold shadow-2xl mx-auto mb-4 border-4 border-white/20">
                          {nannyName.charAt(0)}
                        </div>
                        {callStatus === 'connected' && (
                           <p className="text-white/50 text-sm font-medium animate-pulse">Low bandwidth</p>
                        )}
                     </div>
                  </div>

                  {/* Local Video (PiP) */}
                  {callStatus === 'connected' && !isCamOff && (
                    <div className="absolute top-4 right-4 w-28 h-40 bg-black rounded-xl border-2 border-white/20 overflow-hidden shadow-2xl">
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                    </div>
                  )}
                </div>
             )}

             {/* AUDIO MODE MAIN VIEW */}
             {callType === 'audio' && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-800/95 backdrop-blur-md">
                   <div className="relative mb-8">
                      {callStatus === 'dialing' && (
                        <div className="absolute inset-0 bg-stone-500 rounded-full animate-ping opacity-25"></div>
                      )}
                      <div className="w-32 h-32 bg-stone-200 rounded-full flex items-center justify-center text-stone-400 text-4xl font-bold border-4 border-stone-600 shadow-2xl relative z-10">
                        {nannyName.charAt(0)}
                      </div>
                    </div>
               </div>
             )}
             
             {/* INFO LAYER (Name & Time) */}
             <div className="absolute top-0 left-0 right-0 pt-16 pb-8 flex flex-col items-center pointer-events-none z-10">
                <h3 className="text-3xl font-bold mb-2 drop-shadow-md">{nannyName}</h3>
                <p className="text-white/80 font-medium tracking-wide drop-shadow-md bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  {callStatus === 'dialing' ? text.callingStatus : formatTime(callDuration)}
                </p>
             </div>

             {/* CONTROLS LAYER */}
             <div className="absolute bottom-0 left-0 right-0 pb-12 pt-8 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-6 items-center z-20">
                
                {/* Mute Toggle */}
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-4 rounded-full transition-all backdrop-blur-sm ${isMuted ? 'bg-white text-stone-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  title={isMuted ? text.micOff : text.micOn}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                {/* Video Toggle (Only for Video Call) */}
                {callType === 'video' && (
                  <button 
                    onClick={() => setIsCamOff(!isCamOff)}
                    className={`p-4 rounded-full transition-all backdrop-blur-sm ${isCamOff ? 'bg-white text-stone-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    title={isCamOff ? text.camOff : text.camOn}
                  >
                    {isCamOff ? <VideoOff size={24} /> : <VideoIcon size={24} />}
                  </button>
                )}

                {/* Hang Up */}
                <button 
                  onClick={handleEndCall}
                  className="p-5 bg-red-500 rounded-full text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:scale-105 transition-all"
                >
                  <PhoneOff size={32} />
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};