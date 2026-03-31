import React from 'react';
import { X, Video, BrainCircuit, Heart, Sparkles, Smile, ChevronDown, ScanFace, Fingerprint, ShieldCheck, Search, FileSearch, Lock, Headset, FileText, RefreshCw, Zap } from 'lucide-react';
import { Button } from './UI';
import { Language } from '@/core/types';

export type ModalMode = 'compatibility' | 'verification' | 'support';

interface CompatibilityModalProps {
  onClose: () => void;
  onAction: () => void;
  lang: Language;
  mode: ModalMode;
}

// Helper icon
const Activity = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

// --- CONTENT DATA ---

const SUPPORT_DATA = {
  ru: [
    {
      id: 's1',
      title: "Поддержка рядом.\nБез лишней тревоги.",
      text: "На старте часть простых вопросов закрывает продуктовый flow и support chat.\n\nКогда нужен человек, команда Blizko смотрит на контекст и помогает разобраться со следующим шагом.",
      bg: "bg-linear-to-b from-amber-50 to-orange-50",
      icon: <Sparkles size={60} className="text-amber-500" />
    },
    {
      id: 's2',
      title: "Когда нужен человек",
      text: "Подключаемся там, где нужно уточнить детали анкеты, ожидания семьи или спокойно разобраться в спорном моменте.",
      bg: "bg-linear-to-b from-orange-50 to-yellow-50",
      icon: <Headset size={60} className="text-orange-400" />
    },
    {
      id: 's3',
      title: "Полный сервис",
      bg: "bg-linear-to-b from-yellow-50 to-emerald-50",
      type: "steps",
      steps: [
        {
          icon: <FileText size={20} className="text-stone-600" />,
          title: "Юридическая ясность",
          desc: "Помогаем понять, какие условия стоит зафиксировать заранее."
        },
        {
          icon: <RefreshCw size={20} className="text-emerald-600" />,
          title: "Следующий шаг",
          desc: "Если ситуация не складывается, помогаем сориентироваться, что делать дальше."
        },
        {
          icon: <Zap size={20} className="text-amber-600" />,
          title: "Спорные моменты",
          desc: "Помогаем спокойно собрать контекст и договориться о следующем шаге."
        }
      ]
    },
    {
      id: 's4',
      title: "Спокойнее на старте",
      text: "Мы не убираем всю неопределённость, но помогаем пройти первые шаги с меньшим хаосом и более понятной коммуникацией.",
      bg: "bg-linear-to-b from-emerald-50 to-teal-50",
      icon: <Heart size={60} className="text-emerald-500" />
    }
  ],
  en: [
    {
      id: 's1',
      title: "Support nearby.\nWith less anxiety.",
      text: "At the start, simple questions are handled by the product flow and support chat.\n\nWhen a human is needed, the Blizko team looks at the context and helps with the next step.",
      bg: "bg-linear-to-b from-amber-50 to-orange-50",
      icon: <Sparkles size={60} className="text-amber-500" />
    },
    {
      id: 's2',
      title: "When a human is needed",
      text: "We step in when request details, family expectations, or a tricky moment need calm human help.",
      bg: "bg-linear-to-b from-orange-50 to-yellow-50",
      icon: <Headset size={60} className="text-orange-400" />
    },
    {
      id: 's3',
      title: "Full Service",
      bg: "bg-linear-to-b from-yellow-50 to-emerald-50",
      type: "steps",
      steps: [
        {
          icon: <FileText size={20} className="text-stone-600" />,
          title: "Legal clarity",
          desc: "We help you understand which terms are worth fixing in advance."
        },
        {
          icon: <RefreshCw size={20} className="text-emerald-600" />,
          title: "Next step",
          desc: "If the situation does not work out, we help you understand what to do next."
        },
        {
          icon: <Zap size={20} className="text-amber-600" />,
          title: "Tricky moments",
          desc: "We help gather context and move the conversation toward the next step."
        }
      ]
    },
    {
      id: 's4',
      title: "A calmer start",
      text: "We do not remove every uncertainty, but we help the first steps feel less chaotic and more understandable.",
      bg: "bg-linear-to-b from-emerald-50 to-teal-50",
      icon: <Heart size={60} className="text-emerald-500" />
    }
  ]
};

