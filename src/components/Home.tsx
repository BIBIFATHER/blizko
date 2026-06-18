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
  cta: 'Начать подбор',
  photoAlt: 'Няня читает книгу ребёнку дома',
  headlineTop: 'Найдите няню,',
  headlineBottom: 'которой доверяют',
};

const en = {
  cta: 'Start matching',
  photoAlt: 'A nanny reading a book to a child at home',
  headlineTop: 'Find a nanny',
  headlineBottom: 'you can trust',
};

// Self-hosted (BLI-122): no visitor IP egress to Unsplash.
const heroImage = '/assets/hero-care.jpg';

export const Home: React.FC<HomeProps> = ({ lang, onShare, onOpenAccount }) => {
  const navigate = useNavigate();
  const copy = lang === 'ru' ? ru : en;

  const startRequest = () => {
    navigate('/find-nanny');
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col overflow-hidden bg-[#F9F6F2] text-[#1C2B2D] sm:max-w-[34rem] sm:rounded-[2.4rem] sm:shadow-[0_24px_70px_rgba(28,43,45,0.12)] lg:max-w-[40rem]">
      {/* Hero — full-bleed фото, растёт и заполняет высоту экрана (без пустого провала) */}
      <div className="relative min-h-[24rem] flex-1 sm:min-h-[28rem]">
        <img
          src={heroImage}
          alt={copy.photoAlt}
          className="absolute inset-0 h-full w-full object-cover object-[50%_32%]"
          loading="eager"
        />
        {/* Плавный переход фото в фон */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F9F6F2] to-transparent" />

        {/* Кнопки поверх фото */}
        <div className="absolute left-0 right-0 top-0 flex items-start justify-between px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
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

      {/* Текст + CTA — естественная высота, сразу под фото */}
      <div className="flex flex-shrink-0 flex-col px-5 pb-7 pt-1 sm:px-7 lg:px-9">
        <h1 className="flex flex-col">
          <span
            className="animate-fade-up font-display text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.022em] text-[#1C2B2D] sm:text-[2.75rem] lg:text-[3.1rem]"
            style={{ animationDelay: '0ms' }}
          >
            {copy.headlineTop}
          </span>
          <span
            className="animate-fade-up font-display text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.022em] text-[#1C2B2D] sm:text-[2.75rem] lg:text-[3.1rem]"
            style={{ animationDelay: '80ms' }}
          >
            {copy.headlineBottom}
          </span>
        </h1>

        <button
          type="button"
          onClick={() => startRequest()}
          className="animate-fade-up mt-5 flex min-h-[4rem] w-full items-center justify-center rounded-full bg-[#2A6B6E] px-6 text-[1.0625rem] font-semibold tracking-[0.01em] text-white shadow-[0_16px_40px_rgba(42,107,110,0.26)] transition-all duration-200 hover:bg-[#235B5E] active:scale-[0.97] active:shadow-[0_6px_16px_rgba(42,107,110,0.16)]"
          style={{ animationDelay: '280ms' }}
        >
          {copy.cta}
        </button>
      </div>
    </div>
  );
};
