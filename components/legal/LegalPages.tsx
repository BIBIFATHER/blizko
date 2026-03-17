import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Building2, FileText, Scale } from 'lucide-react';
import { SeoHead } from '../seo/SeoHead';

/* ─────────────────────────────────────────────
   OfertaPage  /oferta
   Публичная оферта на оказание информационных услуг
────────────────────────────────────────────── */
export const OfertaPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <>
            <SeoHead
                title="Публичная оферта | Blizko"
                description="Условия использования сервиса Blizko. Публичная оферта на оказание информационных посреднических услуг по подбору персонала."
                canonical="https://blizko.app/oferta"
            />
            <article className="min-h-screen bg-gradient-warm px-4 py-8 max-w-2xl mx-auto">
                <nav>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 mb-6 hover:text-stone-700 transition-colors">
                        <ArrowLeft size={18} /> Назад
                    </button>
                </nav>

                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <FileText size={24} className="text-amber-600" />
                        <h1 className="text-2xl font-bold text-stone-800">Публичная оферта</h1>
                    </div>
                    <p className="text-stone-500 text-sm">Редакция от 17 марта 2026 г.</p>
                </header>

                <div className="space-y-6 text-sm text-stone-700 leading-relaxed">
                    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">1. Общие положения</h2>
                        <p>Настоящая оферта является официальным предложением ИП Крюков Антон Сергеевич (ОГРНИП/ИНН уточняется, далее — «Blizko», «Исполнитель») заключить договор на оказание информационно-посреднических услуг по подбору персонала (нянь) на условиях, изложенных ниже.</p>
                        <p className="mt-2">Акцептом оферты является регистрация на сайте <strong>blizko.app</strong> или в мобильном приложении Blizko.</p>
                    </section>

                    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">2. Предмет договора</h2>
                        <p>Blizko оказывает информационно-посреднические услуги:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Публикация анкет нянь и семей на платформе</li>
                            <li>AI-подбор нянь по критериям совместимости</li>
                            <li>Организация первичного контакта между семьёй и няней</li>
                            <li>Верификация документов нянь (справки, паспорт, медкнижка)</li>
                        </ul>
                        <p className="mt-2"><strong>Blizko не является работодателем</strong> и не несёт ответственности за трудовые отношения между семьёй и няней.</p>
                    </section>

                    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">3. Стоимость и порядок оплаты</h2>
                        <p>Стоимость услуг определяется действующим тарифным планом, опубликованным на сайте blizko.app/pricing.</p>
                        <p className="mt-2">Оплата производится через платёжный сервис ЮKassa (ООО НКО «ЮМани»). Blizko использует сервис «Безопасная сделка» для защиты платежей: средства зачисляются и удерживаются до подтверждения факта оказания услуги.</p>
                    </section>

                    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">4. Порядок возврата</h2>
                        <p>Возврат средств производится в течение <strong>10 рабочих дней</strong> при обращении на <a href="mailto:support@blizko.app" className="text-amber-600 underline">support@blizko.app</a> в следующих случаях:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Подбор не был произведён по вине Blizko</li>
                            <li>Сделка расторгнута по взаимному соглашению сторон</li>
                            <li>Технический сбой платёжной системы</li>
                        </ul>
                    </section>

                    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">5. Права и обязанности сторон</h2>
                        <p className="font-medium mt-1">Пользователь обязуется:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Предоставлять достоверные данные при регистрации</li>
                            <li>Не использовать платформу в незаконных целях</li>
                            <li>Соблюдать конфиденциальность данных нянь</li>
                        </ul>
                        <p className="font-medium mt-3">Blizko обязуется:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Обеспечивать работоспособность платформы</li>
                            <li>Защищать персональные данные пользователей</li>
                            <li>Производить верификацию нянь</li>
                        </ul>
                    </section>

                    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">6. Ответственность</h2>
                        <p>Blizko не несёт ответственности за действия нянь или семей после установления контакта. Решение о найме принимается пользователями самостоятельно. Максимальная ответственность Blizko ограничена суммой оплаченных услуг.</p>
                    </section>

                    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">7. Персональные данные</h2>
                        <p>Обработка персональных данных осуществляется в соответствии с ФЗ-152 «О персональных данных». Политика конфиденциальности доступна на <Link to="/privacy" className="text-amber-600 underline">blizko.app/privacy</Link>.</p>
                    </section>

                    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">8. Реквизиты</h2>
                        <div className="text-sm text-stone-600 space-y-1">
                        <p><strong>ИП Аносов Антон Владимирович</strong></p>
                        <p>400120, Россия, Волгоградская обл., г. Волгоград, ул. Елецкая, д. 2б, кв. 12</p>
                        <p>ИНН: 710513782849 · ОГРНИП: 324344300006654</p>
                        <p>Р/с: 40802810500005898558</p>
                        <p>АО «Тинькофф Банк» · БИК 044525974 · ИНН банка 7710140679</p>
                        <p>К/с: 30101810145250000974</p>
                        <p>127287, г. Москва, ул. Хуторская 2-я, д. 38А, стр. 26</p>
                        <p className="pt-1">Email: <a href="mailto:support@blizko.app" className="text-amber-600 underline">support@blizko.app</a></p>
                    </div>
                    </section>
                </div>
            </article>
        </>
    );
};

