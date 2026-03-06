import React, { useState } from 'react';
import { useParentForm } from './ParentFormProvider';
import { Button, Textarea, ChipGroup, Card } from '../../UI';
import { DocumentUploadModal } from '../../DocumentUploadModal';
import { t } from '../../../src/core/i18n/translations';
import { Language, DocumentVerification } from '../../../types';
import { Upload, FileText, Check } from 'lucide-react';

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

    // Helper arrays for language
    const arrChildTriggers = lang === 'ru' ? ['Шум', 'Смена режима', 'Новые люди', 'Запреты', 'Усталость'] : ['Noise', 'Routine changes', 'New people', 'Restrictions', 'Fatigue'];
    const arrNeeds = lang === 'ru' ? ['Спокойствие', 'Структура', 'Игра', 'Обучение', 'Активность'] : ['Calm', 'Structure', 'Play', 'Learning', 'Activity'];

    const sectionLabel = "flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400 font-semibold";
    const selectClass = "w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200/50 focus:border-amber-300 transition-all";

    return (
        <div className="animate-fade-in space-y-6">
            <div className="section-label">
                Дополнительно
            </div>

            <div className="section-label">Общие параметры</div>
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

            <div className="section-label">
                Для точного подбора
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-white/60 shadow-sm rounded-2xl p-4">
                <div className="text-xs font-semibold text-stone-700 mb-2">Для точного анализа (AI)</div>
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

            <div className="bg-amber-50/40 backdrop-blur-md border border-amber-200/50 shadow-sm rounded-3xl p-5 space-y-2 mt-8">
                <div className="text-sm font-semibold text-amber-900 mb-4">{lang === 'ru' ? 'Психологический профиль (улучшает мэтчинг)' : 'Psychological profile (improves matching)'}</div>

                <ChipGroup
                    label={lang === 'ru' ? 'Стиль семьи' : 'Family style'}
                    options={lang === 'ru' ? ['Мягкий, эмпатичный', 'Структурный, с правилами', 'Баланс'] : ['Gentle, empathetic', 'Structured, rules-based', 'Balanced']}
                    selected={riskProfile?.familyStyle ? [riskProfile.familyStyle] : []}
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), familyStyle: s[0] as any }))}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Как ребёнок реагирует на стресс?' : 'How does the child react to stress?'}
                    options={lang === 'ru' ? ['Берет поддержку', 'Замыкается', 'Злится', 'Истерики'] : ['Seeks support', 'Withdraws', 'Gets angry', 'Tantrums']}
                    selected={riskProfile?.childStress ? [riskProfile.childStress] : []}
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), childStress: s[0] as any }))}
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
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), nannyStylePreference: s[0] as any }))}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Частота сообщений от няни' : 'Nanny communication frequency'}
                    options={lang === 'ru' ? ['Минимум сообщений', 'Регулярно (2-3 раза)', 'Часто'] : ['Minimal messages', 'Regular (2-3 times)', 'Frequent']}
                    selected={riskProfile?.communicationPreference ? [riskProfile.communicationPreference] : []}
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), communicationPreference: s[0] as any }))}
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
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), pcmType: s[0] as any }))}
                    single
                />
            </div>

            <Card className={`transition-all duration-300 ${documents.length > 0 ? 'bg-sky-50/50 border-sky-200/50 shadow-sm' : 'bg-white/60 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full flex-shrink-0 ${documents.length > 0 ? 'bg-sky-200 text-sky-700' : 'bg-stone-100 text-stone-400'}`}>
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

            <div className="bg-white/60 backdrop-blur-sm border border-white/60 shadow-sm rounded-xl p-3 text-sm text-stone-600 mt-6">
                <div>{text.parentEtaLine}</div>
                <div className="text-stone-400 mt-1">{text.parentSafetyLine}</div>
            </div>

            <div className="sticky bottom-0 z-10 flex gap-4 mt-8 pt-6 pb-6 -mx-2 px-2 sticky-footer-fade">
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
