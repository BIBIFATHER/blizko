import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from './UI';
import { ShieldCheck, Heart, Users, X, ChevronRight, Sparkles, Star, Clock } from 'lucide-react';
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

  // Social proof stats — Bandwagon Effect
  const socialProof = lang === 'ru'
    ? [
      { icon: <Users size={14} />, label: '150+ семей' },
      { icon: <Star size={14} />, label: '97% совпадений' },
      { icon: <Clock size={14} />, label: '< 24ч ответ' },
    ]
    : [
      { icon: <Users size={14} />, label: '150+ families' },
      { icon: <Star size={14} />, label: '97% match rate' },
      { icon: <Clock size={14} />, label: '< 24h response' },
    ];

  return (
    <>
      <div className="flex flex-col min-h-full animate-fade-in space-y-8 pb-10">
        {/* Hero — Peak-End: memorable first impression */}
        <div className="text-center space-y-5 pt-10 sm:pt-12 bg-gradient-to-br from-amber-50/80 via-white to-sky-50/70 border border-stone-100 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight font-display">
            Blizko
          </div>
          <div className="space-y-3">
            <p className="text-base sm:text-lg font-semibold text-stone-800">
              {lang === 'ru' ? 'Технология ' : 'Technology '}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-700 font-semibold shadow-sm">
                Humanity+
              </span>
            </p>
            <p className="text-stone-500/90 text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
              {lang === 'ru'
                ? 'AI анализирует стиль воспитания, подход и совместимость. Подбор с первого дня.'
                : 'AI analyzes parenting style, approach and compatibility. Match from day one.'}
            </p>
          </div>

          {/* Social Proof — Bandwagon Effect */}
          <div className="flex items-center justify-center gap-3 pt-1">
            {socialProof.map((item, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                <span className="text-amber-500">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Primary CTA — Foot-in-the-Door: low barrier entry */}
        <div className="space-y-3">
          <Button onClick={onFindNanny} pulse>
            <Sparkles size={18} />
            {text.findNanny}
          </Button>
          <Button variant="secondary" onClick={onBecomeNanny}>
            {lang === 'ru' ? 'Стать няней на Blizko' : 'Become a nanny on Blizko'}
          </Button>
        </div>

        {/* Trust Blocks — Authority Bias */}
        <div className="space-y-5">
          <h2 className="text-center text-stone-400/80 text-xs uppercase tracking-[0.25em] font-semibold">
            {text.whyTrust}
          </h2>

          <div className="grid gap-3">
            {trustBlocks.map((block, index) => (
              <Card
                key={block.id}
                onClick={() => handleBlockClick(block)}
                className="animate-fade-up flex items-start gap-3 sm:gap-4 py-4 sm:py-5 cursor-pointer hover-lift active:scale-[0.99] group border-transparent hover:border-stone-100/70"
                role="button"
                tabIndex={0}
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                <div className={`${block.colorClass} p-2.5 rounded-2xl transition-transform group-hover:scale-110 ring-1 ring-white/70 shadow-sm`}>
                  {block.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-stone-800 leading-snug">
                    {block.title}
                  </h3>
                  <p className="text-sm text-stone-500 leading-relaxed mt-0.5">
                    {block.desc}
                  </p>
                </div>
                <ChevronRight size={18} className="text-stone-300 group-hover:text-stone-500 transition-colors mt-1" />
              </Card>
            ))}
          </div>
        </div>

        {/* Trust Badge — Anchoring */}
        <div className="flex justify-center">
          <Badge variant="trust">
            {lang === 'ru' ? 'Все данные зашифрованы' : 'Data encrypted'}
          </Badge>
        </div>
      </div>

      {/* Deep Dive Modal */}
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
                    <div className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm" />
                    <p className="text-stone-600 text-[15px] leading-relaxed whitespace-pre-line">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

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