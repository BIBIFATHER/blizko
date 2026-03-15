import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Star, ShieldCheck, Award, Heart, Phone, MessageCircle, Users } from 'lucide-react';
import { NannyProfile, Language } from '../../types';
import { idFromSlug } from '../../src/core/utils/slugify';
import { t } from '../../src/core/i18n/translations';

interface NannyPublicProfileProps {
  lang: Language;
}

// Trust badge display config
const BADGE_CONFIG = {
  verified_docs: { icon: ShieldCheck, label: 'Документы проверены', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  verified_moderation: { icon: Award, label: 'Ручная модерация', color: 'text-blue-700 bg-blue-50 border-blue-100' },
  ai_checked: { icon: Star, label: 'AI-проверка', color: 'text-violet-700 bg-violet-50 border-violet-100' },
  soft_skills: { icon: Heart, label: 'Soft skills оценены', color: 'text-rose-700 bg-rose-50 border-rose-100' },
  has_reviews: { icon: Users, label: 'Есть отзывы', color: 'text-amber-700 bg-amber-50 border-amber-100' },
};

export const NannyPublicProfile: React.FC<NannyPublicProfileProps> = ({ lang }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const text = t[lang];
  const [nanny, setNanny] = useState<NannyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nannyId = slug ? idFromSlug(slug) : null;

  useEffect(() => {
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

        // --- Dynamic OG / meta tags ---
        document.title = `${found.name} — Няня в ${found.city} | Blizko`;
        updateMeta('description', `Опыт ${found.experience}. Верифицирована. Доступна в ${found.district || found.city}.`);
        updateMeta('og:title', `${found.name} — Няня | Blizko`);
        updateMeta('og:description', found.about?.slice(0, 150) ?? '');
        updateMeta('og:url', window.location.href);
        updateMeta('og:type', 'profile');
        if (found.photo) updateMeta('og:image', found.photo);
      } catch {
        setError('Профиль не найден. Попробуйте поискать другую няню.');
      } finally {
        setLoading(false);
      }
    };

    fetchNanny();

    return () => {
      // Restore default title on unmount
      document.title = 'Blizko — Найдите идеальную няню';
    };
  }, [nannyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-amber-100 animate-pulse mb-4" />
        <p className="text-stone-400 text-sm">Загружаем профиль…</p>
      </div>
    );
  }

  if (error || !nanny) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-stone-800 mb-2">Профиль не найден</h2>
        <p className="text-stone-500 text-sm mb-6">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 active:scale-[0.97] transition-all"
        >
          Найти няню
        </Link>
      </div>
    );
  }

  const avgRating = nanny.reviews?.length
    ? (nanny.reviews.reduce((s, r) => s + r.rating, 0) / nanny.reviews.length).toFixed(1)
    : null;

  return (
    <article className="animate-fade-in max-w-2xl mx-auto py-6 space-y-5" itemScope itemType="https://schema.org/Person">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-stone-400 hover:text-stone-700 text-sm font-medium transition-colors p-2 -ml-2 rounded-xl hover:bg-stone-50 active:bg-stone-100"
      >
        <ArrowLeft size={18} /> Назад
      </button>

      {/* Hero card */}
      <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center overflow-hidden shadow-sm">
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
            <h1 className="text-xl md:text-2xl font-semibold text-stone-900 truncate" itemProp="name">
              {nanny.name}
            </h1>
            {avgRating && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-stone-700">{avgRating}</span>
                <span className="text-xs text-stone-400">({nanny.reviews!.length} отзывов)</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-500">
              {(nanny.district || nanny.city) && (
                <span className="flex items-center gap-1" itemProp="address">
                  <MapPin size={12} /> {nanny.district ? `${nanny.district}, ${nanny.city}` : nanny.city}
                </span>
              )}
              {nanny.schedule && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {nanny.schedule}
                </span>
              )}
              {nanny.experience && (
                <span className="flex items-center gap-1">
                  <Award size={12} /> {nanny.experience}
                </span>
              )}
            </div>
          </div>

          {/* Rate */}
          {nanny.expectedRate && (
            <div className="flex-shrink-0 text-right">
              <div className="text-sm font-semibold text-stone-900">{nanny.expectedRate}</div>
              <div className="text-xs text-stone-400">в час</div>
            </div>
          )}
        </div>

        {/* Trust badges */}
        {nanny.documents?.some(d => d.status === 'verified') && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {(nanny.isVerified) && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border ${BADGE_CONFIG.verified_docs.color}`}>
                <ShieldCheck size={11} /> {BADGE_CONFIG.verified_docs.label}
              </span>
            )}
            {nanny.softSkills && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border ${BADGE_CONFIG.soft_skills.color}`}>
                <Heart size={11} /> {BADGE_CONFIG.soft_skills.label}
              </span>
            )}
            {nanny.reviews && nanny.reviews.length > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border ${BADGE_CONFIG.has_reviews.color}`}>
                <Users size={11} /> {BADGE_CONFIG.has_reviews.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* About */}
      {nanny.about && (
        <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-2">О себе</h2>
          <p className="text-stone-700 text-sm leading-relaxed" itemProp="description">{nanny.about}</p>
        </div>
      )}

      {/* Skills */}
      {nanny.skills?.length > 0 && (
        <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-3">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {nanny.skills.map((skill) => (
              <span key={skill} className="text-xs font-medium bg-stone-100 text-stone-700 px-3 py-1 rounded-lg">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Child ages */}
      {nanny.childAges?.length > 0 && (
        <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-3">Возраст детей</h2>
          <div className="flex flex-wrap gap-2">
            {nanny.childAges.map((age) => (
              <span key={age} className="text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100 px-3 py-1 rounded-lg">
                {age}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {nanny.reviews && nanny.reviews.length > 0 && (
        <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-3">Отзывы</h2>
          <div className="space-y-3">
            {nanny.reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="border-b border-stone-50 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-stone-800">{review.authorName}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} size={12} className="text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA — sticky on mobile */}
      <div className="sticky bottom-4 md:static md:bottom-auto">
        <div className="bg-white/90 backdrop-blur-sm md:bg-transparent border border-stone-100 md:border-0 rounded-2xl md:rounded-none p-3 md:p-0 shadow-lg md:shadow-none flex gap-2">
          <Link
            to="/find-nanny"
            className="flex-1 flex items-center justify-center gap-2 bg-stone-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-stone-700 active:scale-[0.97] transition-all"
          >
            <MessageCircle size={17} /> Найти похожую няню
          </Link>
          {nanny.contact && (
            <a
              href={`tel:${nanny.contact}`}
              className="flex items-center justify-center gap-1.5 border border-stone-200 text-stone-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-stone-50 active:scale-[0.97] transition-all"
            >
              <Phone size={16} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

// Helper — upsert meta/og tags
function updateMeta(name: string, content: string) {
  const isOg = name.startsWith('og:');
  const selector = isOg
    ? `meta[property="${name}"]`
    : `meta[name="${name}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    if (isOg) el.setAttribute('property', name);
    else el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
