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
            <div className={sectionLabel}>
                <span className="h-px flex-1 bg-stone-200/70" />
                Дополнительно
                <span className="h-px flex-1 bg-stone-200/70" />
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-violet-700 mb-2">Общие параметры</div>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select className={`${selectClass} text-xs`} value={advanced.cameras} onChange={(e) => setAdvanced((p) => ({ ...p, cameras: e.target.value }))}>
                        <option value="ok">Камеры: допустимо</option>
                        <option value="not_ok">Камеры: нежелательно</option>
                    </select>
                    <select className={`${selectClass} text-xs`} value={advanced.travel} onChange={(e) => setAdvanced((p) => ({ ...p, travel: e.target.value }))}>
                        <option value="no">Поездки: не нужны</option>
                        <option value="yes">Поездки: возможны</option>
                    </select>
                    <select className={`${selectClass} text-xs`} value={advanced.household} onChange={(e) => setAdvanced((p) => ({ ...p, household: e.target.value }))}>
                        <option value="light">Дом: только легкая помощь</option>
                        <option value="none">Дом: не требуется</option>
                        <option value="extended">Дом: расширенная помощь</option>
                    </select>
                    <select className={`${selectClass} text-xs`} value={advanced.pets} onChange={(e) => setAdvanced((p) => ({ ...p, pets: e.target.value }))}>
                        <option value="has_pets">Дома есть животные</option>
                        <option value="no_pets">Животных нет</option>
                    </select>
                    <select className={`${selectClass} text-xs`} value={advanced.night} onChange={(e) => setAdvanced((p) => ({ ...p, night: e.target.value }))}>
                        <option value="sometimes">Ночные смены: иногда</option>
                        <option value="no">Ночные смены: не нужны</option>
                        <option value="yes">Ночные смены: да</option>
                    </select>
                </div>
            </div>

            <div className={sectionLabel}>
                <span className="h-px flex-1 bg-stone-200/70" />
                Для точного подбора
                <span className="h-px flex-1 bg-stone-200/70" />
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-3">
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

            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-4">
                <div className="text-sm font-semibold text-violet-800">Психологический профиль (улучшает мэтчинг)</div>

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Стиль семьи</label>
                    <select
                        className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                        value={riskProfile?.familyStyle || 'balanced'}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), familyStyle: e.target.value as any }))}
                    >
                        <option value="warm">Мягкий, эмпатичный</option>
                        <option value="structured">Структурный, с правилами</option>
                        <option value="balanced">Баланс</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Как ребёнок реагирует на стресс?</label>
                    <select
                        className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                        value={riskProfile?.childStress || 'tantrum'}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), childStress: e.target.value as any }))}
                    >
                        <option value="cry">Плачет и ищет поддержку</option>
                        <option value="withdraw">Замыкается</option>
                        <option value="aggressive">Злится/агрессия</option>
                        <option value="tantrum">Истерики</option>
                    </select>
                </div>

                <ChipGroup
                    label={lang === 'ru' ? 'Триггеры ребёнка (выберите 1–3)' : 'Child triggers (1–3)'}
                    options={arrChildTriggers}
                    selected={riskProfile?.triggers || []}
                    onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), triggers: list }))}
                />

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Комфортный стиль няни</label>
                    <select
                        className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                        value={riskProfile?.nannyStylePreference || 'gentle'}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), nannyStylePreference: e.target.value as any }))}
                    >
                        <option value="gentle">Мягкая и спокойная</option>
                        <option value="strict">Структурная/строгая</option>
                        <option value="playful">Игровая и творческая</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Коммуникация от няни</label>
                    <select
                        className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                        value={riskProfile?.communicationPreference || 'regular'}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), communicationPreference: e.target.value as any }))}
                    >
                        <option value="minimal">Минимум сообщений</option>
                        <option value="regular">Регулярно (2–3 апдейта)</option>
                        <option value="frequent">Часто в течение дня</option>
                    </select>
                </div>

                <ChipGroup
                    label={lang === 'ru' ? 'Наши потребности' : 'Family needs'}
                    options={arrNeeds}
                    selected={riskProfile?.needs || []}
                    onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), needs: list }))}
                />

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Стиль общения (PCM)</label>
                    <select
                        className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                        value={riskProfile?.pcmType || 'harmonizer'}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), pcmType: e.target.value as any }))}
                    >
                        <option value="thinker">Мыслитель — логика, структура</option>
                        <option value="persister">Надёжный — ценности, ответственность</option>
                        <option value="harmonizer">Тёплый — эмпатия, забота</option>
                        <option value="rebel">Игривый — лёгкость, юмор</option>
                        <option value="imaginer">Спокойный — тишина, пространство</option>
                        <option value="promoter">Действенный — результат, скорость</option>
                    </select>
                </div>
            </div>

            <Card className={`transition-all duration-300 ${documents.length > 0 ? 'bg-sky-50 border-sky-200' : 'bg-white'}`}>
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

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-600 mt-6">
                <div>{text.parentEtaLine}</div>
                <div className="text-stone-400 mt-1">{text.parentSafetyLine}</div>
            </div>

            <div className="flex gap-4 mt-8">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1 bg-stone-800 hover:bg-stone-900" onClick={onFinalSubmit} isLoading={loading}>
                    {isEditing ? (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes') : text.submitParent}
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
