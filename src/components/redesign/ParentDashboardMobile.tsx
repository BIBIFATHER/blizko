import React from 'react';
import {
  Bell,
  ChevronRight,
  Clock,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  Sparkles,
  Heart,
  ArrowRight,
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
    },
    {
      id: '2',
      name: 'Елена К.',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=250&fit=crop&crop=face',
      rating: 4.8,
      matchScore: 91,
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
      subtitle: 'Анна Морозова — 96% совпадение',
      time: '2 часа назад',
      icon: Sparkles,
      color: 'emerald',
    },
    {
      id: '2',
      type: 'message',
      title: 'Новое сообщение',
      subtitle: 'Елена ответила на ваш запрос',
      time: '5 часов назад',
      icon: MessageCircle,
      color: 'blue',
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Напоминание',
      subtitle: 'Собеседование завтра в 15:00',
      time: 'Вчера',
      icon: Calendar,
      color: 'amber',
    },
  ],
  stats: {
    viewed: 12,
    saved: 3,
    contacted: 2,
  },
};

export const ParentDashboardMobile: React.FC<ParentDashboardMobileProps> = ({
  onNavigate,
}) => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <header className="bg-gray-900 text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src={mockData.user.avatar}
              alt={mockData.user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
            />
            <div>
              <p className="text-white/60 text-sm">Добрый день,</p>
              <p className="font-bold text-lg">{mockData.user.name}</p>
            </div>
          </div>
          <button className="relative w-11 h-11 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-gray-900" />
          </button>
        </div>

        {/* Search Progress */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/70">Прогресс поиска</span>
            <span className="text-sm font-semibold">{mockData.searchProgress.stage}/{mockData.searchProgress.totalStages}</span>
          </div>
          <div className="flex gap-1.5 mb-3">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-1.5 rounded-full ${
                  step <= mockData.searchProgress.stage ? 'bg-emerald-400' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
          <p className="text-sm font-medium">{mockData.searchProgress.label}</p>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="px-5 -mt-1 mb-6">
        <div className="flex gap-3 overflow-x-auto py-4 -mx-5 px-5 scrollbar-hide">
          {[
            { icon: Search, label: 'Найти', color: 'bg-gray-900' },
            { icon: Heart, label: 'Избранное', color: 'bg-rose-500' },
            { icon: MessageCircle, label: 'Чаты', color: 'bg-blue-500', badge: 2 },
            { icon: Calendar, label: 'Встречи', color: 'bg-amber-500' },
          ].map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2 min-w-[72px]"
            >
              <div className={`relative w-14 h-14 rounded-2xl ${action.color} flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform`}>
                <action.icon size={24} />
                {action.badge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-xs font-bold flex items-center justify-center border-2 border-white">
                    {action.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-600 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shortlist Section */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="text-lg font-bold text-gray-900">Ваш шортлист</h2>
          <button
            onClick={() => onNavigate?.('/shortlist')}
            className="flex items-center gap-1 text-sm font-semibold text-gray-500 active:text-gray-900 transition-colors"
          >
            Все
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Horizontal Scroll Cards */}
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 -mx-1 scrollbar-hide">
          {mockData.shortlist.map((nanny) => (
            <button
              key={nanny.id}
              onClick={() => onNavigate?.(`/nanny/${nanny.id}`)}
              className="relative flex-shrink-0 w-32 active:scale-98 transition-transform"
            >
              <div className="relative h-44 rounded-2xl overflow-hidden mb-2">
                <img
                  src={nanny.photo}
                  alt={nanny.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {nanny.isTop && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-emerald-500 flex items-center gap-1">
                    <Sparkles size={10} className="text-white" />
                    <span className="text-[10px] font-bold text-white">TOP</span>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-white text-xs font-semibold">{nanny.rating}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 text-left">{nanny.name}</p>
              <p className="text-xs text-gray-500 text-left">{nanny.matchScore}% совпадение</p>
            </button>
          ))}

          {/* Add more button */}
          <button className="flex-shrink-0 w-32 h-44 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 active:border-gray-300 active:text-gray-500 transition-colors">
            <Plus size={24} />
            <span className="text-xs font-medium">Найти ещё</span>
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 mb-6">
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-gray-900">{mockData.stats.viewed}</p>
            <p className="text-xs text-gray-500">Просмотрено</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-gray-900">{mockData.stats.saved}</p>
            <p className="text-xs text-gray-500">Сохранено</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-gray-900">{mockData.stats.contacted}</p>
            <p className="text-xs text-gray-500">Связались</p>
          </div>
        </div>
      </section>

      {/* Activity Feed */}
      <section className="px-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Активность</h2>
        <div className="space-y-3">
          {mockData.activity.map((item) => (
            <button
              key={item.id}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 active:bg-gray-50 transition-colors text-left"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                item.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                item.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                'bg-amber-100 text-amber-600'
              }`}>
                <item.icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</p>
                <p className="text-sm text-gray-500 truncate">{item.subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-gray-400">{item.time}</span>
                <ArrowRight size={16} className="text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pb-6 pt-2">
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
                item.active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <item.icon size={24} strokeWidth={item.active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ParentDashboardMobile;
