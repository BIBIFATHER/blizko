import React, { useState } from 'react';
import { Button, Checkbox, ModalShell } from './UI';
import { X, FileText } from 'lucide-react';
import { Language } from '@/core/types';
import { t } from '@/core/i18n/translations';

interface NannyOfferModalProps {
  onClose: () => void;
  onAccept: () => void;
  lang: Language;
}

export const NannyOfferModal: React.FC<NannyOfferModalProps> = ({ onClose, onAccept, lang }) => {
  const text = t[lang];
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const displayedText = activeTab === 'terms' ? text.offerText : text.nannyPersonalDataText;

  return (
    <ModalShell variant="card" className="z-80" panelClassName="bg-white">
      <div className="border-b border-stone-100 bg-stone-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-stone-800 font-semibold">
              <FileText size={20} className="text-amber-500" />
              <h3>{text.offerTitle}</h3>
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
               {text.offerTabTerms}
             </button>
             <button 
               onClick={() => setActiveTab('privacy')}
               className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'privacy' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-600'}`}
             >
               {text.offerTabPrivacy}
             </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 bg-white p-6">
          {displayedText.map((paragraph, index) => (
            <p 
              key={index} 
              className={`text-sm text-stone-600 leading-relaxed ${paragraph.startsWith('•') || paragraph.startsWith('1.') ? 'pl-4' : ''} ${paragraph.includes(':') ? 'font-medium text-stone-800 mt-2' : ''}`}
            >
              {paragraph}
            </p>
          ))}
      </div>

      <div className="space-y-3 border-t border-stone-100 bg-stone-50 p-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <Checkbox 
              label={`${text.offerAccept} *`}
              checked={termsAccepted}
              onChange={() => {
                setTermsAccepted(!termsAccepted);
                if (!termsAccepted) setActiveTab('terms');
              }}
            />
          </div>
          
          <div className="rounded-xl border border-stone-200 bg-stone-100 p-3">
            <Checkbox 
              label={`${text.offerPrivacyAccept} *`}
              checked={privacyAccepted}
              onChange={() => {
                setPrivacyAccepted(!privacyAccepted);
                if (!privacyAccepted) setActiveTab('privacy');
              }}
            />
          </div>

          <Button 
            onClick={onAccept} 
            disabled={!termsAccepted || !privacyAccepted}
            className="w-full"
          >
            {text.offerSubmit}
          </Button>
      </div>
    </ModalShell>
  );
};
