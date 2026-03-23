import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NannyProfile, Language } from '../../../types';
import { t } from '@/core/i18n/translations';
import { ArrowLeft } from 'lucide-react';
import { ProgressBar } from '../../UI';
import { NannyFormProvider, useNannyForm } from './NannyFormProvider';
import { Step1_BasicInfo } from './Step1_BasicInfo';
import { Step2_Experience } from './Step2_Experience';
import { Step3_Verification } from './Step3_Verification';
import { Step4_Psychology } from './Step4_Psychology';
import { NannyOfferModal } from '../../NannyOfferModal';
import { trackCTA, trackNannyFormStarted, trackNannyFormStep, trackNannyOfferShown, trackNannyOfferAccepted } from '@/services/analytics';

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
        prevStep,
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

    React.useEffect(() => {
        if (!isEditing) {
            trackNannyFormStarted();
        }
    }, [isEditing]);

    React.useEffect(() => {
        trackNannyFormStep(currentStep, `nanny_step_${currentStep}`);
    }, [currentStep]);

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

    const handleFinalSubmit = () => {
        if (!isEditing) {
            // Show offer only for new registrations
            trackCTA('nanny_offer_open', 'nanny_form');
            trackNannyOfferShown();
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
        trackNannyOfferAccepted();
        submitData();
    };

    return (
        <div className="animate-slide-up relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <button onClick={onBack} className="text-stone-400 hover:text-stone-700 flex items-center gap-1.5 transition-colors p-2 -ml-2 rounded-xl hover:bg-stone-50 active:bg-stone-100">
                    <ArrowLeft size={18} /> <span className="text-sm font-medium">{text.back}</span>
                </button>
            </div>

            {/* Title */}
            <div className="mb-5">
                <h2 className="text-2xl font-semibold text-stone-800">
                    {isEditing ? (lang === 'ru' ? 'Редактирование профиля' : 'Edit Profile') : text.nFormTitle}
                </h2>
                <div className="flex items-center justify-between mt-3 text-sm font-medium">
                    <span className="text-amber-700">
                        {currentStep === 1 && (lang === 'ru' ? 'Давайте знакомиться!' : 'Let\'s get acquainted!')}
                        {currentStep === 2 && (lang === 'ru' ? 'Отлично! Теперь про ваш опыт' : 'Great! Now your experience')}
                        {currentStep === 3 && (lang === 'ru' ? 'Позитивные отзывы — залог успеха' : 'Positive reviews are key')}
                        {currentStep === 4 && (lang === 'ru' ? 'Финальный штрих: ваши суперсилы' : 'Final touch: your superpowers')}
                    </span>
                    <span className="text-stone-400">{currentStep} / {totalSteps}</span>
                </div>
            </div>

            {/* Progress bar — Goal-Gradient */}
            <ProgressBar
                value={(currentStep / totalSteps) * 100}
                className="mb-6"
            />

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
