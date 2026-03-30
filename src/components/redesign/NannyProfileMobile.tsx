import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Star,
  ShieldCheck,
  Heart,
  MessageCircle,
  Phone,
  ChevronRight,
  BadgeCheck,
  Clock,
  Users,
  Bookmark,
  Share2,
  CheckCircle2,
  Calendar,
  Award,
  GraduationCap,
  FileText,
  ThumbsUp,
} from 'lucide-react';

interface NannyProfileMobileProps {
  lang?: 'ru' | 'en';
  onBack?: () => void;
}

// Mock data for demonstration
const mockNanny = {
  id: '1',
  name: 'Анна Морозова',
  age: 34,
  photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
  location: 'Пресненский, ЦАО',
  experience: '8 лет',
  rating: 4.9,
  reviewCount: 47,
  rate: 1200,
  verified: true,
  verificationLevel: 'platinum',
  responseTime: '~15 мин',
  about: 'Профессиональная няня с педагогическим образованием. Владею методиками раннего развития. Спокойная, внимательная, ответственная. Опыт работы с детьми от 6 месяцев до 10 лет.',
  specialties: ['Раннее развитие', 'Монтессори', 'Подготовка к школе', 'Первая помощь'],
  languages: ['Русский', 'English'],
  education: 'МПГУ, дошкольная педагогика',
  childAges: '6 мес - 7 лет',
  schedule: 'Пн-Пт, с 8:00',
  verifications: [
    { type: 'identity', label: 'Личность подтверждена', verified: true },
    { type: 'background', label: 'Проверка безопасности', verified: true },
    { type: 'medical', label: 'Медицинская книжка', verified: true },
    { type: 'education', label: 'Диплом педагога', verified: true },
    { type: 'references', label: '3 рекомендации', verified: true },
  ],
  reviews: [
    {
      id: '1',
      author: 'Мария К.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      rating: 5,
      date: '2 недели назад',
      text: 'Анна - чудесная няня! Сын (3 года) обожает с ней проводить время. Очень спокойная, находит подход к ребёнку. Рекомендую!',
      helpful: 12,
    },
    {
      id: '2',
      author: 'Екатерина М.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
      rating: 5,
      date: '1 месяц назад',
      text: 'Работаем с Анной уже полгода. Профессионал высокого уровня, дочка быстро к ней привыкла.',
      helpful: 8,
    },
  ],
  matchReasons: [
    'Опыт работы с детьми вашего возраста',
    'Район проживания рядом с вами',
    'Подходит под ваш график',
    'Высокий рейтинг доверия',
  ],
};

