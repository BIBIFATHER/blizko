import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, FileCheck, Users, Video, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { SeoHead } from './SeoHead';

/* ─── HowWeVerifyPage ─── /how-we-verify ─── */

const howWeVerifySchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Как мы проверяем нянь — 5 уровней верификации',
    description: 'Пошаговый процесс проверки нянь в Blizko: документы, видеовизитка, рекомендации, модерация и AI-совместимость.',
    step: [
        {
            '@type': 'HowToStep',
            position: 1,
            name: 'Проверка документов',
            text: 'Паспорт, медицинская книжка, справка о несудимости — каждый документ проходит AI-анализ и ручную проверку оператором.',
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
            text: 'Каждый профиль проверяется оператором Blizko. Только полностью верифицированные няни попадают в подбор.',
        },
        {
            '@type': 'HowToStep',
            position: 5,
            name: 'Humanity+ совместимость',
            text: 'AI анализирует стиль воспитания, подход и совместимость — и объясняет, почему конкретная няня подходит вашей семье.',
        },
    ],
};

export const HowWeVerifyPage: React.FC = () => {
    const navigate = useNavigate();

    const steps = useMemo(() => [
        {
            icon: <FileCheck size={28} className="text-green-600" />,
            title: 'Проверка документов',
            description: 'Паспорт, медицинская книжка, справка о несудимости — каждый документ проходит AI-анализ и ручную проверку оператором.',
        },
        {
            icon: <Video size={28} className="text-amber-600" />,
            title: 'Видеовизитка',
            description: 'Каждая няня записывает видеовизитку. Вы видите, как она общается, ещё до первой встречи.',
        },
        {
            icon: <Users size={28} className="text-blue-600" />,
            title: 'Рекомендации',
            description: 'Мы проверяем отзывы от предыдущих семей и запрашиваем рекомендации.',
        },
        {
            icon: <ShieldCheck size={28} className="text-purple-600" />,
            title: 'Ручная модерация',
            description: 'Каждый профиль проверяется оператором Blizko. Только полностью верифицированные няни попадают в подбор.',
        },
        {
            icon: <CheckCircle size={28} className="text-green-600" />,
            title: 'Humanity+ совместимость',
            description: 'AI анализирует стиль воспитания, подход и совместимость — и объясняет, почему конкретная няня подходит вашей семье.',
        },
    ], []);

    return (
        <>
            <SeoHead
                title="Как мы проверяем нянь — 5 уровней верификации | Blizko"
                description="Проверка документов, видеовизитки, рекомендации, ручная модерация и AI-совместимость. Узнайте, как Blizko гарантирует безопасность вашей семьи."
                canonical="https://blizko.app/how-we-verify"
                schema={howWeVerifySchema}
            />

            <article className="min-h-screen bg-gradient-warm px-4 py-8 max-w-2xl mx-auto">
                <nav>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 mb-6 hover:text-stone-700 transition-colors">
                        <ArrowLeft size={18} /> Назад
                    </button>
                </nav>

                <header>
                    <h1 className="text-2xl font-bold text-stone-800 mb-2">Как мы проверяем нянь</h1>
                    <p className="text-stone-500 mb-8">5 уровней проверки — от документов до AI-совместимости</p>
                </header>

                <section className="space-y-4" aria-label="Шаги верификации">
                    {steps.map((step, i) => (
                        <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 flex gap-4 items-start hover-lift transition-all">
                            <div className="mt-0.5 shrink-0 w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center">
                                {step.icon}
                            </div>
                            <div>
                                <h2 className="font-semibold text-stone-800 mb-1 text-base">{step.title}</h2>
                                <p className="text-sm text-stone-500 leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="mt-8 bg-white/60 backdrop-blur rounded-2xl p-6 text-center">
                    <p className="text-stone-600 mb-4">
                        <strong>97% нянь проходят проверку.</strong><br />
                        Мы не гонимся за количеством — мы заботимся о качестве.
                    </p>
                    <button
                        onClick={() => navigate('/find-nanny')}
                        className="btn-honey-pulse px-8 py-3 rounded-full text-base font-semibold flex items-center gap-2 mx-auto"
                    >
                        <Sparkles size={18} /> Найти няню
                    </button>
                </section>

                <footer className="mt-6 text-center text-sm text-stone-400">
                    <Link to="/humanity-plus" className="text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors">
                        Узнайте, как работает AI-подбор по совместимости →
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
            name: 'Что такое Humanity+ от Blizko?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Humanity+ — это AI-технология подбора няни по совместимости. AI анализирует стиль воспитания, подход и эмоциональную совместимость, и объясняет, почему конкретная няня подходит вашей семье.',
            },
        },
        {
            '@type': 'Question',
            name: 'Как работает AI-подбор няни по совместимости?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Вы заполняете заявку из 5 вопросов о стиле воспитания. AI анализирует ваш профиль и профили нянь, после чего вы получаете 2-3 подобранных кандидата с объяснением совместимости.',
            },
        },
    ],
};

