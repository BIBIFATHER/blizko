import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronRight,
  MessageCircle,
  Search,
  Star,
  Heart,
  Home,
  User,
  Calendar,
  Plus,
} from 'lucide-react';

interface ParentDashboardMobileProps {
  onNavigate?: (path: string) => void;
}

const mockData = {
  user: {
    name: 'Мария',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
  },
  searchProgress: {
    stage: 3,
    totalStages: 4,
    label: 'Выбор кандидатов',
  },
  shortlist: [
    {
      id: '1',
      name: 'Анна М.',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=250&fit=crop&crop=face',
      rating: 4.9,
      matchScore: 96,
      isTop: true,
      status: 'new',
    },
    {
      id: '2',
      name: 'Елена К.',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=250&fit=crop&crop=face',
      rating: 4.8,
      matchScore: 91,
      status: 'pending',
    },
    {
      id: '3',
      name: 'Мария П.',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=250&fit=crop&crop=face',
      rating: 4.7,
      matchScore: 87,
    },
  ],
  activity: [
    {
      id: '1',
      type: 'match',
      title: 'Новое совпадение',
      subtitle: 'Анна Морозова — 96%',
      time: '2 часа назад',
    },
    {
      id: '2',
      type: 'message',
      title: 'Новое сообщение',
      subtitle: 'Елена ответила на ваш запрос',
      time: '5 часов назад',
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Напоминание',
      subtitle: 'Собеседование завтра в 15:00',
      time: 'Вчера',
    },
  ],
};

export const ParentDashboardMobile: React.FC<ParentDashboardMobileProps> = ({
  onNavigate,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className={`min-h-screen bg-[#FDFCFB] pb-24 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header - warm, no dark overlay */}
      <header className="bg-[#F0EDE8] px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src={mockData.user.avatar}
              alt={mockData.user.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <p className="text-stone-400 text-sm font-light">Добрый день,</p>
              <p className="font-serif text-lg text-stone-700">{mockData.user.name}</p>
            </div>
          </div>
          <button className="relative w-10 h-10 rounded-full bg-[#FDFCFB] flex items-center justify-center active:bg-stone-200 transition-colors">
            <Bell size={18} className="text-stone-500" strokeWidth={1.5} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C17F5E]" />
          </button>
        </div>

        {/* Search Progress */}
        <div className="bg-[#FDFCFB] rounded-2xl p-5 border border-stone-200/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-stone-400 font-light uppercase tracking-wider">Прогресс поиска</span>
            <span className="text-xs text-stone-500">{mockData.searchProgress.stage}/{mockData.searchProgress.totalStages}</span>
          </div>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-1 rounded-full ${
                  step <= mockData.searchProgress.stage ? 'bg-[#C9A86C]' : 'bg-stone-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-stone-600 font-light">{mockData.searchProgress.label}</p>
        </div>
      </header>

      {/* Quick Actions - clean line-art icons in a single row */}
      <div className="px-5 py-6">
        <div className="flex items-center justify-between">
          {[
            { icon: Search, label: 'Поиск' },
            { icon: Heart, label: 'Шортлист' },
            { icon: MessageCircle, label: 'Чаты', badge: 2 },
            { icon: Calendar, label: 'Встречи' },
          ].map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center text-stone-500 active:bg-stone-200 transition-colors">
                <action.icon size={20} strokeWidth={1.5} />
                {action.badge && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#C17F5E] text-[10px] font-medium text-white flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-stone-500 font-light">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shortlist Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="font-serif text-lg text-stone-700">Ваш шортлист</h2>
          <button
            onClick={() => onNavigate?.('/shortlist')}
            className="flex items-center gap-1 text-xs font-light text-stone-400 uppercase tracking-wider active:text-stone-600 transition-colors"
          >
            Все
            <ChevronRight size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Horizontal Scroll Cards */}
        <div className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide">
          {mockData.shortlist.map((nanny) => (
            <button
              key={nanny.id}
              onClick={() => onNavigate?.(`/nanny/${nanny.id}`)}
              className="relative flex-shrink-0 w-36 active:scale-98 transition-transform"
            >
              <div className="relative h-48 rounded-2xl overflow-hidden mb-3 border border-stone-200/50">
                <img
                  src={nanny.photo}
                  alt={nanny.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2C2C2C]/50 via-transparent to-transparent" />
                
                {/* Status badge - muted pastel */}
                {nanny.status && (
                  <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-light ${
                    nanny.status === 'new' 
                      ? 'bg-[#D4DDD0] text-[#5A6B52]' 
                      : 'bg-[#E8DDD0] text-[#8B7355]'
                  }`}>
                    {nanny.status === 'new' ? 'Новая' : 'Ожидает'}
                  </div>
                )}

                {/* Top badge */}
                {nanny.isTop && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full border border-[#C9A86C] flex items-center justify-center">
                    <span className="text-[8px] text-[#C9A86C]">1</span>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-1">
                    <Star size={11} className="text-[#C9A86C] fill-[#C9A86C]" />
                    <span className="text-white text-xs font-light">{nanny.rating}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-stone-700 text-left">{nanny.name}</p>
              <p className="text-xs text-stone-400 text-left font-light">{nanny.matchScore}% совпадение</p>
            </button>
          ))}

          {/* Add more button */}
          <button className="flex-shrink-0 w-36 h-48 rounded-2xl border border-dashed border-stone-300 flex flex-col items-center justify-center gap-2 text-stone-400 active:border-stone-400 active:text-stone-500 transition-colors">
            <Plus size={20} strokeWidth={1.5} />
            <span className="text-xs font-light">Найти ещё</span>
          </button>
        </div>
      </section>

      {/* Activity Feed */}
      <section className="px-5">
        <h2 className="font-serif text-lg text-stone-700 mb-4">Активность</h2>
        <div className="space-y-3">
          {mockData.activity.map((item) => (
            <button
              key={item.id}
              className="w-full bg-[#F0EDE8] rounded-2xl p-4 flex items-center gap-4 active:bg-[#E8E5E0] transition-colors text-left border border-stone-200/50"
            >
              <div className="w-10 h-10 rounded-full bg-[#FDFCFB] flex items-center justify-center text-stone-500">
                {item.type === 'match' && <Star size={16} strokeWidth={1.5} />}
                {item.type === 'message' && <MessageCircle size={16} strokeWidth={1.5} />}
                {item.type === 'reminder' && <Calendar size={16} strokeWidth={1.5} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 mb-0.5">{item.title}</p>
                <p className="text-xs text-stone-400 font-light truncate">{item.subtitle}</p>
              </div>
              <span className="text-xs text-stone-400 font-light shrink-0">{item.time}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#FDFCFB] border-t border-stone-200/50 px-6 pb-6 pt-3">
        <div className="flex items-center justify-around">
          {[
            { icon: Home, label: 'Главная', active: true },
            { icon: Search, label: 'Поиск' },
            { icon: Heart, label: 'Избранное' },
            { icon: MessageCircle, label: 'Чаты' },
            { icon: User, label: 'Профиль' },
          ].map((item) => (
            <button
              key={item.label}
              className={`flex flex-col items-center gap-1 py-2 px-3 ${
                item.active ? 'text-stone-700' : 'text-stone-400'
              }`}
            >
              <item.icon size={22} strokeWidth={item.active ? 2 : 1.5} />
              <span className="text-[10px] font-light">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ParentDashboardMobile;
