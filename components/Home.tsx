import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './UI';
import { ShieldCheck, Heart, Users, X, ChevronRight } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';
import { CompatibilityModal, ModalMode } from './CompatibilityModal';

interface HomeProps {
  lang: Language;
}

export const Home: React.FC<HomeProps> = ({ lang }) => {
  const navigate = useNavigate();

  const onFindNanny = () => navigate('/find-nanny');
  const onBecomeNanny = () => navigate('/become-nanny');
  const text = t[lang];
  // Replaced individual state with a single modal state
  const [activeTrust, setActiveTrust] = useState<null | { title: string; desc: string; detail: string; icon: React.ReactNode; colorClass: string; bgClass: string }>(null);
  const [deepDiveMode, setDeepDiveMode] = useState<ModalMode | null>(null);

  const trustBlocks = [
    {
      id: 'trust2', // Compatibility Block moved first due to new Humanity+ focus
      title: lang === 'ru' ? 'Humanity+ совместимость' : 'Humanity+ Match',
      desc: lang === 'ru'
        ? 'Мы анализируем 120+ параметров личности няни: от стиля игры и дисциплины до реакций на ребенка. Вы совпадаете по ценностям с первого дня.'
        : 'We analyze 120+ nanny personality parameters: from play style and discipline to child reactions. Value match from day 1.',
      detail: text.trust2Detail,
      icon: <Users size={24} />,
      colorClass: 'bg-indigo-100 text-indigo-700',
      bgClass: 'bg-indigo-50'
    },
    {
      id: 'trust1', // Verification Block
      title: text.trust1Title,
      desc: text.trust1Desc,
      detail: text.trust1Detail,
      icon: <ShieldCheck size={24} />,
      colorClass: 'bg-green-100 text-green-700',
      bgClass: 'bg-green-50'
    },
    {
      id: 'trust3', // Support Block
      title: text.trust3Title,
      desc: text.trust3Desc,
      detail: text.trust3Detail,
      icon: <Heart size={24} />,
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

  // Helper to split text into bullet points
  const getPoints = (text: string) => {
    if (text.includes('\n')) {
      return text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    }
    return text.split('. ').filter(s => s.trim().length > 0).map(s => s.trim().endsWith('.') ? s : s + '.');
  };

  const heroSubtitleParts = text.heroSubtitle.split('Humanity+');

  return (
    <>
      <style>{`
        @keyframes popInCustom {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-cloud-pop {
          animation: popInCustom 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="cloud-bg flex flex-col h-[100dvh] overflow-hidden bg-[#F9F6F1] animate-fade-in relative w-full pt-safe">
        {/* Decorative mint blob */}
        <div className="cloud-blob-mint" />

        {/* 1. Fixed Header (Native App Style) */}
        <div className="flex-none text-center space-y-2 pt-8 sm:pt-12 pb-2 relative z-20 px-4">
          <div className="text-4xl sm:text-5xl logo-serif tracking-tight mb-2">
            Blizko
          </div>
          <p className="text-stone-500 text-[14px] sm:text-base max-w-[280px] sm:max-w-sm mx-auto leading-snug">
            {lang === 'ru'
              ? 'Объяснимый подбор нянь и гарантия безопасности для вашей семьи.'
              : 'Explainable nanny matching and safety guarantee for your family.'}
          </p>
        </div>

        {/* 2. Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto w-full relative z-10 no-scrollbar pt-6 pb-[140px] px-2 sm:px-4 space-y-10">

          {/* Flow Section */}
          <div className="space-y-3">
            <h2 className="text-center text-stone-400/80 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold">
              {text.homeFlowTitle}
            </h2>
            <div className="flex items-center justify-center gap-2 text-[13px] text-stone-500 flex-wrap px-4">
              {text.homeFlowSteps.map((step, index) => (
                <React.Fragment key={step}>
                  <span className="px-3 py-1 rounded-full bg-white/70 text-stone-600 shadow-sm border border-stone-100/40 whitespace-nowrap">
                    {step}
                  </span>
                  {index < text.homeFlowSteps.length - 1 && (
                    <span className="text-stone-300">→</span>
                  )}
                </React.Fragment>
              ))}
              <span className="text-stone-300">•</span>
              <span className="text-stone-400 whitespace-nowrap">{text.homeEta}</span>
            </div>
          </div>

          {/* Trust Blocks Section */}
          <div className="space-y-4">
            <h2 className="text-center text-stone-400/80 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold">
              {text.whyTrust}
            </h2>

            {/* Horizontal Scroll Area */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 pt-1 no-scrollbar px-2 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 pl-4 pr-10">
              {trustBlocks.map((block) => (
                <Card
                  key={block.id}
                  onClick={() => handleBlockClick(block)}
                  className="card-float flex-none w-[75vw] sm:w-auto snap-center flex flex-col items-start gap-3 p-5 cursor-pointer group border-transparent hover:border-stone-100/70 h-[190px] sm:h-auto"
                  role="button"
                  tabIndex={0}
                >
                  <div className={`${block.colorClass} p-2.5 rounded-2xl transition-transform group-hover:scale-110 ring-1 ring-white/70 shadow-sm mb-0.5`}>
                    {block.icon}
                  </div>
                  <div className="flex-1 flex flex-col w-full">
                    <h3 className="text-[16px] font-bold text-stone-800 leading-snug">
                      {block.title}
                    </h3>
                    <p className="text-[13px] text-stone-500/90 leading-relaxed mt-1.5 line-clamp-3">
                      {block.desc}
                    </p>
                    <div className="mt-auto pt-2 flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-stone-400 group-hover:text-amber-500 transition-colors uppercase tracking-widest">
                        {lang === 'ru' ? 'Подробнее' : 'Details'}
                      </span>
                      <ChevronRight size={14} className="text-stone-300 group-hover:text-amber-500 transition-colors" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Fixed Bottom Dock (iOS Style) */}
        <div className="flex-none fixed bottom-0 left-0 w-full px-5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-xl border-t border-white/60 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 text-center space-y-3 rounded-t-3xl">
          <button
            type="button"
            onClick={onFindNanny}
            className="btn-gold rounded-full w-full py-4 text-[17px] tracking-wide active:scale-[0.98] transition-transform"
          >
            {text.findNanny}
          </button>

          {/* Social Proof / Stats */}
          <div className="flex items-center justify-between px-2 text-[13px] text-stone-500 font-medium">
            <div className="flex items-center gap-1.5 text-amber-500">
              <span className="text-[14px]">★★★★★</span>
              <span className="text-stone-600 text-xs mt-0.5">4.9 {lang === 'ru' ? 'из 500+' : 'from 500+'}</span>
            </div>

            <button
              type="button"
              onClick={onBecomeNanny}
              className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-4"
            >
              {text.becomeNanny}
            </button>
          </div>
        </div>
      </div>

      {/* Deep Dive Modal (Verification & Compatibility & Support) */}
      {deepDiveMode && (
        <CompatibilityModal
          onClose={() => setDeepDiveMode(null)}
          onAction={() => {
            setDeepDiveMode(null);
            onFindNanny();
          }}
          lang={lang}
          mode={deepDiveMode}
        />
      )}

      {/* Standard Trust Details Modal (Fallback/Legacy) */}
      {activeTrust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/30 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.12)] relative animate-cloud-pop flex flex-col max-h-[85vh] overflow-hidden border border-white/50">

            {/* Close Button */}
            <button
              onClick={() => setActiveTrust(null)}
              className="absolute top-4 right-4 z-10 bg-stone-50 hover:bg-stone-100 p-2 rounded-full text-stone-400 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-12 no-scrollbar">
              <div className="flex flex-col items-center text-center mb-8">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${activeTrust.colorClass} mb-5 shadow-sm transform hover:scale-110 transition-transform`}>
                  {React.cloneElement(activeTrust.icon as React.ReactElement, { size: 36, strokeWidth: 2 })}
                </div>
                <h3 className="text-2xl font-bold text-stone-800 leading-tight px-2">
                  {activeTrust.title}
                </h3>
              </div>

              <div className="space-y-5">
                {getPoints(activeTrust.detail).map((point, index) => (
                  <div key={index} className="flex gap-4 items-start animate-fade-in" style={{ animationDelay: `${index * 50 + 100}ms` }}>
                    <div className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm" />
                    <p className="text-stone-600 text-[15px] leading-relaxed whitespace-pre-line">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Button */}
            <div className="p-6 pt-2 bg-gradient-to-t from-white via-white to-transparent">
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