export const HumanityPlusPage: React.FC = () => {
    const navigate = useNavigate();

    const factors = useMemo(() => [
        { emoji: '🤝', title: 'Стиль общения', description: 'Тёплый, структурный или активный — мы подбираем няню с похожим стилем, чтобы ребёнку было комфортно.' },
        { emoji: '🧠', title: 'Подход к воспитанию', description: 'Что важнее — правила или свобода? AI сопоставляет ваш подход с подходом няни.' },
        { emoji: '💛', title: 'Эмоциональная совместимость', description: 'Как няня справляется с истериками? Насколько она автономна? Мы учитываем всё.' },
        { emoji: '⏰', title: 'Режим и гибкость', description: 'Структурированный день или гибкий график — находим баланс между вашими потребностями.' },
        { emoji: '🛡️', title: 'Зоны риска', description: 'AI предупреждает о потенциальных точках напряжения ещё до первой встречи.' },
    ], []);

    return (
        <>
            <SeoHead
                title="Humanity+ — AI-подбор няни по совместимости | Blizko"
                description="AI анализирует стиль воспитания, подход и совместимость — и объясняет, почему конкретная няня подходит вашей семье. Технология Humanity+ от Blizko."
                canonical="https://blizko.app/humanity-plus"
                schema={humanityPlusSchema}
            />

            <article className="min-h-screen bg-gradient-warm px-4 py-8 max-w-2xl mx-auto">
                <nav>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 mb-6 hover:text-stone-700 transition-colors">
                        <ArrowLeft size={18} /> Назад
                    </button>
                </nav>

                <header>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-stone-800">AI-подбор няни по совместимости — Humanity+</h1>
                        <span className="text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">Технология</span>
                    </div>
                    <p className="text-stone-500 mb-8">AI, который понимает людей — не просто фильтрует, а объясняет совместимость</p>
                </header>

                <section className="space-y-4" aria-label="Факторы совместимости">
                    {factors.map((f, i) => (
                        <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 flex gap-4 items-start hover-lift transition-all">
                            <span className="text-2xl mt-0.5" role="img" aria-hidden="true">{f.emoji}</span>
                            <div>
                                <h2 className="font-semibold text-stone-800 mb-1 text-base">{f.title}</h2>
                                <p className="text-sm text-stone-500 leading-relaxed">{f.description}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="mt-8 bg-amber-50/80 backdrop-blur rounded-2xl p-6">
                    <h2 className="font-semibold text-stone-800 mb-3">Как это работает?</h2>
                    <ol className="space-y-2 text-sm text-stone-600 list-decimal list-inside">
                        <li>Вы заполняете заявку — отвечаете на 5 вопросов о стиле воспитания</li>
                        <li>AI анализирует ваш профиль и профили нянь</li>
                        <li>Вы получаете 2-3 подобранных кандидата</li>
                        <li>К каждой — объяснение: почему она подходит + на что обратить внимание</li>
                    </ol>
                </section>

                <section className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/find-nanny')}
                        className="btn-honey-pulse px-8 py-3 rounded-full text-base font-semibold flex items-center gap-2 mx-auto"
                    >
                        <Sparkles size={18} /> Попробовать Humanity+
                    </button>
                </section>

                <footer className="mt-6 text-center text-sm text-stone-400">
                    <Link to="/how-we-verify" className="text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors">
                        Узнайте, как мы проверяем нянь — 5 уровней верификации →
                    </Link>
                </footer>
            </article>
        </>
    );
};
