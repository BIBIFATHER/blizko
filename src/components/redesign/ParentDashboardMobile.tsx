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
      {/* Header - warm off-white, no dark overlay */}
      <header className="bg-[#F7F5F2] px-4 pt-12 pb-5 border-b border-stone-200/30">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <img
              src={mockData.user.avatar}
              alt={mockData.user.name}
              className="w-11 h-11 rounded-full object-cover border-[0.5px] border-stone-200/50"
            />
            <div>
              <p className="text-stone-500 text-xs font-light">Добрый день,</p>
              <p className="font-serif text-lg font-normal tracking-tight text-stone-700">{mockData.user.name}</p>
            </div>
          </div>
          <button className="relative w-9 h-9 rounded-full bg-[#FDFCFB] flex items-center justify-center active:bg-stone-200 transition-colors border-[0.5px] border-stone-200/50">
            <Bell size={16} className="text-stone-500" strokeWidth={1} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#C17F5E]" />
          </button>
        </div>

        {/* Search Progress - bento style card */}
        <div className="bg-[#FDFCFB] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-stone-500 font-light uppercase tracking-wider">Прогресс поиска</span>
            <span className="text-xs text-stone-600 font-light">{mockData.searchProgress.stage}/{mockData.searchProgress.totalStages}</span>
          </div>
          <div className="flex gap-1.5 mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-1 rounded-full ${
                  step <= mockData.searchProgress.stage ? 'bg-[#C9A86C]' : 'bg-stone-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-stone-600 font-light">{mockData.searchProgress.label}</p>
        </div>
      </header>

      {/* Quick Actions - minimal line-art icons */}
      <div className="px-4 py-5">
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Search, label: 'Поиск' },
            { icon: Heart, label: 'Шортлист' },
            { icon: MessageCircle, label: 'Чаты', badge: 2 },
            { icon: Calendar, label: 'Встречи' },
          ].map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2 py-3 px-2 bg-[#F7F5F2] rounded-2xl border-[0.5px] border-stone-200/50 active:bg-[#F0EDE8] transition-colors"
            >
              <div className="relative">
                <action.icon size={18} strokeWidth={1} className="text-stone-500" />
                {action.badge && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-[#C17F5E] text-[8px] font-medium text-white flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-stone-600 font-light">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shortlist Section */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-serif text-lg font-normal tracking-tight text-stone-700">Ваш шортлист</h2>
          <button
            onClick={() => onNavigate?.('/shortlist')}
            className="flex items-center gap-0.5 text-[10px] font-light text-stone-500 uppercase tracking-wider active:text-stone-700 transition-colors"
          >
            Все
            <ChevronRight size={12} strokeWidth={1} />
          </button>
        </div>

        {/* Horizontal Scroll Cards - premium surfaces */}
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {mockData.shortlist.map((nanny) => (
            <button
              key={nanny.id}
              onClick={() => onNavigate?.(`/nanny/${nanny.id}`)}
              className="relative flex-shrink-0 w-32 active:scale-98 transition-transform"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-2 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
                <img
                  src={nanny.photo}
                  alt={nanny.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2C2C2C]/40 via-transparent to-transparent" />
                
                {/* Status badge - muted pastel */}
                {nanny.status && (
                  <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[8px] font-light ${
                    nanny.status === 'new' 
                      ? 'bg-[#D4DDD0] text-[#5A6B52]' 
                      : 'bg-[#E8DDD0] text-[#8B7355]'
                  }`}>
                    {nanny.status === 'new' ? 'Новая' : 'Ожидает'}
                  </div>
                )}

                {/* Top badge - gold circle with number */}
                {nanny.isTop && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full border border-[#C9A86C] bg-[#FDFCFB]/80 flex items-center justify-center">
                    <span className="text-[8px] text-[#9A7D4E]">1</span>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center gap-1">
                    <Star size={10} className="text-[#C9A86C] fill-[#C9A86C]" />
                    <span className="text-white text-[10px] font-light">{nanny.rating}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-stone-700 text-left font-normal">{nanny.name}</p>
              <p className="text-[10px] text-stone-500 text-left font-light">{nanny.matchScore}%</p>
            </button>
          ))}

          {/* Add more button */}
          <button className="flex-shrink-0 w-32 aspect-[3/4] rounded-2xl border border-dashed border-stone-300/50 flex flex-col items-center justify-center gap-2 text-stone-400 active:border-stone-400 active:text-stone-500 transition-colors">
            <Plus size={18} strokeWidth={1} />
            <span className="text-[10px] font-light">Найти ещё</span>
          </button>
        </div>
      </section>

      {/* Activity Feed */}
      <section className="px-4">
        <h2 className="font-serif text-lg font-normal tracking-tight text-stone-700 mb-3">Активность</h2>
        <div className="space-y-2">
          {mockData.activity.map((item, i) => (
            <button
              key={item.id}
              className={`w-full rounded-2xl p-3 flex items-center gap-3 active:bg-[#F0EDE8] transition-colors text-left border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)] ${
                i % 2 === 0 ? 'bg-[#F7F5F2]' : 'bg-[#FDFCFB]'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-[#FDFCFB] flex items-center justify-center text-stone-400 border-[0.5px] border-stone-200/50">
                {item.type === 'match' && <Star size={14} strokeWidth={1} />}
                {item.type === 'message' && <MessageCircle size={14} strokeWidth={1} />}
                {item.type === 'reminder' && <Calendar size={14} strokeWidth={1} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-700 font-normal mb-0.5">{item.title}</p>
                <p className="text-[10px] text-stone-500 font-light truncate">{item.subtitle}</p>
              </div>
              <span className="text-[10px] text-stone-400 font-light shrink-0">{item.time}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Bottom Navigation - clean, minimal */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#FDFCFB] border-t border-stone-200/30 px-4 pb-5 pt-2">
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
              className={`flex flex-col items-center gap-1 py-1.5 px-3 ${
                item.active ? 'text-stone-700' : 'text-stone-400'
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
