import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  HelpCircle,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  User,
  Users,
  Sparkles,
  FileText,
  AlertCircle,
  RefreshCw,
  Heart,
} from 'lucide-react';
import { Language, ParentRequest, Booking, NannyProfile } from '@/core/types/types';

interface ParentDashboardMobileProps {
  lang: Language;
  user?: { id?: string; name?: string; email?: string };
  requests?: ParentRequest[];
  bookings?: Booking[];
  shortlistedNannies?: NannyProfile[];
}

// Status configuration
type RequestStatus = 'payment_pending' | 'new' | 'in_review' | 'approved' | 'rejected';

const STATUS_CONFIG: Record<RequestStatus, { label: string; labelEn: string; color: string; bg: string; icon: React.ReactNode }> = {
  payment_pending: {
    label: 'Ожидает оплаты',
    labelEn: 'Payment pending',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    icon: <Clock size={12} />,
  },
  new: {
    label: 'Новая заявка',
    labelEn: 'New request',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: <Sparkles size={12} />,
  },
  in_review: {
    label: 'На проверке',
    labelEn: 'In review',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    icon: <Search size={12} />,
  },
  approved: {
    label: 'Подбор начат',
    labelEn: 'Matching started',
    color: 'text-green-700',
    bg: 'bg-green-50',
    icon: <Check size={12} />,
  },
  rejected: {
    label: 'Требует внимания',
    labelEn: 'Needs attention',
    color: 'text-red-700',
    bg: 'bg-red-50',
    icon: <AlertCircle size={12} />,
  },
};

// Quick action card
const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}> = ({ icon, label, description, onClick, variant = 'secondary' }) => (
  <button
    onClick={onClick}
    className={`w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98] ${
      variant === 'primary'
        ? 'bg-stone-900 text-white'
        : 'bg-white border border-stone-100'
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
      variant === 'primary' ? 'bg-white/10' : 'bg-stone-100'
    }`}>
      {icon}
    </div>
    <p className={`text-sm font-semibold mb-0.5 ${variant === 'primary' ? 'text-white' : 'text-stone-900'}`}>
      {label}
    </p>
    <p className={`text-xs ${variant === 'primary' ? 'text-white/70' : 'text-stone-500'}`}>
      {description}
    </p>
  </button>
);