const VERIFICATION_DATA = {
  ru: [
    {
      id: 'v1',
      title: "Проверка профиля.\nПомогаем снизить риск на старте.",
      text: "Мы смотрим на профиль в несколько шагов: документы, описание опыта, видеовизитку и рекомендации, если они есть.",
      bg: "bg-linear-to-b from-emerald-50 to-teal-50",
      icon: <ShieldCheck size={60} className="text-emerald-500" />
    },
    {
      id: 'v2',
      title: "Документы и читаемость файлов",
      text: "Сначала проверяем, что документы читаются, относятся к профилю и помогают семье понять уровень подготовки кандидата.",
      bg: "bg-linear-to-b from-teal-50 to-cyan-50",
      icon: <FileSearch size={60} className="text-cyan-500" />
    },
    {
      id: 'v3',
      title: "Что ещё смотрим",
      bg: "bg-linear-to-b from-cyan-50 to-blue-50",
      type: "steps",
      steps: [
        {
          icon: <Search size={20} className="text-blue-600" />,
          title: "Профиль и анкета",
          desc: "Сверяем опыт, график и описание с загруженными материалами."
        },
        {
          icon: <Lock size={20} className="text-indigo-600" />,
          title: "Рекомендации и отзывы",
          desc: "Учитываем сторонние сигналы, если они есть."
        },
        {
          icon: <Activity size={20} className="text-rose-600" />,
          title: "Ручная модерация",
          desc: "Оператор отмечает, что семье стоит обсудить заранее."
        },
      ]
    },
    {
      id: 'v4',
      title: "Без ложных гарантий",
      text: "Проверка снижает неопределённость, но не заменяет разговор, пробный выход и решение самой семьи.",
      bg: "bg-linear-to-b from-blue-50 to-indigo-50",
      icon: <Fingerprint size={60} className="text-indigo-500" />
    }
  ],
  en: [
    {
      id: 'v1',
      title: "Profile review.\nLowering risk at the start.",
      text: "We look at a profile in several steps: documents, experience, short introductions, and references when they exist.",
      bg: "bg-linear-to-b from-emerald-50 to-teal-50",
      icon: <ShieldCheck size={60} className="text-emerald-500" />
    },
    {
      id: 'v2',
      title: "Documents and file readability",
      text: "We first check that documents are readable, relevant to the profile, and helpful for the family to understand the candidate's preparation.",
      bg: "bg-linear-to-b from-teal-50 to-cyan-50",
      icon: <FileSearch size={60} className="text-cyan-500" />
    },
    {
      id: 'v3',
      title: "What else we review",
      bg: "bg-linear-to-b from-cyan-50 to-blue-50",
      type: "steps",
      steps: [
        {
          icon: <Search size={20} className="text-blue-600" />,
          title: "Profile and request fit",
          desc: "We compare experience, schedule, and profile description with the uploaded materials."
        },
        {
          icon: <Lock size={20} className="text-indigo-600" />,
          title: "References and reviews",
          desc: "We include outside signals when they exist."
        },
        {
          icon: <Activity size={20} className="text-rose-600" />,
          title: "Human moderation",
          desc: "An operator marks what the family should discuss before the first shift."
        },
      ]
    },
    {
      id: 'v4',
      title: "No false guarantees",
      text: "Review lowers uncertainty, but it does not replace the conversation, trial shift, and the family's own decision.",
      bg: "bg-linear-to-b from-blue-50 to-indigo-50",
      icon: <Fingerprint size={60} className="text-indigo-500" />
    }
  ]
};

