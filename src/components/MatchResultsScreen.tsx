import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { t } from '@/core/i18n/translations';

interface MatchResultsScreenProps {
    lang: Language;
}

interface MatchResultsLocationState {
    matchResult?: MatchResult;
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
    const text = t[lang];
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
    const recommendationTone =
        index === 0
            ? (lang === 'ru' ? 'Сильнейшая рекомендация' : 'Strongest recommendation')
            : lang === 'ru'
                ? 'Спокойный запасной вариант'
                : 'Calm backup option';
    const recommendationCopy =
        score >= 90
            ? (lang === 'ru' ? 'Очень высокий уровень совпадения по стилю семьи и запросу.' : 'Very strong alignment with family style and request.')
            : score >= 80
                ? (lang === 'ru' ? 'Хороший баланс между опытом, ритмом семьи и сигналами доверия.' : 'Strong balance of experience, family rhythm, and trust signals.')
                : (lang === 'ru' ? 'Подходит как вариант для аккуратного диалога и уточнения деталей.' : 'Worth opening for a careful conversation and detail check.');
    const contextPills = [
        nanny.experience ? { icon: <Clock size={12} />, label: nanny.experience } : null,
        nanny.city || nanny.district ? { icon: <MapPin size={12} />, label: nanny.district || nanny.city || '' } : null,
        nanny.isNannySharing ? { icon: <Heart size={12} />, label: 'Nanny Sharing' } : null,
    ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string }>;

