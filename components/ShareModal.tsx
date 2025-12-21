
import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Smartphone, AlertTriangle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';

interface ShareModalProps {
  onClose: () => void;
  lang: Language;
}

export const ShareModal: React.FC<ShareModalProps> = ({ onClose, lang }) => {
  const text = t[lang];
  const url = window.location.href;
  const [copied, setCopied] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      setIsLocalhost(true);
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 z-10 p-1"
        >
          <X size={24} />
        </button>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl transform -rotate-6">
            <Smartphone size={32} />
          </div>

          <h3 className="text-xl font-bold text-stone-800 mb-2">{text.shareTitle}</h3>
          <p className="text-stone-500 text-sm mb-6 leading-relaxed">
            {text.shareDesc}
          </p>

          {/* QR Code Container */}
          <div className="bg-white p-4 rounded-xl border-2 border-stone-100 inline-block mb-6 shadow-sm">
            <QRCode
              value={url}
              size={180}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
              fgColor="#292524"
            />
          </div>

          {/* Localhost Warning */}
          {isLocalhost && (
            <div className="mb-6 bg-amber-50 text-amber-800 p-3 rounded-xl text-xs flex items-start gap-2 text-left border border-amber-100">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                {lang === 'ru' 
                  ? 'Внимание: Ссылка "localhost" работает только на этом компьютере. Телефон ее не откроет.'
                  : 'Warning: "localhost" links only work on this computer. Your phone cannot open it.'}
              </span>
            </div>
          )}

          {/* Link Copy */}
          <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-xl border border-stone-100">
            <div className="flex-1 text-xs text-stone-500 truncate px-2 font-mono">
              {url}
            </div>
            <button 
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white text-stone-700 shadow-sm border border-stone-200 hover:bg-stone-50'}`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
