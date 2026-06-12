import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './UI';
import { CheckCircle, Clock, Info, Loader2, MessageSquare, ShieldCheck } from 'lucide-react';
import { Language } from '@/core/types';
import { supabase } from '@/services/supabase';
import { getMyParentRequests, getNannyProfiles } from '@/services/storage';

interface SuccessScreenProps {
  lang: Language;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ lang }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isPaid = new URLSearchParams(location.search).get('paid') === 'true';
  const paymentId = new URLSearchParams(location.search).get('payment_id');
  const processedPaymentRef = useRef<string | null>(null);
  const hasResult = !!location.state?.result;

  const onHome = () => navigate('/');

  const [paidFlowState, setPaidFlowState] = useState<'finalizing' | 'matching' | 'fallback'>(
    isPaid && paymentId ? 'finalizing' : 'fallback',
  );

  useEffect(() => {
    if (!isPaid || !paymentId || !supabase) return;
    if (processedPaymentRef.current === paymentId) return;

    processedPaymentRef.current = paymentId;
    let cancelled = false;

    const finalizePayment = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
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
        const {
          id: _requestId,
          createdAt: _createdAt,
          type: _requestType,
          ...requestInput
        } = paidRequest;
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

  // Paid flow — payment processing in progress
  if (isPaid && paidFlowState !== 'fallback') {
    const isMatching = paidFlowState === 'matching';

    return (
      <div className="form-shell animate-fade-in pt-8">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-6 py-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EFF3F2]">
            <Loader2 size={32} className="animate-spin text-[#2A6B6E]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-[#1C2B2D]">
              {isMatching
                ? lang === 'ru'
                  ? 'Готовим варианты'
                  : 'Preparing your options'
                : lang === 'ru'
                  ? 'Подтверждаем оплату'
                  : 'Confirming payment'}
            </h3>
            <p className="text-sm leading-relaxed text-[#1C2B2D]/55">
              {isMatching
                ? lang === 'ru'
                  ? 'Куратор получит заявку и подготовит варианты.'
                  : 'The curator will receive your request and prepare options.'
                : lang === 'ru'
                  ? 'Проверяем платёж, это займёт несколько секунд.'
                  : 'Verifying your payment, this takes a few seconds.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No result and not a paid flow — direct page access
  if (!hasResult && !isPaid) {
    return (
      <div className="form-shell animate-slide-up pt-8">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF3F2] text-[#1C2B2D]/40">
            <Info size={28} />
          </div>
          <h1 className="text-xl font-semibold text-[#1C2B2D]">
            {lang === 'ru' ? 'Страница недоступна напрямую' : 'Page not accessible directly'}
          </h1>
          <p className="text-sm leading-relaxed text-[#1C2B2D]/55">
            {lang === 'ru'
              ? 'Вернитесь на главную и заполните заявку заново.'
              : 'Return to the home page and submit a new request.'}
          </p>
          <Button onClick={onHome} className="w-full max-w-xs">
            {lang === 'ru' ? 'На главную' : 'Back to Home'}
          </Button>
        </div>
      </div>
    );
  }

  // Main success state — normal submission or paid fallback
  return (
    <div className="form-shell animate-slide-up" data-testid="success-screen">
      <div className="mx-auto flex max-w-sm flex-col gap-8 py-8 px-2">
        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EFF3F2] text-[#2A6B6E]">
            <CheckCircle size={36} strokeWidth={1.75} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold leading-snug text-[#1C2B2D]">
              {lang === 'ru' ? 'Спасибо. Мы поняли контекст.' : 'Thank you. We got the picture.'}
            </h1>
            <p className="text-sm leading-relaxed text-[#1C2B2D]/60">
              {lang === 'ru'
                ? 'Куратор посмотрит заявку и подберёт 2–3 варианта для вашей семьи.'
                : 'The curator will review your request and prepare 2–3 options for your family.'}
            </p>
          </div>
        </div>

        {/* What happens next */}
        <div className="rounded-2xl border border-[#1C2B2D]/8 bg-[#EFF3F2]/60 p-5 space-y-4">
          <p className="text-xs font-semibold tracking-[0.01em] text-[#1C2B2D]/50">
            {lang === 'ru' ? 'Что дальше' : 'What happens next'}
          </p>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#2A6B6E]">
              <MessageSquare size={14} />
            </div>
            <p className="text-sm leading-relaxed text-[#1C2B2D]/80">
              {lang === 'ru'
                ? 'Куратор изучит заявку и свяжется с вами напрямую — без лишних вопросов.'
                : 'The curator will study the request and contact you directly — no extra questions.'}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#2A6B6E]">
              <Clock size={14} />
            </div>
            <p className="text-sm leading-relaxed text-[#1C2B2D]/80">
              {lang === 'ru'
                ? 'Ответ обычно приходит в течение 24 часов. Вы получите 2–3 подходящих варианта.'
                : "You'll hear back within 24 hours with 2–3 suitable candidates."}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#2A6B6E]">
              <ShieldCheck size={14} />
            </div>
            <p className="text-sm leading-relaxed text-[#1C2B2D]/80">
              {lang === 'ru'
                ? 'Данные о семье переданы только куратору. Нянь мы показываем только после вашего согласия.'
                : 'Family details are shared only with the curator. Nanny profiles are shown only after your approval.'}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <Button onClick={onHome} pulse>
            {lang === 'ru' ? 'Понятно, вернуться на главную' : 'Got it, back to home'}
          </Button>
          <p className="text-xs text-center text-[#1C2B2D]/35">
            {lang === 'ru'
              ? 'Можно вернуться позже — заявка сохранена.'
              : 'You can come back later — your request is saved.'}
          </p>
        </div>
      </div>
    </div>
  );
};