/* ─────────────────────────────────────────────
   AboutPage  /about
   О компании — юр. информация и реквизиты
────────────────────────────────────────────── */
export const AboutPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <>
            <SeoHead
                title="О сервисе Blizko | Подбор нянь в Москве"
                description="Blizko — сервис подбора проверенных нянь в Москве. Информация о компании, юридические реквизиты, контакты и адрес."
                canonical="https://blizko.app/about"
            />
            <article className="min-h-screen bg-gradient-warm px-4 py-8 max-w-2xl mx-auto">
                <nav>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 mb-6 hover:text-stone-700 transition-colors">
                        <ArrowLeft size={18} /> Назад
                    </button>
                </nav>

                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 size={24} className="text-amber-600" />
                        <h1 className="text-2xl font-bold text-stone-800">О сервисе</h1>
                    </div>
                    <p className="text-stone-500">Blizko — умный подбор нянь в Москве</p>
                </header>

                <div className="space-y-4">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">Кто мы</h2>
                        <p className="text-sm text-stone-600 leading-relaxed">
                            Blizko — платформа для подбора проверенных нянь в Москве. Мы используем AI-технологию Humanity+, чтобы подобрать няню, которая подойдёт именно вашей семье — по стилю воспитания, характеру и расписанию.
                        </p>
                        <p className="text-sm text-stone-600 leading-relaxed mt-2">
                            Каждая няня проходит 5-ступенчатую проверку: документы, видеовизитка, рекомендации, ручная модерация и AI-анализ совместимости.
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">Юридическая информация</h2>
                        <div className="text-sm text-stone-600 space-y-2">
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">Организация</span>
                                <span>ИП Аносов Антон Владимирович</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">ИНН</span>
                                <span>710513782849</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">ОГРНИП</span>
                                <span>324344300006654</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">Юр. адрес</span>
                                <span>400120, Волгоградская обл., г. Волгоград, ул. Елецкая, д. 2б, кв. 12</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">Р/с</span>
                                <span>40802810500005898558</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">Банк</span>
                                <span>АО «Тинькофф Банк»</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">БИК</span>
                                <span>044525974</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">ИНН банка</span>
                                <span>7710140679</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">К/с</span>
                                <span>30101810145250000974</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">Контакты</h2>
                        <div className="text-sm text-stone-600 space-y-2">
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">Email</span>
                                <a href="mailto:support@blizko.app" className="text-amber-600 underline">support@blizko.app</a>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">Сайт</span>
                                <a href="https://blizko.app" className="text-amber-600 underline">blizko.app</a>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-stone-400 w-28 shrink-0">Telegram</span>
                                <a href="https://t.me/blizko_support" className="text-amber-600 underline">@blizko_support</a>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">Услуги и цены</h2>
                        <div className="text-sm text-stone-600 space-y-3">
                            <div>
                                <p className="font-medium text-stone-700">Подбор няни (базовый)</p>
                                <p>AI-подбор + 2-3 верифицированных кандидата. Разовая оплата.</p>
                            </div>
                            <div>
                                <p className="font-medium text-stone-700">Депозит (Безопасная сделка)</p>
                                <p>Средства удерживаются до подтверждения начала работы. Стороны защищены от недобросовестных партнёров.</p>
                            </div>
                        </div>
                        <p className="text-xs text-stone-400 mt-3">Актуальные цены: <Link to="/pricing" className="text-amber-600 underline">blizko.app/pricing</Link></p>
                    </div>

                    <div className="bg-amber-50/80 backdrop-blur rounded-2xl p-5 text-center">
                        <p className="text-sm text-stone-600 mb-3">Документы</p>
                        <div className="flex flex-wrap gap-3 justify-center text-sm">
                            <Link to="/oferta" className="text-amber-600 underline">Публичная оферта</Link>
                            <Link to="/privacy" className="text-amber-600 underline">Политика конфиденциальности</Link>
                            <Link to="/safe-deal" className="text-amber-600 underline">Условия Безопасной сделки</Link>
                        </div>
                    </div>
                </div>
            </article>
        </>
    );
};

