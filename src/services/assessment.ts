import { aiText } from '@/core/ai/aiGateway';
import {
  Language,
  SoftSkillTrait,
  SoftSkillsProfile,
  AssessmentSignal,
  AssessmentSignalName,
  AIStructuredSummary,
} from '@/core/types';

export type AssessmentItemType = 'likert' | 'scenario' | 'text';

interface AssessmentItem {
  id: string;
  type: AssessmentItemType;
  text: Record<Language, string>;
  options?: {
    id: string;
    text: Record<Language, string>;
    traits: { trait: SoftSkillTrait; value: number }[];
  }[];
  trait?: SoftSkillTrait;
}

export interface AssessmentCandidateInfo {
  experience?: string;
  about?: string;
}

const SchemaType = {
  OBJECT: 'OBJECT',
  STRING: 'STRING',
  ARRAY: 'ARRAY',
} as const;

const TRAIT_KEYS: SoftSkillTrait[] = ['empathy', 'stability', 'responsibility', 'structure'];
const TRAIT_MAX_SCORES: Record<SoftSkillTrait, number> = {
  empathy: 27,
  stability: 25,
  responsibility: 24,
  structure: 20,
};

const SIGNAL_LABELS: Record<AssessmentSignalName, Record<Language, string>> = {
  calm_deescalation: {
    ru: 'Спокойная деэскалация',
    en: 'Calm de-escalation',
  },
  transparent_reporting: {
    ru: 'Прозрачная коммуникация с родителями',
    en: 'Transparent parent reporting',
  },
  routine_preference: {
    ru: 'Комфорт в понятном режиме',
    en: 'Comfort with clear routines',
  },
  empathy_first: {
    ru: 'Сначала контакт и понимание ребёнка',
    en: 'Child understanding first',
  },
  safety_priority: {
    ru: 'Безопасность как приоритет',
    en: 'Safety-first mindset',
  },
  low_incident_reporting: {
    ru: 'Нужна более прозрачная коммуникация об инцидентах',
    en: 'Needs stronger incident reporting',
  },
  low_structure_preference: {
    ru: 'Нужны более устойчивые границы и режим',
    en: 'Needs stronger routine and boundaries',
  },
};

