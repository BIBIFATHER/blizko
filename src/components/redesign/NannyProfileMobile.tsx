import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Star,
  Heart,
  Share2,
  ChevronRight,
  Clock,
  Users,
  Check,
  Award,
  Play,
} from 'lucide-react';

interface NannyProfileMobileProps {
  lang?: 'ru' | 'en';
  onBack?: () => void;
}

const mockNanny = {
  id: '1',
  name: 'Анна Морозова',
  age: 34,
  photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&h=1000&fit=crop&crop=face',
  gallery: [
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&h=400&fit=crop',
  ],
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
  childAges: '6 мес - 7 лет',
  verifications: [
    { label: 'Паспорт', verified: true },
    { label: 'Справка', verified: true },
    { label: 'Диплом', verified: true },
    { label: 'Рекомендации', verified: true },
    { label: 'Медкнижка', verified: true },
  ],
  reviews: [
    {
      id: '1',
      author: 'Мария К.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      rating: 5,
      date: '2 недели назад',
      text: 'Анна - чудесная няня! Сын обожает с ней время. Очень рекомендую всем родителям.',
    },
    {
      id: '2',
      author: 'Екатерина М.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
      rating: 5,
      date: '1 месяц назад',
      text: 'Профессионал высокого уровня. Дочка очень быстро привыкла.',
    },
  ],
};