/* ─────────────────────────────────────────────
   SafeDealPage  /safe-deal
   Правила сервиса «Безопасная сделка»
────────────────────────────────────────────── */
export const SafeDealPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <>
            <SeoHead
                title="Безопасная сделка | Blizko"
                description="Условия сервиса «Безопасная сделка» на платформе Blizko. Порядок заморозки, выплат и возврата средств при найме няни."
                canonical="https://blizko.app/safe-deal"
            />
            <article className="min-h-screen bg-gradient-warm px-4 py-8 max-w-2xl mx-auto">
                <nav>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 mb-6 hover:text-stone-700 transition-colors">
                        <ArrowLeft size={18} /> Назад
                    </button>
                </nav>

                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck size={24} className="text-green-600" />
                        <h1 className="text-2xl font-bold text-stone-800">Безопасная сделка</h1>
                    </div>
                    <p className="text-stone-500">Ваши деньги защищены до подтверждения найма</p>
                </header>

                <div className="space-y-4 text-sm text-stone-700 leading-relaxed">

                    <div className="bg-green-50/80 backdrop-blur rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">Как это работает</h2>
                        <ol className="space-y-2 list-decimal list-inside text-stone-600">
                            <li>Родитель вносит депозит через ЮKassa</li>
                            <li>Средства <strong>замораживаются</strong> на 14 дней</li>
                            <li>Няня приступает к работе</li>
                            <li>После подтверждения — средства выплачиваются няне</li>
                            <li>При отмене — деньги возвращаются родителю</li>
                        </ol>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">1. Условия предоставления услуги</h2>
                        <p>Сервис «Безопасная сделка» предоставляется через платёжный агрегатор ЮKassa (ООО НКО «ЮМани», лицензия ЦБ РФ). Blizko выступает агрегатором и технической площадкой.</p>
                        <p className="mt-2">Участники сделки: <strong>Покупатель</strong> (семья/родитель) и <strong>Исполнитель</strong> (няня).</p>
                        <p className="mt-2">Срок заморозки средств: <strong>14 дней</strong> с момента оплаты (по соглашению сторон может быть изменён от 1 до 90 дней).</p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">2. Порядок заключения сделки</h2>
                        <ul className="space-y-2 list-disc list-inside text-stone-600">
                            <li>Сделка создаётся автоматически при подтверждении подбора</li>
                            <li>Обе стороны получают уведомление (Telegram + email)</li>
                            <li>Покупатель оплачивает депозит через ссылку в приложении</li>
                            <li>Исполнитель получает уведомление о поступлении средств</li>
                        </ul>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">3. Порядок расторжения сделки</h2>
                        <p>Сделка расторгается:</p>
                        <ul className="space-y-2 list-disc list-inside mt-2 text-stone-600">
                            <li>По взаимному соглашению сторон (возврат покупателю)</li>
                            <li>Если исполнитель не приступил к работе в течение 3 рабочих дней</li>
                            <li>По решению Blizko при нарушении правил платформы</li>
                        </ul>
                        <p className="mt-2">Для расторжения обратитесь на <a href="mailto:support@blizko.app" className="text-amber-600 underline">support@blizko.app</a> или в чат поддержки в приложении.</p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">4. Комиссия платформы</h2>
                        <p>Blizko удерживает сервисный сбор в размере, указанном в действующем тарифе на blizko.app/pricing. Сбор взимается только при успешном завершении сделки.</p>
                        <p className="mt-2">При отмене сделки по инициативе покупателя до начала работы — сервисный сбор <strong>не удерживается</strong>.</p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">5. Гарантии и ответственность</h2>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <p><strong>Покупатель защищён:</strong> деньги не поступают исполнителю до подтверждения факта оказания услуги</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <p><strong>Исполнитель защищён:</strong> после начала работы гарантирована выплата при положительном завершении</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-amber-500 mt-0.5">!</span>
                                <p><strong>Споры:</strong> разбираются службой поддержки Blizko. При необходимости привлекается медиатор ЮKassa.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-3 text-base">6. Технический провайдер</h2>
                        <p>Платёжный сервис обеспечивает <strong>ООО НКО «ЮМани»</strong> (бренд ЮKassa), имеющее лицензию Банка России на осуществление переводов денежных средств. Blizko не хранит данные банковских карт.</p>
                    </div>

                    <div className="bg-stone-50/80 backdrop-blur rounded-2xl p-5 text-center">
                        <Scale size={20} className="text-stone-400 mx-auto mb-2" />
                        <p className="text-xs text-stone-400">По вопросам Безопасной сделки: <a href="mailto:support@blizko.app" className="text-amber-600 underline">support@blizko.app</a></p>
                        <div className="flex flex-wrap gap-3 justify-center mt-3 text-xs">
                            <Link to="/oferta" className="text-amber-600 underline">Публичная оферта</Link>
                            <Link to="/about" className="text-amber-600 underline">О нас</Link>
                            <Link to="/privacy" className="text-amber-600 underline">Конфиденциальность</Link>
                        </div>
                    </div>
                </div>
            </article>
        </>
    );
};

