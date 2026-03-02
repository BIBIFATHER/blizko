import { Language, SoftSkillsProfile } from '../types';

export type AssessmentItemType = 'likert' | 'scenario' | 'text';

interface AssessmentItem {
  id: string;
  type: AssessmentItemType;
  text: Record<Language, string>;
  // For scenarios
  options?: {
    id: string;
    text: Record<Language, string>;
    traits: { trait: 'empathy' | 'stability' | 'responsibility' | 'structure'; value: number }[];
  }[];
  // For Likert (trait measured by agreeing)
  trait?: 'empathy' | 'stability' | 'responsibility' | 'structure';
}

export const assessmentItems: AssessmentItem[] = [
  // --- Part 1: Likert Scale (1-5) ---
  {
    id: 'l1',
    type: 'likert',
    text: { ru: 'Я легко сохраняю спокойствие, когда планы меняются в последнюю минуту.', en: 'I easily stay calm when plans change at the last minute.' },
    trait: 'stability'
  },
  {
    id: 'l2',
    type: 'likert',
    text: { ru: 'Детям важнее чувствовать, что их понимают, чем просто следовать правилам.', en: 'It is more important for children to feel understood than to just follow rules.' },
    trait: 'empathy'
  },
  {
    id: 'l3',
    type: 'likert',
    text: { ru: 'Я всегда сообщаю родителям о мелких происшествиях, даже если ребенок не пострадал.', en: 'I always inform parents about minor incidents, even if the child was not hurt.' },
    trait: 'responsibility'
  },
  {
    id: 'l4',
    type: 'likert',
    text: { ru: 'Четкий режим дня — залог хорошего настроения ребенка.', en: 'A strict daily schedule is the key to a child\'s good mood.' },
    trait: 'structure'
  },
  {
    id: 'l5',
    type: 'likert',
    text: { ru: 'Я могу сдерживать свои эмоции, даже если ребенок ведет себя агрессивно.', en: 'I can control my emotions even if the child is behaving aggressively.' },
    trait: 'stability'
  },
  {
    id: 'l6',
    type: 'likert',
    text: { ru: 'Иногда нужно нарушить правила, чтобы установить доверие с ребенком.', en: 'Sometimes rules need to be bent to build trust with a child.' },
    trait: 'empathy'
  },
  {
    id: 'l7',
    type: 'likert',
    text: { ru: 'Безопасность важнее, чем веселье или обучение.', en: 'Safety is more important than fun or learning.' },
    trait: 'responsibility'
  },
  {
    id: 'l8',
    type: 'likert',
    text: { ru: 'Мне комфортнее работать, когда у меня есть четкий список задач от родителей.', en: 'I feel more comfortable working when I have a clear task list from parents.' },
    trait: 'structure'
  },
  {
    id: 'l9',
    type: 'likert',
    text: { ru: 'Я быстро восстанавливаю силы после тяжелого рабочего дня.', en: 'I recover my energy quickly after a hard work day.' },
    trait: 'stability'
  },
  {
    id: 'l10',
    type: 'likert',
    text: { ru: 'Я считаю, что няня должна быть частью семьи, а не просто персоналом.', en: 'I believe a nanny should be part of the family, not just staff.' },
    trait: 'empathy'
  },

  // --- Part 2: Scenarios ---
  {
    id: 's1',
    type: 'scenario',
    text: {
      ru: 'Ребенок (3 года) устраивает истерику в магазине, потому что вы не купили игрушку. Ваши действия?',
      en: 'A child (3 y.o.) throws a tantrum in a store because you didn\'t buy a toy. Your action?'
    },
    options: [
      {
        id: 'a',
        text: { ru: 'Спокойно пережду пик эмоций, обеспечив безопасность, затем обниму.', en: 'Calmly wait out the peak of emotions ensuring safety, then hug.' },
        traits: [{ trait: 'empathy', value: 3 }, { trait: 'stability', value: 3 }]
      },
      {
        id: 'b',
        text: { ru: 'Строго напомню о нашем уговоре и выведу из магазина.', en: 'Strictly remind about our agreement and take him out of the store.' },
        traits: [{ trait: 'structure', value: 3 }, { trait: 'stability', value: 2 }]
      },
      {
        id: 'c',
        text: { ru: 'Попробую отвлечь его внимание на что-то другое интересное.', en: 'Try to distract his attention to something else interesting.' },
        traits: [{ trait: 'responsibility', value: 2 }, { trait: 'empathy', value: 1 }]
      }
    ]
  },
  {
    id: 's2',
    type: 'scenario',
    text: {
      ru: 'Вы заметили, что у ребенка ссадина, но не видели момент падения. Родители вернутся через час.',
      en: 'You notice the child has a scratch, but didn\'t see the fall. Parents return in an hour.'
    },
    options: [
      {
        id: 'a',
        text: { ru: 'Обработаю рану и сообщу родителям сразу по их приходу.', en: 'Treat the wound and inform parents immediately upon their arrival.' },
        traits: [{ trait: 'structure', value: 2 }]
      },
      {
        id: 'b',
        text: { ru: 'Сразу напишу родителям сообщение с фото, чтобы быть честной.', en: 'Immediately message parents with a photo to be honest.' },
        traits: [{ trait: 'responsibility', value: 3 }, { trait: 'stability', value: 2 }]
      },
      {
        id: 'c',
        text: { ru: 'Если ребенок не плачет, не буду заострять внимание.', en: 'If the child is not crying, I won\'t focus on it.' },
        traits: [{ trait: 'structure', value: 1 }]
      }
    ]
  },
  {
    id: 's3',
    type: 'scenario',
    text: {
      ru: 'Родители просят укладывать ребенка спать в 13:00, но он совсем не хочет и активно играет.',
      en: 'Parents ask to put the child to sleep at 1:00 PM, but he doesn\'t want to and is playing actively.'
    },
    options: [
      {
        id: 'a',
        text: { ru: 'Буду соблюдать режим: начну успокаивать его заранее, чтобы уложить вовремя.', en: 'Will follow the schedule: start calming him down in advance to put him to bed on time.' },
        traits: [{ trait: 'structure', value: 3 }, { trait: 'responsibility', value: 2 }]
      },
      {
        id: 'b',
        text: { ru: 'Позволю поиграть еще 30 минут, если он не выглядит уставшим.', en: 'Let him play for another 30 minutes if he doesn\'t look tired.' },
        traits: [{ trait: 'empathy', value: 2 }, { trait: 'structure', value: 0 }]
      },
      {
        id: 'c',
        text: { ru: 'Предложу тихую игру в кровати вместо сна.', en: 'Offer a quiet game in bed instead of sleep.' },
        traits: [{ trait: 'empathy', value: 3 }]
      }
    ]
  },

  // --- Part 3: Self Reflection ---
  {
    id: 't1',
    type: 'text',
    text: {
      ru: 'Опишите ваш способ восстановления эмоционального ресурса после сложного дня?',
      en: 'Describe your way of restoring emotional resources after a difficult day?'
    }
  },
  {
    id: 't2',
    type: 'text',
    text: {
      ru: 'Какое ваше главное "супер-качество" в работе с детьми?',
      en: 'What is your main "superpower" in working with children?'
    }
  }
];