    return (
        <div className="animate-pop-in" style={{ animationDelay: `${index * 140 + 200}ms` }}>
            <Card className="overflow-hidden p-0!">
                <div className="space-y-0">
                    <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,rgba(252,249,244,0.96),rgba(241,236,227,0.98))] px-4 py-4 sm:px-5 sm:py-5">
                        <div className="absolute inset-x-6 top-0 h-24 rounded-full bg-[radial-gradient(circle_at_top,rgba(216,171,89,0.18),transparent_72%)] blur-2xl" />
                        <div className="relative space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 shadow-cloud-soft">
                                    <Sparkles size={12} className="text-amber-600" />
                                    {recommendationTone}
                                </div>
                                <div className="rounded-[22px] bg-stone-950 px-4 py-3 text-center text-white shadow-lg">
                                    <div className="text-[2rem] font-semibold leading-none">{score}</div>
                                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/60">
                                        {lang === 'ru' ? 'Рекомендация' : 'Fit'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className={`h-[84px] w-[84px] rounded-[26px] bg-linear-to-br ${avatarGradients[index % 3]} flex items-center justify-center shrink-0 overflow-hidden shadow-md ring-2 ring-white/80`}>
                                    {nanny.photo ? (
                                        <img src={nanny.photo} alt={nanny.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-black text-white/90 drop-shadow-sm">{initials}</span>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                                            {lang === 'ru' ? `Кандидат ${index + 1}` : `Candidate ${index + 1}`}
                                        </p>
                                        <h3 className="text-[1.4rem] font-semibold leading-[1.02] text-stone-900 sm:text-[1.6rem]">
                                            <Link
                                                to={`/nanny/${slugify(nanny.name, nanny.id)}`}
                                                onClick={handleTrackProfileOpen}
                                                className="transition-colors hover:text-amber-700"
                                            >
                                                {nanny.name || (lang === 'ru' ? 'Няня' : 'Nanny')}
                                            </Link>
                                        </h3>
                                        <p className="max-w-[26ch] text-sm leading-6 text-stone-600">
                                            {recommendationCopy}
                                        </p>
                                    </div>

                                    {hasMeta && (
                                        <div className="flex flex-wrap gap-2">
                                            {contextPills.map((item) => (
                                                <span
                                                    key={item.label}
                                                    className="inline-flex items-center gap-1.5 rounded-full bg-white/82 px-2.5 py-1.5 text-[11px] font-medium text-stone-600 shadow-sm"
                                                >
                                                    <span className="text-stone-400">{item.icon}</span>
                                                    {item.label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                        <div className="rounded-[1.7rem] bg-[color:var(--surface)] px-4 py-4">
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                                <MessageCircle size={12} className="text-stone-400" />
                                {text.shortlistReasonTitle}
                            </div>
                            <p className="text-[14px] leading-7 text-stone-700">
                                {humanExplanation}
                            </p>
                        </div>

                        <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,243,238,0.96))] px-4 py-4">
                            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                                <CheckCheck size={12} className="text-emerald-600" />
                                {text.shortlistTrustTitle}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {trustBadges.length > 0 ? (
                                    trustBadges.slice(0, 4).map((badge) => (
                                        <span
                                            key={badge}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-stone-600 shadow-sm"
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
                    </div>

                    {riskFlags && riskFlags.length > 0 && (
                        <div className="mx-4 rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(250,248,244,0.95),rgba(246,241,234,0.95))] px-4 py-4 sm:mx-5">
                            <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">
                                {text.shortlistRiskTitle}
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
                                                    {flag.advice}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-5 gap-2.5 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                        <Button
                            variant="primary"
                            onClick={handleOpenProfile}
                            className="col-span-3 py-3.5! rounded-[22px]! shadow-lg"
                        >
                            <MessageCircle size={16} />
                            {lang === 'ru' ? 'Открыть профиль' : 'Open profile'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={copyShareLink}
                            className="col-span-2 py-3.5! rounded-[22px]! border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50"
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
    const text = t[lang];
    const location = useLocation() as ReturnType<typeof useLocation> & { state: MatchResultsLocationState | null };
    const navigate = useNavigate();
    const mockMatchResult: MatchResult | null = useMemo(() => {
        if (!import.meta.env.DEV) return null;
        const params = new URLSearchParams(location.search);
        if (params.get('mock') !== '1') return null;

        return {
            overallAdvice: lang === 'ru'
                ? 'Мы оставили только те профили, где можно спокойно перейти к разговору о деталях, а не тратить силы на хаотичный просмотр.'
                : 'We kept only the profiles worth moving into a real conversation instead of chaotic browsing.',
            requestId: 'mock-request-1',
            candidates: [
                {
                    score: 93,
                    reasons: ['high_empathy', 'verified', 'experience_fit'],
                    humanExplanation: lang === 'ru'
                        ? 'Анна хорошо подходит семьям, которым важны спокойный ритм, прозрачная коммуникация и мягкая адаптация ребёнка.'
                        : 'Anna fits families that value calm rhythm, transparent communication, and a gentle child adaptation.',
                    trustBadges: ['verified_moderation', 'soft_skills', 'has_reviews'],
                    riskFlags: [
                        {
                            level: 'warning',
                            message: lang === 'ru' ? 'Уточните вечерний график заранее.' : 'Confirm evening schedule in advance.',
                            advice: lang === 'ru' ? 'Лучше сразу обсудить регулярные поздние смены.' : 'Discuss recurring late shifts early.',
                        },
                    ],
                    nanny: {
                        id: 'demo1234-mock',
                        name: 'Анна Иванова',
                        city: 'Москва',
                        district: 'Пресня',
                        experience: '7 лет',
                        expectedRate: '900 ₽',
                        contact: '+7 999 123-45-67',
                        isVerified: true,
                        about: 'Работаю с детьми 0–7 лет, внимательно отношусь к режиму и эмоциональному комфорту ребёнка.',
                        skills: ['Развивающие игры', 'Монтессори', 'Подготовка к школе'],
                        childAges: ['0-1', '1-3', '3-6'],
                        reviews: [
                            { id: 'r1', authorName: 'Мария', rating: 5, text: 'Очень спокойная и внимательная няня.', date: 1711900000000 },
                            { id: 'r2', authorName: 'Екатерина', rating: 5, text: 'Дочка быстро привыкла, всё прошло отлично.', date: 1711900000000 },
                        ],
                        softSkills: {
                            method: 'rule_based_v1',
                            rawScore: 88,
                            dominantStyle: 'Empathetic',
                            summary: 'Спокойная, внимательная и бережно выстраивает контакт с ребёнком.',
                            familySummary: 'Спокойная, внимательная и бережно выстраивает контакт с ребёнком.',
                            moderationSummary: 'Высокая эмпатия, устойчивое поведение, без выраженных рисковых сигналов.',
                            completedAt: 1711900000000,
                            coverage: 0.86,
                            confidenceReason: 'full_answers',
                            answeredItems: 12,
                            totalItems: 14,
                            traits: {
                                empathy: 92,
                                stability: 84,
                                responsibility: 87,
                                structure: 73,
                            },
                            signals: [],
                        },
                        photo: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=800&auto=format&fit=crop',
                        createdAt: 1711900000000,
                        type: 'nanny',
                    },
                },
                {
                    score: 88,
                    reasons: ['good_schedule_fit', 'verified'],
                    humanExplanation: lang === 'ru'
                        ? 'Екатерина сильна там, где семье нужен более структурный режим и опыт с дошкольниками.'
                        : 'Ekaterina is strong where the family needs a more structured rhythm and preschool experience.',
                    trustBadges: ['verified_moderation', 'ai_checked'],
                    nanny: {
                        id: 'demo5678-mock',
                        name: 'Екатерина Смирнова',
                        city: 'Москва',
                        district: 'Хамовники',
                        experience: '5 лет',
                        expectedRate: '850 ₽',
                        contact: '+7 999 123-45-67',
                        isVerified: true,
                        about: 'Люблю понятный режим дня, развитие через рутину и спокойное общение с семьёй.',
                        skills: ['Подготовка к школе', 'Прогулки', 'Режим дня'],
                        childAges: ['1-3', '3-6'],
                        reviews: [],
                        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop',
                        createdAt: 1711900000000,
                        type: 'nanny',
                    },
                },
            ],
        };
    }, [lang, location.search]);
    const matchResult = location.state?.matchResult || mockMatchResult;
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
                                        ? `Найдено ${matchResult.candidates.length} сильных совпадения`
                                        : `${matchResult.candidates.length} strong matches found`}
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
                                        text: lang === 'ru' ? 'Только кандидаты, с которыми есть смысл созваниваться.' : 'Only profiles worth opening and discussing.'
                                    },
                                    {
                                        title: lang === 'ru' ? 'Сигналы доверия видны сразу' : 'Trust appears early',
                                        text: lang === 'ru' ? 'Проверки, отзывы и риски вынесены вверх карточки.' : 'Checks, reviews, and risks are visible before deeper reading.'
                                    },
                                    {
                                        title: lang === 'ru' ? 'Решение без спешки' : 'Decision without rush',
                                        text: lang === 'ru' ? 'Можно открыть профиль, обсудить и вернуться к shortlist.' : 'Open a profile, discuss it, and come back later.'
                                    },
                                ].map((item) => (
                                    <div key={item.title} className="rounded-[1.6rem] bg-white/78 px-4 py-4 shadow-cloud-soft">
                                        <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                                        <p className="mt-2 text-sm leading-6 text-stone-600">{item.text}</p>
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
                                    {lang === 'ru' ? 'Оставили только профили, которые можно обсуждать без ощущения лотереи.' : 'Only profiles worth discussing without roulette-level uncertainty.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    lang === 'ru' ? 'Shortlist' : 'Shortlist',
                                    lang === 'ru' ? 'Проверка' : 'Verification',
                                    lang === 'ru' ? 'Диалог' : 'Dialogue',
                                ].map((item) => (
                                    <div key={item} className="secondary-card px-3 py-3 text-center text-[11px] font-semibold text-stone-600 sm:text-xs">
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
                        {text.shortlistFooter}
                    </p>
                </div>

                <ShareToast show={showToast} lang={lang} />
            </div>
        </div>
    );
};
