import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileCheck,
  Users,
  Video,
  CheckCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { SeoHead } from './SeoHead';
import { Button, Badge } from '../UI';

/* ─── HowWeVerifyPage ─── /how-we-verify ─── */

const howWeVerifySchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Как мы проверяем нянь — 5 уровней верификации',
  description:
    'Пошаговый процесс проверки профиля няни в Blizko: документы, видеовизитка, рекомендации, модерация и объяснимые сигналы совместимости.',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Проверка документов',
      text: 'Мы просим базовые документы и проверяем читаемость, полноту и соответствие профилю.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Видеовизитка',
      text: 'Каждая няня записывает видеовизитку. Вы видите, как она общается, ещё до первой встречи.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Рекомендации',
      text: 'Мы проверяем отзывы от предыдущих семей и запрашиваем рекомендации.',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Ручная модерация',
      text: 'Профиль смотрит оператор Blizko и отмечает, что семье стоит обсудить заранее.',
    },
    {
      '@type': 'HowToStep',
      position: 5,
      name: 'Объяснимые сигналы совместимости',
      text: 'Мы сопоставляем возраст детей, график, опыт и стиль коммуникации и объясняем, почему именно эта няня подошла.',
    },
  ],
};

export const HowWeVerifyPage: React.FC = () => {
  const navigate = useNavigate();

  const steps = useMemo(
    () => [
      {
        icon: <FileCheck size={28} className="text-green-600" />,
        title: 'Проверка документов',
        description:
          'Мы просим базовые документы и проверяем, что они читаемы, относятся к профилю и помогают семье понять уровень подготовки.',
      },
      {
        icon: <Video size={28} className="text-amber-600" />,
        title: 'Видеовизитка',
        description:
          'Каждая няня записывает видеовизитку. Вы видите, как она общается, ещё до первой встречи.',
      },
      {
        icon: <Users size={28} className="text-blue-600" />,
        title: 'Рекомендации',
        description: 'Мы проверяем отзывы от предыдущих семей и запрашиваем рекомендации.',
      },
      {
        icon: <ShieldCheck size={28} className="text-purple-600" />,
        title: 'Ручная модерация',
        description:
          'Профиль смотрит оператор Blizko и отмечает, что семье стоит перепроверить до первого выхода.',
      },
      {
        icon: <CheckCircle size={28} className="text-green-600" />,
        title: 'Объяснимые сигналы совместимости',
        description:
          'Мы сопоставляем возраст детей, график, опыт и стиль общения и объясняем, почему именно эта няня подошла.',
      },
    ],
    [],
  );

  return (
    <>
      <SeoHead
        title="Как мы проверяем нянь — 5 уровней верификации | Blizko"
        description="Документы, видеовизитка, рекомендации, ручная модерация и объяснимые сигналы совместимости. Узнайте, как Blizko помогает семье снизить риск на старте."
        canonical="https://blizko.app/how-we-verify"
        schema={howWeVerifySchema}
      />

      <article className="page-frame section-stack animate-fade-in py-4 pb-16 md:py-8">
        <nav>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--cloud-border)] bg-white/75 px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
          >
            <ArrowLeft size={18} /> Назад
          </button>
        </nav>

        <header className="hero-shell">
          <div className="section-stack">
            <div className="flex flex-wrap items-center gap-2">
              <div className="eyebrow">
                <ShieldCheck size={14} />
                Trust layer
              </div>
              <Badge variant="trust">5 уровней проверки</Badge>
            </div>
            <h1 className="section-heading max-w-none">Как мы проверяем нянь</h1>
            <p className="section-body">
              Документы, видеовизитка, рекомендации, ручная модерация и объяснимые сигналы
              совместимости.
            </p>
          </div>
        </header>

        <section className="section-stack" aria-label="Шаги верификации">
          {steps.map((step, i) => (
            <div key={i} className="section-shell p-5 md:p-6">
              <div className="flex gap-4 items-start">
                <div className="proof-icon-wrap mt-0.5 shrink-0 bg-stone-100 text-stone-700">
                  {step.icon}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-stone-900 mb-1">{step.title}</h2>
                  <p className="text-sm leading-7 text-stone-600">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="section-shell p-6 text-center">
          <p className="section-body mx-auto mb-4">
            <strong>
              Профили проходят модерацию, но окончательное решение всегда остаётся за семьёй.
            </strong>
            <br />
            Мы помогаем быстрее понять, что важно обсудить до первого выхода.
          </p>
          <div className="mx-auto w-full max-w-sm">
            <Button onClick={() => navigate('/find-nanny')} pulse>
              <Sparkles size={18} /> Найти няню
            </Button>
          </div>
        </section>

        <footer className="mt-6 text-center text-sm text-stone-400">
          <Link
            to="/humanity-plus"
            className="text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors"
          >
            Узнайте, как работает подбор Blizko →
          </Link>
        </footer>
      </article>
    </>
  );
};

/* ─── HumanityPlusPage ─── /humanity-plus ─── */

const humanityPlusSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Что делает модель подбора Blizko?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Она помогает куратору собрать контекст семьи, данные анкеты, документы и опыт няни. На основе этих сигналов куратор видит, какие няни могут подойти, где есть риски и что важно обсудить заранее.',
      },
    },
    {
      '@type': 'Question',
      name: 'Чем Blizko отличается от каталога нянь?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'В каталоге семья сама просматривает десятки анкет. В Blizko запрос сначала превращается в понятный контекст, затем куратор отбирает несколько проверенных вариантов и объясняет причины выбора. По мере работы платформа лучше понимает, какие сигналы действительно помогают семьям.',
      },
    },
    {
      '@type': 'Question',
      name: 'Кто принимает решение — ИИ или куратор?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Финальное решение принимает куратор вместе с семьёй. ИИ помогает структурировать информацию, подсветить совпадения и не потерять важные детали, но не заменяет человеческую оценку.',
      },
    },
    {
      '@type': 'Question',
      name: 'Почему подбор становится точнее со временем?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Blizko устроен так, чтобы учитывать не только анкеты, но и реальные результаты — какие варианты семьи открывали, с кем встречались, какой была обратная связь, где возникали риски. По мере работы платформы эти сигналы помогают улучшать будущие подборы.',
      },
    },
  ],
};

