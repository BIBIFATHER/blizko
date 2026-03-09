/**
 * Risk Engine — detects incompatibility red/yellow flags between parent and nanny.
 * Used at matching time to warn parents about potential issues.
 */
import { ParentRequest, NannyProfile } from "../types";

export interface RiskFlag {
    level: 'warning' | 'critical';
    message: string;
    factor: string;
    advice?: string; // what to discuss before first session
}

/**
 * Detect risk flags for a parent-nanny pair.
 * Returns array of risk flags (empty = all clear).
 */
export function detectRiskFlags(
    parent: Omit<ParentRequest, 'id' | 'createdAt' | 'type'>,
    nanny: NannyProfile
): RiskFlag[] {
    const flags: RiskFlag[] = [];
    const rp = parent.riskProfile;
    const np = nanny.riskProfile;

    if (!rp || !np) return flags;

    // --- DISCIPLINE STYLE CONFLICT ---
    if (rp.nannyStylePreference && np.disciplineStyle) {
        if (rp.nannyStylePreference === 'gentle' && np.disciplineStyle === 'strict') {
            flags.push({
                level: 'critical',
                factor: 'discipline_conflict',
                message: 'Разный подход к дисциплине: вы предпочитаете мягкий стиль, а няня — строгий',
                advice: 'Обсудите конкретные ситуации: что делать при отказе есть, убирать игрушки, истерике',
            });
        }
        if (rp.nannyStylePreference === 'strict' && np.disciplineStyle === 'gentle') {
            flags.push({
                level: 'warning',
                factor: 'discipline_conflict',
                message: 'Вы предпочитаете строгий подход, а няня — мягкий',
                advice: 'Уточните границы: какие правила обязательны, а где допустима гибкость',
            });
        }
    }

    // --- COMMUNICATION MISMATCH ---
    if (rp.communicationPreference && np.communicationStyle) {
        if (rp.communicationPreference === 'frequent' && np.communicationStyle === 'minimal') {
            flags.push({
                level: 'warning',
                factor: 'communication_gap',
                message: 'Вы ожидаете частые отчёты, а няня предпочитает минимум сообщений',
                advice: 'Договоритесь о конкретном формате: фото каждые 2 часа? вечерний отчёт?',
            });
        }
        if (rp.communicationPreference === 'minimal' && np.communicationStyle === 'frequent') {
            flags.push({
                level: 'warning',
                factor: 'communication_gap',
                message: 'Няня привыкла часто отчитываться, а вы предпочитаете минимум',
                advice: 'Скажите няне, что не нужно писать часто — это не значит, что вы недовольны',
            });
        }
    }

    // --- CHILD STRESS + NANNY RESPONSE MISMATCH ---
    if (rp.childStress && np.tantrumFirstStep) {
        if (rp.childStress === 'aggressive' && np.tantrumFirstStep === 'distract') {
            flags.push({
                level: 'warning',
                factor: 'stress_response',
                message: 'При агрессивном поведении ребёнка няня использует отвлечение, а не границы',
                advice: 'Расскажите няне о типичных проявлениях и какие методы работают с вашим ребёнком',
            });
        }
        if (rp.childStress === 'cry' && np.tantrumFirstStep === 'boundaries') {
            flags.push({
                level: 'warning',
                factor: 'stress_response',
                message: 'Ребёнок плачет при стрессе, а няня сначала ставит границы',
                advice: 'Попросите няню сначала успокоить, а уже потом обсуждать правила',
            });
        }
    }

    // --- CONFLICT RESOLUTION INCOMPATIBILITY ---
    if (np.conflictStyle === 'avoid' && rp.communicationPreference === 'frequent') {
        flags.push({
            level: 'warning',
            factor: 'conflict_avoidance',
            message: 'Няня избегает конфликтов — может не сообщить о проблеме вовремя',
            advice: 'Создайте безопасную атмосферу: «лучше сказать сразу, даже если неприятно»',
        });
    }

    // --- CHILD AGE EXPERIENCE GAP ---
    const childAge = parent.childAge?.toLowerCase() || '';
    const nannyAges = (nanny.childAges || []).map(a => a.toLowerCase()).join(' ');
    const isInfant = childAge.includes('0') || childAge.includes('до 1') || childAge.includes('грудн') || childAge.includes('новорожд');
    if (isInfant && !nannyAges.includes('0') && !nannyAges.includes('грудн') && !nannyAges.includes('до 1')) {
        flags.push({
            level: 'critical',
            factor: 'infant_experience',
            message: 'У няни не указан опыт с грудными детьми',
            advice: 'Уточните опыт: кормление, пеленание, режим сна новорождённого, первая помощь',
        });
    }

    // --- MEDICAL BOOK for infants ---
    if (isInfant) {
        const hasMedBook = nanny.documents?.some(d => d.type === 'medical_book' && d.status === 'verified');
        if (!hasMedBook) {
            flags.push({
                level: 'critical',
                factor: 'no_medical_book',
                message: 'Нет верифицированной медкнижки (важно для ребёнка до 1 года)',
                advice: 'Запросите актуальную медицинскую книжку до первого выхода',
            });
        }
    }

    // --- FAMILY STYLE vs ROUTINE STYLE ---
    if (rp.familyStyle === 'structured' && np.routineStyle === 'adaptive') {
        flags.push({
            level: 'warning',
            factor: 'routine_mismatch',
            message: 'Вы предпочитаете чёткий режим, а няня — адаптивный подход',
            advice: 'Подготовьте расписание дня заранее и покажите его няне',
        });
    }

    return flags;
}