export const assessmentItems: AssessmentItem[] = [
  {
    id: 'l1',
    type: 'likert',
    text: { ru: 'Я легко сохраняю спокойствие, когда планы меняются в последнюю минуту.', en: 'I easily stay calm when plans change at the last minute.' },
    trait: 'stability',
  },
  {
    id: 'l2',
    type: 'likert',
    text: { ru: 'Детям важнее чувствовать, что их понимают, чем просто следовать правилам.', en: 'It is more important for children to feel understood than to just follow rules.' },
    trait: 'empathy',
  },
  {
    id: 'l3',
    type: 'likert',
    text: { ru: 'Я всегда сообщаю родителям о мелких происшествиях, даже если ребенок не пострадал.', en: 'I always inform parents about minor incidents, even if the child was not hurt.' },
    trait: 'responsibility',
  },
  {
    id: 'l4',
    type: 'likert',
    text: { ru: 'Четкий режим дня — залог хорошего настроения ребенка.', en: 'A strict daily schedule is the key to a child\'s good mood.' },
    trait: 'structure',
  },
  {
    id: 'l5',
    type: 'likert',
    text: { ru: 'Я могу сдерживать свои эмоции, даже если ребенок ведет себя агрессивно.', en: 'I can control my emotions even if the child is behaving aggressively.' },
    trait: 'stability',
  },
  {
    id: 'l6',
    type: 'likert',
    text: { ru: 'Иногда нужно нарушить правила, чтобы установить доверие с ребенком.', en: 'Sometimes rules need to be bent to build trust with a child.' },
    trait: 'empathy',
  },
  {
    id: 'l7',
    type: 'likert',
    text: { ru: 'Безопасность важнее, чем веселье или обучение.', en: 'Safety is more important than fun or learning.' },
    trait: 'responsibility',
  },
  {
    id: 'l8',
    type: 'likert',
    text: { ru: 'Мне комфортнее работать, когда у меня есть четкий список задач от родителей.', en: 'I feel more comfortable working when I have a clear task list from parents.' },
    trait: 'structure',
  },
  {
    id: 'l9',
    type: 'likert',
    text: { ru: 'Я быстро восстанавливаю силы после тяжелого рабочего дня.', en: 'I recover my energy quickly after a hard work day.' },
    trait: 'stability',
  },
  {
    id: 'l10',
    type: 'likert',
    text: { ru: 'Я считаю, что няня должна быть частью семьи, а не просто персоналом.', en: 'I believe a nanny should be part of the family, not just staff.' },
    trait: 'empathy',
  },
  {
    id: 's1',
    type: 'scenario',
    text: {
      ru: 'Ребенок (3 года) устраивает истерику в магазине, потому что вы не купили игрушку. Ваши действия?',
      en: 'A child (3 y.o.) throws a tantrum in a store because you didn\'t buy a toy. Your action?',
    },
    options: [
      {
        id: 'a',
        text: { ru: 'Спокойно пережду пик эмоций, обеспечив безопасность, затем обниму.', en: 'Calmly wait out the peak of emotions ensuring safety, then hug.' },
        traits: [{ trait: 'empathy', value: 3 }, { trait: 'stability', value: 3 }],
      },
      {
        id: 'b',
        text: { ru: 'Строго напомню о нашем уговоре и выведу из магазина.', en: 'Strictly remind about our agreement and take him out of the store.' },
        traits: [{ trait: 'structure', value: 3 }, { trait: 'stability', value: 2 }],
      },
      {
        id: 'c',
        text: { ru: 'Попробую отвлечь его внимание на что-то другое интересное.', en: 'Try to distract his attention to something else interesting.' },
        traits: [{ trait: 'responsibility', value: 2 }, { trait: 'empathy', value: 1 }],
      },
    ],
  },
  {
    id: 's2',
    type: 'scenario',
    text: {
      ru: 'Вы заметили, что у ребенка ссадина, но не видели момент падения. Родители вернутся через час.',
      en: 'You notice the child has a scratch, but didn\'t see the fall. Parents return in an hour.',
    },
    options: [
      {
        id: 'a',
        text: { ru: 'Обработаю рану и сообщу родителям сразу по их приходу.', en: 'Treat the wound and inform parents immediately upon their arrival.' },
        traits: [{ trait: 'structure', value: 2 }],
      },
      {
        id: 'b',
        text: { ru: 'Сразу напишу родителям сообщение с фото, чтобы быть честной.', en: 'Immediately message parents with a photo to be honest.' },
        traits: [{ trait: 'responsibility', value: 3 }, { trait: 'stability', value: 2 }],
      },
      {
        id: 'c',
        text: { ru: 'Если ребенок не плачет, не буду заострять внимание.', en: 'If the child is not crying, I won\'t focus on it.' },
        traits: [{ trait: 'structure', value: 1 }],
      },
    ],
  },
  {
    id: 's3',
    type: 'scenario',
    text: {
      ru: 'Родители просят укладывать ребенка спать в 13:00, но он совсем не хочет и активно играет.',
      en: 'Parents ask to put the child to sleep at 1:00 PM, but he doesn\'t want to and is playing actively.',
    },
    options: [
      {
        id: 'a',
        text: { ru: 'Буду соблюдать режим: начну успокаивать его заранее, чтобы уложить вовремя.', en: 'Will follow the schedule: start calming him down in advance to put him to bed on time.' },
        traits: [{ trait: 'structure', value: 3 }, { trait: 'responsibility', value: 2 }],
      },
      {
        id: 'b',
        text: { ru: 'Позволю поиграть еще 30 минут, если он не выглядит уставшим.', en: 'Let him play for another 30 minutes if he doesn\'t look tired.' },
        traits: [{ trait: 'empathy', value: 2 }, { trait: 'structure', value: 0 }],
      },
      {
        id: 'c',
        text: { ru: 'Предложу тихую игру в кровати вместо сна.', en: 'Offer a quiet game in bed instead of sleep.' },
        traits: [{ trait: 'empathy', value: 3 }],
      },
    ],
  },
  {
    id: 't1',
    type: 'text',
    text: {
      ru: 'Опишите ваш способ восстановления эмоционального ресурса после сложного дня?',
      en: 'Describe your way of restoring emotional resources after a difficult day?',
    },
  },
  {
    id: 't2',
    type: 'text',
    text: {
      ru: 'Какое ваше главное "супер-качество" в работе с детьми?',
      en: 'What is your main "superpower" in working with children?',
    },
  },
];

