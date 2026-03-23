import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, ProgressBar, StatusIndicator } from './UI';
import { Sparkles, CheckCircle, Info, BrainCircuit, Search, Loader2, ArrowRight } from 'lucide-react';
import { SubmissionResult, Language } from '@/core/types';
import { t } from '@/core/i18n/translations';
import { supabase } from '@/services/supabase';
import { getMyParentRequests, getNannyProfiles } from '@/services/storage';

interface SuccessScreenProps {
  lang: Language;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ lang }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const text = t[lang];
  const result: SubmissionResult | undefined = location.state?.result;
  const isPaid = new URLSearchParams(location.search).get('paid') === 'true';
  const paymentId = new URLSearchParams(location.search).get('payment_id');
  const processedPaymentRef = useRef<string | null>(null);

  const onHome = () => navigate('/');
  const [step, setStep] = useState<'analyzing' | 'matching' | 'done'>(isPaid ? 'done' : 'analyzing');
  const [visible, setVisible] = useState(false);
  const [paidFlowState, setPaidFlowState] = useState<'finalizing' | 'matching' | 'fallback'>(
    isPaid && paymentId ? 'finalizing' : 'fallback',
  );

  // Simulate AI Thinking Process
  useEffect(() => {
    if (isPaid) return; // Skip animation when returning from payment
    setVisible(true);

    // Step 1: Analyze profile (0-1.5s)
    const t1 = setTimeout(() => setStep('matching'), 1500);
    // Step 2: Show result (3s)
    const t2 = setTimeout(() => setStep('done'), 3000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (!isPaid || !paymentId || !supabase) return;
    if (processedPaymentRef.current === paymentId) return;

    processedPaymentRef.current = paymentId;

    let cancelled = false;

    const finalizePayment = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) {
          if (!cancelled) setPaidFlowState('fallback');
          return;
        }

        setPaidFlowState('finalizing');

        const finalizeResponse = await fetch('/api/payments/finalize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ paymentId }),
        });

        const finalizePayload = await finalizeResponse.json().catch(() => null);
        const parentRequestId = String(finalizePayload?.parentRequestId || '').trim();

        if (
          cancelled ||
          !finalizeResponse.ok ||
          !finalizePayload?.ok ||
          finalizePayload?.status !== 'succeeded' ||
          !parentRequestId
        ) {
          if (!cancelled) setPaidFlowState('fallback');
          return;
        }

        setPaidFlowState('matching');

        const requests = await getMyParentRequests();
        const paidRequest = requests.find((item) => item.id === parentRequestId);

        if (!paidRequest || cancelled) {
          if (!cancelled) setPaidFlowState('fallback');
          return;
        }

        const allNannies = await getNannyProfiles();
        const { findBestMatch } = await import('@/core/ai/matchingAi');
        const { id, createdAt, type, ...requestInput } = paidRequest;
        const aiMatchResult = await findBestMatch(requestInput, allNannies, lang, session.user.id);

        if (cancelled) return;

        if (aiMatchResult.matchResult?.candidates?.length) {
          navigate('/match-results', {
            replace: true,
            state: {
              matchResult: {
                ...aiMatchResult.matchResult,
                requestId: aiMatchResult.matchResult.requestId || paidRequest.id,
              },
            },
          });
          return;
        }

        setPaidFlowState('fallback');
      } catch (error) {
        console.warn('Payment finalization sync failed:', error);
        if (!cancelled) setPaidFlowState('fallback');
      }
    };

    void finalizePayment();

    return () => {
      cancelled = true;
    };
  }, [isPaid, paymentId, lang, navigate]);

  if (!result && !isPaid) {
    return (
      <div className="form-shell animate-slide-up pt-8">
        <div className="empty-state min-h-[26rem] space-y-4">
          <div className="empty-state-icon mb-2">
            <Info size={40} />
          </div>
          <h2 className="text-2xl text-stone-900 md:text-3xl">
            {lang === 'ru' ? 'Информация не найдена' : 'Information not found'}
          </h2>
          <p className="max-w-md text-sm leading-7 text-stone-500 md:text-base">
            {lang === 'ru'
              ? 'Кажется, вы перешли на эту страницу напрямую или ваша сессия устарела. Вернитесь на главную страницу.'
              : 'It seems you accessed this page directly or your session has expired. Return to the home page.'}
          </p>
          <Button onClick={onHome} className="mx-auto w-full max-w-sm">
            {lang === 'ru' ? 'На главную' : 'Back to Home'}
          </Button>
        </div>
      </div>
    );
  }

  if (isPaid) {
    if (paidFlowState !== 'fallback') {
      const isMatching = paidFlowState === 'matching';

      return (
        <div className="form-shell animate-fade-in pt-8">
          <div className="hero-shell min-h-[60vh]">
            <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 py-8 text-center">
              <div className="eyebrow">
                <Sparkles size={14} />
                {lang === 'ru' ? 'Blizko подбирает дальше' : 'Blizko keeps matching'}
              </div>

              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 animate-pulse-slow">
                  {isMatching ? (
                    <Search size={48} className="text-amber-600 animate-bounce" />
                  ) : (
                    <CheckCircle size={48} className="text-emerald-600 animate-pulse" />
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 rounded-full bg-white p-2 shadow-lg">
                  <Loader2 size={20} className="animate-spin text-stone-400" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="max-w-[12ch] text-[2.1rem] leading-[0.96] text-stone-950 sm:max-w-none sm:text-3xl md:text-4xl">
                  {isMatching
                    ? (lang === 'ru' ? 'Собираем shortlist под вашу заявку' : 'Building your shortlist')
                    : (lang === 'ru' ? 'Подтверждаем оплату' : 'Confirming payment')}
                </h3>
                <p className="mx-auto max-w-xl text-sm leading-7 text-stone-500 md:text-base">
                  {isMatching
                    ? (lang === 'ru'
                      ? 'Сейчас пересчитываем подходящих нянь и подготовим следующий шаг.'
                      : 'We are recalculating suitable nannies and preparing your next step.')
                    : (lang === 'ru'
                      ? 'Проверяем статус платежа и готовим подбор без повторной отправки формы.'
                      : 'We are verifying your payment and preparing the matching flow without asking you to resubmit.')}
                </p>
                <div className="flex justify-center pt-1">
                  <StatusIndicator
                    status="active"
                    label={isMatching
                      ? (lang === 'ru' ? 'Подбираем кандидатов...' : 'Matching candidates...')
                      : (lang === 'ru' ? 'Платёж подтверждается...' : 'Confirming payment...')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="form-shell animate-slide-up pt-8">
        <div className="hero-shell text-center">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 py-6">
            <div className="relative mx-auto mb-1 flex h-24 w-24 items-center justify-center rounded-full">
              <div className="absolute inset-0 rounded-full bg-amber-200/40 blur-xl animate-pulse"></div>
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-amber-200/50 bg-linear-to-br from-amber-100 to-amber-50 text-amber-600 shadow-lg shadow-amber-200/30 animate-pop-in">
                <CheckCircle size={40} />
              </div>
            </div>
            <div className="eyebrow">
              <CheckCircle size={14} />
              {lang === 'ru' ? 'Платёж подтверждён' : 'Payment confirmed'}
            </div>
            <h2 className="max-w-[12ch] text-[2.1rem] leading-[0.96] text-stone-950 sm:max-w-none sm:text-3xl md:text-4xl">
              {lang === 'ru' ? 'Оплата успешно завершена' : 'Payment Successful'}
            </h2>
            <p className="max-w-xl text-sm leading-7 text-stone-500 md:text-base">
              {lang === 'ru'
                ? 'Платёж подтверждён. Если shortlist не открылся автоматически, мы всё равно сохранили заявку и продолжим подбор.'
                : 'Your payment is confirmed. If the shortlist did not open automatically, your request is still saved and matching will continue.'}
            </p>
            <div className="w-full max-w-sm pt-2">
              <Button onClick={onHome}>
                {lang === 'ru' ? 'На главную' : 'Back to Home'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step !== 'done') {
    return (
      <div className="form-shell animate-fade-in pt-8">
        <div className="hero-shell min-h-[60vh]">
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 py-8 text-center">
            <div className="eyebrow">
              <Sparkles size={14} />
              {lang === 'ru' ? 'AI-анализ заявки' : 'AI request analysis'}
            </div>

            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 animate-pulse-slow">
                {step === 'analyzing' ? (
                  <BrainCircuit size={48} className="text-sky-600 animate-pulse" />
                ) : (
                  <Search size={48} className="text-amber-600 animate-bounce" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 rounded-full bg-white p-2 shadow-lg">
                <Loader2 size={20} className="animate-spin text-stone-400" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="max-w-[12ch] text-[2.1rem] leading-[0.96] text-stone-950 sm:max-w-none sm:text-3xl md:text-4xl">
                {step === 'analyzing'
                  ? text.successAnalyzingTitle
                  : text.successMatchingTitle}
              </h3>
              <p className="mx-auto max-w-xl text-sm leading-7 text-stone-500 md:text-base">
                {text.successProcessingNote}
              </p>
              <div className="flex justify-center pt-1">
                <StatusIndicator status={step === 'analyzing' ? 'pending' : 'active'}
                  label={step === 'analyzing'
                    ? (lang === 'ru' ? 'Анализируем запрос...' : 'Analyzing request...')
                    : (lang === 'ru' ? 'Ищем кандидатов...' : 'Finding candidates...')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-shell animate-slide-up">
      <div className="section-stack relative">
        <section className="hero-shell text-center">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 py-4">
            <div className="eyebrow">
              <Sparkles size={14} />
              {text.aiMatch}
            </div>
            <div className="relative mx-auto mb-1 flex h-24 w-24 items-center justify-center rounded-full">
              <div className="absolute inset-0 rounded-full bg-amber-200/40 blur-xl animate-pulse-slow"></div>
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-amber-200/50 bg-linear-to-br from-amber-100 to-amber-50 text-amber-600 shadow-lg shadow-amber-200/30 animate-pop-in">
                <CheckCircle size={40} />
              </div>
            </div>
            <h2 className="max-w-[12ch] whitespace-pre-wrap text-[2.1rem] leading-[0.96] text-stone-950 sm:max-w-none sm:text-3xl md:text-4xl">{text.successTitle}</h2>
            <p className="max-w-xl text-sm leading-7 text-stone-500 md:text-base">
              {text.successDesc}
            </p>
          </div>
        </section>

        <Card className="relative overflow-hidden border-sky-100 bg-linear-to-br from-white to-sky-50 p-6 shadow-lg shadow-sky-100/50">
          <div className="absolute right-0 top-0 p-4 opacity-10 text-sky-500">
            <Sparkles size={100} />
          </div>

          <div className="relative z-10 text-left">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-700">
              <Sparkles size={16} /> {text.aiMatch}
            </div>

            <div className="mb-5 flex items-baseline gap-3">
              <span className="text-5xl font-bold tracking-tighter text-stone-900">{result.matchScore}%</span>
              <span className="text-sm font-medium text-stone-400">{text.probability}</span>
            </div>

            <ProgressBar value={visible ? result.matchScore : 0} showPercent className="mb-5" />

            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{text.recsTitle}</p>
              {result.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-2xl border border-sky-50 bg-white/80 p-3 text-sm text-stone-600 shadow-sm animate-fade-in" style={{ animationDelay: `${idx * 150}ms` }}>
                  <Info size={16} className="mt-0.5 shrink-0 text-sky-400" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 text-left md:grid-cols-3">
              <div className="rounded-2xl border border-amber-100 bg-white/80 p-4">
                <div className="mb-1 text-[12px] font-semibold text-amber-700">Humanity+</div>
                <div className="text-sm text-stone-600">Совпали по стилю: мягкая дисциплина, спокойная коммуникация</div>
                <div className="mt-2 text-[11px] text-stone-500">PCM‑совместимость: «Тёплый ↔ Тёплый» — легко выстраивается контакт</div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-white/80 p-4">
                <div className="mb-1 text-[12px] font-semibold text-sky-700">Growth</div>
                <div className="text-sm text-stone-600">Добавляет: структура и устойчивость к стрессу</div>
                <div className="mt-2 text-[11px] text-stone-500">PCM‑канал общения: тёплый, поддерживающий, без давления</div>
              </div>
              <div className="rounded-2xl border border-green-100 bg-white/80 p-4">
                <div className="mb-1 text-[12px] font-semibold text-green-700">Stability</div>
                <div className="text-sm text-stone-600">Надёжность: высокая (подтверждения без отмен)</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-stone-100 bg-white p-6 text-left">
            <div className="mb-2 text-sm font-semibold text-stone-800">Почему важна минимальная смена нянь</div>
            <p className="text-sm leading-7 text-stone-600">
              Для ребёнка няня — это не услуга, а человек привязанности. Частая смена взрослых
              повышает тревожность, сбивает режим и ухудшает доверие. Стабильность создаёт
              спокойствие, предсказуемость и лучшее развитие.
            </p>
            <div className="mt-3 text-xs text-stone-500">
              Мы подбираем так, чтобы «свой человек» оставался надолго.
            </div>
          </Card>

          <Card className="border-stone-100 bg-white p-6 text-left">
            <div className="mb-3 text-sm font-semibold text-stone-800">Типы нянь и как они помогают</div>
            <div className="space-y-2 text-sm leading-7 text-stone-600">
              <div><span className="font-semibold text-stone-700">Тёплая‑опорная:</span> мягкая, поддерживающая, даёт безопасность.</div>
              <div><span className="font-semibold text-stone-700">Структурная:</span> режим, границы, устойчивость, меньше хаоса.</div>
              <div><span className="font-semibold text-stone-700">Игровая‑творческая:</span> раскрывает эмоции и любознательность.</div>
              <div><span className="font-semibold text-stone-700">Обучающая:</span> развивает навыки и самостоятельность.</div>
              <div><span className="font-semibold text-stone-700">Активная:</span> энергия, прогулки, движение, спорт.</div>
            </div>
          </Card>
        </div>

        <div className="flex justify-center">
          <Badge variant="trust">{lang === 'ru' ? 'Данные защищены' : 'Data protected'}</Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button onClick={onHome}>
            <ArrowRight size={16} />
            {text.successNextCta}
          </Button>
          <Button onClick={onHome} variant="outline">
            {text.successEditCta}
          </Button>
        </div>
      </div>
    </div>
  );
};
