import React, { useState } from 'react';
import { Button, Input } from './UI';
import { X, Shield } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';

interface GosUslugiModalProps {
  onClose: () => void;
  onSuccess: () => void;
  lang: Language;
}

export const GosUslugiModal: React.FC<GosUslugiModalProps> = ({ onClose, onSuccess, lang }) => {
  const text = t[lang];
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate ESIA request (Speed up for testing: 600ms)
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header - imitation of official portal */}
        <div className="bg-[#0D4CD3] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border-2 border-white flex items-center justify-center font-bold text-lg">
              {lang === 'ru' ? 'Г' : 'G'}
            </div>
            <span className="font-medium tracking-wide">
              {lang === 'ru' ? 'Госуслуги' : 'Gov Services'}
            </span>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-stone-800">{text.gosTitle}</h3>
            <p className="text-sm text-stone-500 mt-1">{text.gosSubtitle}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              label={lang === 'ru' ? "Телефон / Email / СНИЛС" : "Phone / Email / ID"}
              placeholder="+7 (999) 000-00-00" 
              required // Fake required
            />
            
            <Input 
              label={lang === 'ru' ? "Пароль" : "Password"}
              type="password" 
              placeholder="••••••••" 
              required
            />

            <div className="pt-2">
              <Button 
                type="submit" 
                isLoading={loading}
                className="bg-[#0D4CD3] hover:bg-[#0A3CB0] text-white"
              >
                {text.gosLogin}
              </Button>
            </div>
          </form>

          <div className="mt-6 flex items-start gap-3 p-3 bg-stone-50 rounded-lg text-xs text-stone-500">
            <Shield size={16} className="text-[#0D4CD3] flex-shrink-0 mt-0.5" />
            <p>
              {text.gosSecure}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};