import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './UI';
import { SERVICE_COMMISSION_PERCENT } from '@/core/config/pricing';
import {
    ShieldCheck, Star, Clock, Users, TrendingUp, CheckCircle,
    ArrowRight, Heart, Sparkles, Phone, BadgeCheck, ChevronRight
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
        <div className="page-frame animate-fade-in py-4 pb-20 pt-6 md:pt-10">
            <div className="section-stack">
                <section className="hero-shell">
                    <div className="hero-grid">
                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="eyebrow">
                                <Sparkles size={14} />
                                Набираем нянь в Москве
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-4xl text-stone-950 md:text-6xl">
                                    Работайте с семьями,
                                    <span className="block text-[color:var(--cloud-brand-soft)]">которым подходит ваш стиль и ритм</span>
                                </h1>
                                <p className="max-w-2xl text-base leading-8 text-stone-600 md:text-lg">
                                    Blizko убирает хаос из поиска: сначала понятная анкета, затем ручная модерация,
                                    после этого доступ к запросам с ясным графиком, районом и ожиданиями семьи.
                                </p>
                            </div>

                            <div className="cta-column max-w-xl">
                                <Button onClick={() => navigate('/become-nanny')} className="max-w-sm">
                                    Заполнить анкету няни <ArrowRight size={18} />
                                </Button>
                                <a
                                    href="mailto:nanny@blizko.app"
                                    className="inline-flex min-h-[52px] max-w-sm items-center justify-center gap-2 rounded-full border border-[color:var(--cloud-border-strong)] bg-white/70 px-6 py-3.5 text-sm font-semibold text-stone-700 shadow-cloud-soft transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                                >
                                    Задать вопрос команде <ChevronRight size={16} />
                                </a>
                                <p className="text-sm text-stone-500">
                                    Анкета бесплатно. Активация профиля 5 000 ₽ только после одобрения. Без ежемесячной подписки.
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 grid gap-3">
                            <div className="hero-stat">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Входной порог</p>
                                <div className="mt-3 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-3xl font-semibold text-stone-950">24-48 ч</p>
                                        <p className="mt-2 text-sm leading-6 text-stone-600">
                                            Обычно столько занимает ручная проверка анкеты и документов перед допуском.
                                        </p>
                                    </div>
                                    <div className="proof-icon-wrap bg-emerald-50 text-emerald-700">
                                        <ShieldCheck size={20} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="hero-stat">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Комиссия</p>
                                    <p className="mt-3 text-2xl font-semibold text-stone-950">{SERVICE_COMMISSION_PERCENT}%</p>
                                    <p className="mt-2 text-sm leading-6 text-stone-600">Списывается только после фактического выхода в семью.</p>
                                </div>
                                <div className="hero-stat">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Активация</p>
                                    <p className="mt-3 text-2xl font-semibold text-stone-950">5 000 ₽</p>
                                    <p className="mt-2 text-sm leading-6 text-stone-600">Единоразово после одобрения анкеты, когда вы готовы брать заказы.</p>
                                </div>
                            </div>

                            <Card className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="proof-icon-wrap bg-amber-100/80 text-amber-700">
                                        <BadgeCheck size={18} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-stone-900">Понятный вход без лишнего шума</p>
                                        <p className="text-sm leading-6 text-stone-600">
                                            До первого отклика вы уже понимаете район, график и формат помощи. Это экономит силы и снижает процент случайных диалогов.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>

                <section className="section-shell p-6 md:p-8">
                    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-3">
                            <div className="eyebrow">Почему Blizko</div>
                            <h2 className="text-3xl text-stone-950 md:text-4xl">Меньше случайных откликов, больше нормального рабочего процесса</h2>
                        </div>
                        <p className="max-w-xl text-sm leading-7 text-stone-600 md:text-base">
                            Мы не обещаем магию. Мы делаем путь более ясным: прозрачные условия, аккуратная модерация и поддержка там, где обычно всё разваливается в переписке.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {benefits.map((b, i) => (
                            <Card key={i} className="h-full p-5">
                                <div className="flex h-full flex-col gap-4">
                                    <div className="proof-icon-wrap bg-stone-100 text-stone-700">
                                        {b.icon}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold text-stone-900">{b.title}</h3>
                                        <p className="text-sm leading-7 text-stone-600">{b.desc}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                <section className="section-shell p-6 md:p-8">
                    <div className="mb-8 space-y-3">
                        <div className="eyebrow">Как это работает</div>
                        <h2 className="text-3xl text-stone-950 md:text-4xl">Три шага до доступа к запросам</h2>
                        <p className="max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                            Важный принцип Blizko: сначала прозрачность и проверка, потом уже активация и работа с семьями.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {steps.map((s) => (
                            <Card key={s.num} className="h-full p-5">
                                <div className="flex h-full flex-col gap-5">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--cloud-honey-solid)]/25 text-lg font-semibold text-stone-900">
                                            {s.num}
                                        </span>
                                        <ArrowRight size={18} className="text-stone-300" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold text-stone-900">{s.title}</h3>
                                        <p className="text-sm leading-7 text-stone-600">{s.desc}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                <section className="section-shell p-6 md:p-8">
                    <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:items-start">
                        <div className="space-y-4">
                            <div className="eyebrow">Профиль и доверие</div>
                            <h2 className="text-3xl text-stone-950 md:text-4xl">Проверка профиля усиливает доверие ещё до первого знакомства</h2>
                            <p className="max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                                Документы и ручная модерация нужны не ради бюрократии. Они помогают семье быстрее понять ваш уровень подготовки, а вам не тратить время на объяснение базовых вещей в каждом диалоге.
                            </p>
                        </div>

                        <Card className="p-5">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="proof-icon-wrap bg-emerald-50 text-emerald-700">
                                        <CheckCircle size={18} />
                                    </div>
                                    <p className="text-sm font-semibold text-stone-900">Что обычно подтверждаем на входе</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="trust-badge">Паспорт</span>
                                    <span className="trust-badge trust-badge-blue">Медкнижка</span>
                                    <span className="trust-badge trust-badge-warning">Справка</span>
                                    <span className="trust-badge">Ручная модерация</span>
                                </div>
                                <p className="text-sm leading-7 text-stone-600">
                                    Если по документам или анкете нужно уточнение, команда Blizko пишет аккуратно и по делу, без лишней бюрократии.
                                </p>
                            </div>
                        </Card>
                    </div>
                </section>

                <section className="form-footer-rail p-6 md:p-8">
                    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                                <Phone size={16} />
                                Вопросы по анкете или модерации
                            </div>
                            <h2 className="text-3xl text-stone-950 md:text-4xl">Начните с анкеты, а не с хаотичного поиска</h2>
                            <p className="max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                                Анкета занимает около 5 минут. После модерации вы сами решите, когда активировать профиль и выходить на запросы.
                            </p>
                            <a href="mailto:nanny@blizko.app" className="text-sm font-semibold text-stone-700 underline decoration-[color:var(--cloud-border-strong)] underline-offset-4">
                                nanny@blizko.app
                            </a>
                        </div>

                        <div className="w-full md:w-[320px]">
                            <Button onClick={() => navigate('/become-nanny')}>
                                Заполнить анкету няни <ArrowRight size={18} />
                            </Button>
                        </div>
                    </div>
                </section>

                <footer className="pb-10 pt-2 text-center">
                    <p className="text-xs text-stone-400">
                        © 2026 Blizko. Данные профиля обрабатываются бережно и только в рамках работы сервиса.
                    </p>
                </footer>
            </div>
        </div>
    );
};
