import React, { useState } from 'react';
import { Button, Card } from './UI';
import { ShieldCheck, Heart, Users, X, ChevronRight } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';
import { CompatibilityModal, ModalMode } from './CompatibilityModal';

interface HomeProps {
  onFindNanny: () => void;
  onBecomeNanny: () => void;
  lang: Language;
}

export const Home: React.FC<HomeProps> = ({ onFindNanny, onBecomeNanny, lang }) => {
  const text = t[lang];
  // Replaced individual state with a single modal state
  const [activeTrust, setActiveTrust] = useState<null | { title: string; desc: string; detail: string; icon: React.ReactNode; colorClass: string; bgClass: string }>(null);
  const [deepDiveMode, setDeepDiveMode] = useState<ModalMode | null>(null);

  const trustBlocks = [
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
      id: 'trust2', // Compatibility Block
      title: text.trust2Title,
      desc: text.trust2Desc,
      detail: text.trust2Detail,
      icon: <Users size={24} />,
      colorClass: 'bg-sky-100 text-sky-700',
      bgClass: 'bg-sky-50'
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

      <div className="flex flex-col min-h-full animate-fade-in space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4 pt-4">
          <h1 className="text-4xl font-semibold text-stone-800 tracking-tight">
            {text.heroTitle}
          </h1>
          <p className="text-stone-500 text-lg max-w-xs mx-auto leading-relaxed">
            {text.heroSubtitle}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Button onClick={onFindNanny}>
            {text.findNanny}
          </Button>
          <Button variant="secondary" onClick={onBecomeNanny}>
            {text.becomeNanny}
          </Button>
        </div>

        {/* Trust Blocks */}
        <div className="grid gap-4 mt-8">
          <h2 className="text-center text-stone-400 text-sm uppercase tracking-wider font-medium mb-2">
            {text.whyTrust}
          </h2>
          
          {trustBlocks.map((block) => (
            <Card 
              key={block.id}
              onClick={() => handleBlockClick(block)}
              className="flex items-center gap-4 py-5 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all active:scale-[0.99] group border-transparent hover:border-stone-100"
              role="button"
              tabIndex={0}
            >
              <div className={`${block.colorClass} p-3 rounded-full transition-transform group-hover:scale-110`}>
                {block.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                  {block.title}
                </h3>
                <p className="text-sm text-stone-500 leading-tight mt-1 mb-1">{block.desc}</p>
                <span className="text-xs font-medium text-stone-400 group-hover:text-amber-500 transition-colors">
                  {lang === 'ru' ? 'Подробнее...' : 'More details...'}
                </span>
              </div>
              <ChevronRight size={20} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            </Card>
          ))}
        </div>

        {/* Explainable Match */}
        <div className="mt-6 bg-white/70 border border-stone-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-stone-800 font-semibold text-lg mb-2">
            {text.explainTitle}
          </h3>
          <p className="text-sm text-stone-500 leading-relaxed mb-4">
            {text.explainText}
          </p>
          <div className="flex flex-wrap gap-2">
            {[text.explainBadge1, text.explainBadge2, text.explainBadge3, text.explainBadge4].map((badge, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs bg-stone-100 text-stone-600">
                {badge}
              </span>
            ))}
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