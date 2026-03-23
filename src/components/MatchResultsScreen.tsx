import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { slugify } from '@/core/utils/slugify';
import { Card, Button, Badge, EmptyState } from './UI';
import {
    MessageCircle, ArrowLeft, Sparkles, User,
    AlertTriangle, ShieldAlert, Share2, CheckCheck,
    Heart, Clock, MapPin, Check
} from 'lucide-react';
import { MatchResult, MatchCandidate, TrustBadge, Language } from '@/core/types';
import {
    trackMatchingResults,
    trackMatchProfileOpen,
    trackNannyCardClick,
} from '@/services/analytics';
import {
    markMatchFollowUpProfileOpened,
    saveMatchFollowUp,
} from '@/services/matchFollowUp';

interface MatchResultsScreenProps {
    lang: Language;
}

const TRUST_BADGE_LABELS: Record<TrustBadge, Record<Language, string>> = {
    verified_docs: { ru: 'Документы ✓', en: 'Docs verified' },
    verified_moderation: { ru: 'Модерация ✓', en: 'Reviewed' },
    ai_checked: { ru: 'AI-проверка', en: 'AI-verified' },
    soft_skills: { ru: 'Soft skills ✓', en: 'Soft skills' },
    has_reviews: { ru: 'Есть отзывы', en: 'Has reviews' },
};

const TRUST_BADGE_ICONS: Record<TrustBadge, string> = {
    verified_docs: '📋',
    verified_moderation: '👁️',
    ai_checked: '🤖',
    soft_skills: '🧠',
    has_reviews: '⭐',
};

/* ─── Toast notification for copy feedback ─── */
const ShareToast: React.FC<{ show: boolean; lang: Language }> = ({ show, lang }) => (
    <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl
            bg-stone-800 text-white text-sm font-medium shadow-xl
            flex items-center gap-2 transition-all duration-300
            ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
        <Check size={16} className="text-green-400" />
        {lang === 'ru' ? 'Скопировано для отправки партнёру' : 'Copied for sharing'}
    </div>
);

