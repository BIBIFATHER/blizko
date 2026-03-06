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

    return (
        <div className="animate-fade-in space-y-6">
            <div className="section-label">
                Психологический профиль
            </div>

            <Card className={`transition-all duration-300 ${softSkills ? 'bg-amber-50/50 border-amber-200/50 shadow-sm' : 'bg-white/60 backdrop-blur-md border border-white/60 shadow-sm'}`}>
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

            <div className="bg-amber-50/40 backdrop-blur-md border border-amber-200/50 shadow-sm rounded-3xl p-5 space-y-2 mt-8">
                <div className="text-sm font-semibold text-amber-900 mb-4">
                    {lang === 'ru' ? 'Мои суперсилы в общении (помогает найти "ту самую" семью)' : 'My communication superpowers (helps find the *right* family)'}
                </div>

                <ChipGroup
                    label={lang === 'ru' ? 'Если у ребенка истерика, ваш первый шаг:' : 'If a child has a tantrum, your first step:'}
                    options={lang === 'ru' ? ['🫂 Успокоить эмоции', '🎈 Переключить внимание', '🚧 Обозначить границы'] : ['🫂 Calm emotions', '🎈 Distract', '🚧 Set boundaries']}
                    selected={riskProfile?.tantrumFirstStep ? [riskProfile.tantrumFirstStep] : []}
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), tantrumFirstStep: s[0] as any }))}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Ваш стиль дисциплины:' : 'Your discipline style:'}
                    options={lang === 'ru' ? ['💛 Мягкая, поддерживающая', '📐 Структурная, с правилами', '🔒 Строгая'] : ['💛 Gentle, supportive', '📐 Structured, rules-based', '🔒 Strict']}
                    selected={riskProfile?.disciplineStyle ? [riskProfile.disciplineStyle] : []}
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), disciplineStyle: s[0] as any }))}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Ваш стиль режима дня:' : 'Your routine style:'}
                    options={lang === 'ru' ? ['⏰ Чёткая структура', '⚖️ Баланс', '🌊 Гибкая адаптация'] : ['⏰ Clear structure', '⚖️ Balanced', '🌊 Flexible adaptation']}
                    selected={riskProfile?.routineStyle ? [riskProfile.routineStyle] : []}
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), routineStyle: s[0] as any }))}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Коммуникация с родителями:' : 'Communication with parents:'}
                    options={lang === 'ru' ? ['📵 Минимум сообщений', '📱 Регулярно (2-3 раза)', '💬 Часто'] : ['📵 Minimal messages', '📱 Regular (2-3 times)', '💬 Frequent']}
                    selected={riskProfile?.communicationStyle ? [riskProfile.communicationStyle] : []}
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), communicationStyle: s[0] as any }))}
                    single
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Мои сильные стороны:' : 'My strengths:'}
                    options={lang === 'ru' ? ['🧘‍♀️ Спокойствие', '📋 Структура', '🎨 Игра', '📚 Обучение', '⚡ Активность'] : ['🧘‍♀️ Calm', '📋 Structure', '🎨 Play', '📚 Learning', '⚡ Activity']}
                    selected={riskProfile?.strengths || []}
                    onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), strengths: list }))}
                />

                <ChipGroup
                    label={lang === 'ru' ? 'Стиль общения (PCM):' : 'Communication style (PCM):'}
                    options={lang === 'ru'
                        ? ['🧠 Логика', '🛡️ Ценности', '❤️ Эмпатия', '🎉 Легкость', '🧘‍♂️ Тишина', '⚡ Исполнитель']
                        : ['🧠 Logic', '🛡️ Values', '❤️ Empathy', '🎉 Lightness', '🧘‍♂️ Quiet', '⚡ Action']
                    }
                    selected={riskProfile?.pcmType ? [riskProfile.pcmType] : []}
                    onChange={(s) => setRiskProfile((prev) => ({ ...(prev || {}), pcmType: s[0] as any }))}
                    single
                />

                <div className="space-y-1">
                    <label className="block text-xs text-stone-600">{lang === 'ru' ? 'В чем я хочу развиваться (честно о сложностях)' : 'Where I want to grow (honestly about challenges)'}</label>
                    <input
                        className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50 transition-all shadow-inner"
                        value={riskProfile?.notBestAt || ''}
                        onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), notBestAt: e.target.value }))}
                        placeholder={lang === 'ru' ? 'Например: мне пока сложно дается выстраивание жестких границ' : 'For example: setting strict boundaries is still hard for me'}
                    />
                </div>
            </div>

            <div className="sticky bottom-0 z-10 flex gap-4 mt-8 pt-6 pb-6 -mx-2 px-2 sticky-footer-fade">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={onFinalSubmit} isLoading={loading} pulse={true}>
                    {isEditing ? (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes') : (lang === 'ru' ? 'Отправить безопасно' : 'Submit safely')}
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
