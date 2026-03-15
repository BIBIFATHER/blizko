import { NannyProfile } from '../types';

/**
 * Blizko Quality Score — автоматический рейтинг надёжности и качества няни.
 * Используется для внутреннего ранжирования в Matching Engine.
 * Родители НЕ видят числовой скор — только бейджи.
 *
 * Факторы:
 * - Документы (30%) — сколько документов верифицировано
 * - Отзывы (25%) — средний рейтинг и количество
 * - Soft Skills (20%) — AI-оценка поведенческих качеств
 * - Надёжность (15%) — процент успешных выходов
 * - Профиль (10%) — полнота заполнения профиля
 */

export interface QualityScoreBreakdown {
    total: number; // 0-100
    documents: number;
    reviews: number;
    softSkills: number;
    reliability: number;
    profileCompleteness: number;
}

export function calculateQualityScore(nanny: NannyProfile): QualityScoreBreakdown {
    let documents = 0;
    let reviews = 0;
    let softSkills = 0;
    let reliability = 0;
    let profileCompleteness = 0;

    // 1. Documents (30 points max)
    if (nanny.isVerified) documents += 15;
    const verifiedDocs = (nanny.documents || []).filter(d => d.status === 'verified').length;
    const totalDocs = (nanny.documents || []).length;
    if (totalDocs > 0) {
        documents += Math.round((verifiedDocs / Math.max(totalDocs, 3)) * 15);
    }

    // 2. Reviews (25 points max)
    const reviewList = nanny.reviews || [];
    if (reviewList.length > 0) {
        const avgRating = reviewList.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewList.length;
        reviews += Math.round((avgRating / 5) * 15); // max 15 from rating
        reviews += Math.min(10, reviewList.length * 2); // max 10 from quantity (5+ reviews = full)
    }

    // 3. Soft Skills (20 points max)
    if (nanny.softSkills) {
        const rawScore = nanny.softSkills.rawScore || 0;
        softSkills += Math.round((Math.min(rawScore, 100) / 100) * 20);
    }

    // 4. Reliability (15 points max)
    // Based on booking completion rate (if we have data)
    const stats = (nanny as any).bookingStats;
    if (stats && stats.total > 0) {
        const completionRate = stats.completed / stats.total;
        reliability += Math.round(completionRate * 15);
    } else {
        // New nanny — give benefit of the doubt
        reliability += 10;
    }

    // 5. Profile Completeness (10 points max)
    let filled = 0;
    if (nanny.name) filled++;
    if (nanny.city) filled++;
    if (nanny.about && nanny.about.length > 20) filled++;
    if (nanny.experience && nanny.experience.length > 10) filled++;
    if (nanny.skills && nanny.skills.length > 0) filled++;
    if (nanny.childAges && nanny.childAges.length > 0) filled++;
    if (nanny.contact) filled++;
    if (nanny.riskProfile) filled++;
    profileCompleteness = Math.round((filled / 8) * 10);

    const total = Math.min(100, documents + reviews + softSkills + reliability + profileCompleteness);

    return {
        total,
        documents,
        reviews,
        softSkills,
        reliability,
        profileCompleteness,
    };
}

// Quick helper for matching
export function getQualityScore(nanny: NannyProfile): number {
    return calculateQualityScore(nanny).total;
}

// Quality tier labels (for admin panel)
export function getQualityTier(score: number): {
    label: string;
    color: string;
} {
    if (score >= 85) return { label: 'Премиум', color: '#6C2586' };
    if (score >= 70) return { label: 'Отлично', color: '#16a34a' };
    if (score >= 50) return { label: 'Хорошо', color: '#ca8a04' };
    return { label: 'Базовый', color: '#78716C' };
}
