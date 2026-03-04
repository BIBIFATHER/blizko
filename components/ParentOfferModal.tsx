import React, { useState } from 'react';
import { Button, Checkbox } from './UI';
import { X, FileText, Shield } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';

interface ParentOfferModalProps {
  onClose: () => void;
  onAccept: () => void;
  lang: Language;
  parentRequestId?: string;
}

export const ParentOfferModal: React.FC<ParentOfferModalProps> = ({ onClose, onAccept, lang, parentRequestId }) => {
  const text = t[lang];
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const displayedText = activeTab === 'terms' ? text.parentOfferText : text.parentPersonalDataText;

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      // 1. First trigger the onAccept so the parent component can save the application to the DB if needed
      await onAccept();

      // 2. Try to generate a payment link (Assuming a standard 990 RUB fee for matching for example)
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 990, // Example fee
          parentRequestId,
          description: 'Оплата подбора няни Blizko'
        })
      });

      const data = await res.json();

      if (data.confirmation_url) {
        window.location.href = data.confirmation_url; // Redirect to YooKassa
        return;
      }

      // If no url returned (e.g. backend not fully configured yet), just close and let the main flow navigate to success screen
      onClose();
    } catch (e) {
      console.error('Payment generation failed:', e);
      onClose(); // Fallback to normal flow
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-stone-50 border-b border-stone-100 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-stone-800 font-semibold">
              <FileText size={20} className="text-sky-500" />
              <h3>{text.parentOfferTitle}</h3>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-800 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white space-y-3">
          {displayedText.map((paragraph, index) => (
            <p
              key={index}
              className={`text-sm text-stone-600 leading-relaxed ${paragraph.startsWith('•') || paragraph.startsWith('1.') ? 'pl-4' : ''} ${paragraph.includes(':') ? 'font-medium text-stone-800 mt-2' : ''}`}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Footer with Checkboxes */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 space-y-3">
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
            {isLoading ? (lang === 'ru' ? 'Переход к оплате...' : 'Redirecting...') : text.parentOfferSubmit}
          </Button>
        </div>
      </div>
    </div>
  );
};