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
  CheckCircle2,
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
      {/* Hero Image */}
      <div className="relative h-[52vh] min-h-[380px]">
        <img 
          src={nanny.photo} 
          alt={nanny.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Warm gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2C2C2C]/70 via-transparent to-transparent" />
        
        {/* Top navigation */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12 z-10">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-full bg-[#FDFCFB]/95 backdrop-blur-sm flex items-center justify-center text-stone-600 active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`w-11 h-11 rounded-full backdrop-blur-sm flex items-center justify-center transition-all active:scale-95 ${
                liked ? 'bg-[#FDFCFB] text-[#C17F5E]' : 'bg-[#FDFCFB]/95 text-stone-600'
              }`}
            >
              <Heart size={20} strokeWidth={1.5} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button className="w-11 h-11 rounded-full bg-[#FDFCFB]/95 backdrop-blur-sm flex items-center justify-center text-stone-600 active:scale-95 transition-transform">
              <Share2 size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Bottom info on photo */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          {/* Trust badge - gold/bronze line-art style */}
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#C9A86C] flex items-center justify-center">
              <span className="text-xs font-light text-[#C9A86C]">{nanny.matchScore}</span>
            </div>
            <span className="text-sm font-light tracking-wide text-white/90">% совпадение</span>
          </div>
          
          <h1 className="text-3xl font-serif font-medium mb-1 tracking-tight">{nanny.name}</h1>
          
          <div className="flex items-center gap-3 text-white/90 font-light">
            <div className="flex items-center gap-1">
              <Star size={14} className="text-[#C9A86C] fill-[#C9A86C]" />
              <span>{nanny.rating}</span>
              <span className="text-white/50">({nanny.reviewCount})</span>
            </div>
            <span className="text-white/30">|</span>
            <div className="flex items-center gap-1">
              <MapPin size={13} strokeWidth={1.5} />
              <span>{nanny.distance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-[#F0EDE8] border-b border-stone-200/50">
        <div className="flex">
          <div className="flex-1 py-5 text-center border-r border-stone-200/50">
            <p className="text-2xl font-light text-stone-700">{nanny.experience}</p>
            <p className="text-xs text-stone-500 mt-1 font-light tracking-wide">лет опыта</p>
          </div>
          <div className="flex-1 py-5 text-center border-r border-stone-200/50">
            <p className="text-2xl font-light text-stone-700">{nanny.rate}₽</p>
            <p className="text-xs text-stone-500 mt-1 font-light tracking-wide">в час</p>
          </div>
          <div className="flex-1 py-5 text-center">
            <p className="text-2xl font-light text-stone-700">{nanny.responseTime}</p>
            <p className="text-xs text-stone-500 mt-1 font-light tracking-wide">ответ</p>
          </div>
        </div>
      </div>

      {/* Section Toggle */}
      <div className="bg-[#FDFCFB] px-5 py-3 sticky top-0 z-20 border-b border-stone-200/50">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveSection('info')}
            className={`pb-2 text-sm tracking-wide transition-all border-b-2 ${
              activeSection === 'info'
                ? 'border-stone-700 text-stone-700 font-medium'
                : 'border-transparent text-stone-400 font-light'
            }`}
          >
            Информация
          </button>
          <button
            onClick={() => setActiveSection('reviews')}
            className={`pb-2 text-sm tracking-wide transition-all border-b-2 ${
              activeSection === 'reviews'
                ? 'border-stone-700 text-stone-700 font-medium'
                : 'border-transparent text-stone-400 font-light'
            }`}
          >
            Отзывы ({nanny.reviewCount})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-6 space-y-8">
        {activeSection === 'info' ? (
          <>
            {/* Verification Row - thin line icons */}
            <div className="flex items-center justify-center gap-6 py-4 bg-[#F0EDE8] rounded-2xl">
              {nanny.verifications.slice(0, 4).map((v, i) => (
                <div key={i} className="flex items-center gap-1.5 text-stone-600">
                  <CheckCircle2 size={14} strokeWidth={1.5} className="text-[#8B9D83]" />
                  <span className="text-xs font-light">{v.label}</span>
                </div>
              ))}
            </div>

            {/* About */}
            <div>
              <h3 className="font-serif text-lg text-stone-700 mb-3">О себе</h3>
              <p className="text-[15px] text-stone-600 leading-relaxed font-light">{nanny.about}</p>
            </div>

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F0EDE8] rounded-2xl p-5 border border-stone-200/50">
                <Users size={18} className="text-[#8B9D83] mb-3" strokeWidth={1.5} />
                <p className="text-xs text-stone-500 uppercase tracking-wider font-light mb-1">Возраст детей</p>
                <p className="text-sm text-stone-700">{nanny.childAges}</p>
              </div>
              <div className="bg-[#F0EDE8] rounded-2xl p-5 border border-stone-200/50">
                <Award size={18} className="text-[#8B9D83] mb-3" strokeWidth={1.5} />
                <p className="text-xs text-stone-500 uppercase tracking-wider font-light mb-1">Образование</p>
                <p className="text-sm text-stone-700">Педагог</p>
              </div>
            </div>

            {/* Specialties */}
            <div>
              <h3 className="font-serif text-lg text-stone-700 mb-4">Специализация</h3>
              <div className="flex flex-wrap gap-2">
                {nanny.specialties.map((skill) => (
                  <span
                    key={skill}
                    className="px-4 py-2 rounded-full bg-[#F0EDE8] text-sm font-light text-stone-600 border border-stone-200/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Verifications */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-stone-700">Проверки</h3>
                <span className="text-xs font-light text-[#8B9D83] bg-[#8B9D83]/10 px-3 py-1 rounded-full">
                  {verifiedCount}/5 подтверждено
                </span>
              </div>
              <div className="space-y-3">
                {nanny.verifications.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="text-sm text-stone-600 font-light">{item.label}</span>
                    {item.verified ? (
                      <CheckCircle2 size={18} className="text-[#8B9D83]" strokeWidth={1.5} />
                    ) : (
                      <Clock size={18} className="text-stone-300" strokeWidth={1.5} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Video intro */}
            <button className="w-full bg-[#F0EDE8] rounded-2xl p-5 flex items-center gap-4 active:bg-[#E8E5E0] transition-colors border border-stone-200/50">
              <div className="w-14 h-14 rounded-xl bg-[#8B9D83] flex items-center justify-center">
                <Play size={20} className="text-white ml-0.5" fill="white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-stone-700">Видео-визитка</p>
                <p className="text-xs text-stone-500 mt-0.5 font-light">2:34 мин</p>
              </div>
              <ChevronRight size={18} className="text-stone-400" strokeWidth={1.5} />
            </button>
          </>
        ) : (
          <>
            {/* Rating Summary */}
            <div className="bg-[#F0EDE8] rounded-2xl p-6 border border-stone-200/50">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-light text-stone-700">{nanny.rating}</div>
                  <div className="flex items-center justify-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className="text-[#C9A86C] fill-[#C9A86C]"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-stone-500 mt-2 font-light">{nanny.reviewCount} отзывов</p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-xs text-stone-500 w-3 font-light">{rating}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
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
              <div key={review.id} className="py-5 border-b border-stone-200/50">
                <div className="flex items-start gap-4">
                  <img
                    src={review.avatar}
                    alt={review.author}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm text-stone-700">{review.author}</h4>
                      <span className="text-xs text-stone-400 font-light">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={11}
                          className="text-[#C9A86C] fill-[#C9A86C]"
                        />
                      ))}
                    </div>
                    <p className="text-[15px] text-stone-600 leading-relaxed font-light">{review.text}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Load more */}
            <button className="w-full py-4 text-sm tracking-wider uppercase text-stone-500 font-light active:text-stone-700 transition-colors">
              Показать все отзывы
            </button>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FDFCFB] border-t border-stone-200/50 p-5 pb-8">
        <button className="w-full h-14 rounded-xl bg-stone-800 text-white font-light text-sm uppercase tracking-widest active:bg-stone-700 transition-colors">
          Связаться с Анной
        </button>
      </div>
    </div>
  );
};

export default NannyProfileMobile;
