import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  Heart,
  MessageCircle,
  Phone,
  ChevronRight,
  BadgeCheck,
  Sparkles,
  BookOpen,
  Users,
  CalendarCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { NannyProfile, Language, Review } from '@/core/types/types';
import { idFromSlug } from '@/core/utils/slugify';
import { getAssessmentSignalLabel } from '@/services/assessment';
import { SeoHead } from '../seo/SeoHead';

interface NannyProfileMobileProps {
  lang: Language;
}

// Trust verification tiers
type TrustTier = 'platinum' | 'gold' | 'silver' | 'pending';

const getTrustTier = (nanny: NannyProfile): TrustTier => {
  const hasVerification = nanny.isVerified;
  const hasSoftSkills = Boolean(nanny.softSkills);
  const hasReviews = (nanny.reviews?.length || 0) > 0;
  const hasDocuments = (nanny.documents?.filter(d => d.status === 'verified')?.length || 0) >= 2;
  
  if (hasVerification && hasSoftSkills && hasReviews && hasDocuments) return 'platinum';
  if (hasVerification && (hasSoftSkills || hasReviews)) return 'gold';
  if (hasVerification) return 'silver';
  return 'pending';
};

const TRUST_TIER_CONFIG: Record<TrustTier, { label: string; labelEn: string; color: string; bg: string; border: string }> = {
  platinum: {
    label: 'Полная проверка',
    labelEn: 'Fully Verified',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  gold: {
    label: 'Расширенная проверка',
    labelEn: 'Extended Verified',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  silver: {
    label: 'Базовая проверка',
    labelEn: 'Basic Verified',
    color: 'text-stone-600',
    bg: 'bg-stone-100',
    border: 'border-stone-200',
  },
  pending: {
    label: 'На проверке',
    labelEn: 'Pending Review',
    color: 'text-stone-400',
    bg: 'bg-stone-50',
    border: 'border-stone-200',
  },
};

// Review card component
const ReviewCard: React.FC<{ review: Review; index: number }> = ({ review, index }) => (
  <div 
    className="rounded-2xl bg-white/80 border border-stone-100 p-4 animate-fade-up"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
          <span className="text-xs font-semibold text-stone-600">{review.authorName[0]}</span>
        </div>
        <span className="text-sm font-medium text-stone-800">{review.authorName}</span>
      </div>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-200'}
          />
        ))}
      </div>
    </div>
    <p className="text-sm text-stone-600 leading-relaxed">{review.text}</p>
  </div>
);

// Trust verification item
const TrustItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  status: 'verified' | 'pending' | 'missing';
  detail?: string;
}> = ({ icon, label, status, detail }) => (
  <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
      status === 'verified' ? 'bg-teal-50 text-teal-600' :
      status === 'pending' ? 'bg-amber-50 text-amber-600' :
      'bg-stone-50 text-stone-400'
    }`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          status === 'verified' ? 'bg-teal-50 text-teal-600' :
          status === 'pending' ? 'bg-amber-50 text-amber-600' :
          'bg-stone-50 text-stone-400'
        }`}>
          {status === 'verified' ? 'Подтверждено' : status === 'pending' ? 'На проверке' : 'Не указано'}
        </span>
      </div>
      {detail && <p className="text-xs text-stone-400 mt-0.5">{detail}</p>}
    </div>
  </div>
);

