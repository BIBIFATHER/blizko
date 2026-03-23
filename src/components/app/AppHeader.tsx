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
          className={`font-semibold text-stone-900 logo-serif text-[1.4rem] leading-none transition-opacity duration-300 cursor-pointer ${isScrolled && location.pathname === '/' ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => { if (location.pathname !== '/') navigate('/'); }}
        >
          Blizko
        </div>

        <div className="flex items-center gap-2 pr-safe">
          <button
            type="button"
            onClick={onShare}
            className="bg-white/86 border border-stone-200/80 text-stone-600 p-2.5 rounded-full hover:bg-white transition-all shadow-sm active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={t[lang].share}
            aria-label={t[lang].share}
          >
            <Share2 size={16} />
          </button>

          <button
            type="button"
            onClick={onToggleLanguage}
            className="bg-white/86 border border-stone-200/80 text-stone-600 px-3.5 py-2 rounded-full text-sm font-semibold hover:bg-white transition-all shadow-sm active:scale-95 min-h-[44px] flex items-center"
            aria-label={lang === 'ru' ? 'Переключить язык на английский' : 'Switch language to Russian'}
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>

          {!user ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="bg-stone-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-stone-800 transition-all shadow-sm active:scale-95 min-h-[44px] flex items-center"
            >
              {t[lang].login}
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
