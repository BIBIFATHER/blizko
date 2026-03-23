import React from 'react';
import { Card } from '../UI';
import { Star, MessageCircle } from 'lucide-react';
import { Language, Review } from '../../types';
import { t } from '@/core/i18n/translations';

interface ReviewsTabProps {
    reviews: Review[];
    lang: Language;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({ reviews, lang }) => {
    const text = t[lang];

    return (
        <div className="animate-fade-in space-y-4">
            {reviews.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                    <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>{text.noReviews}</p>
                    <p className="text-[11px] text-stone-400 mt-2">Первые отзывы увеличивают доверие и конверсию.</p>
                    <button className="mt-3 text-xs font-semibold text-sky-600 underline">
                        Пригласить семью оставить отзыв
                    </button>
                </div>
            ) : (
                reviews.map((review) => (
                    <Card key={review.id} className="p-4! border-stone-100 bg-white">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold text-xs">
                                    {review.authorName.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-stone-800">{review.authorName}</div>
                                    <div className="text-[10px] text-stone-400">{new Date(review.date).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        size={12}
                                        className={`${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'} transition-colors`}
                                    />
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-lg">
                            "{review.text}"
                        </p>
                    </Card>
                ))
            )}
        </div>
    );
};
