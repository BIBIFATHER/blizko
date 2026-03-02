import React, { useState } from 'react';
import { Button, Input, Textarea, ChipGroup } from './UI';
import { ParentRequest, Language } from '../types';
import { ArrowLeft } from 'lucide-react';
import { ParentOfferModal } from './ParentOfferModal';
import { t } from '../src/core/i18n/translations';

interface ParentFormProps {
  onSubmit: (data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'>) => Promise<void>;
  onBack: () => void;
  lang: Language;
}

export const ParentForm: React.FC<ParentFormProps> = ({ onSubmit, onBack, lang }) => {
  const text = t[lang];
  const [loading, setLoading] = useState(false);
  const [showOffer, setShowOffer] = useState(false);

  const [formData, setFormData] = useState({
    city: '',
    childAge: '',
    schedule: '',
    budget: '',
    comment: ''
  });
  
  const [requirements, setRequirements] = useState<string[]>([]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOffer(true);
  };

  const handleOfferAccept = async () => {
    setShowOffer(false);
    setLoading(true);
    
    try {
      await onSubmit({
        ...formData,
        requirements
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <button onClick={onBack} className="text-stone-400 hover:text-stone-800 mb-6 flex items-center gap-2">
        <ArrowLeft size={20} /> {text.back}
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">{text.pFormTitle}</h2>
        <p className="text-stone-500">{text.pFormSubtitle}</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <Input 
          label={text.cityLabel}
          placeholder={lang === 'ru' ? "Москва, Хамовники" : "New York, Brooklyn"} 
          value={formData.city}
          onChange={e => setFormData({...formData, city: e.target.value})}
          required
        />

        <ChipGroup 
          label={text.childAgeLabel}
          options={text.ageOptions}
          selected={formData.childAge ? [formData.childAge] : []}
          onChange={(s) => setFormData({...formData, childAge: s[0] || ''})}
          single
        />

        <ChipGroup 
          label={text.scheduleLabel}
          options={text.scheduleOptions}
          selected={formData.schedule ? [formData.schedule] : []}
          onChange={(s) => setFormData({...formData, schedule: s[0] || ''})}
          single
        />

        <Input 
          label={text.budgetLabel}
          placeholder={lang === 'ru' ? "600 - 800 руб/час" : "20 - 30 $/hour"}
          value={formData.budget}
          onChange={e => setFormData({...formData, budget: e.target.value})}
          required
        />

        <ChipGroup 
          label={text.importantLabel}
          options={text.reqOptions}
          selected={requirements}
          onChange={setRequirements}
        />

        <Textarea 
          label={text.commentLabel}
          placeholder={lang === 'ru' ? "Например: у нас есть кот..." : "Example: we have a cat..."}
          value={formData.comment}
          onChange={e => setFormData({...formData, comment: e.target.value})}
        />

        <Button type="submit" isLoading={loading} className="mt-8">
          {loading ? (lang === 'ru' ? 'AI подбирает няню...' : 'AI is searching...') : text.submitParent}
        </Button>
      </form>

      {showOffer && (
        <ParentOfferModal
          onClose={() => setShowOffer(false)}
          onAccept={handleOfferAccept}
          lang={lang}
        />
      )}
    </div>
  );
};