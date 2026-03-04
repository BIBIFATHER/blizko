import React, { useState } from 'react';
import { useNannyForm } from './NannyFormProvider';
import { Button, Card, ChipGroup } from '../../UI';
import { BrainCircuit, Check } from 'lucide-react';
import { BehavioralTestModal } from '../../BehavioralTestModal';
import { t } from '../../../src/core/i18n/translations';
import { Language, SoftSkillsProfile } from '../../../types';

interface Props {
    lang: Language;
    onFinalSubmit: () => void;
    loading: boolean;
}

export const Step4_Psychology: React.FC<Props> = ({ lang, onFinalSubmit, loading }) => {
    const text = t[lang];
    const {
        formData,
        softSkills, setSoftSkills,
        riskProfile, setRiskProfile,
        prevStep, isEditing
    } = useNannyForm();

    const [showAssessment, setShowAssessment] = useState(false);

    const handleAssessmentComplete = (result: SoftSkillsProfile) => {
        setSoftSkills(result);
        setShowAssessment(false);
    };

    const sectionLabel = "flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400 font-semibold";

    return (
        <div className="animate-fade-in space-y-6">
            <div className={sectionLabel}>
                <span className="h-px flex-1 bg-stone-200/70" />
                Психологический профиль
                <span className="h-px flex-1 bg-stone-200/70" />
            </div>

            <Card className={`transition-all duration-300 ${softSkills ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full flex-shrink-0 ${softSkills ? 'bg-amber-200 text-amber-700' : 'bg-stone-100 text-stone-400'}`}>
                        <BrainCircuit size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-stone-800 mb-1">
                            {softSkills ? text.testResultTitle : text.softSkillsTitle}
                        </h3>

                        {!softSkills && (
                            <>
                                <p className="text-sm text-stone-500 mb-3">{text.softSkillsDesc}</p>
                                <button
                                    type="button"
                                    onClick={() => setShowAssessment(true)}
                                    className="text-sm font-medium text-amber-700 bg-amber-100 px-4 py-2 rounded-lg hover:bg-amber-200 transition-colors"
                                >
                                    {text.startTest}
                                </button>
                            </>
                        )}

                        {softSkills && (
                            <div className="animate-fade-in">
                                <div className="flex items-center gap-2 text-sm text-amber-700 font-medium mb-2">
                                    <Check size={16} /> {text.testCompletedBadge}
                                </div>
                                <div className="bg-white/60 p-3 rounded-lg text-xs text-stone-600 italic leading-relaxed border border-amber-100">
                                    "{softSkills.summary}"
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-4">
                <div className="text-sm font-semibold text-violet-800">
                    Стиль работы (улучшает мэтчинг с семьями)
                </div>

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Если у ребенка истерика, ваш первый шаг:</label>
                    <select
                        className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-violet-400"
                        value={riskProfile?.tantrumFirstStep || 'calm'}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), tantrumFirstStep: e.target.value as any }))}
                    >
                        <option value="calm">Сначала успокоить эмоции</option>
                        <option value="distract">Переключить внимание</option>
                        <option value="boundaries">Сразу обозначить границы</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Ваш стиль дисциплины:</label>
                    <select
                        className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-violet-400"
                        value={riskProfile?.disciplineStyle || 'gentle'}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), disciplineStyle: e.target.value as any }))}
                    >
                        <option value="gentle">Мягкая, поддерживающая</option>
                        <option value="structured">Структурная, с правилами</option>
                        <option value="strict">Строгая</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Ваш стиль режима дня:</label>
                    <select
                        className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-violet-400"
                        value={riskProfile?.routineStyle || 'balanced'}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), routineStyle: e.target.value as any }))}
                    >
                        <option value="structured">Чёткая структура</option>
                        <option value="balanced">Баланс</option>
                        <option value="adaptive">Гибкая адаптация по ситуации</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Коммуникация с родителями</label>
                    <select
                        className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-violet-400"
                        value={riskProfile?.communicationStyle || 'regular'}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), communicationStyle: e.target.value as any }))}
                    >
                        <option value="minimal">Минимум сообщений</option>
                        <option value="regular">Регулярно (2–3 апдейта)</option>
                        <option value="frequent">Часто в течение дня</option>
                    </select>
                </div>

                <ChipGroup
                    label={lang === 'ru' ? 'Мои сильные стороны' : 'My strengths'}
                    options={lang === 'ru' ? ['Спокойствие', 'Структура', 'Игра', 'Обучение', 'Активность'] : ['Calm', 'Structure', 'Play', 'Learning', 'Activity']}
                    selected={riskProfile?.strengths || []}
                    onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), strengths: list }))}
                />

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Стиль общения по модели PCM</label>
                    <select
                        className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-violet-400"
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

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">Что даётся сложнее (честно)</label>
                    <input
                        className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-violet-400"
                        value={riskProfile?.notBestAt || ''}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), notBestAt: e.target.value }))}
                        placeholder={lang === 'ru' ? 'Например: строгая дисциплина' : 'For example: strict discipline'}
                    />
                </div>
            </div>

            <div className="flex gap-4 mt-8">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1 bg-stone-800 hover:bg-stone-900" onClick={onFinalSubmit} isLoading={loading}>
                    {isEditing ? (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes') : text.submitNanny}
                </Button>
            </div>

            {showAssessment && (
                <BehavioralTestModal
                    onClose={() => setShowAssessment(false)}
                    onComplete={handleAssessmentComplete}
                    lang={lang}
                    candidateInfo={{
                        experience: formData.experience,
                        about: formData.about
                    }}
                />
            )}
        </div>
    );
};
