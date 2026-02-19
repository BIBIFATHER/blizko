
import React, { useEffect, useState } from 'react';
import { Button, Card } from './UI';
import { Sparkles, CheckCircle, Info, BrainCircuit, Search, Loader2 } from 'lucide-react';
import { SubmissionResult, Language } from '../types';
import { t } from '../src/core/i18n/translations';

interface SuccessScreenProps {
  result: SubmissionResult;
  onHome: () => void;
  lang: Language;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ result, onHome, lang }) => {
  const text = t[lang];
  const [step, setStep] = useState<'analyzing' | 'matching' | 'done'>('analyzing');
  const [visible, setVisible] = useState(false);

  // Simulate AI Thinking Process
  useEffect(() => {
    setVisible(true);
    
    // Step 1: Analyze profile (0-1.5s)
    const t1 = setTimeout(() => setStep('matching'), 1500);
    // Step 2: Show result (3s)
    const t2 = setTimeout(() => setStep('done'), 3000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (step !== 'done') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in`}>
        <div className="relative">
          <div className="w-24 h-24 bg-sky-100 rounded-full flex items-center justify-center animate-pulse-slow">
             {step === 'analyzing' ? (
               <BrainCircuit size={48} className="text-sky-600 animate-pulse" />
             ) : (
               <Search size={48} className="text-amber-600 animate-bounce" />
             )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg">
             <Loader2 size={20} className="animate-spin text-stone-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-stone-800">
            {step === 'analyzing' 
              ? text.successAnalyzingTitle
              : text.successMatchingTitle}
          </h3>
          <p className="text-stone-400 text-sm">
            {text.successProcessingNote}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`text-center space-y-8 animate-slide-up`}>
      
      <div className="pt-8 flex flex-col items-center justify-center space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2 shadow-lg shadow-green-100/50 animate-pop-in">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-3xl font-semibold text-stone-800 whitespace-pre-wrap">{text.successTitle}</h2>
        <p className="text-stone-500 max-w-xs mx-auto">
          {text.successDesc}
        </p>
      </div>

      {/* AI Match Result */}
      <Card className="bg-gradient-to-br from-white to-sky-50 border-sky-100 relative overflow-hidden shadow-lg shadow-sky-100/50">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-sky-500">
          <Sparkles size={100} />
        </div>
        
        <div className="relative z-10 text-left">
          <div className="flex items-center gap-2 mb-2 text-sky-700 font-medium text-sm uppercase tracking-wide">
            <Sparkles size={16} /> {text.aiMatch}
          </div>
          
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-bold text-stone-800 tracking-tighter">{result.matchScore}%</span>
            <span className="text-stone-400 font-medium">{text.probability}</span>
          </div>
          
          <div className="w-full bg-stone-100 rounded-full h-2.5 mb-5 overflow-hidden">
            <div 
              className="bg-sky-400 h-full rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${visible ? result.matchScore : 0}%` }}
            />
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{text.recsTitle}</p>
            {result.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm text-stone-600 bg-white/80 p-3 rounded-xl border border-sky-50 shadow-sm animate-fade-in" style={{ animationDelay: `${idx * 150}ms` }}>
                <Info size={16} className="mt-0.5 text-sky-400 flex-shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 text-left">
            <div className="bg-white/80 border border-amber-100 rounded-xl p-3">
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-1">Humanity+</div>
              <div className="text-sm text-stone-600">Совпали по стилю: мягкая дисциплина, спокойная коммуникация</div>
              <div className="mt-2 text-[11px] text-stone-500">PCM‑совместимость: «Тёплый ↔ Тёплый» — легко выстраивается контакт</div>
            </div>
            <div className="bg-white/80 border border-sky-100 rounded-xl p-3">
              <div className="text-[11px] font-bold text-sky-600 uppercase tracking-widest mb-1">Growth</div>
              <div className="text-sm text-stone-600">Добавляет: структура и устойчивость к стрессу</div>
              <div className="mt-2 text-[11px] text-stone-500">PCM‑канал общения: тёплый, поддерживающий, без давления</div>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl p-3">
              <div className="text-[11px] font-bold text-green-600 uppercase tracking-widest mb-1">Stability</div>
              <div className="text-sm text-stone-600">Надёжность: высокая (подтверждения без отмен)</div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-stone-100 text-left">
        <div className="text-sm font-semibold text-stone-800 mb-2">Почему важна минимальная смена нянь</div>
        <p className="text-sm text-stone-600 leading-relaxed">
          Для ребёнка няня — это не услуга, а человек привязанности. Частая смена взрослых
          повышает тревожность, сбивает режим и ухудшает доверие. Стабильность создаёт
          спокойствие, предсказуемость и лучшее развитие.
        </p>
        <div className="mt-3 text-xs text-stone-500">
          Мы подбираем так, чтобы «свой человек» оставался надолго.
        </div>
      </Card>

      <Card className="bg-white border border-stone-100 text-left">
        <div className="text-sm font-semibold text-stone-800 mb-2">Типы нянь (и как они помогают)</div>
        <div className="space-y-2 text-sm text-stone-600">
          <div><span className="font-semibold text-stone-700">Тёплая‑опорная:</span> мягкая, поддерживающая, даёт безопасность.</div>
          <div><span className="font-semibold text-stone-700">Структурная:</span> режим, границы, устойчивость, меньше хаоса.</div>
          <div><span className="font-semibold text-stone-700">Игровая‑творческая:</span> раскрывает эмоции и любознательность.</div>
          <div><span className="font-semibold text-stone-700">Обучающая:</span> развивает навыки и самостоятельность.</div>
          <div><span className="font-semibold text-stone-700">Активная:</span> энергия, прогулки, движение, спорт.</div>
        </div>
      </Card>

      <Button onClick={onHome} variant="outline" className="active:scale-95 transition-transform">
        {text.returnHome}
      </Button>
    </div>
  );
};
