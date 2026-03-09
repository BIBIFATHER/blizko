import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, EmptyState } from './UI';
import { MessageCircle, ArrowLeft, Sparkles, Star, User, AlertTriangle, ShieldAlert } from 'lucide-react';
import { MatchResult, MatchCandidate, TrustBadge, Language } from '../types';

interface MatchResultsScreenProps {
    lang: Language;
}

const TRUST_BADGE_LABELS: Record<TrustBadge, Record<Language, string>> = {
    verified_docs: { ru: 'Документы проверены', en: 'Documents verified' },
    verified_moderation: { ru: 'Ручная модерация', en: 'Manually reviewed' },
    ai_checked: { ru: 'AI-проверка', en: 'AI-verified' },
    soft_skills: { ru: 'Soft skills оценены', en: 'Soft skills assessed' },
    has_reviews: { ru: 'Есть отзывы', en: 'Has reviews' },
};

const CandidateCard: React.FC<{
    candidate: MatchCandidate;
    index: number;
    lang: Language;
    onMessage: (nannyId: string) => void;
}> = ({ candidate, index, lang, onMessage }) => {
    const { nanny, score, humanExplanation, trustBadges, riskFlags } = candidate;

    // Generate initials for avatar
    const initials = (nanny.name || '?')
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const avatarColors = [
        'from-amber-200 to-amber-100',
        'from-sky-200 to-sky-100',
        'from-green-200 to-green-100',
    ];

    return (
        <Card
            className="animate-pop-in hover-lift"
            style={{ animationDelay: `${index * 150 + 200}ms` }}
        >
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColors[index % 3]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    {nanny.photo ? (
                        <img src={nanny.photo} alt={nanny.name} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                        <span className="text-lg font-bold text-stone-600">{initials}</span>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-stone-800 truncate">
                            {nanny.name || (lang === 'ru' ? 'Няня' : 'Nanny')}
                        </h3>
                        <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100/50 flex-shrink-0 ml-2">
                            <Sparkles size={12} className="text-amber-500" />
                            <span className="text-xs font-bold text-amber-700">{score}%</span>
                        </div>
                    </div>

                    {/* Experience summary */}
                    <p className="text-sm text-stone-400 mt-0.5 truncate">
                        {nanny.city}{nanny.experience ? ` · ${nanny.experience}` : ''}
                    </p>
                </div>
            </div>

            {/* AI Explanation — Peak-End Rule: emotional moment */}
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-50/80 to-sky-50/60 border border-amber-100/30">
                <div className="flex items-start gap-2">
                    <Sparkles size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-stone-600 leading-relaxed">{humanExplanation}</p>
                </div>
            </div>

            {/* Trust Badges — Authority Bias */}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {nanny.isNannySharing && (
                    <Badge variant="info" className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        <Sparkles size={10} className="mr-1 inline-block text-emerald-500" />
                        {lang === 'ru' ? 'Nanny Sharing' : 'Nanny Sharing'}
                    </Badge>
                )}
                {trustBadges.slice(0, 4).map(badge => (
                    <Badge key={badge} variant="trust" className="text-[11px]">
                        {TRUST_BADGE_LABELS[badge]?.[lang] || badge}
                    </Badge>
                ))}
            </div>

            {/* Risk Flags — trust-first: warn before booking */}
            {riskFlags && riskFlags.length > 0 && (
                <div className="mt-3 space-y-2">
                    {riskFlags.map((flag, i) => (
                        <div
                            key={i}
                            className={`p-2.5 rounded-xl border text-xs leading-relaxed ${flag.level === 'critical'
                                    ? 'bg-red-50/80 border-red-200/60 text-red-800'
                                    : 'bg-amber-50/80 border-amber-200/60 text-amber-800'
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                {flag.level === 'critical'
                                    ? <ShieldAlert size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    : <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                }
                                <div>
                                    <p className="font-medium">{flag.message}</p>
                                    {flag.advice && (
                                        <p className="mt-1 opacity-75">
                                            💡 {flag.advice}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CTA — Foot-in-the-Door: small step */}
            <Button
                variant="secondary"
                onClick={() => onMessage(nanny.id)}
                className="mt-4 !py-3"
            >
                <MessageCircle size={16} />
                {lang === 'ru' ? 'Написать' : 'Message'}
            </Button>
        </Card>
    );
};

export const MatchResultsScreen: React.FC<MatchResultsScreenProps> = ({ lang }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const matchResult = (location.state as any)?.matchResult as MatchResult | undefined;

    const handleMessage = (nannyId: string) => {
        // Navigate to chat with this nanny
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
        <div className="flex flex-col min-h-full animate-fade-in pb-10">
            {/* Header */}
            <div className="p-4 pb-0">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-1 text-stone-400 hover:text-stone-600 mb-4 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm">{lang === 'ru' ? 'На главную' : 'Home'}</span>
                </button>

                <div className="text-center space-y-2 mb-6">
                    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium border border-green-100/50 animate-pop-in">
                        <Star size={14} />
                        {lang === 'ru'
                            ? `Мы подобрали ${matchResult.candidates.length} ${matchResult.candidates.length === 1 ? 'кандидата' : 'кандидатов'}`
                            : `${matchResult.candidates.length} match${matchResult.candidates.length === 1 ? '' : 'es'} found`}
                    </div>
                    <p className="text-sm text-stone-400 max-w-sm mx-auto leading-relaxed">
                        {matchResult.overallAdvice}
                    </p>
                </div>
            </div>

            {/* Candidate Cards — Paradox of Choice: max 3 */}
            <div className="space-y-4 px-4">
                {matchResult.candidates.map((candidate, index) => (
                    <CandidateCard
                        key={candidate.nanny.id}
                        candidate={candidate}
                        index={index}
                        lang={lang}
                        onMessage={handleMessage}
                    />
                ))}
            </div>

            {/* Bottom CTA */}
            <div className="px-4 mt-6">
                <p className="text-xs text-center text-stone-300 mb-4">
                    {lang === 'ru'
                        ? 'Напишите няне — это ни к чему не обязывает'
                        : 'Message a nanny — no obligation'}
                </p>
            </div>
        </div>
    );
};
