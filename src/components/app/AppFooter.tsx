import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HeartHandshake, House, Search, Shield, User } from 'lucide-react';
import { Language, User as AppUser } from '@/core/types';

type AppFooterProps = {
  lang: Language;
  user: AppUser | null;
  isAdmin: boolean;
  onBecomeNanny: () => void;
  onOpenAdmin: () => void;
};

export function AppFooter({
  lang,
  user,
  isAdmin,
  onBecomeNanny,
  onOpenAdmin,
}: AppFooterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const profilePath = user?.role === 'nanny' ? '/nanny-dashboard' : '/family-dashboard';

  const items = [
    {
      key: 'home',
      label: lang === 'ru' ? 'Главная' : 'Home',
      icon: House,
      active:
        pathname === '/' ||
        pathname === '/match-results' ||
        pathname.startsWith('/nanny/'),
      onClick: () => navigate('/'),
    },
    {
      key: 'find',
      label: lang === 'ru' ? 'Поиск' : 'Search',
      icon: Search,
      active: pathname === '/find-nanny',
      onClick: () => navigate('/find-nanny'),
    },
    {
      key: 'nannies',
      label: lang === 'ru' ? 'Няням' : 'Nannies',
      icon: HeartHandshake,
      active: pathname === '/for-nannies' || pathname === '/become-nanny',
      onClick: () => navigate('/for-nannies'),
    },
    {
      key: 'profile',
      label: user ? (lang === 'ru' ? 'Кабинет' : 'Account') : (lang === 'ru' ? 'Вход' : 'Login'),
      icon: User,
      active: pathname === '/login' || pathname.includes('dashboard'),
      onClick: () => navigate(user ? profilePath : '/login'),
    },
  ];

  return (
    <>
      <footer className="fixed inset-x-0 bottom-0 z-30 pb-[calc(var(--sab)+0.65rem)]">
        <div className="page-frame">
          <div className="app-tabbar">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className={`app-tab ${item.active ? 'is-active' : ''}`}
                  aria-current={item.active ? 'page' : undefined}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </footer>

      <div className="page-frame hidden pb-4 pt-1 text-center text-[11px] text-stone-400 md:block">
        <div className="flex items-center justify-center gap-3">
          <button onClick={onBecomeNanny} className="underline hover:text-stone-500">
            {lang === 'ru' ? 'Стать няней' : 'Become a nanny'}
          </button>
          <span className="text-stone-300">·</span>
          <a href="/privacy" className="underline hover:text-stone-500">Политика конфиденциальности</a>
          <span className="text-stone-300">·</span>
          <a href="/oferta" className="underline hover:text-stone-500">Оферта</a>
          {user?.email && isAdmin && (
            <>
              <span className="text-stone-300">·</span>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1 underline hover:text-stone-500"
              >
                <Shield size={12} />
                Admin
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
