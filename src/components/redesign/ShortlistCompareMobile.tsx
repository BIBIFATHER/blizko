import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  Heart,
  MessageCircle,
  ChevronRight,
  Check,
  X,
  Users,
  Sparkles,
  ArrowRight,
  Scale,
  HelpCircle,
  Info,
  BadgeCheck,
} from 'lucide-react';
import { NannyProfile, MatchCandidate, Language } from '@/core/types/types';
import { slugify } from '@/core/utils/slugify';

interface ShortlistCompareMobileProps {
  lang: Language;
  candidates: MatchCandidate[];
  overallAdvice?: string;
}

// Comparison category
interface CompareCategory {
  key: string;
  label: string;
  labelEn: string;
  getValue: (nanny: NannyProfile) => string | null;
  highlight?: (values: (string | null)[]) => number | null; // returns index of "best" or null
}

const COMPARE_CATEGORIES: CompareCategory[] = [
  {
    key: 'experience',
    label: 'Опыт',
    labelEn: 'Experience',
    getValue: (n) => n.experience || null,
    highlight: (values) => {
      const nums = values.map(v => v ? parseInt(v) : 0);
      const max = Math.max(...nums);
      return max > 0 ? nums.indexOf(max) : null;
    },
  },
  {
    key: 'rate',
    label: 'Ставка',
    labelEn: 'Rate',
    getValue: (n) => n.expectedRate ? `${n.expectedRate} ₽/ч` : null,
  },
  {
    key: 'location',
    label: 'Район',
    labelEn: 'District',
    getValue: (n) => n.district || n.city || null,
  },
  {
    key: 'verification',
    label: 'Проверка',
    labelEn: 'Verification',
    getValue: (n) => n.isVerified ? 'Пройдена' : 'В процессе',
    highlight: (values) => {
      const idx = values.findIndex(v => v === 'Пройдена');
      return idx >= 0 ? idx : null;
    },
  },
  {
    key: 'softSkills',
    label: 'Soft skills',
    labelEn: 'Soft skills',
    getValue: (n) => n.softSkills?.dominantStyle || null,
  },
  {
    key: 'reviews',
    label: 'Отзывы',
    labelEn: 'Reviews',
    getValue: (n) => n.reviews?.length ? `${n.reviews.length} отзывов` : null,
    highlight: (values) => {
      const nums = values.map(v => v ? parseInt(v) : 0);
      const max = Math.max(...nums);
      return max > 0 ? nums.indexOf(max) : null;
    },
  },
];

