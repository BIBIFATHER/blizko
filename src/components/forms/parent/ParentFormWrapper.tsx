import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParentRequest, Language } from '@/core/types';
import { t } from '@/core/i18n/translations';
import { ParentFormProvider, useParentForm } from './ParentFormProvider';
import { Step1_FamilyStory } from './Step1_FamilyStory';
import { Step2_Calendar } from './Step2_Calendar';
import { Step3_FamilyProfile } from './Step3_FamilyProfile';
import { ParentOfferModal } from '../../ParentOfferModal';
import { ParentSummaryModal } from '../../ParentSummaryModal';
import { StepWizardShell } from '../../ui/StepWizardShell';

interface ParentFormWrapperProps {
    onSubmit: (data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'> & { id?: string; status?: ParentRequest['status'] }) => Promise<void>;
    lang: Language;
    initialData?: ParentRequest;
}

const ParentFormContent: React.FC<ParentFormWrapperProps> = ({ onSubmit, lang }) => {
    const navigate = useNavigate();
    const text = t[lang];
    const [loading, setLoading] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [showOffer, setShowOffer] = useState(false);

    const {
        currentStep,
        prevStep,
        totalSteps,
        isEditing,
        initialDataId,
        initialDataStatus,
        formData,
        advanced,
        selectedSlots,
        requirements,
        documents,
        riskProfile
    } = useParentForm();

    const onBack = () => {
        if (currentStep > 1) {
            prevStep();
        } else {
            navigate(-1);
        }
    };

    const summarizeSlots = () => {
        const keys = Object.keys(selectedSlots).filter((k) => selectedSlots[k]);
        if (keys.length === 0) return '';
        return keys.map((k) => {
            const [d, s] = k.split('-').map(Number);
            const day = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][d] || '';
            const slot = ['08–10', '10–12', '12–14', '14–16', '16–18', '18–20'][s] || '';
            return `${day} ${slot}`;
        }).join(', ');
    };

    const handleFinalSubmit = () => {
        setShowSummary(true);
    };

    const submitData = async () => {
        setLoading(true);

        try {
            const budget = formData.budgetHourly
                ? `за час: ${formData.budgetHourly}; за месяц: ${formData.budgetMonthly || '—'}`
                : '—';

            // Structured summary → comment (curator reads this first)
            const structured: string[] = [];
            if (formData.childAge) structured.push(`Возраст: ${formData.childAge}`);
            if (formData.schedule) structured.push(`График: ${formData.schedule}`);
            if (formData.budgetHourly) structured.push(`Бюджет: ${budget}`);
            if (formData.city) structured.push(`Город: ${formData.city}`);
            const slots = summarizeSlots();
            if (formData.dateFrom || formData.dateTo || slots) {
                structured.push(`Период: ${formData.dateFrom || '—'} → ${formData.dateTo || '—'}${slots ? ` | Слоты: ${slots}` : ''}`);
            }

            const advancedNotes = `\n\n[Доп. условия]\nКамеры: ${advanced.cameras}; Дом: ${advanced.household}; Животные: ${advanced.pets}; Ночь: ${advanced.night}; Поездки: ${advanced.travel}`;

            // Freeform story + extra phrases → [Для анализа] (AI / curator deep read)
            const storyParts: string[] = [];
            if (formData.comment?.trim()) storyParts.push(formData.comment.trim());
            if (formData.extraPhrases.length > 0) storyParts.push(`Пожелания: ${formData.extraPhrases.join(', ')}`);
            const analysisBlock = storyParts.length > 0
                ? `\n\n[Для анализа]\n${storyParts.join('\n')}`
                : '';

            await onSubmit({
                id: initialDataId,
                status: initialDataStatus,
                city: formData.city,
                childAge: formData.childAge,
                schedule: formData.schedule,
                budget,
                comment: `${structured.join('\n')}${advancedNotes}${analysisBlock}`.trim(),
                requirements,
                documents,
                riskProfile,
                isNannySharing: formData.isNannySharing,
                pdConsentAt: new Date().toISOString(),
            });
        } catch (e) {
            console.error('Submit error:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <StepWizardShell
                backLabel={text.back}
                currentStep={currentStep}
                formClassName={initialDataStatus === 'approved' ? 'opacity-50 pointer-events-none' : ''}
                lockedNotice={initialDataStatus === 'approved' && isEditing ? (
                    <div className="bg-amber-50/60 text-amber-800 p-3 rounded-2xl text-sm font-medium mb-4 flex items-center justify-center border border-amber-200/40">
                        {lang === 'ru' ? 'Заявка одобрена. Редактирование заблокировано.' : 'Request is approved. Editing is locked.'}
                    </div>
                ) : undefined}
                onBack={onBack}
                progress={(
                    <div className="w-full bg-stone-100/80 h-1.5 rounded-full mb-6 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${(currentStep / totalSteps) * 100}%`,
                                background: 'linear-gradient(90deg, #E8D5A3, #D2B48C)'
                            }}
                        />
                    </div>
                )}
                stepHint={
                    <>
                        {currentStep === 1 && (lang === 'ru' ? 'Расскажите о семье' : 'Tell us about your family')}
                        {currentStep === 2 && (lang === 'ru' ? 'Отличный старт! Теперь график' : 'Great start! Now schedule')}
                        {currentStep === 3 && (lang === 'ru' ? 'Почти готово! Бюджет и условия' : 'Almost there! Budget & conditions')}
                    </>
                }
                stepTitle={isEditing ? (lang === 'ru' ? 'Редактирование заявки' : 'Edit Request') : text.pFormTitle}
                totalSteps={totalSteps}
            >
                {currentStep === 1 && <Step1_FamilyStory lang={lang} />}
                {currentStep === 2 && <Step2_Calendar lang={lang} />}
                {currentStep === 3 && <Step3_FamilyProfile lang={lang} onFinalSubmit={handleFinalSubmit} loading={loading} />}
            </StepWizardShell>

            {showSummary && (
                <ParentSummaryModal
                    lang={lang}
                    formData={formData}
                    advanced={advanced}
                    onConfirm={() => { setShowSummary(false); setShowOffer(true); }}
                    onClose={() => setShowSummary(false)}
                />
            )}

            {showOffer && (
                <ParentOfferModal
                    onClose={() => setShowOffer(false)}
                    onAccept={submitData}
                    lang={lang}
                />
            )}
        </>
    );
};

export const ParentForm: React.FC<ParentFormWrapperProps> = (props) => {
    return (
        <ParentFormProvider initialData={props.initialData} lang={props.lang}>
            <ParentFormContent {...props} />
        </ParentFormProvider>
    );
};
