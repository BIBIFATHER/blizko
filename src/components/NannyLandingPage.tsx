import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './UI';
import { SERVICE_COMMISSION_PERCENT } from '@/core/config/pricing';
import {
    ShieldCheck, Star, Clock, Users, TrendingUp, CheckCircle,
    ArrowRight, Heart, Sparkles, Phone
} from 'lucide-react';

export const NannyLandingPage: React.FC = () => {
    const navigate = useNavigate();

    const benefits = [
        {
            icon: <Users size={28} />,
            title: 'Стабильный поток заказов',
            desc: 'Получайте более понятные запросы по графику, району и формату помощи. Не нужно вручную разбирать всё подряд.',
        },
        {
            icon: <ShieldCheck size={28} />,
            title: 'Понятный контекст запроса',
            desc: 'До первого шага видны график, район и формат помощи. Если нужен человек, команда Blizko помогает разобраться в деталях.',
        },
        {
            icon: <TrendingUp size={28} />,
            title: 'Прозрачные деньги',
            desc: `Комиссия ${SERVICE_COMMISSION_PERCENT}% списывается после выхода. Доступ к заказам открывается после единоразовой активации профиля 5 000 ₽.`,
        },
        {
            icon: <Clock size={28} />,
            title: 'Гибкий график',
            desc: 'Вы отмечаете доступность и сами выбираете, на какие запросы откликаться.',
        },
        {
            icon: <Heart size={28} />,
            title: 'Поддержка рядом',
            desc: 'Помогаем по анкете, ожиданиям семьи и спорным моментам. Отвечаем быстро и без лишнего шума.',
        },
        {
            icon: <Star size={28} />,
            title: 'Рейтинг и отзывы',
            desc: 'Заполненный профиль и отзывы помогают семьям быстрее понять ваш опыт и стиль работы.',
        },
    ];

    const steps = [
        { num: '1', title: 'Заполните анкету', desc: '5 минут — расскажите о себе, опыте и подходе к работе' },
        { num: '2', title: 'Пройдите проверку', desc: 'Загрузите документы и дождитесь решения по анкете. Обычно это занимает 24-48 часов.' },
        { num: '3', title: 'Активируйте профиль', desc: 'После единоразовой активации 5 000 ₽ вы сможете получать запросы от семей.' },
    ];

    return (
        <div className="min-h-screen bg-linear-to-b from-stone-50 to-white">
            {/* Hero */}
            <section className="relative overflow-hidden px-4 pt-16 pb-20 text-center">
                <div className="absolute inset-0 bg-linear-to-br from-purple-50 via-stone-50 to-orange-50 opacity-80" />
                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-purple-100 mb-6 shadow-sm">
                        <Sparkles size={16} className="text-purple-600" />
                        <span className="text-sm font-semibold text-purple-700">Набираем нянь в Москве</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight">
                        Работайте спокойнее<br />
                        <span className="text-purple-600">с семьями, которым подходит ваш формат</span>
                    </h1>

                    <p className="text-lg text-stone-600 mb-8 leading-relaxed">
                        Blizko помогает пройти понятный путь: анкета, проверка, активация профиля
                        и подходящие запросы без хаотичного поиска.
                    </p>

                    <Button
                        onClick={() => navigate('/become-nanny')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg shadow-xl shadow-purple-200 hover-lift"
                    >
                        Заполнить анкету няни <ArrowRight size={20} />
                    </Button>

                    <p className="text-sm text-stone-500 mt-4">
                        Анкета бесплатно · Активация профиля 5 000 ₽ · Без ежемесячной подписки
                    </p>
                </div>
            </section>

            {/* Social Proof */}
            <section className="py-8 bg-white border-y border-stone-100">
                <div className="max-w-lg mx-auto px-4 flex justify-around text-center">
                    <div>
                        <div className="text-2xl font-bold text-stone-800">Модерация</div>
                        <div className="text-xs text-stone-500">анкета и документы смотрятся перед допуском</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-stone-800">{SERVICE_COMMISSION_PERCENT}%</div>
                        <div className="text-xs text-stone-500">комиссия только после выхода</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-stone-800">5 000 ₽</div>
                        <div className="text-xs text-stone-500">единоразовая активация профиля</div>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-16 px-4">
                <div className="max-w-lg mx-auto">
                    <h2 className="text-2xl font-bold text-stone-800 text-center mb-2">
                        Почему няни выбирают Blizko
                    </h2>
                    <p className="text-stone-500 text-center mb-10">
                        Меньше шума, больше понятного рабочего процесса.
                    </p>

                    <div className="space-y-4">
                        {benefits.map((b, i) => (
                            <Card key={i} className="p-5 flex gap-4 items-start hover-lift">
                                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
                                    {b.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800 mb-1">{b.title}</h3>
                                    <p className="text-sm text-stone-600 leading-relaxed">{b.desc}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-16 px-4 bg-stone-50">
                <div className="max-w-lg mx-auto">
                    <h2 className="text-2xl font-bold text-stone-800 text-center mb-10">
                        Как начать работать
                    </h2>

                    <div className="space-y-6">
                        {steps.map((s) => (
                            <div key={s.num} className="flex gap-4 items-start">
                                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-purple-200">
                                    {s.num}
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800">{s.title}</h3>
                                    <p className="text-sm text-stone-600 mt-1">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-16 px-4">
                <div className="max-w-lg mx-auto bg-linear-to-br from-purple-600 to-purple-800 rounded-3xl p-8 text-white text-center shadow-2xl shadow-purple-200">
                    <CheckCircle size={40} className="mx-auto mb-4 opacity-90" />
                    <h2 className="text-2xl font-bold mb-3">Проверка профиля усиливает доверие</h2>
                    <p className="text-purple-100 leading-relaxed mb-6">
                        Документы помогают подтвердить профиль и понятнее показать семье ваш уровень подготовки.
                        Сначала — модерация анкеты и документов, потом решение по следующему шагу.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 text-sm">
                        <span className="bg-white/20 px-3 py-1.5 rounded-full">✓ Паспорт</span>
                        <span className="bg-white/20 px-3 py-1.5 rounded-full">✓ Медкнижка</span>
                        <span className="bg-white/20 px-3 py-1.5 rounded-full">✓ Справка</span>
                        <span className="bg-white/20 px-3 py-1.5 rounded-full">✓ Ручная модерация</span>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-4 text-center">
                <div className="max-w-lg mx-auto">
                    <h2 className="text-3xl font-bold text-stone-800 mb-4">
                        Начните с анкеты,<br />а не с хаотичного поиска
                    </h2>
                    <p className="text-stone-600 mb-8">
                        Анкета займёт около 5 минут. После модерации вы решите, когда активировать профиль и выходить на заказы.
                    </p>
                    <Button
                        onClick={() => navigate('/become-nanny')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 text-lg shadow-xl shadow-purple-200 hover-lift w-full max-w-sm"
                    >
                        Заполнить анкету няни <ArrowRight size={20} />
                    </Button>

                    <div className="mt-8 flex items-center justify-center gap-2 text-stone-500">
                        <Phone size={16} />
                        <span className="text-sm">Вопросы? Пишите: <a href="mailto:nanny@blizko.app" className="text-purple-600 font-semibold hover:underline">nanny@blizko.app</a></span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 pb-24 bg-stone-50 border-t border-stone-100 text-center">
                <p className="text-xs text-stone-400">
                    © 2026 Blizko. Данные профиля обрабатываются бережно и только в рамках работы сервиса.
                </p>
            </footer>
        </div>
    );
};
