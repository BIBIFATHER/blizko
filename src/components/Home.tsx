import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Share2, UserRound } from 'lucide-react';
import { Language } from '@/core/types';

interface HomeProps {
  lang: Language;
  onShare?: () => void;
  onOpenAccount?: () => void;
}

const ru = {
  cta: 'Начать',
  photoAlt: 'Няня читает книгу ребёнку дома',
  line1: 'Поиск',
  line2: 'вашей няни',
  line3: 'начинается тут',
};

const en = {
  cta: 'Start',
  photoAlt: 'A nanny reading a book to a child at home',
  line1: 'Your',
  line2: 'nanny search',
  line3: 'starts here',
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
    <div className="mx-auto flex min-h-full w-full max-w-[30rem] flex-col bg-[#F9F6F2] px-5 pb-5 pt-5 text-[#1C2B2D] sm:max-w-[34rem] sm:rounded-[2.4rem] sm:shadow-[0_24px_70px_rgba(28,43,45,0.12)]">
      <section className="relative flex min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden">
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between">
          <button
            type="button"
            onClick={onShare}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2A6B6E] text-white shadow-[0_12px_28px_rgba(42,107,110,0.18)] transition hover:bg-[#235B5E] active:scale-[0.97]"
            aria-label={lang === 'ru' ? 'Поделиться приложением' : 'Share app'}
          >
            <Share2 size={19} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onOpenAccount}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1C2B2D]/10 bg-[#EFF3F2] text-[#1C2B2D] shadow-[0_10px_24px_rgba(28,43,45,0.08)] transition hover:bg-white active:scale-[0.97]"
            aria-label={lang === 'ru' ? 'Войти в кабинет' : 'Open account'}
          >
            <UserRound size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center pt-2">
          <div className="absolute inset-x-[-26%] top-[8%] h-[68%] rounded-full bg-[#EFF3F2]" />
          <div className="absolute left-3 top-[18%] h-16 w-16 rounded-full bg-[#7FA99B]/45" />
          <div className="absolute right-0 top-[10%] h-9 w-9 rounded-full bg-[#C4744A]" />
          <div className="absolute bottom-[22%] right-8 h-14 w-14 rounded-full bg-[#D4E2DE]" />
          <img
            src={heroImage}
            alt={copy.photoAlt}
            className="relative z-10 h-[22.5rem] w-full max-w-[22rem] rounded-[11rem_11rem_2.2rem_2.2rem] border-[6px] border-white object-cover object-[50%_42%] shadow-[0_28px_60px_rgba(28,43,45,0.18)] sm:h-[25.5rem] sm:max-w-[24rem]"
            loading="eager"
          />
        </div>

        <div className="relative z-10 pb-1">
          <h1 className="flex flex-col">
            <span
              className="animate-fade-up font-display text-[1.5rem] font-normal leading-tight tracking-[-0.01em] text-[#1C2B2D]/50"
              style={{ animationDelay: '0ms' }}
            >
              {copy.line1}
            </span>
            <span
              className="animate-fade-up font-display text-[3.6rem] font-semibold leading-[0.95] tracking-[-0.025em] text-[#1C2B2D] sm:text-[4.2rem]"
              style={{ animationDelay: '80ms' }}
            >
              {copy.line2}
            </span>
            <span
              className="animate-fade-up font-display text-[1.5rem] font-normal leading-tight tracking-[-0.01em] text-[#1C2B2D]/50"
              style={{ animationDelay: '160ms' }}
            >
              {copy.line3}
            </span>
          </h1>
          <button
            type="button"
            onClick={() => startRequest()}
            className="animate-fade-up mt-6 flex min-h-[4.25rem] w-full items-center justify-between rounded-full bg-[#2A6B6E] py-2 pl-6 pr-2 text-lg font-semibold text-white shadow-[0_20px_48px_rgba(42,107,110,0.22)] transition-all duration-200 hover:bg-[#235B5E] active:scale-[0.96] active:shadow-[0_6px_18px_rgba(42,107,110,0.14)]"
            style={{ animationDelay: '280ms' }}
          >
            <span>{copy.cta}</span>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#2A6B6E]">
              <ArrowRight size={24} strokeWidth={1.9} />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};
