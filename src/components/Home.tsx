import React, { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from './UI';
import { ShieldCheck, Heart, Users, X, ChevronRight, Sparkles } from 'lucide-react';
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

  const proofChips = text.homeProofChips as string[] | undefined;

  return (
    <>
      <div className="flex min-h-full animate-fade-in flex-col gap-6 pb-8">
        <div className="relative overflow-hidden rounded-[1.7rem] bg-[linear-gradient(165deg,rgba(252,249,244,0.98),rgba(243,237,229,0.98))] px-5 pb-5 pt-6 shadow-cloud-soft sm:rounded-[2rem] sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-[radial-gradient(circle_at_top,rgba(216,171,89,0.16),transparent_70%)] blur-3xl" />
          <div className="relative space-y-4 text-center">
            <div className="hidden items-center gap-2 rounded-full bg-white/82 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 shadow-cloud-soft sm:inline-flex">
              <Sparkles size={12} className="text-amber-600" />
              {lang === 'ru' ? 'Curated childcare matching' : 'Curated childcare matching'}
            </div>

            <div className="space-y-2">
              <div className="text-[2rem] sm:text-5xl font-semibold text-stone-950 tracking-tight font-display leading-[0.95]">
                {text.heroTitle}
              </div>
              <p className="mx-auto max-w-md text-sm leading-6 text-stone-600 sm:text-base sm:leading-7">
                {text.heroSubtitle}
              </p>
            </div>

            <div className="hidden flex-wrap items-center justify-center gap-2 pt-1 sm:flex">
              {(proofChips || []).map((item, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-stone-600 shadow-sm"
                >
                  <span className="text-amber-600">•</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <Button onClick={onFindNanny} pulse>
            <Sparkles size={18} />
            {text.findNanny}
          </Button>
          <Button variant="secondary" onClick={onBecomeNanny}>
            {lang === 'ru' ? 'Стать няней на Blizko' : 'Become a nanny on Blizko'}
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-center text-stone-400/80 text-[11px] uppercase tracking-[0.18em] font-semibold">
            {text.whyTrust}
          </h2>

          <div className="grid gap-3">
            {trustBlocks.map((block, index) => (
              <Card
                key={block.id}
                onClick={() => handleBlockClick(block)}
                className="animate-fade-up overflow-hidden p-0! cursor-pointer hover-lift active:scale-[0.99] group border-transparent hover:border-stone-100/70"
                role="button"
                tabIndex={0}
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                <div className="flex items-start gap-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,243,238,0.96))] px-4 py-4 sm:px-5 sm:py-5">
                  <div className={`${block.colorClass} shrink-0 rounded-[1.1rem] p-3 transition-transform group-hover:scale-105 ring-1 ring-white/70 shadow-sm`}>
                    {block.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                      {lang === 'ru' ? `Причина ${index + 1}` : `Reason ${index + 1}`}
                    </div>
                    <h3 className="text-[1.05rem] font-semibold text-stone-900 leading-snug">
                      {block.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-stone-600 leading-6">
                      {block.desc}
                    </p>
                  </div>
                  <ChevronRight size={18} className="mt-1 text-stone-300 transition-colors group-hover:text-stone-500" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <Badge variant="trust">
            {lang === 'ru' ? 'Все данные зашифрованы' : 'Data encrypted'}
          </Badge>
        </div>
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