export const analyzeAssessment = (answers: Record<string, string>, lang: Language): Promise<SoftSkillsProfile> => {
  return new Promise((resolve) => {
    // Simulation of AI processing
    setTimeout(() => {
      const scores = { empathy: 0, stability: 0, responsibility: 0, structure: 0 };
      
      assessmentItems.forEach(item => {
        const val = answers[item.id];
        
        if (item.type === 'likert' && val && item.trait) {
          // Value is 1-5 string
          const num = parseInt(val, 10);
          scores[item.trait] += num;
        }

        if (item.type === 'scenario' && val && item.options) {
          const selectedOpt = item.options.find(o => o.id === val);
          selectedOpt?.traits.forEach(t => {
            scores[t.trait] += t.value * 2; // Scenarios have higher weight
          });
        }
      });

      // Simple heuristic for dominant style
      let dominantStyle: SoftSkillsProfile['dominantStyle'] = 'Balanced';
      if (scores.empathy > scores.structure + 5) dominantStyle = 'Empathetic';
      else if (scores.structure > scores.empathy + 5) dominantStyle = 'Structured';

      const rawScore = Math.min(Math.round(((scores.empathy + scores.stability + scores.responsibility + scores.structure) / 100) * 100), 98);

      // AI Text Generation based on logic
      let summaryRu = '';
      let summaryEn = '';

      if (dominantStyle === 'Empathetic') {
        summaryRu = 'Профиль "Заботливый наставник". Кандидат демонстрирует высокий эмоциональный интеллект. В критических ситуациях (истерика, стресс) фокусируется на чувствах ребенка, используя мягкие методы контейнирования эмоций. Сильная сторона: создание глубокой доверительной связи. Зона внимания: поддержание границ.';
        summaryEn = '"Caring Mentor" Profile. Candidate demonstrates high emotional intelligence. In critical situations (tantrums, stress), focuses on the child\'s feelings using gentle emotional containment methods. Strength: creating a deep trust bond. Focus area: maintaining boundaries.';
      } else if (dominantStyle === 'Structured') {
        summaryRu = 'Профиль "Надежный организатор". Кандидат ценит предсказуемость, режим и безопасность. В стрессовых ситуациях сохраняет хладнокровие и опирается на инструкции. Идеально подходит для семей, где важен четкий распорядок и дисциплина. Сильная сторона: ответственность и стабильность.';
        summaryEn = '"Reliable Organizer" Profile. Candidate values predictability, routine, and safety. In stressful situations, remains composed and relies on instructions. Ideal for families where clear schedule and discipline are key. Strength: responsibility and stability.';
      } else {
        summaryRu = 'Профиль "Баланс и гибкость". Кандидат умело переключается между ролью мягкого друга и авторитетного взрослого. Адаптируется под ситуацию: может проявить твердость в вопросах безопасности, но уступить в игре. Высокий показатель стрессоустойчивости указывает на профессиональную зрелость.';
        summaryEn = '"Balance and Flexibility" Profile. Candidate skillfully switches between the role of a gentle friend and an authoritative adult. Adapts to the situation: can be firm on safety issues but yielding in play. High stress resilience indicates professional maturity.';
      }

      resolve({
        rawScore,
        dominantStyle,
        summary: lang === 'ru' ? summaryRu : summaryEn,
        completedAt: Date.now()
      });
    }, 2500);
  });
};