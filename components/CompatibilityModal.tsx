import React from 'react';
import { X, Video, BrainCircuit, Heart, Sparkles, Smile, ChevronDown, ScanFace, Fingerprint, ShieldCheck, Search, FileSearch, Lock, Headset, FileText, RefreshCw, Zap, LifeBuoy } from 'lucide-react';
import { Button } from './UI';
import { Language } from '../types';

export type ModalMode = 'compatibility' | 'verification' | 'support';

interface CompatibilityModalProps {
  onClose: () => void;
  onAction: () => void;
  lang: Language;
  mode: ModalMode;
}

// Helper icon
const Activity = ({size, className}: {size:number, className?:string}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

// --- CONTENT DATA ---

const SUPPORT_DATA = {
  ru: [
    {
      id: 's1',
      title: "Поддержка 24/7.\nМы всегда на вашей стороне.",
      text: "Наш сервис работает на базе новейшей самообучающейся AI-модели.\n\nЧат-бот не просто отвечает шаблонами — он понимает контекст, помнит историю вашей семьи и мгновенно решает 90% вопросов в любое время суток.",
      bg: "bg-gradient-to-b from-amber-50 to-orange-50",
      icon: <Sparkles size={60} className="text-amber-500" />
    },
    {
      id: 's2',
      title: "Личный менеджер заботы",
      text: "Там, где нужен человеческий подход, подключается эксперт.\n\nЖивой менеджер помогает согласовать сложные графики, обсудить деликатные моменты воспитания или скорректировать условия договора.",
      bg: "bg-gradient-to-b from-orange-50 to-yellow-50",
      icon: <Headset size={60} className="text-orange-400" />
    },
    {
      id: 's3',
      title: "Полный сервис",
      bg: "bg-gradient-to-b from-yellow-50 to-emerald-50",
      type: "steps",
      steps: [
        { 
          icon: <FileText size={20} className="text-stone-600" />, 
          title: "Юридическая защита", 
          desc: "Готовим индивидуальный договор, защищающий интересы семьи и ребенка." 
        },
        { 
          icon: <RefreshCw size={20} className="text-emerald-600" />, 
          title: "Бесплатная замена", 
          desc: "Если няня заболела или ушла в отпуск, мы найдем проверенную замену за 2 часа." 
        },
        { 
          icon: <Zap size={20} className="text-amber-600" />, 
          title: "Медиация конфликтов", 
          desc: "Помогаем экологично решать споры, сохраняя комфортную атмосферу в доме." 
        }
      ]
    },
    {
      id: 's4',
      title: "Спокойствие как сервис",
      text: "Мы берем на себя всю рутину и риски, чтобы ваше время с няней было наполнено только заботой о ребенке, а не организационными проблемами.",
      bg: "bg-gradient-to-b from-emerald-50 to-teal-50",
      icon: <Heart size={60} className="text-emerald-500" />
    }
  ],
  en: [
    {
      id: 's1',
      title: "24/7 Support.\nWe are always by your side.",
      text: "Our service is powered by the newest self-learning AI model.\n\nThe chatbot doesn't just use templates — it understands context, remembers your family history, and instantly resolves 90% of issues around the clock.",
      bg: "bg-gradient-to-b from-amber-50 to-orange-50",
      icon: <Sparkles size={60} className="text-amber-500" />
    },
    {
      id: 's2',
      title: "Personal Care Manager",
      text: "Where a human touch is needed, an expert steps in.\n\nA real manager helps coordinate complex schedules, discuss delicate parenting moments, or adjust contract terms.",
      bg: "bg-gradient-to-b from-orange-50 to-yellow-50",
      icon: <Headset size={60} className="text-orange-400" />
    },
    {
      id: 's3',
      title: "Full Service",
      bg: "bg-gradient-to-b from-yellow-50 to-emerald-50",
      type: "steps",
      steps: [
        { 
          icon: <FileText size={20} className="text-stone-600" />, 
          title: "Legal Protection", 
          desc: "We prepare an individual contract protecting the interests of the family and child." 
        },
        { 
          icon: <RefreshCw size={20} className="text-emerald-600" />, 
          title: "Free Replacement", 
          desc: "If the nanny gets sick or goes on vacation, we find a vetted replacement in 2 hours." 
        },
        { 
          icon: <Zap size={20} className="text-amber-600" />, 
          title: "Conflict Mediation", 
          desc: "We help resolve disputes ecologically, maintaining a comfortable atmosphere at home." 
        }
      ]
    },
    {
      id: 's4',
      title: "Peace of Mind as a Service",
      text: "We take on all the routine and risks so that your time with the nanny is filled only with care for the child, not organizational problems.",
      bg: "bg-gradient-to-b from-emerald-50 to-teal-50",
      icon: <Heart size={60} className="text-emerald-500" />
    }
  ]
};

const VERIFICATION_DATA = {
  ru: [
    {
      id: 'v1',
      title: "5 Уровней Защиты.\nБезопасность без компромиссов.",
      text: "Мы не просто «смотрим документы». Мы создали многоступенчатую систему обороны, где технологии страхуют человеческую интуицию.",
      bg: "bg-gradient-to-b from-emerald-50 to-teal-50",
      icon: <ShieldCheck size={60} className="text-emerald-500" />
    },
    {
      id: 'v2',
      title: "AI-Верификация Документов",
      text: "Человеческий глаз может ошибиться. Нейросеть — нет. Наш алгоритм сканирует документы в спектрах, недоступных человеку:\n\n• Анализ микро-шрифтов и защитных сеток\n• Сверка контрольных сумм в MRZ-зонах\n• Выявление следов графических редакторов",
      bg: "bg-gradient-to-b from-teal-50 to-cyan-50",
      icon: <FileSearch size={60} className="text-cyan-500" />
    },
    {
      id: 'v3',
      title: "Глубинный OSINT-анализ",
      bg: "bg-gradient-to-b from-cyan-50 to-blue-50",
      type: "steps",
      steps: [
        { 
          icon: <Search size={20} className="text-blue-600" />, 
          title: "Цифровой след", 
          desc: "Поиск упоминаний в соцсетях, форумах и черных списках нянь по всей стране." 
        },
        { 
          icon: <Lock size={20} className="text-indigo-600" />, 
          title: "Судебная история", 
          desc: "Автоматическая проверка по базам ФССП и судебным реестрам на предмет долгов и правонарушений." 
        },
        { 
          icon: <Activity size={20} className="text-rose-600" />, 
          title: "Риск-профиль", 
          desc: "AI оценивает благонадежность на основе 20+ факторов риска." 
        },
      ]
    },
    {
      id: 'v4',
      title: "Доверие под защитой",
      text: "Только 8 из 100 кандидатов проходят этот фильтр.\n\nМы делаем эту работу, чтобы вы могли просто доверить самое дорогое, не думая о рисках.",
      bg: "bg-gradient-to-b from-blue-50 to-indigo-50",
      icon: <Fingerprint size={60} className="text-indigo-500" />
    }
  ],
  en: [
    {
      id: 'v1',
      title: "5 Levels of Defense.\nSafety without compromise.",
      text: "We don't just 'check documents'. We created a multi-layered defense system where technology backs up human intuition.",
      bg: "bg-gradient-to-b from-emerald-50 to-teal-50",
      icon: <ShieldCheck size={60} className="text-emerald-500" />
    },
    {
      id: 'v2',
      title: "AI Document Verification",
      text: "The human eye can fail. Neural networks do not. Our algorithm scans documents in spectrums invisible to humans:\n\n• Analysis of micro-fonts and security meshes\n• Validation of MRZ checksums\n• Detection of graphic editing traces",
      bg: "bg-gradient-to-b from-teal-50 to-cyan-50",
      icon: <FileSearch size={60} className="text-cyan-500" />
    },
    {
      id: 'v3',
      title: "Deep OSINT Analysis",
      bg: "bg-gradient-to-b from-cyan-50 to-blue-50",
      type: "steps",
      steps: [
        { 
          icon: <Search size={20} className="text-blue-600" />, 
          title: "Digital Footprint", 
          desc: "Search for mentions in social media, forums, and nanny blacklists nationwide." 
        },
        { 
          icon: <Lock size={20} className="text-indigo-600" />, 
          title: "Legal History", 
          desc: "Automatic check against bailiff databases and court registries for debts and offenses." 
        },
        { 
          icon: <Activity size={20} className="text-rose-600" />, 
          title: "Risk Profile", 
          desc: "AI evaluates trustworthiness based on 20+ risk factors." 
        },
      ]
    },
    {
      id: 'v4',
      title: "Trust Protected",
      text: "Only 8 out of 100 candidates pass this filter.\n\nWe do this work so you can simply entrust what is most precious without thinking about risks.",
      bg: "bg-gradient-to-b from-blue-50 to-indigo-50",
      icon: <Fingerprint size={60} className="text-indigo-500" />
    }
  ]
};

const COMPATIBILITY_DATA = {
  ru: [
    {
      id: 1,
      title: "Blizko+ — подбор, который объясним.",
      text: "Няня = продолжение семьи + добавляет то, чего не хватает.\n\nМы подбираем по ценностям, стилю общения и поведенческому совпадению — с гарантией прихода и объяснимым выбором.",
      bg: "bg-gradient-to-b from-amber-50 to-orange-50",
      icon: <Smile size={60} className="text-amber-400" />
    },
    {
      id: 2,
      title: "Что видит ИИ?",
      text: "Пока обычный подбор смотрит на дипломы, наш алгоритм анализирует 50+ неочевидных параметров во время видеоинтервью:\n\n• Тон голоса и микро-выражения лица\n• Уровень скрытой агрессии или усталости\n• Искренность эмоций при ответах",
      bg: "bg-gradient-to-b from-orange-50 to-rose-50",
      icon: <ScanFace size={60} className="text-rose-400" />
    },
    {
      id: 3,
      title: "Технология Совместимости",
      bg: "bg-gradient-to-b from-rose-50 to-indigo-50",
      type: "steps",
      steps: [
        { 
          icon: <Video size={20} className="text-purple-600" />, 
          title: "Computer Vision", 
          desc: "Анализ невербальных сигналов: открытость позы, зрительный контакт, улыбка." 
        },
        { 
          icon: <BrainCircuit size={20} className="text-amber-600" />, 
          title: "NLP Анализ", 
          desc: "Оценка речи: словарный запас, педагогические установки и стиль общения." 
        },
        { 
          icon: <Fingerprint size={20} className="text-emerald-600" />, 
          title: "Предиктивный Мэтчинг", 
          desc: "Система прогнозирует, насколько комфортно конкретной няне будет именно в вашей семье." 
        },
      ]
    },
    {
      id: 4,
      title: "Результат: Идеальная пара",
      text: "Это не магия, а математика отношений.\n\nСемьи, подобранные через наш AI-алгоритм, меняют нянь в 3 раза реже. Потому что когда ценности совпадают, каждый день становится спокойным.",
      bg: "bg-gradient-to-b from-indigo-50 to-sky-50",
      icon: <Sparkles size={60} className="text-sky-400" />
    }
  ],
  en: [
    {
      id: 1,
      title: "Blizko+ — explainable matching.",
      text: "A nanny is an extension of the family + brings what’s missing.\n\nWe match by values, communication style, and behavioral fit — with arrival guarantee and explainable selection.",
      bg: "bg-gradient-to-b from-amber-50 to-orange-50",
      icon: <Smile size={60} className="text-amber-400" />
    },
    {
      id: 2,
      title: "What does AI see?",
      text: "While standard recruiting looks at diplomas, our algorithm analyzes 50+ subtle parameters during video interviews:\n\n• Voice tone and micro-expressions\n• Levels of hidden aggression or fatigue\n• Sincerity of emotions in responses",
      bg: "bg-gradient-to-b from-orange-50 to-rose-50",
      icon: <ScanFace size={60} className="text-rose-400" />
    },
    {
      id: 3,
      title: "Compatibility Technology",
      bg: "bg-gradient-to-b from-rose-50 to-indigo-50",
      type: "steps",
      steps: [
        { 
          icon: <Video size={20} className="text-purple-600" />, 
          title: "Computer Vision", 
          desc: "Analysis of non-verbal signals: open posture, eye contact, smiling." 
        },
        { 
          icon: <BrainCircuit size={20} className="text-amber-600" />, 
          title: "NLP Analysis", 
          desc: "Speech evaluation: vocabulary, pedagogical mindset, and communication style." 
        },
        { 
          icon: <Fingerprint size={20} className="text-emerald-600" />, 
          title: "Predictive Matching", 
          desc: "The system predicts how comfortable a specific nanny will be in your specific family." 
        },
      ]
    },
    {
      id: 4,
      title: "Result: The Perfect Match",
      text: "It's not magic, it's relationship mathematics.\n\nFamilies matched through our AI algorithm change nannies 3 times less often. Because when values align, every day becomes peaceful.",
      bg: "bg-gradient-to-b from-indigo-50 to-sky-50",
      icon: <Sparkles size={60} className="text-sky-400" />
    }
  ]
};

const getSlidesData = (mode: ModalMode, lang: Language) => {
  if (mode === 'verification') return VERIFICATION_DATA[lang] || VERIFICATION_DATA['ru'];
  if (mode === 'support') return SUPPORT_DATA[lang] || SUPPORT_DATA['ru'];
  return COMPATIBILITY_DATA[lang] || COMPATIBILITY_DATA['ru'];
};

export const CompatibilityModal: React.FC<CompatibilityModalProps> = ({ onClose, onAction, lang, mode }) => {
  const slides = getSlidesData(mode, lang);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative flex flex-col overflow-hidden h-[85vh] max-h-[800px]">
        
        {/* Floating Close Button */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 backdrop-blur hover:bg-white transition-colors text-stone-600 shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {slides.map((section, idx) => (
            <div 
              key={section.id} 
              className={`p-8 flex flex-col justify-center min-h-[380px] relative ${section.bg} ${idx === 0 ? 'pt-20' : ''}`}
            >
              {/* Visual Icon */}
              {section.icon && (
                <div className="mb-6 self-center animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="relative">
                     <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-150"></div>
                     <div className="relative z-10 drop-shadow-xl transform transition-transform duration-700 hover:scale-105">
                       {section.icon}
                     </div>
                  </div>
                </div>
              )}

              {/* Text Content */}
              <div className="z-10 animate-slide-up" style={{ animationDelay: `${idx * 150}ms` }}>
                <h2 className="text-2xl font-bold text-stone-800 mb-4 leading-tight whitespace-pre-line">
                  {section.title}
                </h2>

                {section.type === 'steps' ? (
                  <div className="space-y-4 mt-2">
                     {section.steps?.map((step, sIdx) => (
                       <div key={sIdx} className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              {step.icon}
                            </div>
                            <span className="font-bold text-stone-800 text-sm tracking-tight">{step.title}</span>
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed pl-1">
                            {step.desc}
                          </p>
                       </div>
                     ))}
                  </div>
                ) : (
                  <p className="text-stone-600 text-lg leading-relaxed whitespace-pre-wrap">
                    {section.text}
                  </p>
                )}
              </div>

              {/* Decorative Divider (Arrow down between sections) */}
              {idx < slides.length - 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-30">
                  <ChevronDown size={24} className="text-stone-500 animate-bounce" />
                </div>
              )}
            </div>
          ))}

          {/* Final CTA Action Area */}
          <div className="p-8 bg-stone-50 pt-0 bg-gradient-to-b from-white to-white">
             <Button 
               onClick={onAction} 
               className="w-full bg-stone-900 text-white hover:bg-stone-800 shadow-xl rounded-2xl py-4 text-lg"
             >
               {lang === 'ru' ? 'Найти свою няню' : 'Find my nanny'}
             </Button>
             
             <button 
               onClick={onClose}
               className="w-full mt-4 text-sm text-stone-400 font-medium hover:text-stone-600 transition-colors"
             >
               {lang === 'ru' ? 'Закрыть' : 'Close'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};