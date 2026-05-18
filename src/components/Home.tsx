import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, UserRound } from 'lucide-react';
import { Language } from '@/core/types';

interface HomeProps {
  lang: Language;
  onShare?: () => void;
  onOpenAccount?: () => void;
}

const ru = {
  cta: 'Найти няню',
  photoAlt: 'Няня читает книгу ребёнку дома',
  headlineTop: 'Найдите няню,',
  headlineBottom: 'которой доверяют',
};

const en = {
  cta: 'Find a nanny',
  photoAlt: 'A nanny reading a book to a child at home',
  headlineTop: 'Find a nanny',
  headlineBottom: 'you can trust',
};

const heroImage =
  'https://images.unsplash.com/photo-1713942590283-59867d5e3f8d?auto=format&fit=crop&w=900&q=84';

export const Home: React.FC<HomeProps> = ({ lang, onShare, onOpenAccount }) => {
  const navigate = useNavigate();
  const copy = lang === 'ru' ? ru : en;

  const startRequest = (starterPrompt?: string) => {
    navigate('/find-nanny', { state: starterPrompt ? { starterPrompt } : undefined });
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[30rem] flex-col overflow-hidden bg-[#F9F6F2] text-[#1C2B2D] sm:max-w-[34rem] sm:rounded-[2.4rem] sm:shadow-[0_24px_70px_rgba(28,43,45,0.12)]">

      {/* Hero — full-bleed фото с кнопками поверх */}
      <div className="relative h-[28rem] flex-shrink-0 sm:h-[32rem]">
        <img
          src={heroImage}
          alt={copy.photoAlt}
          className="absolute inset-0 h-full w-full object-cover object-[50%_32%]"
          loading="eager"
        />
        {/* Плавный переход фото в фон */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F9F6F2] to-transparent" />

        {/* Кнопки поверх фото */}
        <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-5">
          <button
            type="button"
            onClick={onShare}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2A6B6E] shadow-[0_4px_18px_rgba(28,43,45,0.14)] backdrop-blur-md transition hover:bg-white active:scale-[0.96]"
            aria-label={lang === 'ru' ? 'Поделиться приложением' : 'Share app'}
          >
            <Share2 size={17} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={onOpenAccount}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#1C2B2D] shadow-[0_4px_18px_rgba(28,43,45,0.14)] backdrop-blur-md transition hover:bg-white active:scale-[0.96]"
            aria-label={lang === 'ru' ? 'Войти в кабинет' : 'Open account'}
          >
            <UserRound size={18} strokeWidth={1.9} />
          </button>
        </div>
      </div>

      {/* Текст + CTA */}
      <div className="flex flex-1 flex-col justify-end px-5 pb-7 pt-1">
        <h1 className="flex flex-col">
          <span
            className="animate-fade-up font-display text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.022em] text-[#1C2B2D] sm:text-[2.75rem]"
            style={{ animationDelay: '0ms' }}
          >
            {copy.headlineTop}
          </span>
          <span
            className="animate-fade-up font-display text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.022em] text-[#1C2B2D] sm:text-[2.75rem]"
            style={{ animationDelay: '80ms' }}
          >
            {copy.headlineBottom}
          </span>
        </h1>
        <button
          type="button"
          onClick={() => startRequest()}
          className="animate-fade-up mt-7 flex min-h-[4rem] w-full items-center justify-center rounded-full bg-[#2A6B6E] px-6 text-[1.0625rem] font-semibold tracking-[0.01em] text-white shadow-[0_16px_40px_rgba(42,107,110,0.26)] transition-all duration-200 hover:bg-[#235B5E] active:scale-[0.97] active:shadow-[0_6px_16px_rgba(42,107,110,0.16)]"
          style={{ animationDelay: '160ms' }}
        >
          {copy.cta}
        </button>
      </div>
    </div>
  );
};
