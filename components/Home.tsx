import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './UI';
import { ShieldCheck, Heart, Users, X, ChevronRight, Sparkles, Star, Clock, CheckCircle2, Bell, Search, HelpCircle, Shield, MessageCircle, ArrowUpRight, Check, Headphones } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';
import { CompatibilityModal, ModalMode } from './CompatibilityModal';
import {
  trackCTA,
  trackMatchFollowUpClicked,
  trackMatchFollowUpShown,
  trackPageView,
} from '../services/analytics';
import {
  dismissMatchFollowUp,
  getPendingMatchFollowUp,
  MatchFollowUpState,
} from '../services/matchFollowUp';

interface HomeProps {
  lang: Language;
}

export const Home: React.FC<HomeProps> = ({ lang }) => {
  const navigate = useNavigate();
  const onFindNanny = () => { trackCTA('find_nanny', 'home_hero'); navigate('/find-nanny'); };
  const onBecomeNanny = () => { trackCTA('become_nanny', 'home_hero'); navigate('/become-nanny'); };
  const text = t[lang];
  const [activeTrust, setActiveTrust] = useState<null | { title: string; desc: string; detail: string; icon: React.ReactNode; colorClass: string; bgClass: string }>(null);
  const [deepDiveMode, setDeepDiveMode] = useState<ModalMode | null>(null);
  const [matchFollowUp, setMatchFollowUp] = useState<MatchFollowUpState | null>(null);
  const trackedFollowUpRef = useRef<string | null>(null);

  useEffect(() => {
    trackPageView('home');
    setMatchFollowUp(getPendingMatchFollowUp());
  }, []);

  useEffect(() => {
    if (!matchFollowUp) return;
    const key = `${matchFollowUp.matchResult.requestId || 'no-request'}:${matchFollowUp.stage}`;
    if (trackedFollowUpRef.current === key) return;
    trackMatchFollowUpShown(matchFollowUp.stage);
    trackedFollowUpRef.current = key;
  }, [matchFollowUp]);

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

  // Trust signals — concrete service guarantees instead of inflated counters.
  const socialProof = lang === 'ru'
    ? [
      { icon: <ShieldCheck size={14} />, label: 'Проверка профилей включена' },
      { icon: <Star size={14} />, label: 'Подбор: AI + человек' },
      { icon: <Clock size={14} />, label: 'Поддержка отвечает < 24ч' },
    ]
    : [
      { icon: <ShieldCheck size={14} />, label: 'Profile checks are active' },
      { icon: <Star size={14} />, label: 'Matching: AI + human' },
      { icon: <Clock size={14} />, label: 'Support replies < 24h' },
    ];

  const serviceSignals = lang === 'ru'
    ? [
      { label: 'Проверка профилей', value: 'Включена' },
      { label: 'Ответ поддержки', value: '< 24ч' },
      { label: 'Совместимость', value: 'AI + человек' },
    ]
    : [
      { label: 'Profile checks', value: 'Active' },
      { label: 'Support reply', value: '< 24h' },
      { label: 'Compatibility', value: 'AI + human' },
    ];

  const quickActions = [
    {
      id: 'find',
      title: lang === 'ru' ? 'Быстрый старт' : 'Quick start',
      subtitle: lang === 'ru' ? 'Запустить подбор' : 'Start matching',
      icon: <Search size={18} />,
      onClick: onFindNanny,
    },
    {
      id: 'trust',
      title: lang === 'ru' ? 'Безопасность' : 'Safety',
      subtitle: lang === 'ru' ? 'Проверка и верификация' : 'Checks and verification',
      icon: <Shield size={18} />,
      onClick: () => setDeepDiveMode('verification'),
    },
    {
      id: 'help',
      title: lang === 'ru' ? 'Поддержка' : 'Support',
      subtitle: lang === 'ru' ? 'Человек рядом' : 'Human help nearby',
      icon: <MessageCircle size={18} />,
      onClick: () => setDeepDiveMode('support'),
    },
  ];

  const topCandidate = matchFollowUp?.matchResult.candidates[0];

  const handleResumeMatches = () => {
    if (!matchFollowUp) return;
    trackMatchFollowUpClicked(matchFollowUp.stage);
    navigate('/match-results', { state: { matchResult: matchFollowUp.matchResult } });
  };

  const handleDismissFollowUp = () => {
    dismissMatchFollowUp();
    setMatchFollowUp(null);
  };

  return (
    <>
      <div className="app-shell flex flex-col min-h-full animate-fade-in space-y-4">
        <section className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.72rem] uppercase tracking-[0.18em] font-bold text-stone-400">
              {lang === 'ru' ? 'Ваш помощник рядом' : 'Your care assistant'}
            </div>
            <div className="text-[1.9rem] font-semibold tracking-[-0.04em] text-stone-900 leading-none">
              Blizko
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/90 border border-stone-200/80 text-[12px] font-semibold text-stone-600 shadow-sm">
              <Check size={13} className="text-emerald-600" />
              {lang === 'ru' ? 'Trust on' : 'Trust on'}
            </span>
            <button type="button" className="w-10 h-10 rounded-full bg-white/90 border border-stone-200/80 shadow-sm flex items-center justify-center text-stone-500">
              <Bell size={17} />
            </button>
          </div>
        </section>

        <section className="rounded-[30px] bg-white/96 border border-stone-200/80 shadow-[0_18px_48px_rgba(15,23,42,0.06)] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400">
              <Sparkles size={12} className="text-sky-500" />
              {lang === 'ru' ? 'Главный экран' : 'Home'}
            </div>
            <button
              type="button"
              onClick={() => setDeepDiveMode('compatibility')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-700"
            >
              <HelpCircle size={14} />
              {lang === 'ru' ? 'Как это работает' : 'How it works'}
            </button>
          </div>

          <div className="space-y-3">
            <h1 className="text-[2rem] sm:text-[2.35rem] leading-[1.02] font-semibold tracking-[-0.05em] text-stone-900 max-w-lg">
                {lang === 'ru' ? 'Подберём 2–3 сильных кандидата.' : 'We will find 2–3 strong matches.'}
            </h1>
            <p className="text-[15px] sm:text-base text-stone-500 max-w-md leading-relaxed">
              {lang === 'ru'
                ? 'Спокойно, без десятков анкет. Сначала учитываем график, совместимость семьи и сигналы доверия.'
                : 'Calmly, without dozens of profiles. We start with schedule, family compatibility, and trust signals.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-[24px] bg-slate-50/95 border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                <ShieldCheck size={16} className="text-emerald-600" />
                {lang === 'ru' ? 'Подбор с проверкой и поддержкой' : 'Matching with checks and support'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {socialProof.map((item, i) => (
                  <div key={i} className="rounded-[18px] bg-white border border-stone-200/70 px-3 py-3 text-center">
                    <div className="flex justify-center text-sky-600 mb-1">{item.icon}</div>
                    <div className="text-[11px] sm:text-xs text-stone-600 font-semibold leading-tight">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={onFindNanny} pulse className="!bg-stone-900 !text-white !border-stone-900 hover:!bg-stone-800 shadow-[0_12px_30px_rgba(17,24,39,0.18)]">
                <Sparkles size={18} />
                {text.findNanny}
              </Button>
              <Button variant="secondary" onClick={onBecomeNanny} className="!bg-white !border-stone-200/80 !text-stone-700">
                {lang === 'ru' ? 'Стать няней' : 'Become a nanny'}
              </Button>
            </div>
          </div>
        </section>

        {matchFollowUp && topCandidate && (
          <section className="rounded-[28px] bg-emerald-50/80 border border-emerald-100 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-emerald-600 mb-2">
                  {lang === 'ru' ? 'Вернуться к мэтчу' : 'Continue after match'}
                </div>
                <h2 className="text-lg font-semibold text-stone-900 leading-tight">
                  {matchFollowUp.stage === 'engaged'
                    ? (lang === 'ru' ? 'Вернитесь к последнему сильному мэтчу и продолжите диалог.' : 'Return to your strongest match and continue the conversation.')
                    : (lang === 'ru' ? 'У вас уже есть сильные кандидаты. Не теряйте тёплый момент.' : 'You already have strong candidates. Do not lose the warm moment.')}
                </h2>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                  {lang === 'ru'
                    ? `Сохранено ${matchFollowUp.matchResult.candidates.length} кандидата. Первый в списке: ${topCandidate.nanny.name} (${topCandidate.score}% совместимости).`
                    : `${matchFollowUp.matchResult.candidates.length} candidates saved. Top match: ${topCandidate.nanny.name} (${topCandidate.score}% match).`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismissFollowUp}
                className="w-9 h-9 rounded-full border border-emerald-100 bg-white/80 text-stone-400 hover:text-stone-600 flex items-center justify-center"
                aria-label={lang === 'ru' ? 'Закрыть напоминание' : 'Dismiss reminder'}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={handleResumeMatches}
                className="!bg-stone-900 !text-white !border-stone-900 hover:!bg-stone-800"
              >
                <MessageCircle size={17} />
                {lang === 'ru' ? 'Вернуться к мэтчам' : 'Resume matches'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDismissFollowUp}
                className="!bg-white !border-emerald-100 !text-stone-700"
              >
                {lang === 'ru' ? 'Позже' : 'Later'}
              </Button>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-stone-400">
              {lang === 'ru' ? 'Быстрые действия' : 'Quick actions'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="rounded-[24px] bg-white/95 border border-stone-200/80 shadow-sm text-left px-4 py-4 flex sm:flex-col items-center sm:items-start gap-3 active:scale-[0.99] transition-all"
              >
                <div className="w-11 h-11 rounded-[18px] bg-slate-50 border border-slate-200/80 flex items-center justify-center text-stone-700 shrink-0">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-stone-800">{action.title}</div>
                  <div className="text-xs text-stone-500">{action.subtitle}</div>
                </div>
                <ArrowUpRight size={16} className="text-stone-300 sm:self-end" />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-stone-400">
              {text.whyTrust}
            </h2>
          </div>

          <div className="rounded-[28px] bg-white/95 border border-stone-200/80 shadow-sm overflow-hidden">
            {trustBlocks.map((block, index) => (
              <Card
                key={block.id}
                onClick={() => handleBlockClick(block)}
                className={`animate-fade-up !rounded-none !shadow-none !border-0 !bg-transparent flex items-start gap-4 py-4 group ${index !== trustBlocks.length - 1 ? 'border-b border-stone-100' : ''}`}
                role="button"
                tabIndex={0}
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                <div className={`${block.colorClass} p-3 rounded-[18px] transition-transform group-hover:scale-105 ring-1 ring-white/70 shadow-sm flex-shrink-0`}>
                  {block.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] sm:text-base font-semibold text-stone-800 leading-tight">
                    {block.title}
                  </h3>
                  <p className="text-[13px] sm:text-sm text-stone-500 leading-relaxed mt-1">
                    {block.desc}
                  </p>
                </div>
                <ChevronRight size={18} className="text-stone-300 group-hover:text-stone-500 transition-colors mt-1" />
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-white/95 border border-stone-200/80 shadow-sm p-5 sm:p-6 pb-24 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr] gap-4 items-start">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-stone-400 mb-3">
                {lang === 'ru' ? 'Что происходит дальше' : 'What happens next'}
              </div>
              <div className="space-y-2">
                {[
                  lang === 'ru' ? '1. Вы описываете семью и график.' : '1. You describe family needs and schedule.',
                  lang === 'ru' ? '2. AI фильтрует и ранжирует совместимость.' : '2. AI filters and ranks compatibility.',
                  lang === 'ru' ? '3. Вы общаетесь только с сильными кандидатами.' : '3. You talk only to strong candidates.',
                ].map((line) => (
                  <div key={line} className="flex items-center gap-2.5 text-sm text-stone-600">
                    <CheckCircle2 size={15} className="text-sky-600 shrink-0" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] bg-slate-50/95 border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                <Headphones size={16} className="text-sky-600" />
                {lang === 'ru' ? 'Статус сервиса' : 'Service status'}
              </div>
              <div className="space-y-2.5">
                {serviceSignals.map((item) => (
                  <div key={item.label} className="rounded-[18px] bg-white border border-stone-200/70 px-3 py-3 flex items-center justify-between gap-3">
                    <span className="text-[13px] text-stone-500">{item.label}</span>
                    <span className="text-[13px] font-semibold text-stone-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
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
