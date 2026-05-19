import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { slugify } from '@/core/utils/slugify';
import { Card, Button, Badge, EmptyState } from './UI';
import { Skeleton } from './ui/feedback-primitives';
import { SkeletonNannyCard } from './ui/SkeletonNannyCard';
import { ErrorState } from './ui/ErrorState';
import { useMatchResults } from '@/hooks/useMatchResults';
import {
    MessageCircle, ArrowLeft, Sparkles, User,
    AlertTriangle, ShieldAlert, Share2, CheckCheck,
    Heart, Clock, MapPin, Check, ChevronDown, ShieldCheck,
} from 'lucide-react';
import { MatchCandidate, TrustBadge, Language } from '@/core/types';
import {
    trackMatchingResults,
    trackMatchProfileOpen,
    trackNannyCardClick,
} from '@/services/analytics';
import {
    markMatchFollowUpProfileOpened,
    saveMatchFollowUp,
} from '@/services/matchFollowUp';
import { recordMatchOutcome } from '@/services/matchingFeedback';
import { supabase } from '@/services/supabase';
import { t } from '@/core/i18n/translations';

/* ─── Warm Trust palette ─── */
const PETROL     = '#2A6B6E';
const PETROL_BG  = '#EFF3F2';
const SAGE       = '#7FA99B';

interface MatchResultsScreenProps {
    lang: Language;
}

const TRUST_BADGE_LABELS: Record<TrustBadge, Record<Language, string>> = {
    verified_docs:      { ru: 'Документы ✓',  en: 'Docs verified'  },
    verified_moderation:{ ru: 'Модерация ✓',  en: 'Reviewed'       },
    ai_checked:         { ru: 'AI-проверка',  en: 'AI-verified'    },
    soft_skills:        { ru: 'Soft skills ✓',en: 'Soft skills'    },
    has_reviews:        { ru: 'Есть отзывы',  en: 'Has reviews'    },
};

const TRUST_BADGE_ICONS: Record<TrustBadge, string> = {
    verified_docs: '📋', verified_moderation: '👁️', ai_checked: '🤖',
    soft_skills: '🧠', has_reviews: '⭐',
};

/* Score is internal — parents see a qualitative tier, not a number. */
function getTier(score: number, lang: Language): string {
    if (score >= 85) return lang === 'ru' ? 'Сильный вариант'  : 'Strong match';
    if (score >= 70) return lang === 'ru' ? 'Хороший вариант'  : 'Good match';
    return               lang === 'ru' ? 'Вариант для диалога' : 'Worth discussing';
}

