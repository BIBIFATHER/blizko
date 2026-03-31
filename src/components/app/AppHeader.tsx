import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, User as UserIcon, Share2 } from 'lucide-react';
import { Language, User } from '@/core/types';
import { t } from '@/core/i18n/translations';

type AppHeaderProps = {
  lang: Language;
  user: User | null;
  isScrolled: boolean;
  onToggleLanguage: () => void;
  onShare: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
};

export function AppHeader({
  lang,
  user,
  isScrolled,
  onToggleLanguage,
  onShare,
  onOpenAuth,
  onOpenProfile,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const isRoot = pathname === '/';
  const screenTitle = (() => {
    if (pathname === '/') return 'Blizko';
    if (pathname === '/find-nanny') return lang === 'ru' ? 'Запрос семьи' : 'Family request';
    if (pathname === '/match-results') return lang === 'ru' ? 'Ваш shortlist' : 'Your shortlist';
    if (pathname.startsWith('/nanny/')) return lang === 'ru' ? 'Профиль няни' : 'Nanny profile';
    if (pathname === '/become-nanny') return lang === 'ru' ? 'Анкета няни' : 'Nanny profile form';
    if (pathname === '/for-nannies') return lang === 'ru' ? 'Для нянь' : 'For nannies';
    if (pathname.includes('dashboard')) return lang === 'ru' ? 'Кабинет' : 'Dashboard';
    if (pathname === '/admin') return 'Admin';
    return 'Blizko';
  })();
  const screenHint = (() => {
    if (pathname === '/') return lang === 'ru' ? 'Подбор рядом' : 'Matching nearby';
    if (pathname === '/match-results') return lang === 'ru' ? 'Подобранные профили' : 'Curated profiles';
    if (pathname.startsWith('/nanny/')) return lang === 'ru' ? 'Проверка и контекст' : 'Trust and context';
    if (pathname === '/find-nanny') return lang === 'ru' ? 'Заполняем шаг за шагом' : 'Step by step';
    return lang === 'ru' ? 'Спокойный выбор' : 'Calm decision';
  })();

  return (
    <div className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 top-safe ${isScrolled ? 'py-2.5' : 'py-3.5'}`}>
      <div className="page-frame">
        <div className={`floating-bar app-topbar flex items-center justify-between rounded-[26px] px-3 py-2.5 md:px-5 ${isScrolled ? 'translate-y-0 opacity-100' : 'bg-white/62'}`}>
        <div className="flex min-w-0 items-center gap-2">
          {isRoot ? (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/82 text-stone-500 shadow-sm"
              aria-label="Blizko home"
            >
              <span className="logo-serif text-[1.15rem] leading-none text-stone-900">B</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/82 text-stone-500 shadow-sm transition-colors hover:text-stone-800"
              aria-label={lang === 'ru' ? 'Назад' : 'Back'}
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div className="min-w-0">
            {!isRoot && (
              <div className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone-400">
                {screenHint}
              </div>
            )}
            <div
              className={`truncate leading-none text-stone-950 transition-all duration-300 ${isRoot ? 'logo-serif text-[1.2rem] sm:text-[1.35rem]' : 'text-[0.98rem] font-semibold'}`}
            >
              {screenTitle}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 pr-safe">
          <button
            type="button"
            onClick={onShare}
            className="hidden items-center justify-center rounded-full border border-stone-200/80 bg-white/86 p-2 text-stone-600 shadow-sm transition-all hover:bg-white active:scale-95 min-[401px]:flex min-[401px]:min-h-[40px] min-[401px]:min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] sm:p-2.5"
            title={t[lang].share}
            aria-label={t[lang].share}
          >
            <Share2 size={16} />
          </button>

          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex min-h-[40px] items-center rounded-full border border-stone-200/80 bg-white/86 px-3 py-2 text-xs font-semibold text-stone-600 shadow-sm transition-all hover:bg-white active:scale-95 sm:min-h-[44px] sm:px-3.5 sm:text-sm"
            aria-label={lang === 'ru' ? 'Переключить язык на английский' : 'Switch language to Russian'}
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>

          {!user ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-stone-900 px-2.5 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-stone-800 active:scale-95 sm:min-h-[44px] sm:min-w-0 sm:px-5 sm:text-sm"
              aria-label={t[lang].login}
            >
              <UserIcon size={15} className="sm:hidden" />
              <span className="hidden sm:inline">{t[lang].login}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline text-[11px] text-stone-500 bg-white/86 border border-stone-200 rounded-full px-2.5 py-1" title={user.email || user.name}>
                {lang === 'ru' ? 'Вы вошли как' : 'Signed in as'} {user.email || user.name}
              </span>
              <button
                type="button"
                onClick={onOpenProfile}
                className="bg-white/86 border border-stone-200/80 px-3 py-2 rounded-full text-stone-600 hover:bg-white hover:text-amber-700 transition-all shadow-sm flex items-center gap-1.5 min-h-[44px]"
                title={user.email || user.name}
              >
                <UserIcon size={16} />
                <span className="text-xs font-medium max-w-[110px] truncate">{user.name || 'Профиль'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
