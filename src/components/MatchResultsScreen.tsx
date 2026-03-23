import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { slugify } from '@/core/utils/slugify';
import { Card, Button, Badge, EmptyState } from './UI';
import {
    MessageCircle, ArrowLeft, Sparkles, User,
    AlertTriangle, ShieldAlert, Share2, CheckCheck,
    Heart, Clock, MapPin, Check
} from 'lucide-react';
import { MatchResult, MatchCandidate, TrustBadge, Language } from '../types';
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
                                <div className="rounded-[18px] bg-stone-50 border border-stone-100 px-3 py-2 flex flex-col items-center justify-center shrink-0 min-w-[70px]">
                                    <span className="text-xl font-black text-stone-800 leading-none">{score}</span>
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
                        <div className="rounded-[22px] bg-stone-50/80 border border-stone-100 p-3.5">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.18em] block mb-1.5">
                                {lang === 'ru' ? 'Почему подходит' : 'Why it fits'}
                            </span>
                            <p className="text-[13px] sm:text-sm text-stone-700 leading-relaxed font-medium">
                                {humanExplanation}
                            </p>
                        </div>

                        <div className="rounded-[22px] bg-white/80 border border-stone-100 p-3.5">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.18em] mb-2 flex items-center gap-1">
                                <CheckCheck size={11} />
                                {lang === 'ru' ? 'Доверие' : 'Trust'}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {trustBadges.length > 0 ? (
                                    trustBadges.slice(0, 4).map(badge => (
                                        <span
                                            key={badge}
                                            className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-600 bg-stone-50 border border-stone-100 rounded-full px-2 py-0.5"
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
                        <div className="rounded-[20px] bg-stone-50/80 border border-stone-200/60 p-3">
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
                            className="col-span-2 py-3.5! rounded-[20px]! border-stone-200 text-stone-600 hover:bg-stone-50 bg-white shadow-sm"
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
            <div className="flex flex-col min-h-full animate-fade-in p-4">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-1 text-stone-400 hover:text-stone-600 mb-6 transition-colors"
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
        <div className="flex flex-col min-h-full animate-fade-in pb-12">
            {/* Header */}
            <div className="p-4 pb-0">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 mb-5 transition-colors group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span className="text-sm font-medium">{lang === 'ru' ? 'На главную' : 'Home'}</span>
                </button>

                <div className="surface-panel space-y-4 mb-6 p-5 sm:p-6 rounded-[28px]">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold border border-emerald-100/60 animate-pop-in shadow-sm">
                            <Sparkles size={15} className="text-emerald-500" />
                            {lang === 'ru'
                                ? `Найдено ${matchResult.candidates.length} сильных совпадения`
                                : `${matchResult.candidates.length} strong matches found`}
                        </div>
                        <div className="topbar-chip">
                            <CheckCheck size={12} />
                            {lang === 'ru' ? 'Проверка включена' : 'Trust checked'}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-[1.8rem] sm:text-[2.2rem] leading-[1.02] font-display font-semibold text-stone-900 max-w-lg">
                            {lang === 'ru' ? 'Кандидаты, с которыми можно спокойно идти дальше.' : 'Candidates you can calmly move forward with.'}
                        </h1>
                        <p className="text-sm sm:text-base text-stone-500 max-w-xl leading-relaxed">
                            {lang === 'ru'
                                ? 'Мы оставили профили, где совпадают требования семьи, базовые сигналы доверия и общий стиль общения.'
                                : 'We kept the profiles where family needs, trust signals, and overall style align.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {[
                            lang === 'ru' ? 'AI shortlist' : 'AI shortlist',
                            lang === 'ru' ? 'Верификация' : 'Verification',
                            lang === 'ru' ? 'Поддержка рядом' : 'Support nearby',
                        ].map((item) => (
                            <div key={item} className="rounded-[18px] bg-white/75 border border-stone-100 px-3 py-2.5 text-[11px] sm:text-xs font-semibold text-stone-600 text-center">
                                {item}
                            </div>
                        ))}
                    </div>

                    {matchResult.overallAdvice && (
                        <p className="text-sm text-stone-500 leading-relaxed animate-pop-in" style={{ animationDelay: '100ms' }}>
                            {matchResult.overallAdvice}
                        </p>
                    )}
                </div>
            </div>

            {/* Candidate Bento Cards */}
            <div className="space-y-8 px-4">
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

            {/* Bottom reassurance */}
            <div className="px-4 mt-8">
                <p className="text-xs text-center text-stone-300 leading-relaxed">
                    {lang === 'ru'
                        ? 'Напишите няне — это ни к чему не обязывает. Решение всегда за вами.'
                        : 'Message a nanny — no obligation. The decision is always yours.'}
                </p>
            </div>

            {/* Toast */}
            <ShareToast show={showToast} lang={lang} />
        </div>
    );
};
