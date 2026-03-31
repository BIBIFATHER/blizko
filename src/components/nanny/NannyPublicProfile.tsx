import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Star, ShieldCheck, Award, Heart, Users, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { NannyProfile, Language } from '@/core/types';
import { idFromSlug } from '@/core/utils/slugify';
import { getAssessmentSignalLabel } from '@/services/assessment';
import { SeoHead } from '../seo/SeoHead';
import { t } from '@/core/i18n/translations';

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
  const text = t[lang];
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
      <div className="form-shell animate-fade-in py-10">
        <div className="hero-shell flex min-h-[50vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-14 w-14 rounded-2xl bg-amber-100/80 animate-pulse" />
          <p className="text-sm text-stone-400">Загружаем профиль…</p>
        </div>
      </div>
    );
  }

  if (error || !nanny) {
    return (
      <div className="form-shell animate-fade-in py-10">
        <div className="hero-shell flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50">
            <Heart size={24} className="text-amber-400" />
          </div>
          <h2 className="mb-2 text-2xl text-stone-900">Профиль не найден</h2>
          <p className="mb-1 max-w-sm text-sm leading-7 text-stone-500">
            Возможно, няня временно скрыла профиль или ссылка устарела.
          </p>
          <p className="mb-6 text-xs text-stone-400">
            Это нормально — мы поможем найти подходящую няню.
          </p>
          <Link
            to="/find-nanny"
            className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-stone-700 active:scale-[0.97]"
          >
            Начать подбор
          </Link>
        </div>
      </div>
    );
  }

  const avgRating = nanny.reviews?.length
    ? (nanny.reviews.reduce((s, r) => s + r.rating, 0) / nanny.reviews.length).toFixed(1)
    : null;
  const trustSignals = [
    nanny.isVerified
      ? {
          icon: ShieldCheck,
          label: BADGE_CONFIG.verified_moderation.label,
          className: 'bg-emerald-50 text-emerald-800',
        }
      : null,
    nanny.softSkills
      ? {
          icon: Heart,
          label: BADGE_CONFIG.soft_skills.label,
          className: 'bg-rose-50 text-rose-800',
        }
      : null,
    nanny.reviews && nanny.reviews.length > 0
      ? {
          icon: Users,
          label: BADGE_CONFIG.has_reviews.label,
          className: 'bg-amber-50 text-amber-800',
        }
      : null,
  ].filter(Boolean) as Array<{ icon: React.ComponentType<{ size?: number; className?: string }>; label: string; className: string }>;
  const quickFacts = [
    nanny.district || nanny.city
      ? { icon: MapPin, label: nanny.district ? `${nanny.district}, ${nanny.city}` : nanny.city }
      : null,
    nanny.experience
      ? { icon: Clock, label: nanny.experience }
      : null,
    nanny.expectedRate
      ? { icon: Award, label: `${nanny.expectedRate}${lang === 'ru' ? ' / час' : ' / hour'}` }
      : null,
  ].filter(Boolean) as Array<{ icon: React.ComponentType<{ size?: number; className?: string }>; label: string }>;
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
    <article className="page-frame animate-fade-in py-4 pb-16 md:py-8" itemScope itemType="https://schema.org/Person">
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
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cloud-border)] bg-white/75 px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
      >
        <ArrowLeft size={18} /> Назад
      </button>

      {/* ===== 1. Hero Card ===== */}
      <section className="hero-shell mb-4">
        <div className="hero-grid">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500 shadow-cloud-soft">
              <Heart size={12} className="text-amber-600" />
              {text.profileSelectedLabel}
            </div>

            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[2rem] bg-linear-to-br from-amber-100 via-[#ecd7b3] to-[#d8b886] shadow-sm ring-2 ring-white/80">
                  {nanny.photo ? (
                    <img src={nanny.photo} alt={nanny.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-amber-700">{nanny.name[0]}</span>
                  )}
                </div>
                {nanny.isVerified && (
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-sm ring-2 ring-white/80">
                    <ShieldCheck size={15} className="text-white" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-[2.1rem] leading-[0.98] text-stone-950 md:text-5xl" itemProp="name">
                  {nanny.name}
                </h1>
                <p className="mt-2 max-w-[28ch] text-sm leading-7 text-stone-600">
                  {nanny.softSkills?.familySummary || nanny.softSkills?.summary || nanny.about || (lang === 'ru' ? 'Спокойный профиль для бережного знакомства и дальнейшего диалога.' : 'A calm profile for a careful introduction and conversation.')}
                </p>
                {avgRating && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <Star size={14} className="fill-amber-500 text-amber-500" />
                    <span className="text-sm font-semibold text-stone-800">{avgRating}</span>
                    <span className="text-xs text-stone-400">({nanny.reviews!.length})</span>
                  </div>
                )}
              </div>
            </div>

            {quickFacts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickFacts.map((fact) => {
                  const Icon = fact.icon;
                  return (
                    <span
                      key={fact.label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/82 px-3 py-1.5 text-[11px] font-medium text-stone-600 shadow-sm"
                    >
                      <Icon size={12} className="text-stone-400" />
                      {fact.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-3">
            {trustSignals.length > 0 && (
              <div className="hero-stat">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {lang === 'ru' ? 'Сигналы доверия' : 'Trust signals'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {trustSignals.map((signal) => {
                    const Icon = signal.icon;
                    return (
                      <span
                        key={signal.label}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${signal.className}`}
                      >
                        <Icon size={12} />
                        {signal.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,243,238,0.96))] px-4 py-4 shadow-cloud-soft">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                  {text.profileOpenWhyTitle}
                </p>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  {text.profileOpenWhyBody}
                </p>
              </div>

            {nanny.expectedRate && (
              <div className="hero-stat">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{lang === 'ru' ? 'Ставка' : 'Rate'}</span>
                  <div>
                    <span className="text-2xl font-semibold text-stone-950">{nanny.expectedRate}</span>
                    <span className="ml-1 text-xs text-stone-400">{lang === 'ru' ? '/ час' : '/ hour'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== 2. Reviews (moved UP — strongest proof signal) ===== */}
      {nanny.reviews && nanny.reviews.length > 0 && (
        <section className="section-shell mb-4 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-2">
                {text.profileReviewsTitle}
              </div>
              <p className="text-sm leading-6 text-stone-600">
                {text.profileReviewsBody}
              </p>
            </div>
            {avgRating && (
              <div className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                {avgRating} / 5
              </div>
            )}
          </div>
          <div className="space-y-3">
            {nanny.reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="rounded-[1.4rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,243,238,0.96))] p-4 shadow-cloud-soft">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-800">{review.authorName}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} size={12} className="fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                </div>
                <p className="text-[14px] leading-7 text-stone-600">{review.text}</p>
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
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-[18px] border border-[color:var(--cloud-border)] bg-white/75 px-4 py-3 text-sm font-medium text-stone-500 transition-colors hover:bg-white"
          >
            <span>{showDetails ? text.profileDetailsHide : text.profileDetailsToggle}</span>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDetails && (
            <div className="space-y-4 animate-fade-in mb-4">
              {/* About */}
              {nanny.about && (
                <section className="section-shell p-5">
                  <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-2">
                    {text.profileAboutTitle}
                  </div>
                  <p className="text-sm text-stone-700 leading-7" itemProp="description">{nanny.about}</p>
                </section>
              )}

              {/* Work Style */}
              {nanny.softSkills && (
                <section className="section-shell p-5">
                  <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-2">
                    {text.profileStyleTitle}
                  </div>
                  <p className="text-sm text-stone-700 leading-7">
                    {nanny.softSkills.familySummary || nanny.softSkills.summary}
                  </p>
                  {nanny.softSkills.signals?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {nanny.softSkills.signals
                        .filter((signal) => signal.direction === 'positive')
                        .slice(0, 3)
                        .map((signal) => (
                          <span
                            key={signal.signal}
                            className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700"
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
                <section className="section-shell space-y-4 p-5">
                  {nanny.skills?.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-2">
                        {text.profileSkillsTitle}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {nanny.skills.map((skill) => (
                          <span key={skill} className="rounded-full bg-stone-100 px-3 py-1.5 text-[11px] font-semibold text-stone-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {nanny.childAges?.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-2">
                        {text.profileAgesTitle}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {nanny.childAges.map((age) => (
                          <span key={age} className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
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
        <div className="space-y-2 rounded-[22px] border border-[color:var(--cloud-border)] bg-white/92 p-3 shadow-lg backdrop-blur-sm md:border-0 md:bg-transparent md:p-0 md:shadow-none">
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
