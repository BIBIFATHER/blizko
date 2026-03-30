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
} from 'lucide-react';

interface ParentDashboardMobileProps {
  onNavigate?: (path: string) => void;
}

const mockData = {
  user: {
    name: 'Мария',
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
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
      rating: 4.9,
      matchScore: 96,
      isTop: true,
    },
    {
      id: '2',
      name: 'Елена К.',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
      rating: 4.8,
      matchScore: 91,
    },
    {
      id: '3',
      name: 'Мария П.',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
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
      time: '2 ч',
    },
    {
      id: '2',
      type: 'message',
      title: 'Сообщение',
      subtitle: 'Елена ответила на запрос',
      time: '5 ч',
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
    <div className={`min-h-screen bg-[#FDFCFB] pb-24 transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header - clean, light */}
      <header className="px-6 pt-12 pb-6 border-b border-stone-200/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-stone-400 text-sm font-light">Добрый день,</p>
            <h1 className="font-serif text-2xl text-stone-800">{mockData.user.name}</h1>
          </div>
          <button className="relative w-10 h-10 flex items-center justify-center text-stone-500">
            <Bell size={18} strokeWidth={1} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#9A7D4E]" />
          </button>
        </div>

        {/* Search Progress - minimal bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-400 font-light uppercase tracking-wider">Прогресс</span>
            <span className="text-xs text-stone-500 font-light">{mockData.searchProgress.stage} из {mockData.searchProgress.totalStages}</span>
          </div>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-0.5 ${
                  step <= mockData.searchProgress.stage ? 'bg-[#C9A86C]' : 'bg-stone-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-stone-600 font-light">{mockData.searchProgress.label}</p>
        </div>
      </header>

      {/* Shortlist Section */}
      <section className="py-6">
        <div className="flex items-center justify-between px-6 mb-4">
          <h2 className="font-serif text-lg text-stone-800">Ваш шортлист</h2>
          <button
            onClick={() => onNavigate?.('/shortlist')}
            className="flex items-center gap-0.5 text-xs text-stone-400 font-light uppercase tracking-wider"
          >
            Все
            <ChevronRight size={12} strokeWidth={1} />
          </button>
        </div>

        {/* Horizontal Scroll - circular avatars */}
        <div className="flex gap-5 overflow-x-auto px-6 pb-2 scrollbar-hide">
          {mockData.shortlist.map((nanny) => (
            <button
              key={nanny.id}
              onClick={() => onNavigate?.(`/nanny/${nanny.id}`)}
              className="flex-shrink-0 text-center"
            >
              <div className="relative mb-2">
                <img
                  src={nanny.photo}
                  alt={nanny.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                {/* Top badge */}
                {nanny.isTop && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FDFCFB] border border-[#C9A86C] flex items-center justify-center">
                    <span className="text-[8px] text-[#9A7D4E] font-serif">1</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-stone-700">{nanny.name}</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <Star size={8} className="text-[#C9A86C] fill-[#C9A86C]" />
                <span className="text-[10px] text-stone-500 font-light">{nanny.rating}</span>
              </div>
            </button>
          ))}

          {/* Add more - dashed circle */}
          <button className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-full border border-dashed border-stone-300 flex items-center justify-center mb-2">
              <Search size={16} className="text-stone-400" strokeWidth={1} />
            </div>
            <p className="text-xs text-stone-400 font-light">Найти</p>
          </button>
        </div>
      </section>

      {/* Quick Actions - minimal text links */}
      <section className="px-6 py-4 border-y border-stone-200/50">
        <div className="flex items-center justify-between">
          {[
            { icon: Search, label: 'Поиск' },
            { icon: Heart, label: 'Избранное' },
            { icon: MessageCircle, label: 'Чаты', badge: 2 },
            { icon: Calendar, label: 'Встречи' },
          ].map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2 py-2 text-stone-500"
            >
              <div className="relative">
                <action.icon size={20} strokeWidth={1} />
                {action.badge && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-[#9A7D4E] text-[8px] text-white flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-light">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Activity Feed - hairline separated */}
      <section className="px-6 py-6">
        <h2 className="font-serif text-lg text-stone-800 mb-4">Активность</h2>
        <div className="divide-y divide-stone-200/50">
          {mockData.activity.map((item) => (
            <button
              key={item.id}
              className="w-full py-4 flex items-center gap-4 text-left"
            >
              <div className="w-10 h-10 rounded-full border border-stone-200/50 flex items-center justify-center text-stone-400">
                {item.type === 'match' && <Star size={16} strokeWidth={1} />}
                {item.type === 'message' && <MessageCircle size={16} strokeWidth={1} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700">{item.title}</p>
                <p className="text-xs text-stone-400 font-light truncate">{item.subtitle}</p>
              </div>
              <span className="text-xs text-stone-400 font-light">{item.time}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Bottom Navigation - minimal icons */}
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
              className={`flex flex-col items-center gap-1 py-1 ${
                item.active ? 'text-stone-800' : 'text-stone-400'
              }`}
            >
              <item.icon size={20} strokeWidth={item.active ? 1.5 : 1} />
              <span className="text-[9px] font-light">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ParentDashboardMobile;
