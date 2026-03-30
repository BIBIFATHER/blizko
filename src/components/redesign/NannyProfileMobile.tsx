import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Star,
  ShieldCheck,
  Heart,
  MessageCircle,
  ChevronRight,
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
    <div className="min-h-screen bg-[#FAF9F7] pb-28">
      {/* Hero Image */}
      <div className="relative h-[52vh] min-h-[380px]">
        <img 
          src={nanny.photo} 
          alt={nanny.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Soft warm gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#3D3D3D]/80 via-[#3D3D3D]/10 to-transparent" />
        
        {/* Top navigation */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12 z-10">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#4A4A4A] active:scale-95 transition-transform shadow-sm"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`w-11 h-11 rounded-full backdrop-blur-sm flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                liked ? 'bg-white text-[#E07A5F]' : 'bg-white/90 text-[#4A4A4A]'
              }`}
            >
              <Heart size={22} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#4A4A4A] active:scale-95 transition-transform shadow-sm">
              <Share2 size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Bottom info on photo */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-sm mb-3">
            <ShieldCheck size={14} className="text-[#81B29A]" />
            <span className="text-xs font-medium">{verifiedCount}/5 проверок</span>
          </div>
          
          <h1 className="text-3xl font-semibold mb-1 tracking-tight">{nanny.name}</h1>
          
          <div className="flex items-center gap-3 text-white/90">
            <div className="flex items-center gap-1">
              <Star size={16} className="text-[#F2CC8F] fill-[#F2CC8F]" />
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
      <div className="bg-white border-b border-[#E8E4DF]">
        <div className="flex">
          <div className="flex-1 py-4 text-center border-r border-[#E8E4DF]">
            <p className="text-2xl font-semibold text-[#3D3D3D]">{nanny.experience}</p>
            <p className="text-xs text-[#8B8680] mt-0.5">лет опыта</p>
          </div>
          <div className="flex-1 py-4 text-center border-r border-[#E8E4DF]">
            <p className="text-2xl font-semibold text-[#3D3D3D]">{nanny.rate}₽</p>
            <p className="text-xs text-[#8B8680] mt-0.5">в час</p>
          </div>
          <div className="flex-1 py-4 text-center">
            <p className="text-2xl font-semibold text-[#3D3D3D]">{nanny.responseTime}</p>
            <p className="text-xs text-[#8B8680] mt-0.5">ответ</p>
          </div>
        </div>
      </div>

      {/* Section Toggle */}
      <div className="bg-white px-4 py-2 sticky top-0 z-20 border-b border-[#E8E4DF]">
        <div className="flex gap-1 p-1 rounded-xl bg-[#F5F3F0]">
          <button
            onClick={() => setActiveSection('info')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeSection === 'info'
                ? 'bg-white text-[#3D3D3D] shadow-sm'
                : 'text-[#8B8680]'
            }`}
          >
            Информация
          </button>
          <button
            onClick={() => setActiveSection('reviews')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeSection === 'reviews'
                ? 'bg-white text-[#3D3D3D] shadow-sm'
                : 'text-[#8B8680]'
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#81B29A] to-[#6A9B83] p-4 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-[#F2CC8F]" />
                  <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">Почему подходит</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  Анна идеально подходит: опыт с детьми 2-4 лет, живёт в 12 минутах от вас, свободна в нужные дни.
                </p>
              </div>
            </div>

            {/* About */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8E4DF]">
              <h3 className="text-xs font-semibold text-[#8B8680] mb-3 uppercase tracking-wide">О себе</h3>
              <p className="text-[15px] text-[#4A4A4A] leading-relaxed">{nanny.about}</p>
            </div>

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-[#E8E4DF]">
                <Users size={20} className="text-[#81B29A] mb-2" />
                <p className="text-xs text-[#8B8680] uppercase tracking-wide mb-1">Возраст детей</p>
                <p className="text-sm font-medium text-[#3D3D3D]">{nanny.childAges}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#E8E4DF]">
                <Award size={20} className="text-[#81B29A] mb-2" />
                <p className="text-xs text-[#8B8680] uppercase tracking-wide mb-1">Образование</p>
                <p className="text-sm font-medium text-[#3D3D3D]">Педагог</p>
              </div>
            </div>

            {/* Specialties */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8E4DF]">
              <h3 className="text-xs font-semibold text-[#8B8680] mb-3 uppercase tracking-wide">Специализация</h3>
              <div className="flex flex-wrap gap-2">
                {nanny.specialties.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-2 rounded-full bg-[#F5F3F0] text-sm font-medium text-[#4A4A4A]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Verifications */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8E4DF]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-[#8B8680] uppercase tracking-wide">Проверки</h3>
                <span className="text-xs font-semibold text-[#81B29A] bg-[#81B29A]/10 px-2 py-1 rounded-full">
                  {verifiedCount}/5
                </span>
              </div>
              <div className="space-y-3">
                {nanny.verifications.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-[#4A4A4A]">{item.label}</span>
                    {item.verified ? (
                      <CheckCircle2 size={20} className="text-[#81B29A]" />
                    ) : (
                      <Clock size={20} className="text-[#C9C5BF]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Video intro */}
            <button className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 active:bg-[#FAF9F7] transition-colors border border-[#E8E4DF]">
              <div className="w-16 h-16 rounded-xl bg-[#5D8A72] flex items-center justify-center">
                <Play size={24} className="text-white ml-1" fill="white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-[#3D3D3D]">Видео-визитка</p>
                <p className="text-xs text-[#8B8680] mt-0.5">2:34 мин</p>
              </div>
              <ChevronRight size={20} className="text-[#C9C5BF]" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Rating Summary */}
            <div className="bg-white rounded-2xl p-5 border border-[#E8E4DF]">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl font-semibold text-[#3D3D3D]">{nanny.rating}</div>
                  <div className="flex items-center justify-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className="text-[#F2CC8F] fill-[#F2CC8F]"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#8B8680] mt-1">{nanny.reviewCount} отзывов</p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs text-[#8B8680] w-3">{rating}</span>
                      <div className="flex-1 h-2 rounded-full bg-[#F5F3F0] overflow-hidden">
                        <div
                          className="h-full bg-[#F2CC8F] rounded-full"
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
              <div key={review.id} className="bg-white rounded-2xl p-4 border border-[#E8E4DF]">
                <div className="flex items-start gap-3">
                  <img
                    src={review.avatar}
                    alt={review.author}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-[#3D3D3D]">{review.author}</h4>
                      <span className="text-xs text-[#8B8680]">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          className="text-[#F2CC8F] fill-[#F2CC8F]"
                        />
                      ))}
                    </div>
                    <p className="text-[15px] text-[#4A4A4A] leading-relaxed">{review.text}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Load more */}
            <button className="w-full py-3 text-sm font-medium text-[#4A4A4A] bg-white rounded-2xl active:bg-[#FAF9F7] transition-colors border border-[#E8E4DF]">
              Показать все отзывы
            </button>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E4DF] p-4 pb-8">
        <div className="flex gap-3">
          <button className="w-14 h-14 rounded-2xl bg-[#F5F3F0] flex items-center justify-center text-[#5D8A72] active:bg-[#E8E4DF] transition-colors">
            <MessageCircle size={24} />
          </button>
          <button className="flex-1 h-14 rounded-2xl bg-[#5D8A72] text-white font-medium text-[15px] active:bg-[#4A7A62] transition-colors shadow-lg shadow-[#5D8A72]/20">
            Связаться с Анной
          </button>
        </div>
      </div>
    </div>
  );
};

export default NannyProfileMobile;
