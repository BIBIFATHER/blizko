import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, EmptyState } from './UI';
import {
    MessageCircle, ArrowLeft, Sparkles, Star, User,
    AlertTriangle, ShieldAlert, Share2, CheckCheck,
    Heart, Clock, MapPin, Copy, Check
} from 'lucide-react';
import { MatchResult, MatchCandidate, TrustBadge, Language } from '../types';
import { trackMatchingResults, trackNannyCardClick } from '../services/analytics';

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

/* ─── Circular Score Ring ─── */
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 80 }) => {
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    // Color based on score
    const getColor = (s: number) => {
        if (s >= 85) return { stroke: '#16a34a', glow: 'rgba(22,163,74,0.2)' }; // green
        if (s >= 70) return { stroke: '#d97706', glow: 'rgba(217,119,6,0.2)' };  // amber
        return { stroke: '#ea580c', glow: 'rgba(234,88,12,0.2)' };               // orange
    };

    const color = getColor(score);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background track */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="rgba(0,0,0,0.04)"
                    strokeWidth={strokeWidth}
                />
                {/* Score arc */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                    style={{
                        filter: `drop-shadow(0 0 6px ${color.glow})`,
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-stone-800 leading-none tracking-tight">
                    {score}
                </span>
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                    %
                </span>
            </div>
        </div>
    );
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
    onMessage: (nannyId: string) => void;
    onShareToast: () => void;
}> = ({ candidate, index, lang, onMessage, onShareToast }) => {
    const { nanny, score, humanExplanation, trustBadges, riskFlags } = candidate;

    const initials = (nanny.name || '?')
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const gradients = [
        'from-amber-100 via-orange-50 to-yellow-50',
        'from-sky-100 via-cyan-50 to-blue-50',
        'from-emerald-100 via-teal-50 to-green-50',
    ];

    const avatarGradients = [
        'from-amber-300 to-orange-200',
        'from-sky-300 to-cyan-200',
        'from-emerald-300 to-teal-200',
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

    const hasMeta = !!(nanny.experience || nanny.city || nanny.district);

    return (
        <div
            className="animate-pop-in"
            style={{ animationDelay: `${index * 180 + 200}ms` }}
        >
            {/* ─── Bento Container ─── */}
            <div className="grid grid-cols-5 gap-2.5 overflow-hidden">

                {/* ── Row 1: Profile hero (full width) ── */}
                <Card className={`col-span-5 !p-5 overflow-hidden bg-gradient-to-br ${gradients[index % 3]} border-white/60 hover-lift`}>
                    <div className="flex items-center gap-x-4">
                        {/* Avatar */}
                        <div className={`w-[72px] h-[72px] rounded-[20px] bg-gradient-to-br ${avatarGradients[index % 3]} flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden ring-2 ring-white/80`}>
                            {nanny.photo ? (
                                <img src={nanny.photo} alt={nanny.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-black text-white/90 drop-shadow-sm">{initials}</span>
                            )}
                        </div>

                        {/* Name + meta */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-stone-800 truncate leading-tight">
                                {nanny.name || (lang === 'ru' ? 'Няня' : 'Nanny')}
                            </h3>
                            {hasMeta && (
                                <div className="flex items-center gap-x-3 mt-1.5 text-stone-500">
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
                            {/* Nanny Sharing badge inline */}
                            {nanny.isNannySharing && (
                                <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                    <Heart size={10} className="text-emerald-500" />
                                    Nanny Sharing
                                </span>
                            )}
                        </div>
                    </div>
                </Card>

                {/* ── Row 2: Score (2 cols) + Trust (3 cols) ── */}

                {/* Score Ring */}
                <Card className="col-span-2 !p-3 overflow-hidden flex flex-col items-center justify-center hover-lift bg-white/90">
                    <ScoreRing score={score} size={76} />
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.15em] mt-1.5">
                        {lang === 'ru' ? 'Совместимость' : 'Match'}
                    </span>
                </Card>

                {/* Trust Badges Grid */}
                <Card className="col-span-3 !p-3 overflow-hidden flex flex-col justify-center hover-lift bg-white/90">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-1">
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
                </Card>

                {/* ── Row 3: AI Explanation (full width) ── */}
                <Card className="col-span-5 !p-4 overflow-hidden hover-lift bg-white/90">
                    <div className="flex gap-x-4">
                        <div className="w-8 h-8 min-w-[2rem] rounded-xl bg-gradient-to-br from-violet-100 to-blue-50 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={16} className="text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-violet-500/80 uppercase tracking-[0.15em] block mb-1">
                                {lang === 'ru' ? 'Почему вы подходите друг другу' : 'Why you match'}
                            </span>
                            <p className="text-[13px] text-stone-700 leading-relaxed font-medium line-clamp-2">
                                {humanExplanation}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* ── Row 4: Risk Flags (only if exist) ── */}
                {riskFlags && riskFlags.length > 0 && (
                    <Card className="col-span-5 !p-3 overflow-hidden hover-lift bg-stone-50/80 border-stone-200/60">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.15em] block mb-2">
                            {lang === 'ru' ? 'На что обратить внимание' : 'Points to discuss'}
                        </span>
                        <div className="space-y-1.5">
                            {riskFlags.map((flag, i) => (
                                <div
                                    key={i}
                                    className={`flex items-start gap-x-3 p-2.5 rounded-xl text-xs leading-relaxed ${
                                        flag.level === 'critical'
                                            ? 'bg-red-50/80 text-red-800'
                                            : 'bg-amber-50/60 text-amber-900'
                                    }`}
                                >
                                    {flag.level === 'critical'
                                        ? <ShieldAlert size={14} className="text-red-500 flex-shrink-0 mt-px" />
                                        : <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-px" />
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
                    </Card>
                )}

                {/* ── Row 5: Action Buttons (full width) ── */}
                <div className="col-span-5 grid grid-cols-5 gap-2.5 mt-0.5">
                    <Button
                        variant="primary"
                        onClick={() => onMessage(nanny.id)}
                        className="col-span-3 !py-3.5 !rounded-2xl bg-stone-800 hover:bg-stone-900 border-none shadow-lg text-white"
                    >
                        <MessageCircle size={16} />
                        {lang === 'ru' ? 'Написать' : 'Message'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={copyShareLink}
                        className="col-span-2 !py-3.5 !rounded-2xl border-stone-200 text-stone-600 hover:bg-stone-50 bg-white shadow-sm"
                    >
                        <Share2 size={15} className="text-stone-400" />
                        {lang === 'ru' ? 'Обсудить' : 'Share'}
                    </Button>
                </div>
            </div>
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
        }
    }, [matchResult]);

    const handleMessage = (nannyId: string, nannyName?: string, position?: number, score?: number) => {
        trackNannyCardClick(nannyName || 'unknown', position || 0, score || 0);
        navigate('/parent/profile', { state: { openChat: nannyId } });
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

                <div className="text-center space-y-3 mb-8">
                    {/* Status pill */}
                    <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-full text-sm font-semibold border border-emerald-100/60 animate-pop-in shadow-sm">
                        <Sparkles size={15} className="text-emerald-500" />
                        {lang === 'ru'
                            ? `ИИ подобрал ${matchResult.candidates.length} ${matchResult.candidates.length === 1 ? 'няню' : 'нянь'} для вас`
                            : `AI found ${matchResult.candidates.length} match${matchResult.candidates.length === 1 ? '' : 'es'} for you`}
                    </div>

                    {/* Overall advice */}
                    {matchResult.overallAdvice && (
                        <p className="text-sm text-stone-400 max-w-sm mx-auto leading-relaxed animate-pop-in" style={{ animationDelay: '100ms' }}>
                            {matchResult.overallAdvice}
                        </p>
                    )}
                </div>
            </div>

            {/* Candidate Bento Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
                {matchResult.candidates.map((candidate, index) => (
                    <CandidateCard
                        key={candidate.nanny.id}
                        candidate={candidate}
                        index={index}
                        lang={lang}
                        onMessage={handleMessage}
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
