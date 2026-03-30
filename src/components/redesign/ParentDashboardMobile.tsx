import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  HelpCircle,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Users,
  Sparkles,
  Heart,
  CheckCircle2,
  ArrowRight,
  FileText,
  Phone,
  Home,
  User,
} from 'lucide-react';

interface ParentDashboardMobileProps {
  onNavigate?: (path: string) => void;
}

const mockData = {
  user: {
    name: 'Мария',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  },
  searchStatus: {
    active: true,
    stage: 'matching', // 'submitted' | 'reviewing' | 'matching' | 'interviewing'
    progress: 65,
    message: 'Подбираем лучших кандидатов',
  },
  shortlist: [
    {
      id: '1',
      name: 'Анна Морозова',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
      rating: 4.9,
      matchScore: 96,
      status: 'new',
      verified: true,
    },
    {
      id: '2',
      name: 'Елена Козлова',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
      rating: 4.8,
      matchScore: 91,
      status: 'contacted',
      verified: true,
    },
    {
      id: '3',
      name: 'Мария Петрова',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
      rating: 4.7,
      matchScore: 87,
      status: 'new',
      verified: true,
    },
  ],
  upcomingMeetings: [
    {
      id: '1',
      nanny: 'Анна Морозова',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
      date: 'Сегодня, 15:00',
      type: 'Видеозвонок',
    },
  ],
  activity: [
    {
      id: '1',
      type: 'match',
      message: 'Новый кандидат добавлен в шортлист',
      time: '2 часа назад',
    },
    {
      id: '2',
      type: 'message',
      message: 'Анна ответила на ваше сообщение',
      time: '5 часов назад',
    },
    {
      id: '3',
      type: 'verification',
      message: 'Проверка документов Елены завершена',
      time: 'Вчера',
    },
  ],
};

const stageLabels: Record<string, { label: string; description: string }> = {
  submitted: { label: 'Заявка принята', description: 'Изучаем ваши требования' },
  reviewing: { label: 'Анализ', description: 'Подбираем подходящих нянь' },
  matching: { label: 'Подбор', description: 'Подбираем лучших кандидатов' },
  interviewing: { label: 'Собеседования', description: 'Организуем встречи' },
};