/* ─── Candidate Bento Card ─── */
const CandidateCard: React.FC<{
    candidate: MatchCandidate;
    index: number;
    lang: Language;
    onOpenProfile: (nannyId: string, nannyName: string, position: number, score: number, navigateToProfile?: boolean) => void;
    onShareToast: () => void;
}> = ({ candidate, index, lang, onOpenProfile, onShareToast }) => {
    const { nanny, score, humanExplanation, trustBadges, riskFlags } = candidate;

    const initials = (nanny.name || '?')
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const avatarGradients = [
        'from-amber-300 to-[#d8b886]',
        'from-[#aab79a] to-[#d3decb]',
        'from-[#b79c82] to-[#dfc5a8]',
    ];

    const copyShareLink = useCallback(() => {
        const shareText = lang === 'ru'
            ? `Смотри, кого ИИ подобрал на Blizko — ${nanny.name} (${score}% совместимости)!\n\n💬 Почему подходит: «${humanExplanation}»\n\n👉 Попробуй сам: ${window.location.origin}`
            : `Check who AI matched on Blizko — ${nanny.name} (${score}% match)!\n\n💬 Why it works: "${humanExplanation}"\n\n👉 Try it: ${window.location.origin}`;

        if (navigator.share) {
            navigator.share({
                title: `Blizko: ${nanny.name} — ${score}%`,
                text: shareText,
                url: window.location.origin,
            }).catch(() => { /* user cancelled — ok */ });
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                onShareToast();
            }).catch(console.error);
        }
    }, [nanny, score, humanExplanation, lang, onShareToast]);

    const handleOpenProfile = useCallback(() => {
        onOpenProfile(nanny.id, nanny.name || 'unknown', index + 1, score, true);
    }, [index, nanny.id, nanny.name, onOpenProfile, score]);

    const handleTrackProfileOpen = useCallback(() => {
        onOpenProfile(nanny.id, nanny.name || 'unknown', index + 1, score, false);
    }, [index, nanny.id, nanny.name, onOpenProfile, score]);

    const hasMeta = !!(nanny.experience || nanny.city || nanny.district);

    return (
        <div className="animate-pop-in" style={{ animationDelay: `${index * 140 + 200}ms` }}>
            <Card className="p-4! sm:p-5!">
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`w-[72px] h-[72px] rounded-[20px] bg-linear-to-br ${avatarGradients[index % 3]} flex items-center justify-center shrink-0 shadow-md overflow-hidden ring-2 ring-white/80`}>
                            {nanny.photo ? (
                                <img src={nanny.photo} alt={nanny.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-black text-white/90 drop-shadow-sm">{initials}</span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="text-lg sm:text-xl font-semibold text-stone-800 truncate leading-tight">
                                        <Link
                                            to={`/nanny/${slugify(nanny.name, nanny.id)}`}
                                            onClick={handleTrackProfileOpen}
                                            className="hover:text-amber-700 transition-colors"
                                        >
                                            {nanny.name || (lang === 'ru' ? 'Няня' : 'Nanny')}
                                        </Link>
                                    </h3>
                                    {hasMeta && (
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-stone-500">
                                            {nanny.city && (
                                                <span className="flex items-center gap-1 text-xs font-medium">
                                                    <MapPin size={11} className="text-stone-400" />
                                                    {nanny.district || nanny.city}
                                                </span>
                                            )}
                                            {nanny.experience && (
                                                <span className="flex items-center gap-1 text-xs font-medium">
                                                    <Clock size={11} className="text-stone-400" />
                                                    {nanny.experience}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-[18px] border border-[color:var(--cloud-border)] bg-white/80 px-3 py-2 flex min-w-[76px] shrink-0 flex-col items-center justify-center shadow-cloud-soft">
                                    <span className="text-2xl font-black text-stone-900 leading-none">{score}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400 mt-1">
                                        {lang === 'ru' ? 'Match' : 'Match'}
                                    </span>
                                </div>
                            </div>
                            {/* Nanny Sharing badge inline */}
                            {nanny.isNannySharing && (
                                <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                    <Heart size={10} className="text-emerald-500" />
                                    Nanny Sharing
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_0.9fr] gap-3">
                        <div className="rounded-[22px] border border-[color:var(--cloud-border)] bg-white/78 p-3.5 shadow-cloud-soft">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.18em] block mb-1.5">
                                {lang === 'ru' ? 'Почему подходит' : 'Why it fits'}
                            </span>
                            <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed font-medium">
                                {humanExplanation}
                            </p>
                        </div>

                        <div className="rounded-[22px] border border-[color:var(--cloud-border)] bg-white/80 p-3.5 shadow-cloud-soft">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.18em] mb-2 flex items-center gap-1">
                                <CheckCheck size={11} />
                                {lang === 'ru' ? 'Доверие' : 'Trust'}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {trustBadges.length > 0 ? (
                                    trustBadges.slice(0, 4).map(badge => (
                                        <span
                                            key={badge}
                                            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--cloud-border)] bg-white px-2 py-0.5 text-[10px] font-medium text-stone-600"
                                        >
                                            <span className="text-[10px]">{TRUST_BADGE_ICONS[badge]}</span>
                                            {TRUST_BADGE_LABELS[badge]?.[lang] || badge}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[10px] text-stone-400 font-medium italic">
                                        {lang === 'ru' ? 'Базовая проверка пройдена' : 'Basic check passed'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {riskFlags && riskFlags.length > 0 && (
                        <div className="rounded-[20px] border border-stone-200/60 bg-stone-50/80 p-3">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.15em] block mb-2">
                                {lang === 'ru' ? 'Обсудить заранее' : 'Discuss in advance'}
                            </span>
                            <div className="space-y-1.5">
                                {riskFlags.map((flag, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-start gap-2 p-2.5 rounded-xl text-xs leading-relaxed ${
                                            flag.level === 'critical'
                                                ? 'bg-red-50/80 text-red-800'
                                                : 'bg-amber-50/60 text-amber-900'
                                        }`}
                                    >
                                        {flag.level === 'critical'
                                            ? <ShieldAlert size={14} className="text-red-500 shrink-0 mt-px" />
                                            : <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-px" />
                                        }
                                        <div>
                                            <p className="font-semibold">{flag.message}</p>
                                            {flag.advice && (
                                                <p className="mt-0.5 opacity-75 font-medium">
                                                    💡 {flag.advice}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-5 gap-2.5">
                        <Button
                            variant="primary"
                            onClick={handleOpenProfile}
                            className="col-span-3 py-3.5! rounded-[20px]! shadow-lg"
                        >
                            <MessageCircle size={16} />
                            {lang === 'ru' ? 'Написать' : 'Message'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={copyShareLink}
                            className="col-span-2 py-3.5! rounded-[20px]! border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50"
                        >
                            <Share2 size={15} className="text-stone-400" />
                            {lang === 'ru' ? 'Обсудить' : 'Share'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

/* ─── Main Screen ─── */
export const MatchResultsScreen: React.FC<MatchResultsScreenProps> = ({ lang }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const matchResult = (location.state as any)?.matchResult as MatchResult | undefined;
    const [showToast, setShowToast] = useState(false);

    const handleShareToast = useCallback(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    }, []);

    useEffect(() => {
        if (matchResult && matchResult.candidates.length > 0) {
            trackMatchingResults(
                matchResult.candidates.length,
                matchResult.candidates[0]?.score || 0
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
        if (!navigateToProfile) return;
        const slug = slugify(nannyName || nannyId, nannyId);
        navigate(`/nanny/${slug}`);
    };

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
                    description={lang === 'ru'
                        ? 'Мы расширяем поиск. Попробуйте скорректировать бюджет или график.'
                        : 'We\'re expanding the search. Try adjusting your budget or schedule.'}
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
                                        ? `Найдено ${matchResult.candidates.length} сильных совпадения`
                                        : `${matchResult.candidates.length} strong matches found`}
                                </div>
                                <div className="topbar-chip">
                                    <CheckCheck size={12} />
                                    {lang === 'ru' ? 'Проверка включена' : 'Trust checked'}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h1 className="max-w-3xl text-4xl text-stone-950 md:text-6xl">
                                    {lang === 'ru' ? 'Кандидаты, с которыми можно спокойно идти дальше.' : 'Candidates you can calmly move forward with.'}
                                </h1>
                                <p className="max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                                    {lang === 'ru'
                                        ? 'Мы оставили профили, где совпадают требования семьи, базовые сигналы доверия и общий стиль общения.'
                                        : 'We kept the profiles where family needs, trust signals, and overall style align.'}
                                </p>
                            </div>

                            {matchResult.overallAdvice && (
                                <div className="rounded-[24px] border border-[color:var(--cloud-border)] bg-white/74 px-4 py-4 text-sm leading-7 text-stone-600 shadow-cloud-soft animate-pop-in" style={{ animationDelay: '100ms' }}>
                                    {matchResult.overallAdvice}
                                </div>
                            )}
                        </div>

                        <div className="relative z-10 grid gap-3">
                            <div className="hero-stat">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                    {lang === 'ru' ? 'Shortlist' : 'Shortlist'}
                                </p>
                                <p className="mt-3 text-3xl font-semibold text-stone-950">{matchResult.candidates.length}</p>
                                <p className="mt-2 text-sm leading-6 text-stone-600">
                                    {lang === 'ru' ? 'Оставили только профили, которые можно обсуждать без ощущения лотереи.' : 'Only profiles worth discussing without roulette-level uncertainty.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    lang === 'ru' ? 'AI shortlist' : 'AI shortlist',
                                    lang === 'ru' ? 'Верификация' : 'Verification',
                                    lang === 'ru' ? 'Поддержка рядом' : 'Support nearby',
                                ].map((item) => (
                                    <div key={item} className="rounded-[18px] border border-[color:var(--cloud-border)] bg-white/78 px-3 py-3 text-center text-[11px] font-semibold text-stone-600 shadow-cloud-soft sm:text-xs">
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <Card className="p-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                                        <Heart size={15} className="text-rose-500" />
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
                                {lang === 'ru' ? 'Сверху идут самые сильные совпадения по запросу, доверию и стилю общения.' : 'Top candidates combine request fit, trust signals, and communication style.'}
                            </p>
                        </div>
                        <Badge variant="neutral" className="hidden md:inline-flex">{lang === 'ru' ? 'Открывайте профили по одному' : 'Open profiles one by one'}</Badge>
                    </div>

                    <div className="space-y-6">
                        {matchResult.candidates.map((candidate, index) => (
                            <CandidateCard
                                key={candidate.nanny.id}
                                candidate={candidate}
                                index={index}
                                lang={lang}
                                onOpenProfile={handleOpenProfile}
                                onShareToast={handleShareToast}
                            />
                        ))}
                    </div>
                </section>

                <div className="form-footer-rail p-5 text-center md:p-6">
                    <p className="mx-auto max-w-2xl text-sm leading-7 text-stone-500">
                        {lang === 'ru'
                            ? 'Напишите няне, обсудите shortlist с партнёром или вернитесь позже. Решение всегда за вами, а не за интерфейсом.'
                            : 'Message a nanny, discuss the shortlist with your partner, or come back later. The decision is yours, not the interface’s.'}
                    </p>
                </div>

                <ShareToast show={showToast} lang={lang} />
            </div>
        </div>
    );
};
