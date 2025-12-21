import React, { useState } from 'react';
import { Button, Checkbox } from './UI';
import { X, FileText, Shield } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-stone-50 border-b border-stone-100 p-4">
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
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <Checkbox 
              label={text.offerAccept}
              checked={termsAccepted}
              onChange={() => {
                setTermsAccepted(!termsAccepted);
                if (!termsAccepted) setActiveTab('terms');
              }}
            />
          </div>
          
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-3">
            <Checkbox 
              label={text.offerPrivacyAccept}
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
      </div>
    </div>
  );
};