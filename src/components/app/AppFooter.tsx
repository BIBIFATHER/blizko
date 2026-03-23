import React from 'react';
import { Language, User } from '@/core/types';

type AppFooterProps = {
  lang: Language;
  user: User | null;
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
  return (
    <footer className="py-6 text-center text-stone-400 text-xs">
      <div className="max-w-md mx-auto relative">
        <div className="text-[10px] leading-snug text-stone-400">
          <div className="flex items-center justify-center gap-3">
            <button onClick={onBecomeNanny} className="underline hover:text-stone-500">
              {lang === 'ru' ? 'Стать няней' : 'Become a nanny'}
            </button>
            <span className="text-stone-300">·</span>
            <a href="/privacy" className="underline hover:text-stone-500">Политика конфиденциальности</a>
            <span className="text-stone-300">·</span>
            <a href="/offer.html" className="underline hover:text-stone-500">Оферта</a>
          </div>
        </div>
        {user?.email && isAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="mt-2 opacity-30 hover:opacity-100 transition-opacity"
          >
            Admin
          </button>
        )}
      </div>
    </footer>
  );
}
