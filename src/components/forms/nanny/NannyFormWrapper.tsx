import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NannyProfile, Language } from '@/core/types';
import { t } from '@/core/i18n/translations';
import { ProgressBar } from '../../UI';
import { NannyFormProvider, useNannyForm } from './NannyFormProvider';
import { Step1_BasicInfo } from './Step1_BasicInfo';
import { Step2_Experience } from './Step2_Experience';
import { Step3_Verification } from './Step3_Verification';
import { Step4_Psychology } from './Step4_Psychology';
import { NannyOfferModal } from '../../NannyOfferModal';
import { StepWizardShell } from '../../ui/StepWizardShell';
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

    useEffect(() => {
        if (!isEditing) {
            trackNannyFormStarted();
        }
    }, [isEditing]);

    useEffect(() => {
        trackNannyFormStep(currentStep, `nanny_step_${currentStep}`);
    }, [currentStep]);

    const onBack = () => {
        if (currentStep > 1) {
            prevStep();
        } else {
            navigate(-1);
        }
    };

    const handleFinalSubmit = () => {
        if (!isEditing) {
            trackCTA('nanny_offer_open', 'nanny_form');
            trackNannyOfferShown();
            setShowOffer(true);
        } else {
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
        <>
            <StepWizardShell
                backLabel={text.back}
                currentStep={currentStep}
                onBack={onBack}
                progress={(
                    <ProgressBar
                        className="mb-6"
                        value={(currentStep / totalSteps) * 100}
                    />
                )}
                stepHint={
                    <>
                        {currentStep === 1 && (lang === 'ru' ? 'Давайте знакомиться!' : 'Let\'s get acquainted!')}
                        {currentStep === 2 && (lang === 'ru' ? 'Отлично! Теперь про ваш опыт' : 'Great! Now your experience')}
                        {currentStep === 3 && (lang === 'ru' ? 'Позитивные отзывы — залог успеха' : 'Positive reviews are key')}
                        {currentStep === 4 && (lang === 'ru' ? 'Финальный штрих: ваши суперсилы' : 'Final touch: your superpowers')}
                    </>
                }
                stepTitle={isEditing ? (lang === 'ru' ? 'Редактирование профиля' : 'Edit Profile') : text.nFormTitle}
                totalSteps={totalSteps}
            >
                {currentStep === 1 && <Step1_BasicInfo lang={lang} />}
                {currentStep === 2 && <Step2_Experience lang={lang} />}
                {currentStep === 3 && <Step3_Verification lang={lang} />}
                {currentStep === 4 && <Step4_Psychology lang={lang} onFinalSubmit={handleFinalSubmit} loading={loading} />}
            </StepWizardShell>

            {showOffer && (
                <NannyOfferModal
                    onClose={() => setShowOffer(false)}
                    onAccept={handleOfferAccept}
                    lang={lang}
                />
            )}
        </>
    );
};

export const NannyForm: React.FC<NannyFormWrapperProps> = (props) => {
    return (
        <NannyFormProvider initialData={props.initialData} lang={props.lang}>
            <NannyFormContent {...props} />
        </NannyFormProvider>
    );
};
