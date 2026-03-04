import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParentRequest, Language } from '../../../types';
import { t } from '../../../src/core/i18n/translations';
import { ArrowLeft } from 'lucide-react';
import { ParentFormProvider, useParentForm } from './ParentFormProvider';
import { Step1_Requirements } from './Step1_Requirements';
import { Step2_Calendar } from './Step2_Calendar';
import { Step3_FamilyProfile } from './Step3_FamilyProfile';
import { ParentOfferModal } from '../../ParentOfferModal';

interface ParentFormWrapperProps {
    onSubmit: (data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'> & { id?: string; status?: ParentRequest['status'] }) => Promise<any>;
    lang: Language;
    initialData?: ParentRequest;
}

const ParentFormContent: React.FC<ParentFormWrapperProps> = ({ onSubmit, lang }) => {
    const navigate = useNavigate();
    const text = t[lang];
    const [loading, setLoading] = useState(false);
    const [showOffer, setShowOffer] = useState(false);

    const {
        currentStep,
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

    const onBack = () => navigate(-1);

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
        const budget = `за час: ${formData.budgetHourly || '—'}; за месяц: ${formData.budgetMonthly || '—'}`;
        const advancedNotes = `\n\n[Доп. условия]\nКамеры: ${advanced.cameras}; Поездки: ${advanced.travel}; Помощь по дому: ${advanced.household}; Дом.животные: ${advanced.pets}; Ночь: ${advanced.night}`;
        const calendarNotes = `\n\n[Календарь]\nДиапазон: ${formData.dateFrom || '—'} → ${formData.dateTo || '—'}\nСлоты: ${summarizeSlots() || '—'}`;
        const analysisNotes = formData.analysisNotes?.trim()
            ? `\n\n[Для анализа]\n${formData.analysisNotes.trim()}`
            : '';

        return await onSubmit({
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
        });
    };

    return (
        <div className="animate-slide-up relative">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="text-stone-400 hover:text-stone-800 flex items-center gap-2">
                    <ArrowLeft size={20} /> {text.back}
                </button>
                <div className="text-xs font-semibold text-stone-400 bg-stone-100 px-3 py-1 rounded-full">
                    {lang === 'ru' ? `Шаг ${currentStep} из ${totalSteps}` : `Step ${currentStep} of ${totalSteps}`}
                </div>
            </div>

            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-stone-800">
                    {isEditing ? (lang === 'ru' ? 'Редактировать заявку' : 'Edit Request') : text.pFormTitle}
                </h2>
                <p className="text-stone-500">
                    {isEditing ? (lang === 'ru' ? 'Обновите данные заявки' : 'Update your request data') : text.pFormSubtitle}
                </p>
            </div>

            <div className="w-full bg-stone-100 h-1.5 rounded-full mb-6 overflow-hidden">
                <div
                    className="bg-sky-400 h-full transition-all duration-300"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
            </div>

            {initialDataStatus === 'approved' && isEditing && (
                <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm font-medium mb-4 flex items-center justify-center border border-green-200">
                    {lang === 'ru' ? 'Заявка одобрена. Редактирование заблокировано.' : 'Request is approved. Editing is locked.'}
                </div>
            )}

            <form onSubmit={(e) => e.preventDefault()} className={initialDataStatus === 'approved' ? 'opacity-50 pointer-events-none' : ''}>
                {currentStep === 1 && <Step1_Requirements lang={lang} />}
                {currentStep === 2 && <Step2_Calendar lang={lang} />}
                {currentStep === 3 && <Step3_FamilyProfile lang={lang} onFinalSubmit={handleFinalSubmit} loading={loading} />}
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
