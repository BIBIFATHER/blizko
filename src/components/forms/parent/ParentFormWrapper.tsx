import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParentRequest, Language } from '@/core/types';
import { t } from '@/core/i18n/translations';
import { ArrowLeft } from 'lucide-react';
import { ParentFormProvider, useParentForm } from './ParentFormProvider';
import { Step1_Requirements } from './Step1_Requirements';
import { Step2_Calendar } from './Step2_Calendar';
import { Step3_FamilyProfile } from './Step3_FamilyProfile';
import { ParentOfferModal } from '../../ParentOfferModal';

interface ParentFormWrapperProps {
    onSubmit: (data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'> & { id?: string; status?: ParentRequest['status'] }) => Promise<void>;
    lang: Language;
    initialData?: ParentRequest;
}

const ParentFormContent: React.FC<ParentFormWrapperProps> = ({ onSubmit, lang }) => {
    const navigate = useNavigate();
    const text = t[lang];
    const [loading, setLoading] = useState(false);
    const [showOffer, setShowOffer] = useState(false);
    const directionRef = useRef<'forward' | 'back'>('forward');
    const [stepKey, setStepKey] = useState(0);

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

    // Track step transitions for direction-aware animation
    const prevStepRef = useRef(currentStep);
    if (prevStepRef.current !== currentStep) {
        directionRef.current = currentStep > prevStepRef.current ? 'forward' : 'back';
        prevStepRef.current = currentStep;
        setStepKey(k => k + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

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
        // Parent logic always shows the offer confirmation modal before submitting
        setShowOffer(true);
    };

    const submitData = async () => {
        setShowOffer(false);
        setLoading(true);

        try {
            const budget = `за час: ${formData.budgetHourly || '—'}; за месяц: ${formData.budgetMonthly || '—'}`;
            const advancedNotes = `\n\n[Доп. условия]\nКамеры: ${advanced.cameras}; Поездки: ${advanced.travel}; Помощь по дому: ${advanced.household}; Дом.животные: ${advanced.pets}; Ночь: ${advanced.night}`;
            const calendarNotes = `\n\n[Календарь]\nДиапазон: ${formData.dateFrom || '—'} → ${formData.dateTo || '—'}\nСлоты: ${summarizeSlots() || '—'}`;
            const analysisNotes = formData.analysisNotes?.trim()
                ? `\n\n[Для анализа]\n${formData.analysisNotes.trim()}`
                : '';

            await onSubmit({
                id: initialDataId,
                status: initialDataStatus,
                city: formData.city,
                childAge: formData.childAge,
                schedule: formData.schedule,
                budget,
                comment: `${formData.comment || ''}${advancedNotes}${calendarNotes}${analysisNotes}`.trim(),
                requirements,
                documents,
                riskProfile,
                isNannySharing: formData.isNannySharing,
            });
        } catch (e) {
            console.error('Submit error:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-slide-up relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <button onClick={onBack} className="text-stone-400 hover:text-stone-700 flex items-center gap-1.5 transition-colors p-2 -ml-2 rounded-xl hover:bg-stone-50 active:bg-stone-100">
                    <ArrowLeft size={20} /> <span className="text-sm font-medium">{text.back}</span>
                </button>
            </div>

            {/* Title */}
            <div className="mb-5">
                <h2 className="text-2xl font-semibold text-stone-800">
                    {isEditing ? (lang === 'ru' ? 'Редактировать заявку' : 'Edit Request') : text.pFormTitle}
                </h2>
                <div className="flex items-center justify-between mt-3 text-sm font-medium">
                    <span className="text-amber-700">
                        {currentStep === 1 && (lang === 'ru' ? 'Начнем с главного' : 'Let\'s start with basics')}
                        {currentStep === 2 && (lang === 'ru' ? 'Отличный старт! Теперь график' : 'Great start! Now schedule')}
                        {currentStep === 3 && (lang === 'ru' ? 'Почти готово! Профиль семьи' : 'Almost there! Family profile')}
                    </span>
                    <span className="text-stone-400">{currentStep} / {totalSteps}</span>
                </div>
            </div>

            {/* Progress bar — warm amber */}
            <div className="w-full bg-stone-100/80 h-1.5 rounded-full mb-6 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                        width: `${(currentStep / totalSteps) * 100}%`,
                        background: 'linear-gradient(90deg, #E8D5A3, #D2B48C)'
                    }}
                />
            </div>

            {initialDataStatus === 'approved' && isEditing && (
                <div className="bg-amber-50/60 text-amber-800 p-3 rounded-2xl text-sm font-medium mb-4 flex items-center justify-center border border-amber-200/40">
                    {lang === 'ru' ? 'Заявка одобрена. Редактирование заблокировано.' : 'Request is approved. Editing is locked.'}
                </div>
            )}

            <form
                onSubmit={(e) => e.preventDefault()}
                className={initialDataStatus === 'approved' ? 'opacity-50 pointer-events-none' : ''}
            >
                {/* Direction-aware step animation */}
                <div
                    key={stepKey}
                    className={directionRef.current === 'back' ? 'step-enter-back' : 'step-enter'}
                >
                    {currentStep === 1 && <Step1_Requirements lang={lang} />}
                    {currentStep === 2 && <Step2_Calendar lang={lang} />}
                    {currentStep === 3 && <Step3_FamilyProfile lang={lang} onFinalSubmit={handleFinalSubmit} loading={loading} />}
                </div>
            </form>

            {showOffer && (
                <ParentOfferModal
                    onClose={() => setShowOffer(false)}
                    onAccept={submitData}
                    lang={lang}
                />
            )}
        </div>
    );
};

export const ParentForm: React.FC<ParentFormWrapperProps> = (props) => {
    return (
        <ParentFormProvider initialData={props.initialData} lang={props.lang}>
            <ParentFormContent {...props} />
        </ParentFormProvider>
    );
};