// Why this nanny fits section
const WhyFitsSection: React.FC<{ nanny: NannyProfile; lang: Language }> = ({ nanny, lang }) => {
  const reasons = useMemo(() => {
    const items: { icon: React.ReactNode; text: string }[] = [];
    
    if (nanny.experience) {
      items.push({
        icon: <Clock size={14} />,
        text: lang === 'ru' ? `${nanny.experience} опыта с детьми` : `${nanny.experience} childcare experience`,
      });
    }
    
    if (nanny.childAges?.length > 0) {
      const ages = nanny.childAges.join(', ');
      items.push({
        icon: <Users size={14} />,
        text: lang === 'ru' ? `Работает с детьми ${ages} лет` : `Works with children ${ages} years old`,
      });
    }
    
    if (nanny.softSkills?.dominantStyle) {
      const style = nanny.softSkills.dominantStyle === 'Empathetic' ? 'Эмпатичный подход' :
                    nanny.softSkills.dominantStyle === 'Structured' ? 'Структурированный подход' :
                    'Сбалансированный подход';
      items.push({
        icon: <Heart size={14} />,
        text: lang === 'ru' ? style : nanny.softSkills.dominantStyle,
      });
    }
    
    if (nanny.isVerified) {
      items.push({
        icon: <ShieldCheck size={14} />,
        text: lang === 'ru' ? 'Прошла модерацию команды Blizko' : 'Reviewed by Blizko team',
      });
    }
    
    return items;
  }, [nanny, lang]);

  if (reasons.length === 0) return null;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-teal-50/80 to-white border border-teal-100 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3">
        {lang === 'ru' ? 'Почему эта няня подходит' : 'Why this nanny fits'}
      </h3>
      <div className="space-y-2.5">
        {reasons.map((reason, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm text-stone-700">
            <span className="text-teal-600">{reason.icon}</span>
            <span>{reason.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

// Main component
export const NannyProfileMobile: React.FC<NannyProfileMobileProps> = ({ lang }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [nanny, setNanny] = useState<NannyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'trust' | 'reviews'>('overview');

  const nannyId = slug ? idFromSlug(slug) : null;
  const isMockProfile = useMemo(() => {
    if (typeof window === 'undefined' || !import.meta.env.DEV) return false;
    return new URLSearchParams(location.search).get('mock') === '1';
  }, [location.search]);

  useEffect(() => {
    if (isMockProfile) {
      setNanny({
        id: 'demo1234-mock',
        name: 'Анна Иванова',
        city: 'Москва',
        district: 'Пресня',
        experience: '7 лет',
        expectedRate: '900',
        contact: '+7 999 123-45-67',
        isVerified: true,
        softSkills: {
          method: 'rule_based_v1',
          rawScore: 88,
          dominantStyle: 'Empathetic',
          summary: 'Спокойная, внимательная и бережно выстраивает контакт с ребёнком.',
          familySummary: 'Спокойная, внимательная и бережно выстраивает контакт с ребёнком.',
          moderationSummary: 'Высокая эмпатия, устойчивое поведение, без выраженных рисковых сигналов.',
          completedAt: Date.now(),
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
          signals: [
            {
              signal: 'empathy_first',
              strength: 0.91,
              direction: 'positive',
              evidence: ['Поддерживает спокойный тон и сначала снижает стресс ребёнка.'],
            },
            {
              signal: 'transparent_reporting',
              strength: 0.78,
              direction: 'positive',
              evidence: ['Готова коротко и регулярно сообщать семье о состоянии ребёнка и режиме дня.'],
            },
          ],
        },
        about: 'Работаю с детьми от 0 до 7 лет, внимательно отношусь к режиму и эмоциональному комфорту ребёнка. Имею педагогическое образование и курсы по детской психологии.',
        skills: ['Развивающие игры', 'Монтессори', 'Подготовка к школе', 'Первая помощь'],
        childAges: ['0-1', '1-3', '3-6'],
        reviews: [
          { id: 'r1', authorName: 'Мария', rating: 5, text: 'Очень спокойная и внимательная няня. Сын быстро к ней привязался.', date: Date.now() },
          { id: 'r2', authorName: 'Екатерина', rating: 5, text: 'Дочка быстро привыкла, всё прошло отлично. Рекомендую!', date: Date.now() },
          { id: 'r3', authorName: 'Ольга', rating: 4, text: 'Хорошая няня, пунктуальная и ответственная.', date: Date.now() },
        ],
        photo: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=800&auto=format&fit=crop',
        documents: [
          { type: 'passport', status: 'verified', aiConfidence: 95, aiNotes: '', verifiedAt: Date.now() },
          { type: 'medical_book', status: 'verified', aiConfidence: 92, aiNotes: '', verifiedAt: Date.now() },
        ],
        createdAt: Date.now(),
        type: 'nanny',
      });
      setLoading(false);
      setError(null);
      return;
    }

    if (!nannyId) {
      setError('Профиль не найден');
      setLoading(false);
      return;
    }

    const fetchNanny = async () => {
      try {
        const res = await fetch(`/api/nannies?id=${nannyId}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        const payload = data?.item ?? data;
        const found = Array.isArray(payload)
          ? payload.find((n: NannyProfile) => n.id.startsWith(nannyId))
          : payload;
        if (!found) throw new Error('Профиль не найден');
        setNanny(found);
      } catch {
        setError('Профиль не найден');
      } finally {
        setLoading(false);
      }
    };

    fetchNanny();
  }, [isMockProfile, nannyId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-stone-200" />
          <div className="h-3 w-24 bg-stone-200 rounded" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !nanny) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white px-5 pt-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-amber-500" size={28} />
          </div>
          <h1 className="text-xl font-semibold text-stone-800 mb-2">
            {lang === 'ru' ? 'Профиль не найден' : 'Profile not found'}
          </h1>
          <p className="text-sm text-stone-500 mb-6">
            {lang === 'ru' 
              ? 'Возможно, няня временно скрыла профиль или ссылка устарела.' 
              : 'The nanny may have hidden their profile or the link is outdated.'}
          </p>
          <button
            onClick={() => navigate('/find-nanny')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-stone-900 text-white text-sm font-medium"
          >
            {lang === 'ru' ? 'Начать подбор' : 'Start matching'}
          </button>
        </div>
      </div>
    );
  }

  const trustTier = getTrustTier(nanny);
  const tierConfig = TRUST_TIER_CONFIG[trustTier];
  const avgRating = nanny.reviews?.length
    ? (nanny.reviews.reduce((s, r) => s + r.rating, 0) / nanny.reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-white pb-32">
      <SeoHead
        title={`${nanny.name} - ${lang === 'ru' ? 'Няня' : 'Nanny'} | Blizko`}
        description={nanny.about?.slice(0, 150) || ''}
        canonical={`https://blizko.app/nanny/${slug}`}
      />

      {/* Sticky header */}
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

      {/* Trust summary - above the fold */}
      <section className="px-5 pt-5">
        <div className={`rounded-2xl ${tierConfig.bg} border ${tierConfig.border} p-4 mb-5`}>
          <div className="flex items-center gap-2 mb-2">
            <BadgeCheck size={16} className={tierConfig.color} />
            <span className={`text-sm font-semibold ${tierConfig.color}`}>
              {lang === 'ru' ? tierConfig.label : tierConfig.labelEn}
            </span>
          </div>
          <p className="text-xs text-stone-500">
            {lang === 'ru' 
              ? 'Профиль прошёл проверку командой Blizko. Документы и рекомендации верифицированы.'
              : 'Profile verified by the Blizko team. Documents and references checked.'}
          </p>
        </div>
      </section>

      {/* Hero section */}
      <section className="px-5 pb-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-stone-200 to-stone-300 shadow-md">
              {nanny.photo ? (
                <img src={nanny.photo} alt={nanny.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-stone-500">{nanny.name[0]}</span>
                </div>
              )}
            </div>
            {nanny.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-teal-500 border-2 border-white flex items-center justify-center">
                <ShieldCheck size={12} className="text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-stone-900 mb-1">{nanny.name}</h1>
            
            {avgRating && (
              <div className="flex items-center gap-1.5 mb-2">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-stone-700">{avgRating}</span>
                <span className="text-xs text-stone-400">({nanny.reviews!.length} {lang === 'ru' ? 'отзывов' : 'reviews'})</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
              {(nanny.district || nanny.city) && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-stone-400" />
                  {nanny.district ? `${nanny.district}, ${nanny.city}` : nanny.city}
                </span>
              )}
              {nanny.experience && (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-stone-400" />
                  {nanny.experience}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Rate card */}
      {nanny.expectedRate && (
        <section className="px-5 pb-5">
          <div className="rounded-2xl bg-white border border-stone-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-1">
                  {lang === 'ru' ? 'Ставка' : 'Rate'}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-stone-900">{nanny.expectedRate}</span>
                  <span className="text-sm text-stone-500">{lang === 'ru' ? '₽/час' : '/hour'}</span>
                </div>
              </div>
              <button className="px-4 py-2 rounded-full bg-stone-100 text-sm font-medium text-stone-600">
                {lang === 'ru' ? 'Уточнить' : 'Inquire'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Why fits section */}
      <section className="px-5 pb-5">
        <WhyFitsSection nanny={nanny} lang={lang} />
      </section>

      {/* Tab navigation */}
      <section className="px-5 pb-4">
        <div className="flex gap-2 p-1 rounded-2xl bg-stone-100">
          {(['overview', 'trust', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                activeSection === tab
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500'
              }`}
            >
              {tab === 'overview' && (lang === 'ru' ? 'О няне' : 'About')}
              {tab === 'trust' && (lang === 'ru' ? 'Проверки' : 'Trust')}
              {tab === 'reviews' && (lang === 'ru' ? 'Отзывы' : 'Reviews')}
            </button>
          ))}
        </div>
      </section>

      {/* Tab content */}
      <section className="px-5">
        {activeSection === 'overview' && (
          <div className="space-y-4 animate-fade-up">
            {/* About */}
            {nanny.about && (
              <div className="rounded-2xl bg-white border border-stone-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  {lang === 'ru' ? 'О себе' : 'About'}
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">{nanny.about}</p>
              </div>
            )}

            {/* Work style */}
            {nanny.softSkills && (
              <div className="rounded-2xl bg-white border border-stone-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  {lang === 'ru' ? 'Стиль работы' : 'Work style'}
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-3">
                  {nanny.softSkills.familySummary || nanny.softSkills.summary}
                </p>
                {nanny.softSkills.signals?.filter(s => s.direction === 'positive').slice(0, 3).map((signal) => (
                  <span
                    key={signal.signal}
                    className="inline-block mr-2 mb-2 text-xs font-medium bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full"
                  >
                    {getAssessmentSignalLabel(signal.signal, lang)}
                  </span>
                ))}
              </div>
            )}

            {/* Skills */}
            {nanny.skills?.length > 0 && (
              <div className="rounded-2xl bg-white border border-stone-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                  {lang === 'ru' ? 'Навыки' : 'Skills'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {nanny.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs font-medium bg-stone-100 text-stone-600 px-3 py-1.5 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Child ages */}
            {nanny.childAges?.length > 0 && (
              <div className="rounded-2xl bg-white border border-stone-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                  {lang === 'ru' ? 'Возраст детей' : 'Child ages'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {nanny.childAges.map((age) => (
                    <span
                      key={age}
                      className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-full"
                    >
                      {age} {lang === 'ru' ? 'лет' : 'years'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'trust' && (
          <div className="rounded-2xl bg-white border border-stone-100 p-4 animate-fade-up">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              {lang === 'ru' ? 'Верификация профиля' : 'Profile verification'}
            </h3>
            
            <TrustItem
              icon={<ShieldCheck size={18} />}
              label={lang === 'ru' ? 'Модерация Blizko' : 'Blizko moderation'}
              status={nanny.isVerified ? 'verified' : 'pending'}
              detail={lang === 'ru' ? 'Профиль проверен вручную' : 'Manually reviewed'}
            />
            
            <TrustItem
              icon={<Sparkles size={18} />}
              label={lang === 'ru' ? 'Soft skills оценка' : 'Soft skills assessment'}
              status={nanny.softSkills ? 'verified' : 'missing'}
              detail={nanny.softSkills?.dominantStyle || undefined}
            />
            
            <TrustItem
              icon={<BookOpen size={18} />}
              label={lang === 'ru' ? 'Документы' : 'Documents'}
              status={nanny.documents?.some(d => d.status === 'verified') ? 'verified' : 'pending'}
              detail={lang === 'ru' ? `${nanny.documents?.filter(d => d.status === 'verified').length || 0} подтверждено` : `${nanny.documents?.filter(d => d.status === 'verified').length || 0} verified`}
            />
            
            <TrustItem
              icon={<Users size={18} />}
              label={lang === 'ru' ? 'Отзывы семей' : 'Family reviews'}
              status={(nanny.reviews?.length || 0) > 0 ? 'verified' : 'missing'}
              detail={(nanny.reviews?.length || 0) > 0 ? `${nanny.reviews!.length} ${lang === 'ru' ? 'отзывов' : 'reviews'}` : undefined}
            />
            
            <TrustItem
              icon={<CalendarCheck size={18} />}
              label={lang === 'ru' ? 'Видео-интервью' : 'Video interview'}
              status={nanny.video ? 'verified' : 'missing'}
            />
          </div>
        )}

        {activeSection === 'reviews' && (
          <div className="space-y-3">
            {nanny.reviews && nanny.reviews.length > 0 ? (
              nanny.reviews.map((review, i) => (
                <ReviewCard key={review.id} review={review} index={i} />
              ))
            ) : (
              <div className="rounded-2xl bg-stone-50 border border-stone-100 p-6 text-center">
                <Users className="mx-auto text-stone-300 mb-2" size={32} />
                <p className="text-sm text-stone-500">
                  {lang === 'ru' ? 'Пока нет отзывов' : 'No reviews yet'}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-stone-100 safe-area-inset-bottom">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-stone-900 text-white font-medium text-sm">
            <MessageCircle size={18} />
            {lang === 'ru' ? 'Написать' : 'Message'}
          </button>
          <button className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Phone size={20} />
          </button>
        </div>
        <p className="text-center text-xs text-stone-400 mt-2">
          {lang === 'ru' ? 'Поддержка доступна, если что-то пойдёт не так' : 'Support available if something goes wrong'}
        </p>
      </div>
    </div>
  );
};

export default NannyProfileMobile;
