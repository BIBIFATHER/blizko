import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User as UserIcon, Share2 } from 'lucide-react';
import { Language, User } from '../../types';
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
    <div className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 top-safe ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-4'}`}>
      <div className="max-w-(--breakpoint-lg) mx-auto px-4 md:px-8 flex items-center justify-between">
        <div
          className={`font-semibold text-stone-900 logo-serif text-xl transition-opacity duration-300 cursor-pointer ${isScrolled && location.pathname === '/' ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => { if (location.pathname !== '/') navigate('/'); }}
        >
          Blizko
        </div>

        <div className="flex items-center gap-2 pr-safe">
          <button
            type="button"
            onClick={onShare}
            className="bg-white/80 backdrop-blur-md border border-stone-200 text-stone-600 p-2.5 rounded-full hover:bg-white transition-all shadow-sm active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={t[lang].share}
            aria-label={t[lang].share}
          >
            <Share2 size={16} />
          </button>

          <button
            type="button"
            onClick={onToggleLanguage}
            className="bg-white/80 backdrop-blur-md border border-stone-200 text-stone-600 px-3.5 py-2 rounded-full text-sm font-semibold hover:bg-white transition-all shadow-sm active:scale-95 min-h-[44px] flex items-center"
            aria-label={lang === 'ru' ? 'Переключить язык на английский' : 'Switch language to Russian'}
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>

          {!user ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="bg-stone-800 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-stone-700 transition-all shadow-sm active:scale-95 min-h-[44px] flex items-center"
            >
              {t[lang].login}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-stone-500 bg-white/80 backdrop-blur-md border border-stone-200 rounded-full px-2.5 py-1" title={user.email || user.name}>
                {lang === 'ru' ? 'Вы вошли как' : 'Signed in as'} {user.email || user.name}
              </span>
              <button
                type="button"
                onClick={onOpenProfile}
                className="bg-white/80 backdrop-blur-md border border-stone-200 px-3 py-2 rounded-full text-stone-600 hover:bg-white hover:text-amber-600 transition-all shadow-sm flex items-center gap-1.5 min-h-[44px]"
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
  );
}
