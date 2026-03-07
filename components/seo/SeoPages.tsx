import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileCheck, Users, Video, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';

export const HowWeVerifyPage: React.FC = () => {
    const navigate = useNavigate();

    const steps = [
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
    ];

    return (
        <div className="min-h-screen bg-gradient-warm px-4 py-8 max-w-2xl mx-auto">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 mb-6 hover:text-stone-700 transition-colors">
                <ArrowLeft size={18} /> Назад
            </button>

            <h1 className="text-2xl font-bold text-stone-800 mb-2">Как мы проверяем нянь</h1>
            <p className="text-stone-500 mb-8">5 уровней проверки — от документов до AI-совместимости</p>

            <div className="space-y-4">
                {steps.map((step, i) => (
                    <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 flex gap-4 items-start hover-lift transition-all">
                        <div className="mt-0.5 shrink-0 w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center">
                            {step.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-stone-800 mb-1">{step.title}</h3>
                            <p className="text-sm text-stone-500 leading-relaxed">{step.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-white/60 backdrop-blur rounded-2xl p-6 text-center">
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
            </div>
        </div>
    );
};

export const HumanityPlusPage: React.FC = () => {
    const navigate = useNavigate();

    const factors = [
        { emoji: '🤝', title: 'Стиль общения', description: 'Тёплый, структурный или активный — мы подбираем няню с похожим стилем, чтобы ребёнку было комфортно.' },
        { emoji: '🧠', title: 'Подход к воспитанию', description: 'Что важнее — правила или свобода? AI сопоставляет ваш подход с подходом няни.' },
        { emoji: '💛', title: 'Эмоциональная совместимость', description: 'Как няня справляется с истериками? Насколько она автономна? Мы учитываем всё.' },
        { emoji: '⏰', title: 'Режим и гибкость', description: 'Структурированный день или гибкий график — находим баланс между вашими потребностями.' },
        { emoji: '🛡️', title: 'Зоны риска', description: 'AI предупреждает о потенциальных точках напряжения ещё до первой встречи.' },
    ];

    return (
        <div className="min-h-screen bg-gradient-warm px-4 py-8 max-w-2xl mx-auto">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 mb-6 hover:text-stone-700 transition-colors">
                <ArrowLeft size={18} /> Назад
            </button>

            <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-stone-800">Что такое Humanity+</h1>
                <span className="text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">Технология</span>
            </div>
            <p className="text-stone-500 mb-8">AI, который понимает людей — не просто фильтрует, а объясняет совместимость</p>

            <div className="space-y-4">
                {factors.map((f, i) => (
                    <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 flex gap-4 items-start hover-lift transition-all">
                        <span className="text-2xl mt-0.5">{f.emoji}</span>
                        <div>
                            <h3 className="font-semibold text-stone-800 mb-1">{f.title}</h3>
                            <p className="text-sm text-stone-500 leading-relaxed">{f.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-amber-50/80 backdrop-blur rounded-2xl p-6">
                <h3 className="font-semibold text-stone-800 mb-3">Как это работает?</h3>
                <div className="space-y-2 text-sm text-stone-600">
                    <p>1. Вы заполняете заявку — отвечаете на 5 вопросов о стиле воспитания</p>
                    <p>2. AI анализирует ваш профиль и профили нянь</p>
                    <p>3. Вы получаете 2-3 подобранных кандидата</p>
                    <p>4. К каждой — объяснение: почему она подходит + на что обратить внимание</p>
                </div>
            </div>

            <div className="mt-6 text-center">
                <button
                    onClick={() => navigate('/find-nanny')}
                    className="btn-honey-pulse px-8 py-3 rounded-full text-base font-semibold flex items-center gap-2 mx-auto"
                >
                    <Sparkles size={18} /> Попробовать Humanity+
                </button>
            </div>
        </div>
    );
};
