import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './UI';
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
            desc: 'AI подбирает вам семьи, которые идеально совпадают по стилю и графику. Не нужно искать самой.',
        },
        {
            icon: <ShieldCheck size={28} />,
            title: 'Безопасные семьи',
            desc: 'Все семьи проходят проверку. Вы знаете, к кому идёте, до первого выхода.',
        },
        {
            icon: <TrendingUp size={28} />,
            title: 'Честная комиссия 15%',
            desc: 'Только после успешного выхода. Никаких предоплат, скрытых платежей и абонентской платы.',
        },
        {
            icon: <Clock size={28} />,
            title: 'Гибкий график',
            desc: 'Вы сами выбираете когда и сколько работать. Полная свобода расписания.',
        },
        {
            icon: <Heart size={28} />,
            title: 'Поддержка 24/7',
            desc: 'Оператор Blizko всегда на связи. Поможем решить любой вопрос с семьёй.',
        },
        {
            icon: <Star size={28} />,
            title: 'Рейтинг и отзывы',
            desc: 'Накапливайте репутацию. Лучшие няни получают приоритет в подборе и больше заказов.',
        },
    ];

    const steps = [
        { num: '1', title: 'Заполните анкету', desc: '5 минут — расскажите о себе, опыте и подходе к работе' },
        { num: '2', title: 'Пройдите верификацию', desc: 'Загрузите документы — мы проверим за 24-48 часов' },
        { num: '3', title: 'Получайте заказы', desc: 'AI подберёт вам подходящие семьи. Выбирайте и работайте!' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
            {/* Hero */}
            <section className="relative overflow-hidden px-4 pt-16 pb-20 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-stone-50 to-orange-50 opacity-80" />
                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-purple-100 mb-6 shadow-sm">
                        <Sparkles size={16} className="text-purple-600" />
                        <span className="text-sm font-semibold text-purple-700">Набираем нянь в Москве</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight">
                        Работайте с семьями,<br />
                        <span className="text-purple-600">которые вам подходят</span>
                    </h1>

                    <p className="text-lg text-stone-600 mb-8 leading-relaxed">
                        Blizko — AI-сервис подбора нянь. Мы находим семьи под ваш стиль работы,
                        график и опыт. Никаких агентств, только честное сотрудничество.
                    </p>

                    <Button
                        onClick={() => navigate('/register?role=nanny')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg shadow-xl shadow-purple-200 hover-lift"
                    >
                        Стать няней в Blizko <ArrowRight size={20} />
                    </Button>

                    <p className="text-sm text-stone-500 mt-4">
                        Бесплатная регистрация · Без абонентской платы
                    </p>
                </div>
            </section>

            {/* Social Proof */}
            <section className="py-8 bg-white border-y border-stone-100">
                <div className="max-w-lg mx-auto px-4 flex justify-around text-center">
                    <div>
                        <div className="text-2xl font-bold text-stone-800">50+</div>
                        <div className="text-xs text-stone-500">нянь в сервисе</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-stone-800">4.8</div>
                        <div className="text-xs text-stone-500">средний рейтинг</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-stone-800">150+</div>
                        <div className="text-xs text-stone-500">семей доверяют</div>
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
                        Мы создали сервис, где работать — удовольствие
                    </p>

                    <div className="space-y-4">
                        {benefits.map((b, i) => (
                            <Card key={i} className="p-5 flex gap-4 items-start hover-lift">
                                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 flex-shrink-0">
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
                                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-lg shadow-purple-200">
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
                <div className="max-w-lg mx-auto bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-8 text-white text-center shadow-2xl shadow-purple-200">
                    <CheckCircle size={40} className="mx-auto mb-4 opacity-90" />
                    <h2 className="text-2xl font-bold mb-3">Верификация — ваша защита</h2>
                    <p className="text-purple-100 leading-relaxed mb-6">
                        Мы проверяем документы: паспорт, медкнижку, справку о несудимости.
                        Это защищает вас и повышает доверие семей к вашему профилю.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 text-sm">
                        <span className="bg-white/20 px-3 py-1.5 rounded-full">✓ Паспорт</span>
                        <span className="bg-white/20 px-3 py-1.5 rounded-full">✓ Медкнижка</span>
                        <span className="bg-white/20 px-3 py-1.5 rounded-full">✓ Справка</span>
                        <span className="bg-white/20 px-3 py-1.5 rounded-full">✓ AI-проверка</span>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-4 text-center">
                <div className="max-w-lg mx-auto">
                    <h2 className="text-3xl font-bold text-stone-800 mb-4">
                        Начните зарабатывать<br />уже сегодня
                    </h2>
                    <p className="text-stone-600 mb-8">
                        Регистрация займёт 5 минут. Первый заказ — в течение 48 часов.
                    </p>
                    <Button
                        onClick={() => navigate('/register?role=nanny')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 text-lg shadow-xl shadow-purple-200 hover-lift w-full max-w-sm"
                    >
                        Зарегистрироваться <ArrowRight size={20} />
                    </Button>

                    <div className="mt-8 flex items-center justify-center gap-2 text-stone-500">
                        <Phone size={16} />
                        <span className="text-sm">Вопросы? Пишите: <a href="mailto:nanny@blizko.app" className="text-purple-600 font-semibold hover:underline">nanny@blizko.app</a></span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 bg-stone-50 border-t border-stone-100 text-center">
                <p className="text-xs text-stone-400">
                    © 2026 Blizko. Все данные зашифрованы. Безопасность — наш приоритет.
                </p>
            </footer>
        </div>
    );
};
