import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Star,
  Heart,
  Share2,
  Check,
  Play,
} from 'lucide-react';

interface NannyProfileMobileProps {
  onBack?: () => void;
}

const mockNanny = {
  id: '1',
  name: 'Анна Морозова',
  age: 34,
  photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&h=1000&fit=crop&crop=face',
  location: 'Пресненский район',
  distance: '1.2 км',
  experience: 8,
  rating: 4.9,
  reviewCount: 47,
  rate: 1200,
  verified: true,
  responseTime: '15 мин',
  matchScore: 96,
  about: 'Профессиональная няня с педагогическим образованием. Владею методиками раннего развития Монтессори и Вальдорф. Спокойная, внимательная, ответственная.',
  specialties: ['Раннее развитие', 'Монтессори', 'Первая помощь', 'Творчество'],
  languages: ['Русский', 'English'],
  education: 'МПГУ, дошкольная педагогика',
  childAges: '6 мес — 7 лет',
  verifications: ['Паспорт', 'Справка', 'Диплом', 'Рекомендации', 'Медкнижка'],
  reviews: [
    {
      id: '1',
      author: 'Мария К.',
      rating: 5,
      date: '2 недели назад',
      text: 'Анна — чудесная няня! Сын обожает с ней время. Очень рекомендую всем родителям.',
    },
    {
      id: '2',
      author: 'Екатерина М.',
      rating: 5,
      date: '1 месяц назад',
      text: 'Профессионал высокого уровня. Дочка очень быстро привыкла.',
    },
  ],
};