export const ParentDashboardMobile: React.FC<ParentDashboardMobileProps> = ({
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'messages' | 'profile'>('home');
  const data = mockData;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7] pb-20">
      {/* Header */}
      <header className="bg-gradient-to-b from-[#2D4A3E] to-[#3D5A4E] px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
              <img
                src={data.user.avatar}
                alt={data.user.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm text-white/70">{getGreeting()},</p>
              <p className="text-lg font-semibold text-white">{data.user.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Search Status Card */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Search size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {stageLabels[data.searchStatus.stage]?.label || 'Поиск активен'}
                </p>
                <p className="text-xs text-[#8B8680]">
                  {stageLabels[data.searchStatus.stage]?.description}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#D4D2CF]" />
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-[#8B8680] mb-1.5">
              <span>Прогресс</span>
              <span>{data.searchStatus.progress}%</span>
            </div>
            <div className="h-2 bg-[#F0EFED] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                style={{ width: `${data.searchStatus.progress}%` }}
              />
            </div>
          </div>

          {/* Stage indicators */}
          <div className="flex justify-between">
            {['submitted', 'reviewing', 'matching', 'interviewing'].map((stage, i) => {
              const isActive = ['submitted', 'reviewing', 'matching'].indexOf(data.searchStatus.stage) >= i;
              const isCurrent = data.searchStatus.stage === stage;
              return (
                <div key={stage} className="flex flex-col items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-emerald-500' : 'bg-[#F0EFED]'
                  } ${isCurrent ? 'ring-2 ring-emerald-200' : ''}`}>
                    {isActive ? (
                      <CheckCircle2 size={14} className="text-white" />
                    ) : (
                      <span className="text-xs text-[#8B8680]">{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-[10px] ${isActive ? 'text-[#1A1A1A] font-medium' : 'text-[#8B8680]'}`}>
                    {stage === 'submitted' && 'Заявка'}
                    {stage === 'reviewing' && 'Анализ'}
                    {stage === 'matching' && 'Подбор'}
                    {stage === 'interviewing' && 'Встречи'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-5 space-y-6">
        {/* Shortlist Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1A1A1A]">Ваш шортлист</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                {data.shortlist.length}
              </span>
            </div>
            <button
              onClick={() => onNavigate?.('/shortlist')}
              className="text-sm font-medium text-[#2D4A3E] flex items-center gap-1"
            >
              Все <ArrowRight size={14} />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {data.shortlist.map((nanny, index) => (
              <div
                key={nanny.id}
                onClick={() => onNavigate?.(`/nanny/${nanny.id}`)}
                className={`flex-shrink-0 w-36 rounded-2xl p-3 cursor-pointer transition-transform active:scale-95 ${
                  index === 0 
                    ? 'bg-gradient-to-b from-emerald-50 to-white border-2 border-emerald-200' 
                    : 'bg-white border border-[#E8E6E3]'
                }`}
              >
                {index === 0 && (
                  <div className="flex items-center gap-1 mb-2">
                    <Sparkles size={12} className="text-amber-500" />
                    <span className="text-[10px] font-semibold text-amber-600">Топ совпадение</span>
                  </div>
                )}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden mx-auto mb-2">
                  <img
                    src={nanny.photo}
                    alt={nanny.name}
                    className="w-full h-full object-cover"
                  />
                  {nanny.verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                      <ShieldCheck size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#1A1A1A] text-center truncate">
                  {nanny.name.split(' ')[0]}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    <Star size={10} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs text-[#6B6660]">{nanny.rating}</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">{nanny.matchScore}%</span>
                </div>
                {nanny.status === 'new' && (
                  <div className="mt-2 py-1 px-2 rounded-lg bg-blue-50 text-center">
                    <span className="text-[10px] font-medium text-blue-600">Новая</span>
                  </div>
                )}
                {nanny.status === 'contacted' && (
                  <div className="mt-2 py-1 px-2 rounded-lg bg-amber-50 text-center">
                    <span className="text-[10px] font-medium text-amber-600">На связи</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Upcoming Meetings */}
        {data.upcomingMeetings.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">Ближайшие встречи</h2>
            {data.upcomingMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white rounded-2xl p-4 border border-[#E8E6E3] flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden">
                  <img
                    src={meeting.photo}
                    alt={meeting.nanny}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{meeting.nanny}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-[#8B8680]">
                      <Calendar size={12} />
                      {meeting.date}
                    </span>
                    <span className="text-xs text-[#8B8680]">|</span>
                    <span className="text-xs text-[#8B8680]">{meeting.type}</span>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-xl bg-[#2D4A3E] flex items-center justify-center text-white">
                  <Phone size={18} />
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">Быстрые действия</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate?.('/shortlist')}
              className="bg-white rounded-2xl p-4 border border-[#E8E6E3] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                <Users size={18} className="text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Шортлист</p>
              <p className="text-xs text-[#8B8680]">{data.shortlist.length} кандидатов</p>
            </button>
            <button
              onClick={() => onNavigate?.('/find-nanny')}
              className="bg-white rounded-2xl p-4 border border-[#E8E6E3] text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                <Plus size={18} className="text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Новый запрос</p>
              <p className="text-xs text-[#8B8680]">Начать подбор</p>
            </button>
            <button className="bg-white rounded-2xl p-4 border border-[#E8E6E3] text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                <FileText size={18} className="text-amber-600" />
              </div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Документы</p>
              <p className="text-xs text-[#8B8680]">Договоры и акты</p>
            </button>
            <button className="bg-white rounded-2xl p-4 border border-[#E8E6E3] text-left">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mb-3">
                <HelpCircle size={18} className="text-rose-600" />
              </div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Поддержка</p>
              <p className="text-xs text-[#8B8680]">Помощь 24/7</p>
            </button>
          </div>
        </section>

        {/* Activity Feed */}
        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">Активность</h2>
          <div className="bg-white rounded-2xl border border-[#E8E6E3] divide-y divide-[#F0EFED]">
            {data.activity.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  item.type === 'match' ? 'bg-emerald-100' :
                  item.type === 'message' ? 'bg-blue-100' :
                  'bg-amber-100'
                }`}>
                  {item.type === 'match' && <Sparkles size={14} className="text-emerald-600" />}
                  {item.type === 'message' && <MessageCircle size={14} className="text-blue-600" />}
                  {item.type === 'verification' && <ShieldCheck size={14} className="text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A1A1A] truncate">{item.message}</p>
                  <p className="text-xs text-[#8B8680]">{item.time}</p>
                </div>
                <ChevronRight size={16} className="text-[#D4D2CF]" />
              </div>
            ))}
          </div>
        </section>

        {/* Support Banner */}
        <section className="bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] rounded-2xl p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Heart size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Мы рядом на каждом этапе</p>
              <p className="text-xs opacity-80 leading-relaxed">
                Если что-то пойдёт не так — наша поддержка всегда готова помочь. Напишите нам в любое время.
              </p>
              <button className="mt-3 px-4 py-2 rounded-lg bg-white text-[#2D4A3E] text-sm font-medium">
                Написать в поддержку
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F0EFED] px-6 py-2 pb-6">
        <div className="flex justify-around">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'search', icon: Search, label: 'Поиск' },
            { id: 'messages', icon: MessageCircle, label: 'Сообщения' },
            { id: 'profile', icon: User, label: 'Профиль' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex flex-col items-center gap-1 py-1 ${
                activeTab === tab.id ? 'text-[#2D4A3E]' : 'text-[#8B8680]'
              }`}
            >
              <tab.icon size={22} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ParentDashboardMobile;
