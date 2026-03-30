import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Star,
  ShieldCheck,
  Heart,
  MessageCircle,
  ChevronRight,
  BadgeCheck,
  Clock,
  Users,
  Share2,
  CheckCircle2,
  Award,
  Play,
  Sparkles,
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
  const nanny = mockNanny;
  const verifiedCount = nanny.verifications.filter(v => v.verified).length;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28">
      {/* Hero Image */}
      <div className="relative h-[56vh] min-h-[420px]">
        <img 
          src={nanny.photo} 
          alt={nanny.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Top navigation */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12 z-10">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-95 ${
                liked ? 'bg-white text-red-500' : 'bg-black/30 text-white'
              }`}
            >
              <Heart size={22} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform">
              <Share2 size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Bottom info on photo */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm mb-3">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-xs font-medium">{verifiedCount}/5 проверок</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-1">{nanny.name}</h1>
          
          <div className="flex items-center gap-3 text-white/90">
            <div className="flex items-center gap-1">
              <Star size={16} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold">{nanny.rating}</span>
              <span className="text-white/60">({nanny.reviewCount})</span>
            </div>
            <span className="text-white/40">|</span>
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{nanny.distance}</span>
            </div>
          </div>
        </div>

        {/* Gallery dots */}
        <div className="absolute bottom-5 right-5 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex">
          <div className="flex-1 py-4 text-center border-r border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{nanny.experience}</p>
            <p className="text-xs text-gray-500 mt-0.5">лет опыта</p>
          </div>
          <div className="flex-1 py-4 text-center border-r border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{nanny.rate}₽</p>
            <p className="text-xs text-gray-500 mt-0.5">в час</p>
          </div>
          <div className="flex-1 py-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{nanny.responseTime}</p>
            <p className="text-xs text-gray-500 mt-0.5">ответ</p>
          </div>
        </div>
      </div>

      {/* Section Toggle */}
      <div className="bg-white px-4 py-2 sticky top-0 z-20 border-b border-gray-100">
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
          <button
            onClick={() => setActiveSection('info')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeSection === 'info'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Информация
          </button>
          <button
            onClick={() => setActiveSection('reviews')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeSection === 'reviews'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Отзывы ({nanny.reviewCount})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeSection === 'info' ? (
          <div className="space-y-4">
            {/* AI Match reason */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Blizko Match</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Анна идеально подходит: опыт с детьми 2-4 лет, живёт в 12 минутах от вас, свободна в нужные дни.
                </p>
              </div>
            </div>

            {/* About */}
            <div className="bg-white rounded-2xl p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">О себе</h3>
              <p className="text-[15px] text-gray-600 leading-relaxed">{nanny.about}</p>
            </div>

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4">
                <Users size={20} className="text-gray-400 mb-2" />
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Возраст детей</p>
                <p className="text-sm font-semibold text-gray-900">{nanny.childAges}</p>
              </div>
              <div className="bg-white rounded-2xl p-4">
                <Award size={20} className="text-gray-400 mb-2" />
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Образование</p>
                <p className="text-sm font-semibold text-gray-900">Педагог</p>
              </div>
            </div>

            {/* Specialties */}
            <div className="bg-white rounded-2xl p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Специализация</h3>
              <div className="flex flex-wrap gap-2">
                {nanny.specialties.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-2 rounded-full bg-gray-100 text-sm font-medium text-gray-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Verifications */}
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Проверки</h3>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {verifiedCount}/5
                </span>
              </div>
              <div className="space-y-3">
                {nanny.verifications.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    {item.verified ? (
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    ) : (
                      <Clock size={20} className="text-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Video intro */}
            <button className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 active:bg-gray-50 transition-colors">
              <div className="w-16 h-16 rounded-xl bg-gray-900 flex items-center justify-center">
                <Play size={24} className="text-white ml-1" fill="white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">Видео-визитка</p>
                <p className="text-xs text-gray-500 mt-0.5">2:34 мин</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Rating Summary */}
            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-900">{nanny.rating}</div>
                  <div className="flex items-center justify-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className="text-amber-400 fill-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{nanny.reviewCount} отзывов</p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-3">{rating}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
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
              <div key={review.id} className="bg-white rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={review.avatar}
                    alt={review.author}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-gray-900">{review.author}</h4>
                      <span className="text-xs text-gray-400">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          className="text-amber-400 fill-amber-400"
                        />
                      ))}
                    </div>
                    <p className="text-[15px] text-gray-600 leading-relaxed">{review.text}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Load more */}
            <button className="w-full py-3 text-sm font-semibold text-gray-900 bg-white rounded-2xl active:bg-gray-50 transition-colors">
              Показать все отзывы
            </button>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-8">
        <div className="flex gap-3">
          <button className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors">
            <MessageCircle size={24} />
          </button>
          <button className="flex-1 h-14 rounded-2xl bg-gray-900 text-white font-semibold text-[15px] active:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20">
            Связаться с Анной
          </button>
        </div>
      </div>
    </div>
  );
};

export default NannyProfileMobile;