// Request card
const RequestCard: React.FC<{
  request: ParentRequest;
  lang: Language;
  onClick: () => void;
}> = ({ request, lang, onClick }) => {
  const status = request.status || 'new';
  const config = STATUS_CONFIG[status];

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-white border border-stone-100 p-4 text-left transition-all active:scale-[0.98] animate-fade-up"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
            {config.icon}
            {lang === 'ru' ? config.label : config.labelEn}
          </div>
        </div>
        <ChevronRight size={16} className="text-stone-300" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <MapPin size={14} className="text-stone-400 shrink-0" />
          <span className="text-stone-700">{request.district || request.city}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users size={14} className="text-stone-400 shrink-0" />
          <span className="text-stone-700">{request.childAge}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock size={14} className="text-stone-400 shrink-0" />
          <span className="text-stone-700">{request.schedule}</span>
        </div>
      </div>

      {request.requirements?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-100">
          {request.requirements.slice(0, 3).map((req, i) => (
            <span key={i} className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
              {req}
            </span>
          ))}
          {request.requirements.length > 3 && (
            <span className="text-xs text-stone-400">+{request.requirements.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
};

// Shortlisted nanny card
const ShortlistNannyCard: React.FC<{
  nanny: NannyProfile;
  lang: Language;
  onClick: () => void;
}> = ({ nanny, lang, onClick }) => {
  const avgRating = nanny.reviews?.length
    ? (nanny.reviews.reduce((s, r) => s + r.rating, 0) / nanny.reviews.length).toFixed(1)
    : null;

  return (
    <button
      onClick={onClick}
      className="shrink-0 w-[200px] rounded-2xl bg-white border border-stone-100 p-3 text-left transition-all active:scale-[0.98]"
    >
      <div className="flex items-start gap-3 mb-2">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-200">
            {nanny.photo ? (
              <img src={nanny.photo} alt={nanny.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-500 font-bold">
                {nanny.name[0]}
              </div>
            )}
          </div>
          {nanny.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-teal-500 border border-white flex items-center justify-center">
              <ShieldCheck size={8} className="text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900 truncate">{nanny.name}</p>
          {avgRating && (
            <div className="flex items-center gap-1">
              <Star size={10} className="text-amber-500 fill-amber-500" />
              <span className="text-xs text-stone-600">{avgRating}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-500">{nanny.expectedRate} ₽/ч</span>
        <span className="text-xs text-teal-600 font-medium">{lang === 'ru' ? 'Открыть' : 'View'}</span>
      </div>
    </button>
  );
};

// Booking card
const BookingCard: React.FC<{
  booking: Booking;
  lang: Language;
  onClick: () => void;
}> = ({ booking, lang, onClick }) => (
  <button
    onClick={onClick}
    className="w-full rounded-2xl bg-white border border-stone-100 p-4 text-left transition-all active:scale-[0.98]"
  >
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
        <span className="text-stone-500 font-bold">{booking.nannyName[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-stone-900 truncate">{booking.nannyName}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            booking.status === 'confirmed' ? 'bg-green-50 text-green-700' :
            booking.status === 'pending' ? 'bg-amber-50 text-amber-700' :
            'bg-stone-100 text-stone-600'
          }`}>
            {booking.status === 'confirmed' && (lang === 'ru' ? 'Подтверждено' : 'Confirmed')}
            {booking.status === 'pending' && (lang === 'ru' ? 'Ожидает' : 'Pending')}
            {booking.status === 'active' && (lang === 'ru' ? 'Активно' : 'Active')}
            {booking.status === 'completed' && (lang === 'ru' ? 'Завершено' : 'Completed')}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {booking.date}
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium text-stone-700">{booking.amount}</span>
          </span>
        </div>
      </div>
    </div>
  </button>
);

// Main component
export const ParentDashboardMobile: React.FC<ParentDashboardMobileProps> = ({
  lang,
  user,
  requests = [],
  bookings = [],
  shortlistedNannies = [],
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'home' | 'requests' | 'bookings'>('home');

  // Mock data for preview
  const displayRequests: ParentRequest[] = requests.length > 0 ? requests : [
    {
      id: 'mock-req-1',
      type: 'parent',
      status: 'approved',
      city: 'Москва',
      district: 'Пресня',
      childAge: '3 года',
      schedule: 'Пн-Пт, 9:00-18:00',
      budget: '50 000 - 70 000 ₽',
      requirements: ['Развивающие занятия', 'Прогулки', 'Готовка'],
      comment: '',
      createdAt: Date.now(),
    },
  ];

  const displayBookings: Booking[] = bookings.length > 0 ? bookings : [
    {
      id: 'mock-booking-1',
      nannyName: 'Анна Иванова',
      date: '25 марта',
      status: 'confirmed',
      amount: '7 200 ₽',
    },
    {
      id: 'mock-booking-2',
      nannyName: 'Елена Петрова',
      date: '28 марта',
      status: 'pending',
      amount: '6 400 ₽',
    },
  ];

  const displayNannies: NannyProfile[] = shortlistedNannies.length > 0 ? shortlistedNannies : [
    {
      id: 'mock-nanny-1',
      type: 'nanny',
      name: 'Анна Иванова',
      city: 'Москва',
      district: 'Пресня',
      experience: '7 лет',
      expectedRate: '900',
      isVerified: true,
      about: '',
      skills: [],
      childAges: [],
      contact: '',
      reviews: [{ id: 'r1', authorName: 'Мария', rating: 5, text: '', date: Date.now() }],
      photo: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=400&auto=format&fit=crop',
      createdAt: Date.now(),
    },
    {
      id: 'mock-nanny-2',
      type: 'nanny',
      name: 'Елена Петрова',
      city: 'Москва',
      district: 'Хамовники',
      experience: '5 лет',
      expectedRate: '800',
      isVerified: true,
      about: '',
      skills: [],
      childAges: [],
      contact: '',
      reviews: [{ id: 'r2', authorName: 'Ольга', rating: 5, text: '', date: Date.now() }],
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&auto=format&fit=crop',
      createdAt: Date.now(),
    },
  ];

  const userName = user?.name || 'Пользователь';
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return lang === 'ru' ? 'Доброе утро' : 'Good morning';
    if (hour < 18) return lang === 'ru' ? 'Добрый день' : 'Good afternoon';
    return lang === 'ru' ? 'Добрый вечер' : 'Good evening';
  }, [lang]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
              <span className="text-sm font-semibold text-stone-600">{userName[0]}</span>
            </div>
            <div>
              <p className="text-xs text-stone-400">{greeting}</p>
              <p className="text-sm font-semibold text-stone-900">{userName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-500" />
            </button>
            <button className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      {activeTab === 'home' && (
        <div className="px-5 pt-5 space-y-6">
          {/* Status overview */}
          <section className="rounded-2xl bg-teal-50 border border-teal-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <Search size={18} className="text-teal-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-teal-800 mb-1">
                  {lang === 'ru' ? 'Подбор активен' : 'Search active'}
                </p>
                <p className="text-xs text-teal-600">
                  {lang === 'ru' 
                    ? `${displayNannies.length} кандидатов в вашем shortlist` 
                    : `${displayNannies.length} candidates in your shortlist`}
                </p>
              </div>
              <ChevronRight size={18} className="text-teal-400" />
            </div>
          </section>

          {/* Quick actions */}
          <section>
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
              {lang === 'ru' ? 'Быстрые действия' : 'Quick actions'}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard
                icon={<Users size={18} className="text-white" />}
                label={lang === 'ru' ? 'Shortlist' : 'Shortlist'}
                description={lang === 'ru' ? `${displayNannies.length} кандидатов` : `${displayNannies.length} candidates`}
                onClick={() => navigate('/shortlist')}
                variant="primary"
              />
              <QuickActionCard
                icon={<Plus size={18} className="text-stone-600" />}
                label={lang === 'ru' ? 'Новый запрос' : 'New request'}
                description={lang === 'ru' ? 'Начать подбор' : 'Start search'}
                onClick={() => navigate('/find-nanny')}
              />
              <QuickActionCard
                icon={<Calendar size={18} className="text-stone-600" />}
                label={lang === 'ru' ? 'Бронирования' : 'Bookings'}
                description={`${displayBookings.length} ${lang === 'ru' ? 'запланировано' : 'scheduled'}`}
                onClick={() => setActiveTab('bookings')}
              />
              <QuickActionCard
                icon={<HelpCircle size={18} className="text-stone-600" />}
                label={lang === 'ru' ? 'Поддержка' : 'Support'}
                description={lang === 'ru' ? 'Помощь 24/7' : '24/7 help'}
                onClick={() => window.dispatchEvent(new CustomEvent('blizko:open-support-chat'))}
              />
            </div>
          </section>

          {/* Shortlist preview */}
          {displayNannies.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  {lang === 'ru' ? 'Ваш shortlist' : 'Your shortlist'}
                </h2>
                <button 
                  onClick={() => navigate('/shortlist')}
                  className="text-xs font-medium text-teal-600"
                >
                  {lang === 'ru' ? 'Все' : 'View all'} <ChevronRight size={12} className="inline" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                {displayNannies.map((nanny) => (
                  <ShortlistNannyCard
                    key={nanny.id}
                    nanny={nanny}
                    lang={lang}
                    onClick={() => navigate(`/nanny/${nanny.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Active requests */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                {lang === 'ru' ? 'Активные запросы' : 'Active requests'}
              </h2>
              <button 
                onClick={() => setActiveTab('requests')}
                className="text-xs font-medium text-teal-600"
              >
                {lang === 'ru' ? 'Все' : 'View all'} <ChevronRight size={12} className="inline" />
              </button>
            </div>
            <div className="space-y-3">
              {displayRequests.slice(0, 2).map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  lang={lang}
                  onClick={() => navigate(`/requests/${request.id}`)}
                />
              ))}
            </div>
          </section>

          {/* Upcoming bookings */}
          {displayBookings.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  {lang === 'ru' ? 'Ближайшие встречи' : 'Upcoming bookings'}
                </h2>
                <button 
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs font-medium text-teal-600"
                >
                  {lang === 'ru' ? 'Все' : 'View all'} <ChevronRight size={12} className="inline" />
                </button>
              </div>
              <div className="space-y-3">
                {displayBookings.slice(0, 2).map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    lang={lang}
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Support reminder */}
          <section className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-stone-100 flex items-center justify-center shrink-0">
                <Heart size={16} className="text-stone-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700 mb-1">
                  {lang === 'ru' ? 'Мы рядом на каждом этапе' : "We're with you every step"}
                </p>
                <p className="text-xs text-stone-500">
                  {lang === 'ru' 
                    ? 'Если что-то пойдёт не так — поддержка поможет разобраться.' 
                    : "If something goes wrong, support will help you sort it out."}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="px-5 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-stone-900">
              {lang === 'ru' ? 'Мои запросы' : 'My requests'}
            </h1>
            <button
              onClick={() => navigate('/find-nanny')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium"
            >
              <Plus size={16} />
              {lang === 'ru' ? 'Новый' : 'New'}
            </button>
          </div>
          
          <div className="space-y-3">
            {displayRequests.map((request, i) => (
              <div key={request.id} style={{ animationDelay: `${i * 100}ms` }}>
                <RequestCard
                  request={request}
                  lang={lang}
                  onClick={() => navigate(`/requests/${request.id}`)}
                />
              </div>
            ))}
          </div>

          {displayRequests.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-stone-400" />
              </div>
              <p className="text-sm font-medium text-stone-700 mb-1">
                {lang === 'ru' ? 'Нет активных запросов' : 'No active requests'}
              </p>
              <p className="text-xs text-stone-500 mb-4">
                {lang === 'ru' ? 'Создайте запрос, чтобы начать подбор' : 'Create a request to start matching'}
              </p>
              <button
                onClick={() => navigate('/find-nanny')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium"
              >
                <Plus size={16} />
                {lang === 'ru' ? 'Создать запрос' : 'Create request'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="px-5 pt-5 space-y-4">
          <h1 className="text-xl font-semibold text-stone-900">
            {lang === 'ru' ? 'Бронирования' : 'Bookings'}
          </h1>
          
          <div className="space-y-3">
            {displayBookings.map((booking, i) => (
              <div key={booking.id} style={{ animationDelay: `${i * 100}ms` }} className="animate-fade-up">
                <BookingCard
                  booking={booking}
                  lang={lang}
                  onClick={() => navigate(`/bookings/${booking.id}`)}
                />
              </div>
            ))}
          </div>

          {displayBookings.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-stone-400" />
              </div>
              <p className="text-sm font-medium text-stone-700 mb-1">
                {lang === 'ru' ? 'Нет бронирований' : 'No bookings yet'}
              </p>
              <p className="text-xs text-stone-500">
                {lang === 'ru' ? 'Здесь появятся ваши встречи с нянями' : 'Your meetings with nannies will appear here'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-stone-100 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              activeTab === 'home' ? 'text-teal-600' : 'text-stone-400'
            }`}
          >
            <User size={20} />
            <span className="text-[10px] font-medium">{lang === 'ru' ? 'Главная' : 'Home'}</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              activeTab === 'requests' ? 'text-teal-600' : 'text-stone-400'
            }`}
          >
            <Search size={20} />
            <span className="text-[10px] font-medium">{lang === 'ru' ? 'Запросы' : 'Requests'}</span>
          </button>
          <button
            onClick={() => navigate('/shortlist')}
            className="flex flex-col items-center gap-1 px-4 py-2 text-stone-400"
          >
            <Users size={20} />
            <span className="text-[10px] font-medium">Shortlist</span>
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              activeTab === 'bookings' ? 'text-teal-600' : 'text-stone-400'
            }`}
          >
            <Calendar size={20} />
            <span className="text-[10px] font-medium">{lang === 'ru' ? 'Встречи' : 'Bookings'}</span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('blizko:open-support-chat'))}
            className="flex flex-col items-center gap-1 px-4 py-2 text-stone-400"
          >
            <MessageCircle size={20} />
            <span className="text-[10px] font-medium">{lang === 'ru' ? 'Чат' : 'Chat'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default ParentDashboardMobile;