const COMPATIBILITY_DATA = {
  ru: [
    {
      id: 1,
      title: "Подбор, который проще объяснить.",
      text: "Мы собираем не только анкетные поля, но и наблюдаемые сигналы по графику, опыту и стилю общения — чтобы shortlist был понятнее.",
      bg: "bg-linear-to-b from-amber-50 to-orange-50",
      icon: <Smile size={60} className="text-amber-400" />
    },
    {
      id: 2,
      title: "Какие сигналы мы учитываем?",
      text: "Смотрим на то, что реально видно семье до первого выхода:\n\n• возраст детей и релевантный опыт\n• график, район и формат помощи\n• стиль общения и ясность ответов",
      bg: "bg-linear-to-b from-orange-50 to-rose-50",
      icon: <ScanFace size={60} className="text-rose-400" />
    },
    {
      id: 3,
      title: "Технология Совместимости",
      bg: "bg-linear-to-b from-rose-50 to-indigo-50",
      type: "steps",
      steps: [
        {
          icon: <Video size={20} className="text-purple-600" />,
          title: "Профиль",
          desc: "Учитываем опыт, возраст детей, район и режим работы."
        },
        {
          icon: <BrainCircuit size={20} className="text-amber-600" />,
          title: "Коммуникация",
          desc: "Смотрим на ясность ответов и то, как няня описывает свой подход."
        },
        {
          icon: <Fingerprint size={20} className="text-emerald-600" />,
          title: "Shortlist",
          desc: "Система помогает собрать сильные совпадения и объяснить, почему кандидат оказался в списке."
        },
      ]
    },
    {
      id: 4,
      title: "Результат: меньше хаоса",
      text: "Это не обещание идеальной пары. Это способ быстрее увидеть сильные совпадения и вопросы, которые важно обсудить заранее.",
      bg: "bg-linear-to-b from-indigo-50 to-sky-50",
      icon: <Sparkles size={60} className="text-sky-400" />
    }
  ],
  en: [
    {
      id: 1,
      title: "Matching that is easier to explain.",
      text: "We collect not only form fields, but also observable signals around schedule, experience, and communication style so the shortlist feels clearer.",
      bg: "bg-linear-to-b from-amber-50 to-orange-50",
      icon: <Smile size={60} className="text-amber-400" />
    },
    {
      id: 2,
      title: "What does AI see?",
      text: "While standard recruiting looks only at diplomas, our system structures observable communication signals during short introductions:\n\n• Speech clarity and pacing\n• Interaction style and composure\n• Consistency between answers and profile",
      bg: "bg-linear-to-b from-orange-50 to-rose-50",
      icon: <ScanFace size={60} className="text-rose-400" />
    },
    {
      id: 3,
      title: "Compatibility Technology",
      bg: "bg-linear-to-b from-rose-50 to-indigo-50",
      type: "steps",
      steps: [
        {
          icon: <Video size={20} className="text-purple-600" />,
          title: "Computer Vision",
          desc: "Analysis of observable non-verbal signals such as posture, eye contact, and overall presentation."
        },
        {
          icon: <BrainCircuit size={20} className="text-amber-600" />,
          title: "NLP Analysis",
          desc: "Speech evaluation: vocabulary, pedagogical mindset, and communication style."
        },
        {
          icon: <Fingerprint size={20} className="text-emerald-600" />,
          title: "Predictive Matching",
          desc: "The system estimates likely fit for a specific nanny in your specific family."
        },
      ]
    },
    {
      id: 4,
      title: "Result: less chaos",
      text: "This is not a promise of a perfect pair. It is a way to see stronger fits and better discussion points sooner.",
      bg: "bg-linear-to-b from-indigo-50 to-sky-50",
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
      <div className="bg-white/90 backdrop-blur-xl w-full max-w-sm rounded-3xl card-cloud border border-stone-100/80 relative flex flex-col overflow-hidden h-[85vh] max-h-[800px]">

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

          <div className="p-8 bg-transparent pt-0">
            <Button
              onClick={onAction}
              pulse
              className="w-full text-lg"
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