export const NannyProfileMobile: React.FC<NannyProfileMobileProps> = ({ onBack }) => {
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews'>('about');
  const [isVisible, setIsVisible] = useState(false);
  const nanny = mockNanny;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`min-h-screen bg-[#FDFCFB] transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Hero Image - editorial vertical crop */}
      <div className="relative">
        <div className="aspect-[3/4] max-h-[480px] overflow-hidden">
          <img 
            src={nanny.photo} 
            alt={nanny.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Top navigation - floating */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 pt-12">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-stone-600"
          >
            <ArrowLeft size={18} strokeWidth={1} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center ${
                liked ? 'text-rose-400' : 'text-stone-600'
              }`}
            >
              <Heart size={18} strokeWidth={1} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-stone-600">
              <Share2 size={16} strokeWidth={1} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-6 relative z-10 pb-32">
        {/* Name & Verification */}
        <div className="bg-[#FDFCFB] pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-serif text-2xl font-normal tracking-tight text-stone-800 mb-1">
                {nanny.name}
              </h1>
              <div className="flex items-center gap-2 text-stone-400 text-sm font-light">
                <MapPin size={12} strokeWidth={1} />
                <span>{nanny.location}</span>
                <span>·</span>
                <span>{nanny.distance}</span>
              </div>
            </div>
            {/* Verified badge - gold dot style */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-light">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86C]" />
              <span className="uppercase tracking-wider">Verified</span>
            </div>
          </div>

          {/* Stats - serif, centered, border dividers (NOT boxes) */}
          <div className="flex items-center border-y border-stone-200/50 py-5 mb-6">
            <div className="flex-1 text-center border-r border-stone-200/50">
              <p className="font-serif text-xl text-stone-700">{nanny.experience}</p>
              <p className="text-xs text-stone-400 font-light mt-1">лет опыта</p>
            </div>
            <div className="flex-1 text-center border-r border-stone-200/50">
              <div className="flex items-center justify-center gap-1">
                <p className="font-serif text-xl text-stone-700">{nanny.rating}</p>
                <Star size={12} className="text-[#C9A86C] fill-[#C9A86C]" />
              </div>
              <p className="text-xs text-stone-400 font-light mt-1">{nanny.reviewCount} отзывов</p>
            </div>
            <div className="flex-1 text-center">
              <p className="font-serif text-xl text-stone-700">{nanny.rate}₽</p>
              <p className="text-xs text-stone-400 font-light mt-1">в час</p>
            </div>
          </div>

          {/* Match Score - minimalist bronze text */}
          <div className="flex items-center justify-between py-4 border-b border-stone-200/50 mb-6">
            <span className="text-sm text-stone-500 font-light">Совпадение с вашими критериями</span>
            <span className="font-serif text-lg text-[#9A7D4E]">{nanny.matchScore}%</span>
          </div>
        </div>

        {/* Tabs - minimal underline style */}
        <div className="flex gap-8 mb-6">
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-2 text-sm transition-all ${
              activeTab === 'about'
                ? 'border-b border-stone-800 text-stone-800'
                : 'text-stone-400 font-light'
            }`}
          >
            О няне
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-2 text-sm transition-all ${
              activeTab === 'reviews'
                ? 'border-b border-stone-800 text-stone-800'
                : 'text-stone-400 font-light'
            }`}
          >
            Отзывы
          </button>
        </div>

        {activeTab === 'about' ? (
          <div className="space-y-8">
            {/* About - clean paragraph */}
            <div>
              <p className="text-stone-600 leading-relaxed font-light text-[15px]">
                {nanny.about}
              </p>
            </div>

            {/* Details - hairline separated rows, NOT cards */}
            <div className="divide-y divide-stone-200/50">
              <div className="py-4 flex justify-between">
                <span className="text-stone-400 text-sm font-light">Возраст детей</span>
                <span className="text-stone-700 text-sm">{nanny.childAges}</span>
              </div>
              <div className="py-4 flex justify-between">
                <span className="text-stone-400 text-sm font-light">Образование</span>
                <span className="text-stone-700 text-sm">{nanny.education}</span>
              </div>
              <div className="py-4 flex justify-between">
                <span className="text-stone-400 text-sm font-light">Языки</span>
                <span className="text-stone-700 text-sm">{nanny.languages.join(', ')}</span>
              </div>
              <div className="py-4 flex justify-between">
                <span className="text-stone-400 text-sm font-light">Время ответа</span>
                <span className="text-stone-700 text-sm">{nanny.responseTime}</span>
              </div>
            </div>

            {/* Specialties - simple inline text, no pills */}
            <div>
              <h3 className="font-serif text-lg text-stone-700 mb-3">Специализация</h3>
              <p className="text-stone-600 text-sm font-light leading-relaxed">
                {nanny.specialties.join(' · ')}
              </p>
            </div>

            {/* Verifications - simple checklist, no cards */}
            <div>
              <h3 className="font-serif text-lg text-stone-700 mb-3">Проверки</h3>
              <div className="divide-y divide-stone-200/50">
                {nanny.verifications.map((item) => (
                  <div key={item} className="py-3 flex items-center justify-between">
                    <span className="text-stone-600 text-sm font-light">{item}</span>
                    <Check size={14} className="text-[#8B9D83]" strokeWidth={1} />
                  </div>
                ))}
              </div>
            </div>

            {/* Video - minimal row, no heavy card */}
            <button className="w-full py-4 flex items-center gap-4 border-y border-stone-200/50">
              <div className="w-12 h-12 rounded-sm bg-stone-200 flex items-center justify-center">
                <Play size={16} className="text-stone-500 ml-0.5" fill="currentColor" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-stone-700">Видео-визитка</p>
                <p className="text-xs text-stone-400 font-light mt-0.5">2:34</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rating summary - minimal */}
            <div className="text-center py-6 border-b border-stone-200/50">
              <div className="font-serif text-4xl text-stone-700 mb-2">{nanny.rating}</div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={14} className="text-[#C9A86C] fill-[#C9A86C]" />
                ))}
              </div>
              <p className="text-sm text-stone-400 font-light">{nanny.reviewCount} отзывов</p>
            </div>

            {/* Reviews - clean, no cards */}
            {nanny.reviews.map((review) => (
              <div key={review.id} className="py-5 border-b border-stone-200/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-stone-700">{review.author}</span>
                  <span className="text-xs text-stone-400 font-light">{review.date}</span>
                </div>
                <div className="flex items-center gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={10} className="text-[#C9A86C] fill-[#C9A86C]" />
                  ))}
                </div>
                <p className="text-stone-600 text-sm leading-relaxed font-light">{review.text}</p>
              </div>
            ))}

            <button className="w-full py-4 text-xs uppercase tracking-[0.15em] text-stone-400 font-light">
              Показать все отзывы
            </button>
          </div>
        )}
      </div>

      {/* Bottom CTA - Warm Charcoal, rounded-none, 60px, uppercase, tracking-[0.2em] */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FDFCFB] px-6 py-5 pb-8">
        <button className="w-full h-[60px] bg-[#333333] text-white text-sm font-light uppercase tracking-[0.2em] active:bg-[#444444] transition-colors">
          Связаться
        </button>
      </div>
    </div>
  );
};

export default NannyProfileMobile;
