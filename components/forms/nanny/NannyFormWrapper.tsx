import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NannyProfile, Language } from '../../../types';
import { t } from '../../../src/core/i18n/translations';
import { ArrowLeft } from 'lucide-react';
import { NannyFormProvider, useNannyForm } from './NannyFormProvider';
import { Step1_BasicInfo } from './Step1_BasicInfo';
import { Step2_Experience } from './Step2_Experience';
import { Step3_Verification } from './Step3_Verification';
import { Step4_Psychology } from './Step4_Psychology';
import { NannyOfferModal } from '../../NannyOfferModal';

interface NannyFormWrapperProps {
    onSubmit: (data: Partial<NannyProfile>) => void;
    lang: Language;
    initialData?: NannyProfile;
}

const NannyFormContent: React.FC<NannyFormWrapperProps> = ({ onSubmit, lang }) => {
    const navigate = useNavigate();
    const text = t[lang];
    const [loading, setLoading] = useState(false);
    const [showOffer, setShowOffer] = useState(false);

    const {
        currentStep,
        totalSteps,
        isEditing,
        initialDataId,
        formData,
        advanced,
        photo,
        childAges,
        skills,
        isVerified,
        softSkills,
        documents,
        resumeNormalized,
        riskProfile
    } = useNannyForm();

    const onBack = () => navigate(-1);

    const handleFinalSubmit = () => {
        if (!isEditing) {
            // Show offer only for new registrations
            setShowOffer(true);
        } else {
            // Direct submit for edits
            submitData();
        }
    };

    const submitData = () => {
        setLoading(true);
        setTimeout(() => {
            const advancedNotes = `\n\n[Предпочтения]\nКамеры: ${advanced.cameras}; Поездки: ${advanced.travel}; Дом. задачи: ${advanced.household}; Животные: ${advanced.pets}; Ночь: ${advanced.night}`;

            onSubmit({
                id: initialDataId,
                ...formData,
                about: `${formData.about || ''}${advancedNotes}`.trim(),
                photo,
                childAges,
                skills,
                isVerified,
                softSkills,
                documents,
                resumeNormalized,
                riskProfile,
            });
            setLoading(false);
        }, 600);
    };

    const handleOfferAccept = () => {
        setShowOffer(false);
        submitData();
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
                    {isEditing ? (lang === 'ru' ? 'Редактирование профиля' : 'Edit Profile') : text.nFormTitle}
                </h2>
                <p className="text-stone-500">{text.nFormSubtitle}</p>
            </div>

            <div className="w-full bg-stone-100 h-1.5 rounded-full mb-6 overflow-hidden">
                <div
                    className="bg-amber-400 h-full transition-all duration-300"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
                {currentStep === 1 && <Step1_BasicInfo lang={lang} />}
                {currentStep === 2 && <Step2_Experience lang={lang} />}
                {currentStep === 3 && <Step3_Verification lang={lang} />}
                {currentStep === 4 && <Step4_Psychology lang={lang} onFinalSubmit={handleFinalSubmit} loading={loading} />}
            </form>

            {showOffer && (
                <NannyOfferModal
                    onClose={() => setShowOffer(false)}
                    onAccept={handleOfferAccept}
                    lang={lang}
                />
            )}
        </div>
    );
};

export const NannyForm: React.FC<NannyFormWrapperProps> = (props) => {
    return (
        <NannyFormProvider initialData={props.initialData} lang={props.lang}>
            <NannyFormContent {...props} />
        </NannyFormProvider>
    );
};
