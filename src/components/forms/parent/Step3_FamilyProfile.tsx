import React, { useState } from 'react';
import { useParentForm } from './ParentFormProvider';
import { Button, Textarea, ChipGroup, Card } from '../../UI';
import { DocumentUploadModal } from '../../DocumentUploadModal';
import { t } from '@/core/i18n/translations';
import { Language, ParentRiskProfile } from '@/core/types';
import { Check, FileText, HeartHandshake, Upload } from 'lucide-react';

interface Props {
    lang: Language;
    onFinalSubmit: () => void;
    loading: boolean;
}

export const Step3_FamilyProfile: React.FC<Props> = ({ lang, onFinalSubmit, loading }) => {
    const text = t[lang];
    const {
        formData, setFormData,
        advanced, setAdvanced,
        documents, setDocuments,
        riskProfile, setRiskProfile,
        prevStep, isEditing
    } = useParentForm();

    const [showDocUpload, setShowDocUpload] = useState(false);

    const setSingleRiskValue = <K extends keyof ParentRiskProfile>(key: K) => (values: string[]) => {
        const nextValue = values[0];
        if (!nextValue) return;
        setRiskProfile((prev) => ({ ...(prev || {}), [key]: nextValue as ParentRiskProfile[K] }));
    };

    // Helper arrays for language
    const arrChildTriggers = lang === 'ru' ? ['Шум', 'Смена режима', 'Новые люди', 'Запреты', 'Усталость'] : ['Noise', 'Routine changes', 'New people', 'Restrictions', 'Fatigue'];
    const arrNeeds = lang === 'ru' ? ['Спокойствие', 'Структура', 'Игра', 'Обучение', 'Активность'] : ['Calm', 'Structure', 'Play', 'Learning', 'Activity'];

    return (
        <div className="animate-fade-in space-y-6 pb-24">
            <div className="wizard-hero-card">
                <div className="wizard-hero-copy">
                    <div className="wizard-kicker">
                        <HeartHandshake size={14} />
                        {lang === 'ru' ? 'Шаг 3. Точная настройка' : 'Step 3. Fine tuning'}
                    </div>
                    <div className="space-y-2">
                        <h3 className="wizard-section-title">
                            {lang === 'ru' ? 'Добавьте контекст о семье' : 'Add family context'}
                        </h3>
                        <p className="wizard-section-body">
                            {lang === 'ru'
                                ? 'Это финальный слой: бытовые детали, стиль общения и то, что помогает понять семью глубже. Здесь рождается не просто shortlist, а более точное совпадение.'
                                : 'This is the final layer: daily details, communication style, and signals that help understand the family more deeply.'}
                        </p>
                    </div>
                </div>
            </div>

            <section className="wizard-block">
                <div className="section-label">{lang === 'ru' ? 'Общие параметры' : 'Additional conditions'}</div>
                <ChipGroup
                    label={lang === 'ru' ? 'Видеонаблюдение' : 'Cameras'}
                    options={lang === 'ru' ? ['Допустимо', 'Нежелательно'] : ['Acceptable', 'Not desired']}
                    selected={advanced.cameras ? [advanced.cameras] : []}
                    onChange={(s) => setAdvanced((p) => ({ ...p, cameras: s[0] || '' }))}
                    single
                />
                <ChipGroup
                    label={lang === 'ru' ? 'Поездки с няней' : 'Travel with nanny'}
                    options={lang === 'ru' ? ['Возможны', 'Не нужны'] : ['Possible', 'Not needed']}
                    selected={advanced.travel ? [advanced.travel] : []}
                    onChange={(s) => setAdvanced((p) => ({ ...p, travel: s[0] || '' }))}
                    single
                />
                <ChipGroup
                    label={lang === 'ru' ? 'Помощь по дому' : 'Household help'}
                    options={lang === 'ru' ? ['Легкая', 'Расширенная', 'Не требуется'] : ['Light', 'Extended', 'None']}
                    selected={advanced.household ? [advanced.household] : []}
                    onChange={(s) => setAdvanced((p) => ({ ...p, household: s[0] || '' }))}
                    single
                />
                <ChipGroup
                    label={lang === 'ru' ? 'Животные' : 'Pets'}
                    options={lang === 'ru' ? ['Есть животные', 'Животных нет'] : ['Have pets', 'No pets']}
                    selected={advanced.pets ? [advanced.pets] : []}
                    onChange={(s) => setAdvanced((p) => ({ ...p, pets: s[0] || '' }))}
                    single
                />
                <ChipGroup
                    label={lang === 'ru' ? 'Ночные смены' : 'Night shifts'}
                    options={lang === 'ru' ? ['Да', 'Иногда', 'Не нужны'] : ['Yes', 'Sometimes', 'Not needed']}
                    selected={advanced.night ? [advanced.night] : []}
                    onChange={(s) => setAdvanced((p) => ({ ...p, night: s[0] || '' }))}
                    single
                />
            </section>

            <section className="wizard-block">
                <div className="section-label">
                    {lang === 'ru' ? 'Для точного подбора' : 'For precise matching'}
                </div>

                <div className="wizard-note-panel">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 mb-2">
                        {lang === 'ru' ? 'Для точного анализа (AI)' : 'For AI analysis'}
                    </div>
                    <Textarea
                        label={lang === 'ru' ? 'Что важно знать о ребёнке и семье?' : 'What should we know about your family?'}
                        placeholder={lang === 'ru' ? 'Режим, привычки, триггеры, что недопустимо — всё, что поможет подобрать идеального человека.' : 'Routine, triggers, non-negotiables — anything that helps match the right person.'}
                        value={formData.analysisNotes}
                        onChange={e => setFormData({ ...formData, analysisNotes: e.target.value })}
                    />
                </div>

                <Textarea
                    label={text.commentLabel}
                    placeholder={lang === 'ru' ? "Например: у нас есть кот..." : "Example: we have a cat..."}
                    value={formData.comment}
                    onChange={e => setFormData({ ...formData, comment: e.target.value })}
                />
            </section>

            <section className="wizard-block wizard-block-muted">
                <div className="text-sm font-semibold text-amber-900 mb-4">{lang === 'ru' ? 'Психологический профиль (улучшает мэтчинг)' : 'Psychological profile (improves matching)'}</div>

                <ChipGroup
                    label={lang === 'ru' ? 'Стиль семьи' : 'Family style'}
                    options={lang === 'ru' ? ['Мягкий, эмпатичный', 'Структурный, с правилами', 'Баланс'] : ['Gentle, empathetic', 'Structured, rules-based', 'Balanced']}
                    selected={riskProfile?.familyStyle ? [riskProfile.familyStyle] : []}
                    onChange={setSingleRiskValue('familyStyle')}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Как ребёнок реагирует на стресс?' : 'How does the child react to stress?'}
                    options={lang === 'ru' ? ['Берет поддержку', 'Замыкается', 'Злится', 'Истерики'] : ['Seeks support', 'Withdraws', 'Gets angry', 'Tantrums']}
                    selected={riskProfile?.childStress ? [riskProfile.childStress] : []}
                    onChange={setSingleRiskValue('childStress')}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Триггеры ребёнка (выберите 1–3)' : 'Child triggers (1–3)'}
                    options={arrChildTriggers}
                    selected={riskProfile?.triggers || []}
                    onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), triggers: list }))}
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Комфортный стиль няни' : 'Preferred nanny style'}
                    options={lang === 'ru' ? ['Мягкая и спокойная', 'Структурная', 'Игровая'] : ['Gentle & calm', 'Structured', 'Playful']}
                    selected={riskProfile?.nannyStylePreference ? [riskProfile.nannyStylePreference] : []}
                    onChange={setSingleRiskValue('nannyStylePreference')}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Частота сообщений от няни' : 'Nanny communication frequency'}
                    options={lang === 'ru' ? ['Минимум сообщений', 'Регулярно (2-3 раза)', 'Часто'] : ['Minimal messages', 'Regular (2-3 times)', 'Frequent']}
                    selected={riskProfile?.communicationPreference ? [riskProfile.communicationPreference] : []}
                    onChange={setSingleRiskValue('communicationPreference')}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Наши потребности' : 'Family needs'}
                    options={arrNeeds}
                    selected={riskProfile?.needs || []}
                    onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), needs: list }))}
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Стиль общения (PCM)' : 'Communication style (PCM)'}
                    options={lang === 'ru'
                        ? ['Логика', 'Ценности', 'Эмпатия', 'Легкость', 'Тишина', 'Исполнитель']
                        : ['Logic', 'Values', 'Empathy', 'Lightness', 'Quiet', 'Action']
                    }
                    selected={riskProfile?.pcmType ? [riskProfile.pcmType] : []}
                    onChange={setSingleRiskValue('pcmType')}
                    single
                />
            </section>

            <Card className={`transition-all duration-300 ${documents.length > 0 ? 'bg-sky-50/50 border-sky-200/50 shadow-sm' : 'bg-white/60 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full shrink-0 ${documents.length > 0 ? 'bg-sky-200 text-sky-700' : 'bg-stone-100 text-stone-400'}`}>
                        <FileText size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-stone-800 mb-1">
                            Договоры и документы
                        </h3>

                        {documents.length === 0 && (
                            <>
                                <p className="text-sm text-stone-500 mb-3">Загрузите шаблон договора или паспорт для верификации (опционально)</p>
                                <button
                                    type="button"
                                    onClick={() => setShowDocUpload(true)}
                                    className="text-sm font-medium text-sky-700 bg-sky-100 px-4 py-2 rounded-lg hover:bg-sky-200 transition-colors flex items-center gap-2"
                                >
                                    <Upload size={16} /> {lang === 'ru' ? 'Загрузить' : 'Upload'}
                                </button>
                            </>
                        )}

                        {documents.length > 0 && (
                            <div className="animate-fade-in space-y-2">
                                <div className="flex items-center gap-2 text-sm text-sky-700 font-medium mb-2">
                                    <Check size={16} /> {documents.length} {lang === 'ru' ? 'документов загружено' : 'documents uploaded'}
                                </div>
                                {documents.map((doc, i) => (
                                    <div key={i} className="bg-white/60 p-2 rounded-lg flex justify-between items-center border border-sky-100">
                                        <span className="text-xs font-bold text-stone-700 uppercase">Документ {i + 1}</span>
                                        <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-bold">
                                            Прикреплен
                                        </span>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setShowDocUpload(true)} className="text-xs text-sky-600 underline mt-2">
                                    + {lang === 'ru' ? 'Добавить еще' : 'Add more'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="wizard-note-panel text-sm text-stone-600">
                <div>{text.parentEtaLine}</div>
                <div className="text-stone-400 mt-1">{text.parentSafetyLine}</div>
            </div>

            <div className="sticky-action-rail sticky-footer-fade flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={onFinalSubmit} isLoading={loading} pulse={true}>
                    {isEditing ? (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes') : (lang === 'ru' ? 'Отправить безопасно' : 'Submit safely')}
                </Button>
            </div>

            {showDocUpload && (
                <DocumentUploadModal
                    onClose={() => setShowDocUpload(false)}
                    onVerify={(doc) => setDocuments((prev) => [...prev, doc])}
                    lang={lang}
                />
            )}
        </div>
    );
};