/* ─── Spring config ─── */
const layoutSpring = { type: 'spring' as const, damping: 28, stiffness: 220 };
const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ─── Share toast ─── */
const ShareToast: React.FC<{ show: boolean; lang: Language }> = ({ show, lang }) => (
    <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl
            bg-[#1C2B2D] text-white text-sm font-medium shadow-xl
            flex items-center gap-2 transition-all duration-300
            ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
        <Check size={16} className="text-[#7FA99B]" />
        {lang === 'ru' ? 'Скопировано для отправки партнёру' : 'Copied for sharing'}
    </div>
);

/* ─── Candidate Card ─── */
const CandidateCard: React.FC<{
    candidate: MatchCandidate;
    index: number;
    lang: Language;
    isExpanded: boolean;
    onToggle: () => void;
    onOpenProfile: (nannyId: string, nannyName: string, position: number, score: number, navigateToProfile?: boolean) => void;
    onShareToast: () => void;
    onReject: (nannyId: string) => void;
}> = ({ candidate, index, lang, isExpanded, onToggle, onOpenProfile, onShareToast, onReject }) => {
    const text = t[lang];
    const { nanny, score, humanExplanation, trustBadges, riskFlags } = candidate;

    const initials = (nanny.name || '?')
        .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const avatarGradients = [
        'from-[#2A6B6E] to-[#7FA99B]',
        'from-[#aab79a] to-[#d3decb]',
        'from-[#b79c82] to-[#dfc5a8]',
    ];

    const tier = getTier(score, lang);

    const copyShareLink = useCallback(() => {
        const shareText = lang === 'ru'
            ? `Посмотри, кого Blizko подобрал — ${nanny.name}.\n\n💬 Почему подходит: «${humanExplanation}»\n\n👉 Попробуй сам: ${window.location.origin}`
            : `Check who Blizko matched — ${nanny.name}.\n\n💬 Why it works: "${humanExplanation}"\n\n👉 Try it: ${window.location.origin}`;

        if (navigator.share) {
            navigator.share({ title: `Blizko: ${nanny.name}`, text: shareText, url: window.location.origin })
                .catch(() => {});
        } else {
            navigator.clipboard.writeText(shareText).then(onShareToast).catch(console.error);
        }
    }, [nanny, humanExplanation, lang, onShareToast]);

    const handleOpenProfile = useCallback(() => {
        onOpenProfile(nanny.id, nanny.name || 'unknown', index + 1, score, true);
    }, [index, nanny.id, nanny.name, onOpenProfile, score]);

    const hasMeta = !!(nanny.experience || nanny.city || nanny.district);
    const contextPills = [
        nanny.experience                      ? { icon: <Clock size={12} />, label: nanny.experience }                 : null,
        nanny.city || nanny.district          ? { icon: <MapPin size={12} />, label: nanny.district || nanny.city || '' } : null,
        nanny.isNannySharing                  ? { icon: <Heart size={12} />, label: 'Nanny Sharing' }                   : null,
    ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string }>;

    /* First card gets a subtle breathing glow — position-based, no score exposed */
    const glowProps = index === 0 && !prefersReducedMotion ? {
        animate: {
            boxShadow: [
                '0 2px 16px -4px rgba(42,107,110,0.06)',
                '0 0 18px 2px rgba(42,107,110,0.14)',
                '0 2px 16px -4px rgba(42,107,110,0.06)',
            ],
        },
        transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
    } : {};

    return (
        <motion.div
            layout={!prefersReducedMotion}
            layoutId={`card-${nanny.id}`}
            transition={layoutSpring}
            className="animate-pop-in"
            style={{ animationDelay: `${index * 140 + 200}ms` }}
            {...glowProps}
        >
            <div
                className={`overflow-hidden rounded-[2rem] bg-white transition-shadow duration-300 ${
                    isExpanded
                        ? 'shadow-[0_20px_60px_-15px_rgba(42,107,110,0.14)]'
                        : 'shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_-8px_rgba(42,107,110,0.10)]'
                }`}
            >
                {/* ─── Always-visible header ─── */}
                <motion.div
                    layout={!prefersReducedMotion}
                    className="cursor-pointer select-none active:scale-[0.995] transition-transform"
                    onClick={onToggle}
                >
                    <div className="px-6 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6">
                        <div className="flex items-start gap-5">
                            {/* Avatar */}
                            <motion.div
                                layout={!prefersReducedMotion}
                                className={`${isExpanded ? 'h-[88px] w-[88px]' : 'h-[72px] w-[72px]'} rounded-[24px] bg-linear-to-br ${avatarGradients[index % 3]} flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white transition-all duration-300`}
                                style={{ boxShadow: `0 8px 24px -4px ${PETROL}28` }}
                            >
                                {nanny.photo ? (
                                    <img src={nanny.photo} alt={nanny.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-black text-white/90 drop-shadow-sm">{initials}</span>
                                )}
                            </motion.div>

                            {/* Name + tier + meta */}
                            <div className="min-w-0 flex-1 space-y-2.5">
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                                        {lang === 'ru' ? `Кандидат ${index + 1}` : `Candidate ${index + 1}`}
                                    </p>
                                    <h3 className="text-[1.35rem] font-semibold leading-[1.1] text-[#1C2B2D] sm:text-[1.5rem]">
                                        {nanny.name || (lang === 'ru' ? 'Няня' : 'Nanny')}
                                    </h3>
                                    {/* Qualitative tier — no numeric score exposed */}
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                                        style={{ backgroundColor: PETROL_BG, color: PETROL }}
                                    >
                                        <ShieldCheck size={11} />
                                        {tier}
                                    </span>
                                </div>

                                {hasMeta && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {contextPills.map((item) => (
                                            <span
                                                key={item.label}
                                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-stone-500"
                                                style={{ backgroundColor: '#F8F9FA' }}
                                            >
                                                <span className="text-stone-400">{item.icon}</span>
                                                {item.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Expand chevron */}
                        <div className="mt-4 flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                                className="rounded-full p-1"
                                style={{ color: isExpanded ? PETROL : '#9CA3AF' }}
                            >
                                <ChevronDown size={18} />
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* ─── Expanded details ─── */}
                <AnimatePresence mode="wait">
                    {isExpanded && (
                        <motion.div
                            initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={prefersReducedMotion ? { duration: 0 } : { ...layoutSpring, opacity: { duration: 0.2 } }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-4 px-6 pb-6 sm:px-8 sm:pb-8">
                                <div className="h-px bg-stone-100" />

                                {/* Why it fits — hero of the card */}
                                <div className="rounded-2xl px-5 py-5" style={{ backgroundColor: '#F9F6F2' }}>
                                    <div className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                                        <MessageCircle size={12} style={{ color: SAGE }} />
                                        {text.shortlistReasonTitle}
                                    </div>
                                    <p className="text-[14px] leading-7 text-[#1C2B2D]">
                                        {humanExplanation}
                                    </p>
                                </div>

                                {/* Trust badges */}
                                <div className="rounded-2xl px-5 py-5" style={{ backgroundColor: PETROL_BG }}>
                                    <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: PETROL }}>
                                        <CheckCheck size={12} />
                                        {text.shortlistTrustTitle}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {trustBadges.length > 0 ? (
                                            trustBadges.slice(0, 4).map((badge) => (
                                                <span
                                                    key={badge}
                                                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-[#1C2B2D] shadow-sm"
                                                >
                                                    <span className="text-[10px]">{TRUST_BADGE_ICONS[badge]}</span>
                                                    {TRUST_BADGE_LABELS[badge]?.[lang] || badge}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[11px] font-medium italic text-stone-400">
                                                {lang === 'ru' ? 'Базовая проверка уже пройдена' : 'Basic review already passed'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Risk flags */}
                                {riskFlags && riskFlags.length > 0 && (
                                    <div className="rounded-2xl px-5 py-5 bg-amber-50/60">
                                        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">
                                            {text.shortlistRiskTitle}
                                        </span>
                                        <div className="space-y-2">
                                            {riskFlags.map((flag, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex items-start gap-2.5 rounded-xl p-3 text-xs leading-relaxed ${
                                                        flag.level === 'critical'
                                                            ? 'bg-red-50/80 text-red-800'
                                                            : 'bg-amber-50/80 text-amber-900'
                                                    }`}
                                                >
                                                    {flag.level === 'critical'
                                                        ? <ShieldAlert size={14} className="text-red-500 shrink-0 mt-px" />
                                                        : <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-px" />
                                                    }
                                                    <div>
                                                        <p className="font-semibold">{flag.message}</p>
                                                        {flag.advice && (
                                                            <p className="mt-0.5 opacity-75 font-medium">{flag.advice}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="grid grid-cols-5 gap-3 pt-2">
                                    <button
                                        onClick={handleOpenProfile}
                                        className="col-span-3 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all duration-300 active:scale-[0.97] hover:brightness-110"
                                        style={{
                                            backgroundColor: PETROL,
                                            boxShadow: `0 8px 24px -6px ${PETROL}50`,
                                        }}
                                    >
                                        <MessageCircle size={16} />
                                        {lang === 'ru' ? 'Открыть профиль' : 'Open profile'}
                                    </button>
                                    <Button
                                        variant="outline"
                                        onClick={copyShareLink}
                                        className="col-span-2 py-3.5! rounded-2xl! border-stone-200 bg-white text-stone-500 shadow-sm hover:bg-stone-50"
                                    >
                                        <Share2 size={15} className="text-stone-400" />
                                        {lang === 'ru' ? 'Обсудить' : 'Share'}
                                    </Button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onReject(nanny.id)}
                                    className="w-full pt-1 text-center text-xs text-stone-400 transition-colors hover:text-stone-600"
                                >
                                    {lang === 'ru' ? 'Не подходит' : 'Not a match'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

/* ─── Main Screen ─── */
export const MatchResultsScreen: React.FC<MatchResultsScreenProps> = ({ lang }) => {
    const text = t[lang];
    const navigate = useNavigate();
    const { data: matchResult, loading, error } = useMatchResults(lang);
    const [showToast, setShowToast] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [parentId, setParentId] = useState<string | null>(null);

    useEffect(() => {
        if (!supabase) return;
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setParentId(data.user.id);
        });
    }, []);

    const handleShareToast = useCallback(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    }, []);

    useEffect(() => {
        if (matchResult && matchResult.candidates.length > 0) {
            trackMatchingResults(
                matchResult.candidates.length,
                matchResult.candidates[0]?.score || 0,
            );
            saveMatchFollowUp(matchResult);
        }
    }, [matchResult]);

    const handleOpenProfile = (
        nannyId: string,
        nannyName?: string,
        position?: number,
        score?: number,
        navigateToProfile = true,
    ) => {
        trackNannyCardClick(nannyName || 'unknown', position || 0, score || 0);
        trackMatchProfileOpen(nannyId, position || 0, score || 0);
        markMatchFollowUpProfileOpened(nannyId);
        if (parentId) recordMatchOutcome(parentId, nannyId, 'interested', undefined, score);
        if (!navigateToProfile) return;
        const slug = slugify(nannyName || nannyId, nannyId);
        navigate(`/nanny/${slug}`);
    };

    const handleRejectCandidate = useCallback((nannyId: string) => {
        if (parentId) recordMatchOutcome(parentId, nannyId, 'rejected');
        setExpandedId(null);
    }, [parentId]);

    if (loading) {
        return (
            <div className="page-frame animate-fade-in py-4 pb-14 md:py-8">
                <div className="section-stack space-y-6">
                    <Skeleton className="h-8 w-48 rounded-full" />
                    <SkeletonNannyCard />
                    <SkeletonNannyCard />
                    <SkeletonNannyCard />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-frame animate-fade-in py-6">
                <button
                    onClick={() => navigate('/')}
                    className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cloud-border)] bg-white/75 px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm">{lang === 'ru' ? 'Назад' : 'Back'}</span>
                </button>
                <ErrorState lang={lang} onRetry={() => window.location.reload()} />
            </div>
        );
    }

    if (!matchResult || matchResult.candidates.length === 0) {
        return (
            <div className="page-frame animate-fade-in py-6">
                <button
                    onClick={() => navigate('/')}
                    className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cloud-border)] bg-white/75 px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm">{lang === 'ru' ? 'Назад' : 'Back'}</span>
                </button>
                <EmptyState
                    icon={<User size={28} />}
                    title={lang === 'ru' ? 'Пока кандидатов нет' : 'No candidates yet'}
                    description={text.shortlistEmptyDesc}
                    actionLabel={lang === 'ru' ? 'Изменить запрос' : 'Edit request'}
                    onAction={() => navigate('/find-nanny')}
                />
            </div>
        );
    }

    return (
        <div className="page-frame animate-fade-in py-4 pb-14 md:py-8">
            <div className="section-stack">
                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cloud-border)] bg-white/75 px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span className="text-sm font-medium">{lang === 'ru' ? 'На главную' : 'Home'}</span>
                </button>

                <section className="hero-shell">
                    <div className="hero-grid">
                        <div className="relative z-10 space-y-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="eyebrow">
                                    <Sparkles size={14} />
                                    {lang === 'ru'
                                        ? `${matchResult.candidates.length} варианта для знакомства`
                                        : `${matchResult.candidates.length} candidates to consider`}
                                </div>
                                <div className="topbar-chip">
                                    <CheckCheck size={12} />
                                    {lang === 'ru' ? 'Проверка включена' : 'Trust checked'}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h1 className="max-w-[12ch] text-[2.35rem] leading-[0.96] text-stone-950 sm:max-w-3xl sm:text-4xl md:text-6xl">
                                    {text.shortlistHeroTitle}
                                </h1>
                                <p className="max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                                    {text.shortlistHeroSubtitle}
                                </p>
                            </div>

                            {matchResult.overallAdvice && (
                                <div className="rounded-[24px] border border-[color:var(--cloud-border)] bg-white/74 px-4 py-4 text-sm leading-7 text-stone-600 shadow-cloud-soft animate-pop-in" style={{ animationDelay: '100ms' }}>
                                    {matchResult.overallAdvice}
                                </div>
                            )}

                            <div className="grid gap-2 sm:grid-cols-3">
                                {[
                                    {
                                        title: lang === 'ru' ? 'Не бесконечный список' : 'Not an endless list',
                                        body:  lang === 'ru' ? 'Только кандидаты, с которыми есть смысл созваниваться.' : 'Only profiles worth opening and discussing.',
                                    },
                                    {
                                        title: lang === 'ru' ? 'Сигналы доверия видны сразу' : 'Trust appears early',
                                        body:  lang === 'ru' ? 'Проверки, отзывы и риски вынесены вверх карточки.' : 'Checks, reviews, and risks are visible before deeper reading.',
                                    },
                                    {
                                        title: lang === 'ru' ? 'Решение без спешки' : 'Decision without rush',
                                        body:  lang === 'ru' ? 'Можно открыть профиль, обсудить и вернуться к shortlist.' : 'Open a profile, discuss it, and come back later.',
                                    },
                                ].map((item) => (
                                    <div key={item.title} className="rounded-[1.6rem] bg-white/78 px-4 py-4 shadow-cloud-soft">
                                        <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                                        <p className="mt-2 text-sm leading-6 text-stone-600">{item.body}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative z-10 grid gap-3">
                            <div className="hero-stat">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                    {lang === 'ru' ? 'Shortlist' : 'Shortlist'}
                                </p>
                                <p className="mt-3 text-3xl font-semibold text-stone-950">{matchResult.candidates.length}</p>
                                <p className="mt-2 text-sm leading-6 text-stone-600">
                                    {lang === 'ru'
                                        ? 'Оставили только профили, которые можно обсуждать без ощущения лотереи.'
                                        : 'Only profiles worth discussing without roulette-level uncertainty.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    lang === 'ru' ? 'Shortlist' : 'Shortlist',
                                    lang === 'ru' ? 'Проверка' : 'Verification',
                                    lang === 'ru' ? 'Диалог'   : 'Dialogue',
                                ].map((item) => (
                                    <div key={item} className="secondary-card px-3 py-3 text-center text-[11px] font-semibold text-stone-600 sm:text-xs">
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <Card className="p-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                                        <Heart size={15} className="text-rose-400" />
                                        {lang === 'ru' ? 'Решение без давления' : 'Decision without pressure'}
                                    </div>
                                    <p className="text-sm leading-6 text-stone-600">
                                        {lang === 'ru'
                                            ? 'Можно открыть профиль, обсудить детали с партнёром и вернуться к shortlist позже.'
                                            : 'You can review a profile, discuss it with your partner, and return to the shortlist later.'}
                                    </p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>

                <section className="section-shell p-4 md:p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                {lang === 'ru' ? 'Shortlist' : 'Shortlist'}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-stone-600">
                                {lang === 'ru'
                                    ? 'Сверху идут самые сильные совпадения по запросу, доверию и стилю общения.'
                                    : 'Top candidates combine request fit, trust signals, and communication style.'}
                            </p>
                        </div>
                        <Badge variant="neutral" className="hidden md:inline-flex">
                            {lang === 'ru' ? 'Открывайте профили по одному' : 'Open profiles one by one'}
                        </Badge>
                    </div>

                    <LayoutGroup>
                        <div className="space-y-6">
                            {matchResult.candidates.map((candidate, index) => (
                                <CandidateCard
                                    key={candidate.nanny.id}
                                    candidate={candidate}
                                    index={index}
                                    lang={lang}
                                    isExpanded={expandedId === candidate.nanny.id}
                                    onToggle={() => setExpandedId(
                                        expandedId === candidate.nanny.id ? null : candidate.nanny.id
                                    )}
                                    onOpenProfile={handleOpenProfile}
                                    onShareToast={handleShareToast}
                                    onReject={handleRejectCandidate}
                                />
                            ))}
                        </div>
                    </LayoutGroup>
                </section>

                <div className="form-footer-rail p-5 text-center md:p-6">
                    <p className="mx-auto max-w-2xl text-sm leading-7 text-stone-500">
                        {text.shortlistFooter}
                    </p>
                </div>

                <ShareToast show={showToast} lang={lang} />
            </div>
        </div>
    );
};
