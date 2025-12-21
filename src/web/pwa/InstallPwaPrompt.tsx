
import React, { useEffect, useState } from 'react';
import { X, Download, Share, PlusSquare, MoreHorizontal, Globe } from 'lucide-react';
import { Button } from '@/components/UI';
import { Language } from '@/types';
import { t } from '@/src/core/i18n/translations';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  platform: 'ios' | 'android' | 'desktop';
  canInstall: boolean; // true if we have the prompt event (Android/Desktop)
  lang: Language;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ 
  isOpen, 
  onClose, 
  onInstall, 
  platform, 
  canInstall,
  lang 
}) => {
  const text = t[lang];
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    // Simple check for common in-app browsers
    if (/Instagram|FBAN|FBAV|Telegram|Line/.test(ua)) {
      setIsInApp(true);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop for click-away */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto transition-opacity opacity-100" onClick={onClose} />

      <div className="bg-stone-900/95 backdrop-blur-md text-white p-5 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/10 relative pointer-events-auto w-full max-w-sm m-0 sm:m-4 animate-slide-up">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-stone-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 bg-amber-400 rounded-2xl flex items-center justify-center text-stone-900 font-bold text-2xl flex-shrink-0 shadow-lg">
            B
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-lg mb-1">{text.installTitle}</h4>
            <p className="text-sm text-stone-300 leading-relaxed mb-4">
              {text.installDesc}
            </p>

            {/* In-App Browser Warning */}
            {isInApp && (
              <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl mb-4 text-xs text-red-100 flex items-start gap-2">
                 <Globe size={16} className="flex-shrink-0 mt-0.5" />
                 <div>
                   {lang === 'ru' 
                     ? 'Вы используете встроенный браузер. Чтобы установить приложение, сначала нажмите "Открыть в браузере" (Safari/Chrome).'
                     : 'You are using an in-app browser. To install, please tap "Open in Browser" (Safari/Chrome) first.'}
                 </div>
              </div>
            )}

            {/* Instructions based on Platform */}
            {!isInApp && platform === 'ios' && (
              <div className="text-sm bg-white/10 p-3 rounded-xl space-y-3 border border-white/5">
                 <div className="flex items-center gap-3">
                   <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center"><Share size={14} className="text-blue-300" /></div>
                   <span>1. {lang === 'ru' ? 'Нажмите "Поделиться"' : 'Tap "Share"'}</span>
                 </div>
                 <div className="w-px h-3 bg-white/20 ml-3 my-0.5"></div>
                 <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center"><PlusSquare size={14} /></div>
                   <span>2. {lang === 'ru' ? 'Выберите "На экран Домой"' : 'Select "Add to Home Screen"'}</span>
                 </div>
              </div>
            )}

            {!isInApp && (platform === 'android' || platform === 'desktop') && (
              canInstall ? (
                <Button 
                  onClick={() => { onInstall(); onClose(); }}
                  className="bg-amber-400 text-stone-900 hover:bg-amber-500 py-3 text-sm font-bold shadow-lg shadow-amber-900/20 w-full"
                >
                  <Download size={18} /> {text.installBtn}
                </Button>
              ) : (
                <div className="text-sm bg-white/10 p-3 rounded-xl space-y-3 border border-white/5">
                   <div className="flex items-center gap-3">
                     <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center"><MoreHorizontal size={14} /></div>
                     <span>1. {lang === 'ru' ? 'Нажмите меню (три точки)' : 'Tap menu (three dots)'}</span>
                   </div>
                   <div className="w-px h-3 bg-white/20 ml-3 my-0.5"></div>
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center"><Download size={14} /></div>
                     <span>2. {lang === 'ru' ? 'Нажмите "Установить приложение"' : 'Select "Install App"'}</span>
                   </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
