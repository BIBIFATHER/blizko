import React, { useState } from 'react';
import { useParentForm } from './ParentFormProvider';
import { Button, ChipGroup, Card } from '../../UI';
import { DocumentUploadModal } from '../../DocumentUploadModal';
import { t } from '@/core/i18n/translations';
import { Language, ParentRiskProfile } from '@/core/types';
import { Check, ChevronDown, ChevronUp, FileText, HeartHandshake, Upload } from 'lucide-react';

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
    const [showExtras, setShowExtras] = useState(false);

    const setSingleRiskValue = <K extends keyof ParentRiskProfile>(key: K) => (values: string[]) => {
        const nextValue = values[0];
        if (!nextValue) return;
        setRiskProfile((prev) => ({ ...(prev || {}), [key]: nextValue as ParentRiskProfile[K] }));
    };

    const arrChildTriggers = lang === 'ru'
        ? ['Шум', 'Смена режима', 'Новые люди', 'Запреты', 'Усталость']
        : ['Noise', 'Routine changes', 'New people', 'Restrictions', 'Fatigue'];

    const arrNeeds = lang === 'ru'
        ? ['Спокойствие', 'Структура', 'Игра', 'Обучение', 'Активность']
        : ['Calm', 'Structure', 'Play', 'Learning', 'Activity'];

    return (
        <div className="animate-fade-in space-y-6 pb-24">
            <div className="wizard-hero-card">
                <div className="wizard-hero-copy">
                    <div className="wizard-kicker">
                        <HeartHandshake size={14} />
                        {lang === 'ru' ? 'Шаг 3. Последние детали' : 'Step 3. Final details'}
                    </div>
                    <div className="space-y-2">
                        <h3 className="wizard-section-title">
                            {lang === 'ru' ? 'Несколько бытовых моментов' : 'A few practical details'}
                        </h3>
                        <p className="wizard-section-body">
                            {lang === 'ru'
                                ? 'Минимум вопросов, максимум пользы для подбора. Остальное расскажете менеджеру при знакомстве.'
                                : 'Minimal questions, maximum value for matching. The rest you can tell the manager when you meet.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Essential matching details — cameras, household, pets, nanny style */}
            <section className="wizard-block">
                <div className="section-label">
                    {lang === 'ru' ? 'Условия работы' : 'Working conditions'}
                </div>

                <ChipGroup
                    label={lang === 'ru' ? 'Видеонаблюдение' : 'Cameras'}
                    options={lang === 'ru' ? ['Допустимо', 'Нежелательно'] : ['Acceptable', 'Not desired']}
                    selected={advanced.cameras ? [advanced.cameras] : []}
                    onChange={(s) => setAdvanced((p) => ({ ...p, cameras: s[0] || '' }))}
                    single
                />
                <ChipGroup
                    label={lang === 'ru' ? 'Помощь по дому' : 'Household help'}
                    options={lang === 'ru' ? ['Лёгкая', 'Расширенная', 'Не нужна'] : ['Light', 'Extended', 'None']}
                    selected={advanced.household ? [advanced.household] : []}
                    onChange={(s) => setAdvanced((p) => ({ ...p, household: s[0] || '' }))}
                    single
                />
                <ChipGroup
                    label={lang === 'ru' ? 'Животные дома' : 'Pets at home'}
                    options={lang === 'ru' ? ['Есть', 'Нет'] : ['Yes', 'No']}
                    selected={advanced.pets ? [advanced.pets] : []}
                    onChange={(s) => setAdvanced((p) => ({ ...p, pets: s[0] || '' }))}
                    single
                />
                <ChipGroup
                    label={lang === 'ru' ? 'Стиль общения няни' : 'Nanny style'}
                    options={lang === 'ru' ? ['Мягкая и спокойная', 'Структурная', 'Игровая'] : ['Gentle & calm', 'Structured', 'Playful']}
                    selected={riskProfile?.nannyStylePreference ? [riskProfile.nannyStylePreference] : []}
                    onChange={setSingleRiskValue('nannyStylePreference')}
                    single
                />
            </section>

            {/* Optional extras — collapsed by default */}
            <section className="wizard-block wizard-block-muted">
                <button
                    type="button"
                    onClick={() => setShowExtras(v => !v)}
                    className="flex w-full items-center justify-between text-sm font-semibold text-stone-600"
                >
                    <span>{lang === 'ru' ? 'Дополнительно (необязательно)' : 'More details (optional)'}</span>
                    {showExtras ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showExtras && (
                    <div className="mt-5 space-y-1 animate-fade-in">
                        <ChipGroup
                            label={lang === 'ru' ? 'Поездки с няней' : 'Travel with nanny'}
                            options={lang === 'ru' ? ['Возможны', 'Не нужны'] : ['Possible', 'Not needed']}
                            selected={advanced.travel ? [advanced.travel] : []}
                            onChange={(s) => setAdvanced((p) => ({ ...p, travel: s[0] || '' }))}
                            single
                        />
                        <ChipGroup
                            label={lang === 'ru' ? 'Ночные смены' : 'Night shifts'}
                            options={lang === 'ru' ? ['Да', 'Иногда', 'Не нужны'] : ['Yes', 'Sometimes', 'Not needed']}
                            selected={advanced.night ? [advanced.night] : []}
                            onChange={(s) => setAdvanced((p) => ({ ...p, night: s[0] || '' }))}
                            single
                        />
                        <ChipGroup
                            label={lang === 'ru' ? 'Стиль семьи' : 'Family style'}
                            options={lang === 'ru' ? ['Мягкий, эмпатичный', 'Структурный, с правилами', 'Баланс'] : ['Gentle, empathetic', 'Structured, rules-based', 'Balanced']}
                            selected={riskProfile?.familyStyle ? [riskProfile.familyStyle] : []}
                            onChange={setSingleRiskValue('familyStyle')}
                            single
                        />
                        <ChipGroup
                            label={lang === 'ru' ? 'Реакция ребёнка на стресс' : 'Child stress response'}
                            options={lang === 'ru' ? ['Ищет поддержку', 'Замыкается', 'Злится', 'Истерики'] : ['Seeks support', 'Withdraws', 'Gets angry', 'Tantrums']}
                            selected={riskProfile?.childStress ? [riskProfile.childStress] : []}
                            onChange={setSingleRiskValue('childStress')}
                            single
                        />
                        <ChipGroup
                            label={lang === 'ru' ? 'Триггеры ребёнка' : 'Child triggers'}
                            options={arrChildTriggers}
                            selected={riskProfile?.triggers || []}
                            onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), triggers: list }))}
                        />
                        <ChipGroup
                            label={lang === 'ru' ? 'Частота сообщений от няни' : 'Nanny check-in frequency'}
                            options={lang === 'ru' ? ['Минимум', 'Регулярно (2–3)', 'Часто'] : ['Minimal', 'Regular (2–3)', 'Frequent']}
                            selected={riskProfile?.communicationPreference ? [riskProfile.communicationPreference] : []}
                            onChange={setSingleRiskValue('communicationPreference')}
                            single
                        />
                        <ChipGroup
                            label={lang === 'ru' ? 'Потребности семьи' : 'Family needs'}
                            options={arrNeeds}
                            selected={riskProfile?.needs || []}
                            onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), needs: list }))}
                        />
                    </div>
                )}
            </section>

            {/* Documents — optional */}
            <Card className={`transition-all duration-300 ${
                documents.length > 0
                    ? 'bg-[#EFF3F2] border-[#2A6B6E]/20'
                    : 'bg-white/60 backdrop-blur-md border border-white/60 shadow-sm'
            }`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full shrink-0 ${
                        documents.length > 0
                            ? 'bg-[#2A6B6E]/10 text-[#2A6B6E]'
                            : 'bg-[#EFF3F2] text-[#1C2B2D]/40'
                    }`}>
                        <FileText size={22} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-[#1C2B2D] mb-1">
                            {lang === 'ru' ? 'Договоры и документы' : 'Contracts & documents'}
                        </h3>

                        {documents.length === 0 && (
                            <>
                                <p className="text-sm text-[#1C2B2D]/50 mb-3">
                                    {lang === 'ru'
                                        ? 'Загрузите шаблон договора или паспорт для верификации (опционально)'
                                        : 'Upload a contract template or ID for verification (optional)'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowDocUpload(true)}
                                    className="flex items-center gap-2 rounded-lg bg-[#EFF3F2] px-4 py-2 text-sm font-medium text-[#2A6B6E] transition-colors hover:bg-[#2A6B6E]/10"
                                >
                                    <Upload size={15} />
                                    {lang === 'ru' ? 'Загрузить' : 'Upload'}
                                </button>
                            </>
                        )}

                        {documents.length > 0 && (
                            <div className="animate-fade-in space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-[#2A6B6E] mb-2">
                                    <Check size={15} />
                                    {documents.length} {lang === 'ru' ? 'документов загружено' : 'documents uploaded'}
                                </div>
                                {documents.map((_, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg border border-[#2A6B6E]/10 bg-white/60 p-2">
                                        <span className="text-xs font-semibold text-[#1C2B2D]">
                                            {lang === 'ru' ? `Документ ${i + 1}` : `Document ${i + 1}`}
                                        </span>
                                        <span className="rounded bg-[#EFF3F2] px-1.5 py-0.5 text-[10px] font-bold text-[#2A6B6E]">
                                            {lang === 'ru' ? 'Загружен' : 'Uploaded'}
                                        </span>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setShowDocUpload(true)} className="mt-2 text-xs text-[#2A6B6E] underline underline-offset-2">
                                    + {lang === 'ru' ? 'Добавить ещё' : 'Add more'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="wizard-note-panel text-sm text-[#1C2B2D]/65">
                <div>{text.parentEtaLine}</div>
                <div className="mt-1 text-[#1C2B2D]/40">{text.parentSafetyLine}</div>
            </div>

            <div className="sticky-action-rail sticky-footer-fade flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={onFinalSubmit} isLoading={loading} pulse={!loading}>
                    {isEditing
                        ? (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes')
                        : (lang === 'ru' ? 'Отправить заявку' : 'Submit request')}
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