// Shortlist card component (stacked view)
const ShortlistCard: React.FC<{
  candidate: MatchCandidate;
  index: number;
  lang: Language;
  isSelected: boolean;
  onSelect: () => void;
  onOpenProfile: () => void;
}> = ({ candidate, index, lang, isSelected, onSelect, onOpenProfile }) => {
  const { nanny, score, humanExplanation, trustBadges } = candidate;
  
  const avgRating = nanny.reviews?.length
    ? (nanny.reviews.reduce((s, r) => s + r.rating, 0) / nanny.reviews.length).toFixed(1)
    : null;

  return (
    <div 
      className={`rounded-3xl border-2 transition-all duration-300 animate-fade-up ${
        isSelected 
          ? 'border-teal-400 bg-white shadow-lg shadow-teal-100' 
          : 'border-stone-100 bg-white/90'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Selection indicator */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onSelect}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-teal-500 text-white' 
                : 'border-2 border-stone-200 bg-white'
            }`}
          >
            {isSelected && <Check size={14} strokeWidth={3} />}
          </button>
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            #{index + 1}
          </span>
        </div>
        
        {/* Match score */}
        <div className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">
          <Sparkles size={12} />
          <span className="text-xs font-bold">{score}%</span>
        </div>
      </div>

      {/* Nanny info */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-stone-200 to-stone-300">
              {nanny.photo ? (
                <img src={nanny.photo} alt={nanny.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-lg font-bold text-stone-500">{nanny.name[0]}</span>
                </div>
              )}
            </div>
            {nanny.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-teal-500 border-2 border-white flex items-center justify-center">
                <ShieldCheck size={10} className="text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-stone-900 mb-0.5">{nanny.name}</h3>
            
            <div className="flex items-center gap-2 mb-1">
              {avgRating && (
                <div className="flex items-center gap-0.5">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <span className="text-xs font-medium text-stone-600">{avgRating}</span>
                </div>
              )}
              {nanny.experience && (
                <span className="text-xs text-stone-400">{nanny.experience}</span>
              )}
            </div>

            {(nanny.district || nanny.city) && (
              <div className="flex items-center gap-1 text-xs text-stone-400">
                <MapPin size={10} />
                <span>{nanny.district || nanny.city}</span>
              </div>
            )}
          </div>

          {/* Rate */}
          {nanny.expectedRate && (
            <div className="text-right">
              <span className="text-lg font-semibold text-stone-900">{nanny.expectedRate}</span>
              <span className="text-xs text-stone-400 block">₽/ч</span>
            </div>
          )}
        </div>

        {/* Why fits */}
        <div className="rounded-xl bg-stone-50 p-3 mb-3">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
            {lang === 'ru' ? 'Почему подходит' : 'Why fits'}
          </p>
          <p className="text-sm text-stone-600 leading-relaxed">{humanExplanation}</p>
        </div>

        {/* Trust badges */}
        {trustBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {trustBadges.slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 text-xs font-medium bg-teal-50 text-teal-700 px-2 py-1 rounded-full"
              >
                <BadgeCheck size={10} />
                {badge === 'verified_moderation' && (lang === 'ru' ? 'Модерация' : 'Reviewed')}
                {badge === 'soft_skills' && 'Soft skills'}
                {badge === 'has_reviews' && (lang === 'ru' ? 'Отзывы' : 'Reviews')}
                {badge === 'verified_docs' && (lang === 'ru' ? 'Документы' : 'Docs')}
                {badge === 'ai_checked' && 'AI'}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onOpenProfile}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium"
          >
            <ChevronRight size={16} />
            {lang === 'ru' ? 'Подробнее' : 'View'}
          </button>
          <button className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
            <Heart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Compare table row
const CompareRow: React.FC<{
  category: CompareCategory;
  candidates: MatchCandidate[];
  lang: Language;
}> = ({ category, candidates, lang }) => {
  const values = candidates.map(c => category.getValue(c.nanny));
  const highlightIdx = category.highlight?.(values) ?? null;

  return (
    <div className="border-b border-stone-100 last:border-0">
      <div className="px-4 py-2 bg-stone-50/50">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          {lang === 'ru' ? category.label : category.labelEn}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-stone-100">
        {values.map((value, idx) => (
          <div
            key={idx}
            className={`p-3 bg-white ${highlightIdx === idx ? 'bg-teal-50/50' : ''}`}
          >
            <span className={`text-sm ${value ? 'text-stone-700' : 'text-stone-300'} ${highlightIdx === idx ? 'font-semibold text-teal-700' : ''}`}>
              {value || '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main component
export const ShortlistCompareMobile: React.FC<ShortlistCompareMobileProps> = ({
  lang,
  candidates,
  overallAdvice,
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'compare'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  };

  const selectedCandidates = useMemo(() => {
    return candidates.filter(c => selectedIds.has(c.nanny.id));
  }, [candidates, selectedIds]);

  const canCompare = selectedIds.size === 2;

  // Mock data for preview
  const displayCandidates = candidates.length > 0 ? candidates : [
    {
      nanny: {
        id: 'mock-1',
        type: 'nanny' as const,
        name: 'Анна Иванова',
        city: 'Москва',
        district: 'Пресня',
        experience: '7 лет',
        expectedRate: '900',
        isVerified: true,
        softSkills: { method: 'rule_based_v1' as const, dominantStyle: 'Empathetic' as const, rawScore: 88, summary: '', familySummary: '', moderationSummary: '', completedAt: Date.now(), coverage: 0.86, confidenceReason: 'full_answers' as const, answeredItems: 12, totalItems: 14, traits: { empathy: 92, stability: 84, responsibility: 87, structure: 73 }, signals: [] },
        about: 'Работаю с детьми от 0 до 7 лет',
        skills: ['Развивающие игры', 'Монтессори'],
        childAges: ['0-1', '1-3'],
        contact: '',
        reviews: [{ id: 'r1', authorName: 'Мария', rating: 5, text: 'Отличная няня', date: Date.now() }],
        photo: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=400&auto=format&fit=crop',
        createdAt: Date.now(),
      },
      score: 94,
      reasons: [],
      humanExplanation: 'Высокая эмпатия и опыт работы с детьми вашего возраста. Прошла полную проверку.',
      trustBadges: ['verified_moderation' as const, 'soft_skills' as const, 'has_reviews' as const],
    },
    {
      nanny: {
        id: 'mock-2',
        type: 'nanny' as const,
        name: 'Елена Петрова',
        city: 'Москва',
        district: 'Хамовники',
        experience: '5 лет',
        expectedRate: '800',
        isVerified: true,
        softSkills: { method: 'rule_based_v1' as const, dominantStyle: 'Structured' as const, rawScore: 82, summary: '', familySummary: '', moderationSummary: '', completedAt: Date.now(), coverage: 0.8, confidenceReason: 'full_answers' as const, answeredItems: 11, totalItems: 14, traits: { empathy: 78, stability: 90, responsibility: 85, structure: 88 }, signals: [] },
        about: 'Педагогическое образование',
        skills: ['Подготовка к школе', 'Английский'],
        childAges: ['3-6', '6+'],
        contact: '',
        reviews: [{ id: 'r2', authorName: 'Ольга', rating: 5, text: 'Рекомендую', date: Date.now() }, { id: 'r3', authorName: 'Светлана', rating: 4, text: 'Хорошая няня', date: Date.now() }],
        photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&auto=format&fit=crop',
        createdAt: Date.now(),
      },
      score: 89,
      reasons: [],
      humanExplanation: 'Структурированный подход и педагогический опыт. Отлично подготовит к школе.',
      trustBadges: ['verified_moderation' as const, 'has_reviews' as const],
    },
    {
      nanny: {
        id: 'mock-3',
        type: 'nanny' as const,
        name: 'Ирина Сидорова',
        city: 'Москва',
        district: 'Арбат',
        experience: '3 года',
        expectedRate: '700',
        isVerified: true,
        about: 'Молодая и энергичная няня',
        skills: ['Творчество', 'Прогулки'],
        childAges: ['1-3', '3-6'],
        contact: '',
        photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
        createdAt: Date.now(),
      },
      score: 82,
      reasons: [],
      humanExplanation: 'Молодая и активная, отлично для энергичных детей. Доступная ставка.',
      trustBadges: ['verified_moderation' as const],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{lang === 'ru' ? 'Назад' : 'Back'}</span>
          </button>
          
          <button className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
            <Users size={16} className="text-teal-600" />
          </div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
            {lang === 'ru' ? 'Ваш shortlist' : 'Your shortlist'}
          </span>
        </div>
        
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">
          {lang === 'ru' 
            ? `${displayCandidates.length} кандидата для спокойного выбора` 
            : `${displayCandidates.length} candidates for calm selection`}
        </h1>
        
        <p className="text-sm text-stone-500 leading-relaxed">
          {overallAdvice || (lang === 'ru' 
            ? 'Мы оставили только тех, кто прошёл проверку и соответствует вашим требованиям.' 
            : 'We kept only those who passed verification and match your requirements.')}
        </p>
      </section>

      {/* View toggle */}
      <section className="px-5 pb-4">
        <div className="flex gap-2 p-1 rounded-2xl bg-stone-100">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500'
            }`}
          >
            <Users size={16} />
            {lang === 'ru' ? 'Список' : 'List'}
          </button>
          <button
            onClick={() => setViewMode('compare')}
            disabled={!canCompare}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              viewMode === 'compare'
                ? 'bg-white text-stone-900 shadow-sm'
                : canCompare 
                  ? 'text-stone-500' 
                  : 'text-stone-300 cursor-not-allowed'
            }`}
          >
            <Scale size={16} />
            {lang === 'ru' ? 'Сравнить' : 'Compare'}
          </button>
        </div>
        
        {!canCompare && viewMode === 'list' && (
          <p className="text-xs text-stone-400 text-center mt-2">
            {lang === 'ru' ? 'Выберите 2 кандидата для сравнения' : 'Select 2 candidates to compare'}
          </p>
        )}
      </section>

      {/* Content */}
      <section className="px-5">
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {displayCandidates.map((candidate, idx) => (
              <ShortlistCard
                key={candidate.nanny.id}
                candidate={candidate}
                index={idx}
                lang={lang}
                isSelected={selectedIds.has(candidate.nanny.id)}
                onSelect={() => toggleSelection(candidate.nanny.id)}
                onOpenProfile={() => navigate(`/nanny/${slugify(candidate.nanny.name, candidate.nanny.id)}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden animate-fade-up">
            {/* Compare header with avatars */}
            <div className="grid grid-cols-2 gap-px bg-stone-100 border-b border-stone-200">
              {selectedCandidates.map((candidate) => (
                <div key={candidate.nanny.id} className="p-4 bg-white text-center">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-stone-200 mx-auto mb-2">
                    {candidate.nanny.photo ? (
                      <img src={candidate.nanny.photo} alt={candidate.nanny.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-500 font-bold">
                        {candidate.nanny.name[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-stone-900">{candidate.nanny.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Sparkles size={12} className="text-teal-600" />
                    <span className="text-xs font-bold text-teal-600">{candidate.score}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Compare rows */}
            {COMPARE_CATEGORIES.map((category) => (
              <CompareRow
                key={category.key}
                category={category}
                candidates={selectedCandidates}
                lang={lang}
              />
            ))}

            {/* Why fits comparison */}
            <div className="border-t border-stone-100">
              <div className="px-4 py-2 bg-stone-50/50">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  {lang === 'ru' ? 'Почему подходит' : 'Why fits'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-stone-100">
                {selectedCandidates.map((candidate) => (
                  <div key={candidate.nanny.id} className="p-3 bg-white">
                    <p className="text-xs text-stone-600 leading-relaxed">{candidate.humanExplanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Support note */}
      <section className="px-5 pt-6">
        <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-stone-100 flex items-center justify-center shrink-0">
              <Info size={16} className="text-stone-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-700 mb-1">
                {lang === 'ru' ? 'Нужна помощь с выбором?' : 'Need help choosing?'}
              </p>
              <p className="text-xs text-stone-500">
                {lang === 'ru' 
                  ? 'Наша команда поможет разобраться в нюансах и подобрать лучший вариант для вашей семьи.' 
                  : 'Our team will help you understand the nuances and find the best option for your family.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-stone-100">
        <div className="max-w-lg mx-auto">
          {selectedIds.size > 0 ? (
            <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-stone-900 text-white font-medium text-sm">
              <MessageCircle size={18} />
              {lang === 'ru' 
                ? `Написать ${selectedIds.size === 1 ? 'няне' : 'няням'} (${selectedIds.size})` 
                : `Message nann${selectedIds.size === 1 ? 'y' : 'ies'} (${selectedIds.size})`}
            </button>
          ) : (
            <button
              onClick={() => navigate('/find-nanny')}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-stone-100 text-stone-600 font-medium text-sm"
            >
              <ArrowRight size={18} />
              {lang === 'ru' ? 'Изменить запрос' : 'Edit request'}
            </button>
          )}
        </div>
        <p className="text-center text-xs text-stone-400 mt-2">
          {lang === 'ru' ? 'Поддержка доступна на каждом этапе' : 'Support available at every step'}
        </p>
      </div>
    </div>
  );
};

export default ShortlistCompareMobile;
