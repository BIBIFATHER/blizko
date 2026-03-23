import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Star, ShieldCheck, Award, Heart, Users, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { NannyProfile, Language } from '../../types';
import { idFromSlug } from '@/core/utils/slugify';
import { t } from '@/core/i18n/translations';
import { getAssessmentSignalLabel } from '@/services/assessment';
import { SeoHead } from '../seo/SeoHead';

interface NannyPublicProfileProps {
  lang: Language;
}

// Trust badge display config
const BADGE_CONFIG = {
  verified_moderation: { icon: Award, label: 'Модерация пройдена', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  soft_skills: { icon: Heart, label: 'Soft skills оценены', color: 'text-rose-700 bg-rose-50 border-rose-100' },
  has_reviews: { icon: Users, label: 'Есть отзывы', color: 'text-amber-700 bg-amber-50 border-amber-100' },
};

const DEFAULT_OG_IMAGE = 'https://www.blizko.app/icons/icon-512.png';

export const NannyPublicProfile: React.FC<NannyPublicProfileProps> = ({ lang }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const text = t[lang];
  const [nanny, setNanny] = useState<NannyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const nannyId = slug ? idFromSlug(slug) : null;
  const isMockProfile = useMemo(() => {
    if (!import.meta.env.DEV) return false;
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
        expectedRate: '900 ₽',
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
        about: 'Работаю с детьми 0–7 лет, внимательно отношусь к режиму и эмоциональному комфорту ребёнка.',
        skills: ['Развивающие игры', 'Монтессори', 'Подготовка к школе'],
        childAges: ['0-1', '1-3', '3-6'],
        reviews: [
          { id: 'r1', authorName: 'Мария', rating: 5, text: 'Очень спокойная и внимательная няня.', date: Date.now() },
          { id: 'r2', authorName: 'Екатерина', rating: 5, text: 'Дочка быстро привыкла, всё прошло отлично.', date: Date.now() },
        ],
        photo: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=800&auto=format&fit=crop',
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
        setError('Профиль не найден. Попробуйте поискать другую няню.');
      } finally {
        setLoading(false);
      }
    };

    fetchNanny();
  }, [isMockProfile, nannyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-100/80 animate-pulse mb-4" />
        <p className="text-stone-400 text-sm">Загружаем профиль…</p>
      </div>
    );
  }

  if (error || !nanny) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in px-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
          <Heart size={24} className="text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Профиль не найден</h2>
        <p className="text-stone-500 text-sm mb-1 max-w-xs leading-relaxed">
          Возможно, няня временно скрыла профиль или ссылка устарела.
        </p>
        <p className="text-stone-400 text-xs mb-6">
          Это нормально — мы поможем найти подходящую няню.
        </p>
        <Link
          to="/find-nanny"
          className="inline-flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-stone-700 active:scale-[0.97] transition-all"
        >
          Начать подбор
        </Link>
      </div>
    );
  }

  const avgRating = nanny.reviews?.length
    ? (nanny.reviews.reduce((s, r) => s + r.rating, 0) / nanny.reviews.length).toFixed(1)
    : null;
  const seoTitle = `${nanny.name} — ${lang === 'ru' ? `Няня в ${nanny.city}` : `Nanny in ${nanny.city}`} | Blizko`;
  const seoDescription = nanny.about?.trim()
    ? nanny.about.slice(0, 150)
    : `${nanny.experience}. ${nanny.isVerified ? 'Профиль прошёл модерацию.' : 'Профиль доступен в Blizko.'} ${nanny.district || nanny.city}.`;
  const seoCanonical = `https://blizko.app/nanny/${slug}`;
  const seoImage = nanny.photo && /^https?:\/\//.test(nanny.photo) ? nanny.photo : DEFAULT_OG_IMAGE;
  const seoSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: nanny.name,
    description: nanny.about,
    image: seoImage,
    address: [nanny.district, nanny.city].filter(Boolean).join(', '),
    knowsAbout: nanny.skills,
  };

  return (
    <article className="app-shell animate-fade-in" itemScope itemType="https://schema.org/Person">
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        canonical={seoCanonical}
        ogImage={seoImage}
        ogType="profile"
        schema={seoSchema}
      />

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-stone-400 hover:text-stone-700 text-sm font-medium transition-colors p-2 -ml-2 rounded-xl hover:bg-stone-50 active:bg-stone-100 mb-4"
      >
        <ArrowLeft size={18} /> Назад
      </button>

      {/* ===== 1. Hero Card ===== */}
      <section className="rounded-[24px] bg-white/95 border border-stone-200/80 shadow-sm p-5 mb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-amber-100 to-amber-200 flex items-center justify-center overflow-hidden shadow-sm">
              {nanny.photo ? (
                <img src={nanny.photo} alt={nanny.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-amber-700">{nanny.name[0]}</span>
              )}
            </div>
            {nanny.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                <ShieldCheck size={14} className="text-white" />
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-stone-900 truncate tracking-[-0.02em]" itemProp="name">
              {nanny.name}
            </h1>
            {avgRating && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-stone-700">{avgRating}</span>
                <span className="text-xs text-stone-400">({nanny.reviews!.length})</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-500">
              {(nanny.district || nanny.city) && (
                <span className="flex items-center gap-1" itemProp="address">
                  <MapPin size={12} /> {nanny.district ? `${nanny.district}, ${nanny.city}` : nanny.city}
                </span>
              )}
              {nanny.experience && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {nanny.experience}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Trust badges */}
        {(nanny.isVerified || Boolean(nanny.softSkills) || Boolean(nanny.reviews?.length)) && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {nanny.isVerified && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${BADGE_CONFIG.verified_moderation.color}`}>
                <ShieldCheck size={11} /> {BADGE_CONFIG.verified_moderation.label}
              </span>
            )}
            {nanny.softSkills && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${BADGE_CONFIG.soft_skills.color}`}>
                <Heart size={11} /> {BADGE_CONFIG.soft_skills.label}
              </span>
            )}
            {nanny.reviews && nanny.reviews.length > 0 && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${BADGE_CONFIG.has_reviews.color}`}>
                <Users size={11} /> {BADGE_CONFIG.has_reviews.label}
              </span>
            )}
          </div>
        )}

        {/* Rate */}
        {nanny.expectedRate && (
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-baseline justify-between">
            <span className="text-xs text-stone-400">{lang === 'ru' ? 'Ставка' : 'Rate'}</span>
            <div>
              <span className="text-base font-bold text-stone-900">{nanny.expectedRate}</span>
              <span className="text-xs text-stone-400 ml-1">{lang === 'ru' ? '/ час' : '/ hour'}</span>
            </div>
          </div>
        )}
      </section>

      {/* ===== 2. Reviews (moved UP — strongest proof signal) ===== */}
      {nanny.reviews && nanny.reviews.length > 0 && (
        <section className="rounded-[24px] bg-white/95 border border-stone-200/80 shadow-sm p-5 mb-4">
          <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-3">
            {lang === 'ru' ? 'Отзывы' : 'Reviews'}
          </div>
          <div className="space-y-4">
            {nanny.reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="border-b border-stone-50 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-stone-800">{review.authorName}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} size={12} className="text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                </div>
                <p className="text-[13px] text-stone-600 leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== Expand details — Crouton progressive disclosure ===== */}
      {(nanny.about || nanny.softSkills || nanny.skills?.length > 0 || nanny.childAges?.length > 0) && (
        <>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 rounded-[16px] bg-stone-50/90 border border-stone-200/70 px-4 py-3 text-sm text-stone-500 font-medium hover:bg-stone-100/70 transition-colors mb-4"
          >
            <span>{showDetails ? (lang === 'ru' ? 'Скрыть подробности' : 'Hide details') : (lang === 'ru' ? 'Подробнее о няне' : 'More about this nanny')}</span>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDetails && (
            <div className="space-y-4 animate-fade-in mb-4">
              {/* About */}
              {nanny.about && (
                <section className="rounded-[24px] bg-white/95 border border-stone-200/80 shadow-sm p-5">
                  <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-2">
                    {lang === 'ru' ? 'О себе' : 'About'}
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed" itemProp="description">{nanny.about}</p>
                </section>
              )}

              {/* Work Style */}
              {nanny.softSkills && (
                <section className="rounded-[24px] bg-white/95 border border-stone-200/80 shadow-sm p-5">
                  <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-2">
                    {lang === 'ru' ? 'Стиль работы с детьми' : 'Work style with children'}
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {nanny.softSkills.familySummary || nanny.softSkills.summary}
                  </p>
                  {nanny.softSkills.signals?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {nanny.softSkills.signals
                        .filter((signal) => signal.direction === 'positive')
                        .slice(0, 3)
                        .map((signal) => (
                          <span
                            key={signal.signal}
                            className="text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-full"
                          >
                            {getAssessmentSignalLabel(signal.signal, lang)}
                          </span>
                        ))}
                    </div>
                  )}
                </section>
              )}

              {/* Skills + Child Ages */}
              {(nanny.skills?.length > 0 || nanny.childAges?.length > 0) && (
                <section className="rounded-[24px] bg-white/95 border border-stone-200/80 shadow-sm p-5 space-y-4">
                  {nanny.skills?.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-2">
                        {lang === 'ru' ? 'Навыки' : 'Skills'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {nanny.skills.map((skill) => (
                          <span key={skill} className="text-[11px] font-semibold bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {nanny.childAges?.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-2">
                        {lang === 'ru' ? 'Возраст детей' : 'Child ages'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {nanny.childAges.map((age) => (
                          <span key={age} className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-100 px-2.5 py-1 rounded-full">
                            {age}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== CTA — sticky on mobile ===== */}
      <div className="sticky bottom-4 md:static md:bottom-auto pb-safe">
        <div className="rounded-[20px] bg-white/95 backdrop-blur-sm md:bg-transparent border border-stone-200/80 md:border-0 p-3 md:p-0 shadow-lg md:shadow-none space-y-2">
          <Link
            to="/find-nanny"
            className="flex items-center justify-center gap-2 bg-stone-900 text-white py-3.5 rounded-full text-sm font-semibold hover:bg-stone-800 active:scale-[0.97] transition-all w-full"
          >
            <ArrowRight size={16} />
            {lang === 'ru' ? 'Начать подбор' : 'Start matching'}
          </Link>
          <div className="text-center text-[11px] text-stone-400">
            {lang === 'ru' ? 'Бесплатно для родителей' : 'Free for parents'}
          </div>
        </div>
      </div>
    </article>
  );
};