export const HumanityPlusPage: React.FC = () => {
  const navigate = useNavigate();

  const factors = useMemo(
    () => [
      {
        emoji: '🧩',
        title: 'Контекст семьи',
        description:
          'Возраст ребёнка, график, пожелания и тревоги родителей — с этого начинается подбор.',
      },
      {
        emoji: '🛡️',
        title: 'Проверка и документы',
        description:
          'Анкеты проходят модерацию, документы — проверку. Что уже видно — видно заранее.',
      },
      {
        emoji: '👩‍🍼',
        title: 'Опыт няни',
        description:
          'Смотрим на реальный опыт и навыки под ваш запрос, а не просто на доступность.',
      },
      {
        emoji: '🧑‍💼',
        title: 'Решение куратора',
        description:
          'Финальный выбор — за куратором вместе с семьёй. ИИ помогает не потерять важные детали.',
      },
      {
        emoji: '📈',
        title: 'Точнее со временем',
        description:
          'По мере работы платформа учитывает обратную связь после встреч — подбор уточняется.',
      },
    ],
    [],
  );

  return (
    <>
      <SeoHead
        title="Как Blizko подбирает няню | Кураторский подбор"
        description="Куратор и система доверительных сигналов: контекст семьи, проверка анкеты и опыт няни — и понятные причины выбора. Как устроен подбор Blizko."
        canonical="https://blizko.app/humanity-plus"
        schema={humanityPlusSchema}
      />

      <article className="page-frame section-stack animate-fade-in py-4 pb-16 md:py-8">
        <nav>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--cloud-border)] bg-white/75 px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
          >
            <ArrowLeft size={18} /> Назад
          </button>
        </nav>

        <header className="hero-shell">
          <div className="section-stack">
            <div className="flex flex-wrap items-center gap-2">
              <div className="eyebrow">
                <Sparkles size={14} />
                Как работает подбор
              </div>
              <Badge variant="info">Кураторский подбор</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="section-heading max-w-none">Как Blizko подбирает няню</h1>
            </div>
            <p className="section-body">
              Мы соединяем человеческую экспертизу куратора и систему доверительных сигналов, чтобы
              семья получила не случайный список анкет, а несколько понятных и проверенных
              вариантов.
            </p>
          </div>
        </header>

        <section className="section-stack" aria-label="Факторы совместимости">
          {factors.map((f, i) => (
            <div key={i} className="section-shell p-5 md:p-6">
              <div className="flex gap-4 items-start">
                <span className="text-2xl mt-0.5" role="img" aria-hidden="true">
                  {f.emoji}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-stone-900 mb-1">{f.title}</h2>
                  <p className="text-sm leading-7 text-stone-600">{f.description}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="section-shell p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Как это работает?</h2>
          <ol className="space-y-2 text-sm text-stone-600 list-decimal list-inside leading-7">
            <li>Вы заполняете короткую заявку о семье и пожеланиях</li>
            <li>
              Куратор собирает контекст, анкеты, документы и опыт — ИИ помогает структурировать и
              подсветить совпадения
            </li>
            <li>Вы получаете 2–3 проверенных варианта</li>
            <li>К каждому — понятные причины выбора и что важно обсудить заранее</li>
          </ol>
        </section>

        <section className="text-center">
          <div className="mx-auto w-full max-w-sm">
            <Button onClick={() => navigate('/find-nanny')} pulse>
              <Sparkles size={18} /> Найти няню
            </Button>
          </div>
        </section>

        <footer className="mt-6 text-center text-sm text-stone-400">
          <Link
            to="/how-we-verify"
            className="text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors"
          >
            Узнайте, как мы проверяем нянь — 5 уровней верификации →
          </Link>
        </footer>
      </article>
    </>
  );
};