export const NannyProfileMobile: React.FC<NannyProfileMobileProps> = ({ 
  lang = 'ru',
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'verification'>('about');
  const [isSaved, setIsSaved] = useState(false);
  const nanny = mockNanny;

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Hero Section with Photo */}
      <div className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 h-72 bg-gradient-to-b from-[#2D4A3E] to-[#3D5A4E]" />
        
        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 pt-12 pb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
                isSaved ? 'bg-white text-rose-500' : 'bg-white/20 text-white'
              }`}
            >
              <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <Share2 size={20} />
            </button>
          </div>
        </header>

        {/* Profile Card */}
        <div className="relative z-10 px-4 pt-2 pb-6">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            {/* Photo and basic info */}
            <div className="relative px-5 pt-5 pb-4">
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg">
                    <img 
                      src={nanny.photo} 
                      alt={nanny.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {nanny.verified && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-3 border-white flex items-center justify-center shadow-md">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-1">
                  <h1 className="text-xl font-semibold text-[#1A1A1A] mb-1 font-serif">{nanny.name}</h1>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-semibold text-[#1A1A1A]">{nanny.rating}</span>
                    </div>
                    <span className="text-sm text-[#8B8680]">({nanny.reviewCount} отзывов)</span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-[#6B6660]">
                    <MapPin size={14} className="text-[#9B958E]" />
                    <span>{nanny.location}</span>
                  </div>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">Полная проверка пройдена</p>
                  <p className="text-xs text-emerald-600">5 из 5 верификаций</p>
                </div>
                <ChevronRight size={18} className="text-emerald-400" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 border-t border-[#F0EFED]">
              <div className="px-4 py-3 text-center border-r border-[#F0EFED]">
                <p className="text-lg font-semibold text-[#1A1A1A]">{nanny.experience}</p>
                <p className="text-xs text-[#8B8680]">Опыт</p>
              </div>
              <div className="px-4 py-3 text-center border-r border-[#F0EFED]">
                <p className="text-lg font-semibold text-[#1A1A1A]">{nanny.rate}₽</p>
                <p className="text-xs text-[#8B8680]">в час</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-lg font-semibold text-[#1A1A1A]">{nanny.responseTime}</p>
                <p className="text-xs text-[#8B8680]">Отвечает</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why this nanny fits */}
      <section className="px-4 pb-5">
        <div className="bg-gradient-to-br from-[#FFF8F0] to-white rounded-2xl border border-[#F5E6D3] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
              <ThumbsUp size={12} className="text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Почему Анна вам подходит</h3>
          </div>
          <div className="space-y-2">
            {nanny.matchReasons.map((reason, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span className="text-sm text-[#4A4540]">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-xl bg-[#F0EFED]">
          {[
            { id: 'about', label: 'О няне' },
            { id: 'reviews', label: 'Отзывы' },
            { id: 'verification', label: 'Проверки' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#1A1A1A] shadow-sm'
                  : 'text-[#8B8680]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 pb-32">
        {activeTab === 'about' && (
          <div className="space-y-4">
            {/* About */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">О себе</h3>
              <p className="text-sm text-[#4A4540] leading-relaxed">{nanny.about}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3.5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[#F0EFED] flex items-center justify-center mb-2">
                  <Users size={16} className="text-[#6B6660]" />
                </div>
                <p className="text-xs text-[#8B8680] mb-0.5">Возраст детей</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{nanny.childAges}</p>
              </div>
              <div className="bg-white rounded-xl p-3.5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[#F0EFED] flex items-center justify-center mb-2">
                  <Calendar size={16} className="text-[#6B6660]" />
                </div>
                <p className="text-xs text-[#8B8680] mb-0.5">График</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{nanny.schedule}</p>
              </div>
              <div className="bg-white rounded-xl p-3.5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[#F0EFED] flex items-center justify-center mb-2">
                  <GraduationCap size={16} className="text-[#6B6660]" />
                </div>
                <p className="text-xs text-[#8B8680] mb-0.5">Образование</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{nanny.education}</p>
              </div>
              <div className="bg-white rounded-xl p-3.5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[#F0EFED] flex items-center justify-center mb-2">
                  <FileText size={16} className="text-[#6B6660]" />
                </div>
                <p className="text-xs text-[#8B8680] mb-0.5">Языки</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{nanny.languages.join(', ')}</p>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Навыки и специализация</h3>
              <div className="flex flex-wrap gap-2">
                {nanny.specialties.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-full bg-[#F5F4F2] text-sm text-[#4A4540]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {/* Rating Summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#1A1A1A]">{nanny.rating}</div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={star <= Math.round(nanny.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#8B8680] mt-1">{nanny.reviewCount} отзывов</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs text-[#8B8680] w-3">{rating}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-[#F0EFED] overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{
                            width: rating === 5 ? '85%' : rating === 4 ? '12%' : '3%',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            {nanny.reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={review.avatar}
                    alt={review.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-[#1A1A1A]">{review.author}</h4>
                      <span className="text-xs text-[#8B8680]">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          className={star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#4A4540] leading-relaxed mb-3">{review.text}</p>
                <button className="flex items-center gap-1.5 text-xs text-[#8B8680]">
                  <ThumbsUp size={12} />
                  <span>Полезно ({review.helpful})</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Award size={24} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1A1A1A]">Платиновый статус</h3>
                  <p className="text-sm text-[#8B8680]">Максимальный уровень доверия</p>
                </div>
              </div>
              <p className="text-sm text-[#6B6660] leading-relaxed">
                Анна прошла полную проверку Blizko. Все документы верифицированы, рекомендации подтверждены.
              </p>
            </div>

            {nanny.verifications.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  item.verified ? 'bg-emerald-50' : 'bg-gray-100'
                }`}>
                  {item.verified ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : (
                    <Clock size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1A1A1A]">{item.label}</p>
                  <p className="text-xs text-[#8B8680]">
                    {item.verified ? 'Подтверждено командой Blizko' : 'На проверке'}
                  </p>
                </div>
                {item.verified && (
                  <BadgeCheck size={18} className="text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-[#F0EFED] px-4 py-4 pb-8">
        <div className="flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#F5F4F2] text-[#4A4540] font-medium">
            <MessageCircle size={18} />
            <span>Написать</span>
          </button>
          <button className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#2D4A3E] text-white font-medium shadow-lg shadow-[#2D4A3E]/20">
            <Phone size={18} />
            <span>Связаться</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NannyProfileMobile;
