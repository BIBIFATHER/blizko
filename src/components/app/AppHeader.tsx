import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User as UserIcon, Share2 } from 'lucide-react';
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

  return (
    <div className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 top-safe ${isScrolled ? 'py-3' : 'py-4'}`}>
      <div className="page-frame">
        <div className={`floating-bar flex items-center justify-between rounded-[26px] px-4 py-3 md:px-5 ${isScrolled ? 'translate-y-0 opacity-100' : 'bg-white/62'}`}>
        <div
          className={`shrink-0 font-semibold text-stone-900 logo-serif text-[1.4rem] leading-none transition-[opacity,width,min-width] duration-300 ${isScrolled && location.pathname === '/' ? 'min-w-[5.5rem] cursor-pointer opacity-100' : 'w-0 min-w-0 overflow-hidden pointer-events-none opacity-0'}`}
          onClick={() => { if (location.pathname !== '/') navigate('/'); }}
        >
          Blizko
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