function safeJsonParse<T>(raw: string): T | null {
  if (!raw) return null;

  const variants = [
    raw.trim(),
    raw.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim(),
  ];

  for (const variant of variants) {
    try {
      return JSON.parse(variant) as T;
    } catch {
      continue;
    }
  }

  return null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getLikertAnswer(answers: Record<string, string>, id: string): number | null {
  const value = Number.parseInt(answers[id] || '', 10);
  if (!Number.isFinite(value) || value < 1 || value > 5) return null;
  return value;
}

function answeredItemCount(answers: Record<string, string>): number {
  return assessmentItems.filter((item) => String(answers[item.id] ?? '').trim().length > 0).length;
}

function buildSignal(
  signal: AssessmentSignalName,
  direction: AssessmentSignal['direction'],
  evidence: string[],
  strengths: number[],
): AssessmentSignal | null {
  if (!evidence.length || !strengths.length) return null;

  const strength = clamp01(strengths.reduce((sum, item) => sum + item, 0) / strengths.length);
  if (strength < 0.45) return null;

  return {
    signal,
    direction,
    evidence,
    strength: Number(strength.toFixed(2)),
  };
}

function buildSignals(answers: Record<string, string>): AssessmentSignal[] {
  const signals: AssessmentSignal[] = [];
  const likert01 = (id: string) => {
    const value = getLikertAnswer(answers, id);
    return value == null ? null : clamp01((value - 1) / 4);
  };

  const calmEvidence: string[] = [];
  const calmStrengths: number[] = [];
  if (answers.s1 === 'a') {
    calmEvidence.push('s1:a');
    calmStrengths.push(0.95);
  }
  const l5 = likert01('l5');
  if (l5 != null && l5 >= 0.75) {
    calmEvidence.push(`l5:${getLikertAnswer(answers, 'l5')}`);
    calmStrengths.push(l5);
  }
  const calm = buildSignal('calm_deescalation', 'positive', calmEvidence, calmStrengths);
  if (calm) signals.push(calm);

  const reportingEvidence: string[] = [];
  const reportingStrengths: number[] = [];
  if (answers.s2 === 'b') {
    reportingEvidence.push('s2:b');
    reportingStrengths.push(1);
  }
  const l3 = likert01('l3');
  if (l3 != null && l3 >= 0.75) {
    reportingEvidence.push(`l3:${getLikertAnswer(answers, 'l3')}`);
    reportingStrengths.push(l3);
  }
  const reporting = buildSignal('transparent_reporting', 'positive', reportingEvidence, reportingStrengths);
  if (reporting) signals.push(reporting);

  const routineEvidence: string[] = [];
  const routineStrengths: number[] = [];
  if (answers.s3 === 'a') {
    routineEvidence.push('s3:a');
    routineStrengths.push(1);
  }
  const l4 = likert01('l4');
  if (l4 != null && l4 >= 0.75) {
    routineEvidence.push(`l4:${getLikertAnswer(answers, 'l4')}`);
    routineStrengths.push(l4);
  }
  const l8 = likert01('l8');
  if (l8 != null && l8 >= 0.75) {
    routineEvidence.push(`l8:${getLikertAnswer(answers, 'l8')}`);
    routineStrengths.push(l8);
  }
  const routine = buildSignal('routine_preference', 'positive', routineEvidence, routineStrengths);
  if (routine) signals.push(routine);

  const empathyEvidence: string[] = [];
  const empathyStrengths: number[] = [];
  if (answers.s1 === 'a') {
    empathyEvidence.push('s1:a');
    empathyStrengths.push(0.9);
  }
  if (answers.s3 === 'c') {
    empathyEvidence.push('s3:c');
    empathyStrengths.push(0.85);
  }
  const l2 = likert01('l2');
  if (l2 != null && l2 >= 0.75) {
    empathyEvidence.push(`l2:${getLikertAnswer(answers, 'l2')}`);
    empathyStrengths.push(l2);
  }
  const l10 = likert01('l10');
  if (l10 != null && l10 >= 0.75) {
    empathyEvidence.push(`l10:${getLikertAnswer(answers, 'l10')}`);
    empathyStrengths.push(l10);
  }
  const empathy = buildSignal('empathy_first', 'positive', empathyEvidence, empathyStrengths);
  if (empathy) signals.push(empathy);

  const safetyEvidence: string[] = [];
  const safetyStrengths: number[] = [];
  if (answers.s2 === 'b') {
    safetyEvidence.push('s2:b');
    safetyStrengths.push(0.9);
  }
  const l7 = likert01('l7');
  if (l7 != null && l7 >= 0.75) {
    safetyEvidence.push(`l7:${getLikertAnswer(answers, 'l7')}`);
    safetyStrengths.push(l7);
  }
  if (answers.s1 === 'a') {
    safetyEvidence.push('s1:a');
    safetyStrengths.push(0.75);
  }
  const safety = buildSignal('safety_priority', 'positive', safetyEvidence, safetyStrengths);
  if (safety) signals.push(safety);

  const lowReportingEvidence: string[] = [];
  const lowReportingStrengths: number[] = [];
  if (answers.s2 === 'c') {
    lowReportingEvidence.push('s2:c');
    lowReportingStrengths.push(0.9);
  }
  if (l3 != null && l3 <= 0.25) {
    lowReportingEvidence.push(`l3:${getLikertAnswer(answers, 'l3')}`);
    lowReportingStrengths.push(1 - l3);
  }
  const lowReporting = buildSignal('low_incident_reporting', 'watch', lowReportingEvidence, lowReportingStrengths);
  if (lowReporting) signals.push(lowReporting);

  const lowStructureEvidence: string[] = [];
  const lowStructureStrengths: number[] = [];
  if (answers.s3 === 'b') {
    lowStructureEvidence.push('s3:b');
    lowStructureStrengths.push(0.7);
  }
  if (l4 != null && l4 <= 0.25) {
    lowStructureEvidence.push(`l4:${getLikertAnswer(answers, 'l4')}`);
    lowStructureStrengths.push(1 - l4);
  }
  if (l8 != null && l8 <= 0.25) {
    lowStructureEvidence.push(`l8:${getLikertAnswer(answers, 'l8')}`);
    lowStructureStrengths.push(1 - l8);
  }
  const lowStructure = buildSignal('low_structure_preference', 'watch', lowStructureEvidence, lowStructureStrengths);
  if (lowStructure) signals.push(lowStructure);

  return signals.sort((a, b) => b.strength - a.strength);
}

function buildFamilySummary(
  lang: Language,
  dominantStyle: SoftSkillsProfile['dominantStyle'],
  signals: AssessmentSignal[],
  coverage: number,
): string {
  const leadByStyle: Record<SoftSkillsProfile['dominantStyle'], Record<Language, string>> = {
    Empathetic: {
      ru: 'По ответам анкеты кандидат чаще выбирает мягкий контакт, спокойную поддержку ребёнка и бережную деэскалацию.',
      en: 'Based on the questionnaire, the candidate more often chooses gentle connection, calm support, and careful de-escalation.',
    },
    Structured: {
      ru: 'По ответам анкеты кандидат комфортнее работает в понятном режиме, заранее выстраивает переходы и опирается на договорённости с семьёй.',
      en: 'Based on the questionnaire, the candidate appears more comfortable with clear routines, transitions, and family agreements.',
    },
    Balanced: {
      ru: 'По ответам анкеты кандидат обычно сочетает спокойную поддержку ребёнка с понятными границами и предсказуемой организацией дня.',
      en: 'Based on the questionnaire, the candidate usually combines calm support with clear boundaries and predictable routines.',
    },
  };

  const signalSentences: Partial<Record<AssessmentSignalName, Record<Language, string>>> = {
    calm_deescalation: {
      ru: 'Чаще всего сначала снижает напряжение и только потом возвращается к правилам.',
      en: 'Tends to reduce tension first and then return to rules.',
    },
    transparent_reporting: {
      ru: 'Обычно делает ставку на прозрачную коммуникацию с родителями о мелких инцидентах и самочувствии ребёнка.',
      en: 'Usually prefers transparent communication with parents about minor incidents and the child’s wellbeing.',
    },
    routine_preference: {
      ru: 'Комфортнее чувствует себя в понятном режиме и любит заранее готовить ребёнка к смене активности.',
      en: 'Feels more comfortable in a clear routine and likes preparing the child for transitions in advance.',
    },
    empathy_first: {
      ru: 'В ответах часто выбирает сначала контакт и понимание состояния ребёнка, а не жёсткое давление.',
      en: 'Often chooses connection and understanding the child’s state before applying pressure.',
    },
    safety_priority: {
      ru: 'Видно, что безопасность и предсказуемость для неё важнее спонтанности.',
      en: 'Safety and predictability appear to matter more than spontaneity.',
    },
  };

  const parts = [leadByStyle[dominantStyle][lang]];
  signals
    .filter((signal) => signal.direction === 'positive')
    .slice(0, 2)
    .forEach((signal) => {
      const sentence = signalSentences[signal.signal]?.[lang];
      if (sentence) parts.push(sentence);
    });

  if (coverage < 0.99) {
    parts.push(
      lang === 'ru'
        ? 'Вывод предварительный: анкета заполнена не полностью.'
        : 'This is a preliminary read because the questionnaire is incomplete.',
    );
  }

  return parts.join(' ');
}

function buildModerationSummary(
  lang: Language,
  dominantStyle: SoftSkillsProfile['dominantStyle'],
  signals: AssessmentSignal[],
  coverage: number,
  traits: Record<SoftSkillTrait, number>,
): string {
  const topSignals = signals.slice(0, 3).map((signal) => getAssessmentSignalLabel(signal.signal, lang));
  const watchSignals = signals
    .filter((signal) => signal.direction === 'watch')
    .map((signal) => getAssessmentSignalLabel(signal.signal, lang));
  const strongestTrait = TRAIT_KEYS.slice().sort((a, b) => traits[b] - traits[a])[0];
  const strongestTraitLabel: Record<SoftSkillTrait, Record<Language, string>> = {
    empathy: { ru: 'эмпатия', en: 'empathy' },
    stability: { ru: 'устойчивость', en: 'stability' },
    responsibility: { ru: 'ответственность', en: 'responsibility' },
    structure: { ru: 'структура', en: 'structure' },
  };

  if (lang === 'ru') {
    return [
      `Метод: rule_based_v1. Стиль: ${dominantStyle}. Coverage: ${Math.round(coverage * 100)}%.`,
      `Сильнее всего выражена черта: ${strongestTraitLabel[strongestTrait].ru} (${traits[strongestTrait]}%).`,
      topSignals.length ? `Наблюдаемые сигналы: ${topSignals.join(', ')}.` : 'Сильных сигналов пока недостаточно.',
      watchSignals.length ? `Зоны внимания: ${watchSignals.join(', ')}.` : '',
    ].filter(Boolean).join(' ');
  }

  return [
    `Method: rule_based_v1. Style: ${dominantStyle}. Coverage: ${Math.round(coverage * 100)}%.`,
    `Strongest trait: ${strongestTraitLabel[strongestTrait].en} (${traits[strongestTrait]}%).`,
    topSignals.length ? `Observed signals: ${topSignals.join(', ')}.` : 'Not enough strong signals yet.',
    watchSignals.length ? `Watchouts: ${watchSignals.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
}

async function generateAiStructuredSummary(
  answers: Record<string, string>,
  lang: Language,
  profile: SoftSkillsProfile,
  candidateInfo?: AssessmentCandidateInfo,
): Promise<AIStructuredSummary | undefined> {
  const reflectionAnswers = [answers.t1?.trim(), answers.t2?.trim()].filter(Boolean);
  if (reflectionAnswers.length === 0) return undefined;

  const prompt = [
    `Language: ${lang}`,
    `Rule-based dominant style: ${profile.dominantStyle}`,
    `Coverage: ${Math.round(profile.coverage * 100)}%`,
    `Traits: ${JSON.stringify(profile.traits)}`,
    `Signals: ${JSON.stringify(profile.signals)}`,
    candidateInfo?.experience ? `Experience: ${candidateInfo.experience}` : '',
    candidateInfo?.about ? `About: ${candidateInfo.about}` : '',
    `Reflection answer 1: ${answers.t1 || ''}`,
    `Reflection answer 2: ${answers.t2 || ''}`,
  ].filter(Boolean).join('\n');

  try {
    const raw = await aiText(prompt, {
      instructionPreset: 'assessment_structured_summary_v1',
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          parentSafeSummary: { type: SchemaType.STRING },
          moderationNotes: { type: SchemaType.STRING },
          extractedSignals: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          watchouts: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ['parentSafeSummary', 'moderationNotes', 'extractedSignals', 'watchouts'],
      },
    });

    const parsed = safeJsonParse<{
      parentSafeSummary?: string;
      moderationNotes?: string;
      extractedSignals?: string[];
      watchouts?: string[];
    }>(raw);

    if (!parsed?.parentSafeSummary || !parsed?.moderationNotes) return undefined;

    return {
      method: 'ai_structured_summary_v1',
      parentSafeSummary: parsed.parentSafeSummary.trim(),
      moderationNotes: parsed.moderationNotes.trim(),
      extractedSignals: Array.isArray(parsed.extractedSignals) ? parsed.extractedSignals.filter(Boolean).slice(0, 5) : [],
      watchouts: Array.isArray(parsed.watchouts) ? parsed.watchouts.filter(Boolean).slice(0, 5) : [],
      generatedAt: Date.now(),
    };
  } catch {
    return undefined;
  }
}

export function getAssessmentSignalLabel(signal: AssessmentSignalName, lang: Language): string {
  return SIGNAL_LABELS[signal][lang];
}

export function buildRuleBasedAssessment(
  answers: Record<string, string>,
  lang: Language,
): SoftSkillsProfile {
  const rawTraitScores: Record<SoftSkillTrait, number> = {
    empathy: 0,
    stability: 0,
    responsibility: 0,
    structure: 0,
  };

  assessmentItems.forEach((item) => {
    const value = String(answers[item.id] ?? '').trim();
    if (!value) return;

    if (item.type === 'likert' && item.trait) {
      const numericValue = Number.parseInt(value, 10);
      if (Number.isFinite(numericValue) && numericValue >= 1 && numericValue <= 5) {
        rawTraitScores[item.trait] += numericValue;
      }
    }

    if (item.type === 'scenario' && item.options) {
      const selectedOption = item.options.find((option) => option.id === value);
      selectedOption?.traits.forEach((trait) => {
        rawTraitScores[trait.trait] += trait.value * 2;
      });
    }
  });

  const traits = TRAIT_KEYS.reduce((acc, trait) => {
    const normalized = Math.round((rawTraitScores[trait] / TRAIT_MAX_SCORES[trait]) * 100);
    acc[trait] = Math.round(clamp01(normalized / 100) * 100);
    return acc;
  }, {} as Record<SoftSkillTrait, number>);

  const styleDelta = traits.empathy - traits.structure;
  let dominantStyle: SoftSkillsProfile['dominantStyle'] = 'Balanced';
  if (styleDelta >= 12) dominantStyle = 'Empathetic';
  else if (styleDelta <= -12) dominantStyle = 'Structured';

  const rawScore = Math.min(
    98,
    Math.round(TRAIT_KEYS.reduce((sum, trait) => sum + traits[trait], 0) / TRAIT_KEYS.length),
  );
  const answeredItems = answeredItemCount(answers);
  const totalItems = assessmentItems.length;
  const coverage = Number((answeredItems / totalItems).toFixed(2));
  const signals = buildSignals(answers);
  const familySummary = buildFamilySummary(lang, dominantStyle, signals, coverage);
  const moderationSummary = buildModerationSummary(lang, dominantStyle, signals, coverage, traits);

  return {
    method: 'rule_based_v1',
    rawScore,
    dominantStyle,
    summary: familySummary,
    familySummary,
    moderationSummary,
    completedAt: Date.now(),
    coverage,
    confidenceReason: coverage >= 0.99 ? 'full_answers' : 'partial_answers',
    answeredItems,
    totalItems,
    traits,
    signals,
  };
}

export async function analyzeAssessment(
  answers: Record<string, string>,
  lang: Language,
  candidateInfo?: AssessmentCandidateInfo,
): Promise<SoftSkillsProfile> {
  const profile = buildRuleBasedAssessment(answers, lang);
  const aiStructuredSummary = await generateAiStructuredSummary(answers, lang, profile, candidateInfo);

  if (!aiStructuredSummary) return profile;

  return {
    ...profile,
    aiStructuredSummary,
  };
}
