import React, { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from './UI';
import { ShieldCheck, Heart, Users, X, ChevronRight, Sparkles, Star, Clock, ArrowRight, BadgeCheck } from 'lucide-react';
import { Language } from '@/core/types';
import { t } from '@/core/i18n/translations';
import type { ModalMode } from './CompatibilityModal';

const CompatibilityModal = lazy(() =>
  import('./CompatibilityModal').then((module) => ({ default: module.CompatibilityModal }))
);

interface HomeProps {
  lang: Language;
}

export const Home: React.FC<HomeProps> = ({ lang }) => {
  const navigate = useNavigate();
  const onFindNanny = () => navigate('/find-nanny');
  const onBecomeNanny = () => navigate('/become-nanny');
  const text = t[lang];
  const [activeTrust, setActiveTrust] = useState<null | { title: string; desc: string; detail: string; icon: React.ReactNode; colorClass: string; bgClass: string }>(null);
  const [deepDiveMode, setDeepDiveMode] = useState<ModalMode | null>(null);

  const trustBlocks = [
    {
      id: 'trust1',
      title: text.trust1Title,
      desc: text.trust1Desc,
      detail: text.trust1Detail,
      icon: <ShieldCheck size={22} />,
      colorClass: 'bg-green-100 text-green-700',
      bgClass: 'bg-green-50'
    },
    {
      id: 'trust2',
      title: text.trust2Title,
      desc: text.trust2Desc,
      detail: text.trust2Detail,
      icon: <Users size={22} />,
      colorClass: 'bg-sky-100 text-sky-700',
      bgClass: 'bg-sky-50'
    },
    {
      id: 'trust3',
      title: text.trust3Title,
      desc: text.trust3Desc,
      detail: text.trust3Detail,
      icon: <Heart size={22} />,
      colorClass: 'bg-amber-100 text-amber-700',
      bgClass: 'bg-amber-50'
    }
  ];

  const handleBlockClick = (block: typeof trustBlocks[0]) => {
    if (block.id === 'trust2') {
      setDeepDiveMode('compatibility');
    } else if (block.id === 'trust1') {
      setDeepDiveMode('verification');
    } else if (block.id === 'trust3') {
      setDeepDiveMode('support');
    } else {
      setActiveTrust(block);
    }
  };

  const getPoints = (text: string) => {
    if (text.includes('\n')) {
      return text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    }
    return text.split('. ').filter(s => s.trim().length > 0).map(s => s.trim().endsWith('.') ? s : s + '.');
  };

  // Trust signals — concrete service guarantees
  const socialProof = lang === 'ru'
    ? [
      { icon: <ShieldCheck size={14} />, label: 'Проверка профилей' },
      { icon: <Star size={14} />, label: 'AI + человек' },
      { icon: <Clock size={14} />, label: '< 24ч ответ' },
    ]
    : [
      { icon: <ShieldCheck size={14} />, label: 'Profile checks' },
      { icon: <Star size={14} />, label: 'AI + human' },
      { icon: <Clock size={14} />, label: '< 24h response' },
    ];

  return (
    <>
      <div className="page-frame section-stack animate-fade-in pb-10 pt-6 md:pt-10">
        <section className="hero-shell">
          <div className="hero-grid">
            <div className="section-stack">
              <div className="section-stack max-w-[40rem]">
                <div className="eyebrow">
                  <BadgeCheck size={14} />
                  {lang === 'ru' ? 'Calm concierge matching' : 'Calm concierge matching'}
                </div>

                <div className="section-stack gap-4">
                  <div className="max-w-[10ch] text-[2.05rem] leading-[0.95] text-stone-900 font-display sm:max-w-none sm:text-[4rem]">
                    {lang === 'ru'
                      ? 'Няня без хаоса, тревоги и бесконечного скролла.'
                      : 'A nanny search without chaos, anxiety, or endless scrolling.'}
                  </div>
                  <p className="max-w-[34rem] text-[1.02rem] leading-7 text-stone-600 sm:text-[1.08rem]">
                    {lang === 'ru'
                      ? 'Blizko собирает короткий shortlist, объясняет совместимость и оставляет семье только ясные решения, а не шумный каталог.'
                      : 'Blizko builds a short shortlist, explains compatibility, and leaves families with clear decisions instead of a noisy catalog.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {socialProof.map((item, i) => (
                    <span key={i} className="topbar-chip">
                      <span className="text-amber-600">{item.icon}</span>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="cta-column max-w-[28rem]">
                <Button onClick={onFindNanny} pulse className="justify-between px-5 text-left">
                  <span className="flex items-center gap-2">
                    <Sparkles size={18} />
                    {text.findNanny}
                  </span>
                  <ArrowRight size={18} />
                </Button>
                <Button variant="secondary" onClick={onBecomeNanny} className="justify-between px-5 text-left">
                  <span>{lang === 'ru' ? 'Стать няней на Blizko' : 'Become a nanny on Blizko'}</span>
                  <ArrowRight size={18} />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 self-stretch">
              <div className="hero-stat">
                <div className="text-[0.72rem] uppercase tracking-[0.18em] text-stone-400">
                  {lang === 'ru' ? 'Humanity+ engine' : 'Humanity+ engine'}
                </div>
                <div className="mt-3 text-2xl font-display text-stone-900">
                  {lang === 'ru' ? 'AI объясняет выбор, человек подтверждает доверие.' : 'AI explains the match, humans confirm the trust layer.'}
                </div>
              </div>

              <div className="hero-stat">
                <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
                  <div>
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-stone-400">{lang === 'ru' ? 'Shortlist' : 'Shortlist'}</div>
                    <div className="mt-2 text-2xl font-semibold text-stone-900">2-3</div>
                  </div>
                  <div>
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-stone-400">{lang === 'ru' ? 'Ответ' : 'Reply'}</div>
                    <div className="mt-2 text-2xl font-semibold text-stone-900">&lt;24h</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-stone-400">{lang === 'ru' ? 'Подход' : 'Fit'}</div>
                    <div className="mt-2 break-words text-2xl font-semibold text-stone-900">{lang === 'ru' ? 'объяснимый' : 'explainable'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-stack">
          <div className="flex items-end justify-between gap-4">
            <div className="section-stack gap-2">
              <div className="eyebrow">{text.whyTrust}</div>
              <h2 className="text-3xl font-display text-stone-900 sm:text-[2.6rem]">
                {lang === 'ru'
                  ? 'Доверие не обещают. Его доказывают слоями.'
                  : 'Trust should not be claimed. It should be layered and proven.'}
              </h2>
            </div>
            <div className="hidden md:flex">
              <Badge variant="trust">
                {lang === 'ru' ? 'Все данные зашифрованы' : 'Data encrypted'}
              </Badge>
            </div>
          </div>

          <div className="proof-grid">
            {trustBlocks.map((block, index) => (
              <Card
                key={block.id}
                onClick={() => handleBlockClick(block)}
                className="proof-card animate-fade-up cursor-pointer group border-transparent hover:border-stone-200/80"
                role="button"
                tabIndex={0}
                style={{ animationDelay: `${index * 100 + 140}ms` }}
              >
                <div className={`proof-icon-wrap ${block.colorClass}`}>
                  {block.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[1.05rem] font-semibold leading-snug text-stone-900">
                    {block.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {block.desc}
                  </p>
                </div>
                <ChevronRight size={18} className="mt-1 text-stone-300 transition-colors group-hover:text-stone-600" />
              </Card>
            ))}
          </div>

          <div className="flex md:hidden justify-center">
            <Badge variant="trust">
              {lang === 'ru' ? 'Все данные зашифрованы' : 'Data encrypted'}
            </Badge>
          </div>
        </section>
      </div>

      {/* Deep Dive Modal */}
      {deepDiveMode && (
        <Suspense fallback={null}>
          <CompatibilityModal
            onClose={() => setDeepDiveMode(null)}
            onAction={() => {
              setDeepDiveMode(null);
              onFindNanny();
            }}
            lang={lang}
            mode={deepDiveMode}
          />
        </Suspense>
      )}

      {/* Standard Trust Details Modal */}
      {activeTrust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/30 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.12)] relative animate-pop-in flex flex-col max-h-[85vh] overflow-hidden border border-white/50">
            <button
              onClick={() => setActiveTrust(null)}
              className="absolute top-4 right-4 z-10 bg-stone-50 hover:bg-stone-100 p-2 rounded-full text-stone-400 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex-1 overflow-y-auto p-8 pt-12 no-scrollbar">
              <div className="flex flex-col items-center text-center mb-8">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${activeTrust.colorClass} mb-5 shadow-sm`}>
                  {React.cloneElement(activeTrust.icon as React.ReactElement, { size: 36, strokeWidth: 2 })}
                </div>
                <h3 className="text-2xl font-bold text-stone-800 leading-tight px-2">
                  {activeTrust.title}
                </h3>
              </div>

              <div className="space-y-5">
                {getPoints(activeTrust.detail).map((point, index) => (
                  <div key={index} className="flex gap-4 items-start animate-fade-in" style={{ animationDelay: `${index * 50 + 100}ms` }}>
                    <div className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm" />
                    <p className="text-stone-600 text-[15px] leading-relaxed whitespace-pre-line">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 pt-2 bg-linear-to-t from-white via-white to-transparent">
              <Button onClick={() => setActiveTrust(null)} className="w-full rounded-2xl py-4 shadow-lg hover:shadow-xl bg-stone-900 text-white hover:bg-stone-800">
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
