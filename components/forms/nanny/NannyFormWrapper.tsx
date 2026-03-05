import React, { useState, useRef } from 'react';
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
    const directionRef = useRef<'forward' | 'back'>('forward');
    const [stepKey, setStepKey] = useState(0);

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

    // Track step transitions for direction-aware animation
    const prevStepRef = useRef(currentStep);
    if (prevStepRef.current !== currentStep) {
        directionRef.current = currentStep > prevStepRef.current ? 'forward' : 'back';
        prevStepRef.current = currentStep;
        setStepKey(k => k + 1);
    }

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
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <button onClick={onBack} className="text-stone-400 hover:text-stone-700 flex items-center gap-1.5 transition-colors">
                    <ArrowLeft size={18} /> <span className="text-sm">{text.back}</span>
                </button>
                <div className="step-badge">
                    {lang === 'ru' ? `${currentStep} из ${totalSteps}` : `${currentStep} of ${totalSteps}`}
                </div>
            </div>

            {/* Title */}
            <div className="mb-5">
                <h2 className="text-2xl font-semibold text-stone-800">
                    {isEditing ? (lang === 'ru' ? 'Редактирование профиля' : 'Edit Profile') : text.nFormTitle}
                </h2>
                <p className="text-stone-400 text-sm mt-1">{text.nFormSubtitle}</p>
            </div>

            {/* Progress bar — warm amber */}
            <div className="w-full bg-stone-100/80 h-1 rounded-full mb-6 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                        width: `${(currentStep / totalSteps) * 100}%`,
                        background: 'linear-gradient(90deg, #E8D5A3, #D2B48C)'
                    }}
                />
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
                {/* Direction-aware step animation */}
                <div
                    key={stepKey}
                    className={directionRef.current === 'back' ? 'step-enter-back' : 'step-enter'}
                >
                    {currentStep === 1 && <Step1_BasicInfo lang={lang} />}
                    {currentStep === 2 && <Step2_Experience lang={lang} />}
                    {currentStep === 3 && <Step3_Verification lang={lang} />}
                    {currentStep === 4 && <Step4_Psychology lang={lang} onFinalSubmit={handleFinalSubmit} loading={loading} />}
                </div>
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
