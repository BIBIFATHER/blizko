import React, { useState } from 'react';
import { Button, Textarea } from './UI';
import { Star, X } from 'lucide-react';
import { Language, Review } from '../types';
import { t } from '../src/core/i18n/translations';

interface LeaveReviewModalProps {
  bookingId: string;
  onClose: () => void;
  onSubmit: (review: Review) => void;
  lang: Language;
}

export const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({ bookingId, onClose, onSubmit, lang }) => {
  const text = t[lang];
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    
    setLoading(true);
    setTimeout(() => {
      const review: Review = {
        id: crypto.randomUUID(),
        authorName: lang === 'ru' ? 'Анонимный родитель' : 'Anonymous Parent',
        rating,
        text: selectedTags.length > 0 ? `${selectedTags.join(' • ')}\n${comment}`.trim() : comment,
        date: Date.now(),
        bookingId
      };
      onSubmit(review);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up relative">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 z-10">
          <X size={24} />
        </button>

        <div className="p-6">
          <h3 className="text-xl font-bold text-stone-800 text-center mb-6">{text.leaveReview}</h3>

          <form onSubmit={handleSubmit}>
            <div className="mb-6 text-center">
              <label className="block text-sm font-medium text-stone-500 mb-2">{text.ratingLabel}</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 active:scale-90"
                  >
                    <Star 
                      size={32} 
                      className={`${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'} transition-colors`} 
                      strokeWidth={star <= rating ? 0 : 2}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-500 mb-2">{text.reviewChecklistLabel}</label>
              <div className="flex flex-wrap gap-2">
                {text.reviewChecklistOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTags((prev) => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedTags.includes(tag) ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-stone-500 border-stone-200 hover:border-amber-200'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <Textarea 
              label={text.reviewTextLabel}
              placeholder={text.reviewPlaceholder}
              value={comment}
              onChange={e => setComment(e.target.value)}
              required
            />

            <div className="mt-4 bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-600">
              <div className="text-xs font-semibold text-stone-500 mb-2">{text.reviewPreviewLabel}</div>
              <div className="whitespace-pre-line">
                {(selectedTags.length > 0 ? `${selectedTags.join(' • ')}\n` : '') + (comment || '—')}
              </div>
            </div>

            <Button 
              type="submit" 
              isLoading={loading}
              disabled={rating === 0}
              className="mt-4"
            >
              {text.submitReview}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};