/* ─────────────────────────────────────────────
   PrivacyPage  /privacy
   Политика конфиденциальности
────────────────────────────────────────────── */
export const PrivacyPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <>
            <SeoHead
                title="Политика конфиденциальности | Blizko"
                description="Политика конфиденциальности сервиса Blizko. Как мы собираем, используем и защищаем персональные данные пользователей."
                canonical="https://blizko.app/privacy"
            />
            <article className="min-h-screen bg-gradient-warm px-4 py-8 max-w-2xl mx-auto">
                <nav>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 mb-6 hover:text-stone-700 transition-colors">
                        <ArrowLeft size={18} /> Назад
                    </button>
                </nav>

                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck size={24} className="text-blue-600" />
                        <h1 className="text-2xl font-bold text-stone-800">Политика конфиденциальности</h1>
                    </div>
                    <p className="text-stone-500 text-sm">Редакция от 17 марта 2026 г.</p>
                </header>

                <div className="space-y-4 text-sm text-stone-700 leading-relaxed">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">1. Оператор данных</h2>
                        <p>ИП Крюков Антон Сергеевич (далее — Blizko) является оператором персональных данных в соответствии с ФЗ-152 «О персональных данных».</p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">2. Какие данные мы собираем</h2>
                        <ul className="list-disc list-inside space-y-1 text-stone-600">
                            <li>Имя, номер телефона (при регистрации)</li>
                            <li>Данные профиля (район, расписание, предпочтения)</li>
                            <li>Документы нянь (паспорт, справки) — только в зашифрованном виде</li>
                            <li>Переписка в чате поддержки</li>
                            <li>Аналитика использования (Яндекс.Метрика)</li>
                        </ul>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">3. Цели обработки</h2>
                        <ul className="list-disc list-inside space-y-1 text-stone-600">
                            <li>Оказание услуг подбора нянь</li>
                            <li>Верификация пользователей</li>
                            <li>Улучшение качества AI-подбора</li>
                            <li>Техническая поддержка</li>
                        </ul>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">4. Хранение и защита</h2>
                        <p>Данные хранятся на серверах Supabase (ЕС и Россия). Передача данных третьим лицам без согласия пользователя не производится, за исключением платёжного сервиса ЮKassa для обработки платежей.</p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">5. Права пользователя</h2>
                        <p>Вы вправе запросить, исправить или удалить свои данные, написав на <a href="mailto:support@blizko.app" className="text-amber-600 underline">support@blizko.app</a>. Запрос обрабатывается в течение 30 дней.</p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5">
                        <h2 className="font-semibold text-stone-800 mb-2 text-base">6. Cookies</h2>
                        <p>Сайт использует cookies для аналитики (Яндекс.Метрика) и авторизации. Продолжая использование сайта, вы соглашаетесь с использованием cookies.</p>
                    </div>
                </div>
            </article>
        </>
    );
};