export const NannyProfileMobile: React.FC<NannyProfileMobileProps> = ({ 
  onBack,
}) => {
  const [liked, setLiked] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'reviews'>('info');
  const [isVisible, setIsVisible] = useState(false);
  const nanny = mockNanny;
  const verifiedCount = nanny.verifications.filter(v => v.verified).length;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`min-h-screen bg-[#FDFCFB] pb-28 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Hero Image - fixed aspect ratio 3/4 */}
      <div className="relative mx-4 mt-4">
        <div className="relative aspect-[3/4] max-h-[420px] rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
          <img 
            src={nanny.photo} 
            alt={nanny.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}
          />
          
          {/* Subtle warm gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2C2C2C]/60 via-transparent to-transparent" />
          
          {/* Top navigation */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-8 z-10">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-[#FDFCFB]/90 backdrop-blur-sm flex items-center justify-center text-stone-600 active:scale-95 transition-transform shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]"
            >
              <ArrowLeft size={18} strokeWidth={1} />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setLiked(!liked)}
                className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-all active:scale-95 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)] ${
                  liked ? 'bg-[#FDFCFB] text-[#C17F5E]' : 'bg-[#FDFCFB]/90 text-stone-600'
                }`}
              >
                <Heart size={18} strokeWidth={1} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button className="w-10 h-10 rounded-full bg-[#FDFCFB]/90 backdrop-blur-sm flex items-center justify-center text-stone-600 active:scale-95 transition-transform shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
                <Share2 size={16} strokeWidth={1} />
              </button>
            </div>
          </div>

          {/* Bottom info on photo */}
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <h1 className="text-2xl font-serif font-normal tracking-tight mb-1">{nanny.name}</h1>
            
            {/* Trust Row - minimalist, bronze percentage inline */}
            <div className="flex items-center gap-2 text-white/90 text-sm font-light">
              <div className="flex items-center gap-1">
                <Check size={12} strokeWidth={1} className="text-[#C9A86C]" />
                <span>Verified</span>
              </div>
              <span className="text-white/40">·</span>
              <span>{nanny.experience} лет опыта</span>
              <span className="text-white/40">·</span>
              <span className="text-[#C9A86C]">{nanny.matchScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats - Bento Grid Style */}
      <div className="px-4 pt-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#F7F5F2] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
            <p className="text-xl font-serif font-normal tracking-tight text-stone-700">{nanny.rating}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star size={10} className="text-[#C9A86C] fill-[#C9A86C]" />
              <span className="text-xs text-stone-600 font-light">{nanny.reviewCount} отзывов</span>
            </div>
          </div>
          <div className="bg-[#F7F5F2] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
            <p className="text-xl font-serif font-normal tracking-tight text-stone-700">{nanny.rate}₽</p>
            <p className="text-xs text-stone-600 mt-1 font-light">в час</p>
          </div>
          <div className="bg-[#F7F5F2] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
            <p className="text-xl font-serif font-normal tracking-tight text-stone-700">{nanny.responseTime}</p>
            <p className="text-xs text-stone-600 mt-1 font-light">ответ</p>
          </div>
        </div>
      </div>

      {/* Section Toggle */}
      <div className="px-4 py-4 sticky top-0 z-20 bg-[#FDFCFB]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveSection('info')}
            className={`pb-2 text-sm tracking-tight transition-all border-b ${
              activeSection === 'info'
                ? 'border-stone-600 text-stone-700 font-medium'
                : 'border-transparent text-stone-400 font-light'
            }`}
          >
            Информация
          </button>
          <button
            onClick={() => setActiveSection('reviews')}
            className={`pb-2 text-sm tracking-tight transition-all border-b ${
              activeSection === 'reviews'
                ? 'border-stone-600 text-stone-700 font-medium'
                : 'border-transparent text-stone-400 font-light'
            }`}
          >
            Отзывы ({nanny.reviewCount})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-6">
        {activeSection === 'info' ? (
          <>
            {/* About */}
            <div>
              <h3 className="font-serif text-lg font-normal tracking-tight text-stone-700 mb-3">О себе</h3>
              <p className="text-[15px] text-stone-600 leading-relaxed font-light">{nanny.about}</p>
            </div>

            {/* Key Info - Bento Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#F7F5F2] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
                <Users size={16} className="text-stone-400 mb-2" strokeWidth={1} />
                <p className="text-xs text-stone-500 font-light mb-1">Возраст детей</p>
                <p className="text-sm text-stone-700 font-normal">{nanny.childAges}</p>
              </div>
              <div className="bg-[#F7F5F2] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
                <Award size={16} className="text-stone-400 mb-2" strokeWidth={1} />
                <p className="text-xs text-stone-500 font-light mb-1">Образование</p>
                <p className="text-sm text-stone-700 font-normal">Педагог</p>
              </div>
              <div className="bg-[#F7F5F2] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
                <MapPin size={16} className="text-stone-400 mb-2" strokeWidth={1} />
                <p className="text-xs text-stone-500 font-light mb-1">Расстояние</p>
                <p className="text-sm text-stone-700 font-normal">{nanny.distance}</p>
              </div>
              <div className="bg-[#F7F5F2] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
                <Clock size={16} className="text-stone-400 mb-2" strokeWidth={1} />
                <p className="text-xs text-stone-500 font-light mb-1">Доступность</p>
                <p className="text-sm text-stone-700 font-normal">Пн-Пт</p>
              </div>
            </div>

            {/* Specialties */}
            <div>
              <h3 className="font-serif text-lg font-normal tracking-tight text-stone-700 mb-3">Специализация</h3>
              <div className="flex flex-wrap gap-2">
                {nanny.specialties.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-full bg-[#F7F5F2] text-sm font-light text-stone-600 border-[0.5px] border-stone-200/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Verifications */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-lg font-normal tracking-tight text-stone-700">Проверки</h3>
                <span className="text-xs font-light text-stone-500">
                  {verifiedCount}/5
                </span>
              </div>
              <div className="bg-[#F7F5F2] rounded-2xl border-[0.5px] border-stone-200/50 overflow-hidden shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
                {nanny.verifications.map((item, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? 'border-t border-stone-200/30' : ''}`}>
                    <span className="text-sm text-stone-600 font-light">{item.label}</span>
                    {item.verified ? (
                      <Check size={16} className="text-[#8B9D83]" strokeWidth={1} />
                    ) : (
                      <Clock size={16} className="text-stone-300" strokeWidth={1} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Video intro */}
            <button className="w-full bg-[#F7F5F2] rounded-2xl p-4 flex items-center gap-4 active:bg-[#F0EDE8] transition-colors border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
              <div className="w-12 h-12 rounded-xl bg-stone-300 flex items-center justify-center">
                <Play size={18} className="text-white ml-0.5" fill="white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-stone-700 font-normal">Видео-визитка</p>
                <p className="text-xs text-stone-500 mt-0.5 font-light">2:34 мин</p>
              </div>
              <ChevronRight size={16} className="text-stone-400" strokeWidth={1} />
            </button>
          </>
        ) : (
          <>
            {/* Rating Summary */}
            <div className="bg-[#F7F5F2] rounded-2xl p-5 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-serif font-normal tracking-tight text-stone-700">{nanny.rating}</div>
                  <div className="flex items-center justify-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        className="text-[#C9A86C] fill-[#C9A86C]"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-stone-500 mt-2 font-light">{nanny.reviewCount} отзывов</p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 w-3 font-light">{rating}</span>
                      <div className="flex-1 h-1 rounded-full bg-stone-200 overflow-hidden">
                        <div
                          className="h-full bg-[#C9A86C] rounded-full"
                          style={{
                            width: rating === 5 ? '82%' : rating === 4 ? '15%' : '3%',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews */}
            {nanny.reviews.map((review) => (
              <div key={review.id} className="py-4 border-b border-stone-200/30">
                <div className="flex items-start gap-3">
                  <img
                    src={review.avatar}
                    alt={review.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm text-stone-700 font-normal">{review.author}</h4>
                      <span className="text-xs text-stone-400 font-light">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={10}
                          className="text-[#C9A86C] fill-[#C9A86C]"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed font-light">{review.text}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Load more */}
            <button className="w-full py-3 text-xs tracking-wider uppercase text-stone-400 font-light active:text-stone-600 transition-colors">
              Показать все отзывы
            </button>
          </>
        )}
      </div>

      {/* Bottom CTA - elegant, thin, uppercase */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FDFCFB] border-t border-stone-200/30 p-4 pb-8">
        <button className="w-full h-12 rounded-xl bg-[#6B9A8A] text-white font-light text-xs uppercase tracking-wider active:bg-[#5A8677] transition-colors border border-[#5A8677]/30">
          Связаться с Анной
        </button>
      </div>
    </div>
  );
};

export default NannyProfileMobile;
