import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MatchResult, Language } from '@/core/types';
import { getItem, setItem } from '@/core/platform/storage';

const CACHE_KEY = 'blizko_last_match_result';

interface MatchResultsLocationState {
  matchResult?: MatchResult;
}

interface UseMatchResultsReturn {
  data: MatchResult | null;
  loading: boolean;
  error: boolean;
}

/**
 * Dev preview data — shows all states: pulse (93), normal (85), lower (72)
 */
function buildPreviewData(lang: Language): MatchResult {
  return {
    overallAdvice: lang === 'ru'
      ? 'Мы оставили только те профили, где можно спокойно перейти к разговору о деталях.'
      : 'We kept only the profiles worth moving into a real conversation.',
    requestId: 'preview-request-1',
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
            level: 'warning' as const,
            message: lang === 'ru' ? 'Уточните вечерний график заранее.' : 'Confirm evening schedule in advance.',
            advice: lang === 'ru' ? 'Лучше сразу обсудить регулярные поздние смены.' : 'Discuss recurring late shifts early.',
          },
        ],
        nanny: {
          id: 'preview-1',
          name: 'Анна Иванова',
          city: 'Москва',
          district: 'Пресня',
          experience: '7 лет',
          expectedRate: '900 ₽/ч',
          contact: '',
          isVerified: true,
          about: 'Работаю с детьми 0–7 лет, внимательно отношусь к режиму и эмоциональному комфорту ребёнка.',
          skills: ['Развивающие игры', 'Монтессори', 'Подготовка к школе'],
          childAges: ['0-1', '1-3', '3-6'],
          reviews: [
            { id: 'r1', authorName: 'Мария', rating: 5, text: 'Очень спокойная и внимательная няня.', date: Date.now() - 86400000 },
            { id: 'r2', authorName: 'Екатерина', rating: 5, text: 'Дочка быстро привыкла, всё прошло отлично.', date: Date.now() - 172800000 },
          ],
          softSkills: {
            method: 'rule_based_v1' as const,
            rawScore: 88,
            dominantStyle: 'Empathetic' as const,
            summary: 'Спокойная, внимательная и бережно выстраивает контакт с ребёнком.',
            familySummary: 'Спокойная, внимательная и бережно выстраивает контакт с ребёнком.',
            moderationSummary: 'Высокая эмпатия, устойчивое поведение.',
            completedAt: Date.now(),
            coverage: 0.86,
            confidenceReason: 'full_answers' as const,
            answeredItems: 12,
            totalItems: 14,
            traits: { empathy: 92, stability: 84, responsibility: 87, structure: 73 },
            signals: [],
          },
          photo: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=800&auto=format&fit=crop',
          createdAt: Date.now(),
          type: 'nanny' as const,
        },
      },
      {
        score: 85,
        reasons: ['good_schedule_fit', 'verified'],
        humanExplanation: lang === 'ru'
          ? 'Екатерина сильна там, где семье нужен более структурный режим и опыт с дошкольниками.'
          : 'Ekaterina is strong where the family needs a more structured rhythm and preschool experience.',
        trustBadges: ['verified_moderation', 'ai_checked'],
        nanny: {
          id: 'preview-2',
          name: 'Екатерина Смирнова',
          city: 'Москва',
          district: 'Хамовники',
          experience: '5 лет',
          expectedRate: '850 ₽/ч',
          contact: '',
          isVerified: true,
          about: 'Люблю понятный режим дня, развитие через рутину и спокойное общение с семьёй.',
          skills: ['Подготовка к школе', 'Прогулки', 'Режим дня'],
          childAges: ['1-3', '3-6'],
          reviews: [],
          photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop',
          createdAt: Date.now(),
          type: 'nanny' as const,
        },
      },
      {
        score: 72,
        reasons: ['location_match'],
        humanExplanation: lang === 'ru'
          ? 'Ольга живёт рядом и подходит по графику, но стоит уточнить опыт с малышами.'
          : 'Olga lives nearby and fits the schedule, but verify her experience with toddlers.',
        trustBadges: ['ai_checked'],
        nanny: {
          id: 'preview-3',
          name: 'Ольга Петрова',
          city: 'Москва',
          district: 'Басманный',
          experience: '3 года',
          expectedRate: '700 ₽/ч',
          contact: '',
          isVerified: false,
          about: 'Начинающая няня с педагогическим образованием. Люблю гулять и читать детям.',
          skills: ['Прогулки', 'Чтение', 'Рисование'],
          childAges: ['1-3'],
          reviews: [],
          createdAt: Date.now(),
          type: 'nanny' as const,
        },
      },
    ],
  };
}

/**
 * Resolves match results with priority:
 * 1. ?preview=1 query param (dev preview with test data)
 * 2. location.state (from matching flow navigation)
 * 3. localStorage cache (page refresh resilience)
 * 4. null (empty state)
 */
export function useMatchResults(lang: Language): UseMatchResultsReturn {
  const location = useLocation() as ReturnType<typeof useLocation> & {
    state: MatchResultsLocationState | null;
  };

  const stateResult = location.state?.matchResult ?? null;

  const data = useMemo<MatchResult | null>(() => {
    // Priority 0: Dev preview mode (?preview=1)
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(location.search);
      if (params.get('preview') === '1') return buildPreviewData(lang);
    }

    // Priority 1: navigation state from matching flow
    if (stateResult) {
      try { setItem(CACHE_KEY, JSON.stringify(stateResult)); } catch { /* quota */ }
      return stateResult;
    }

    // Priority 2: localStorage cache
    try {
      const cached = getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as MatchResult;
        if (parsed?.candidates?.length) return parsed;
      }
    } catch {
      // corrupt cache — ignore
    }

    return null;
  }, [stateResult, lang, location.search]);

  return { data, loading: false, error: false };
}
