import React, { useState } from 'react';
import { Button, Checkbox } from './UI';
import { X, FileText } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';

interface ParentOfferModalProps {
  onClose: () => void;
  onAccept: () => Promise<void>;
  lang: Language;
}

export const ParentOfferModal: React.FC<ParentOfferModalProps> = ({ onClose, onAccept, lang }) => {
  const text = t[lang];
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const displayedText = activeTab === 'terms' ? text.parentOfferText : text.parentPersonalDataText;

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept();
    } catch (error) {
      console.error('Parent offer acceptance failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl card-cloud border border-stone-100/80 overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        <div className="bg-white/50 border-b border-stone-100/50 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-stone-800 font-semibold">
              <FileText size={20} className="text-sky-500" />
              <h3>{text.parentOfferTitle}</h3>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-800 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex bg-stone-200/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'terms' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-600'}`}
            >
              {text.parentOfferTabTerms}
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'privacy' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-600'}`}
            >
              {text.parentOfferTabPrivacy}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-transparent space-y-3">
          {displayedText.map((paragraph, index) => (
            <p
              key={index}
              className={`text-sm text-stone-600 leading-relaxed ${paragraph.startsWith('•') || paragraph.startsWith('1.') ? 'pl-4' : ''} ${paragraph.includes(':') ? 'font-medium text-stone-800 mt-2' : ''}`}
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="p-4 bg-white/50 border-t border-stone-100/50 space-y-3">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
            <Checkbox
              label={text.parentOfferAccept}
              checked={termsAccepted}
              onChange={() => {
                setTermsAccepted(!termsAccepted);
                if (!termsAccepted) setActiveTab('terms');
              }}
            />
          </div>

          <div className="bg-stone-100 border border-stone-200 rounded-xl p-3">
            <Checkbox
              label={text.parentOfferPrivacyAccept}
              checked={privacyAccepted}
              onChange={() => {
                setPrivacyAccepted(!privacyAccepted);
                if (!privacyAccepted) setActiveTab('privacy');
              }}
            />
          </div>

          <Button
            onClick={handleAccept}
            disabled={!termsAccepted || !privacyAccepted || isLoading}
            isLoading={isLoading}
            className="w-full"
          >
            {isLoading ? (lang === 'ru' ? 'Отправляем...' : 'Submitting...') : text.parentOfferSubmit}
          </Button>
        </div>
      </div>
    </div>
  );
};
