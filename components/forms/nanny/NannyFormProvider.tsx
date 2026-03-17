import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { NannyProfile, Language, SoftSkillsProfile, DocumentVerification, NormalizedResume } from '../../../types';
import { detectUserLocation } from '../../../services/geolocation';
import { trackLocationDetected, trackNannyReadyForMatch } from '../../../services/analytics';
import { getNannyReadinessSnapshot, NannyReadinessSnapshot } from '../../../services/nannyReadiness';

export interface NannyFormData {
    name: string;
    city: string;
    district: string;
    metro: string;
    experience: string;
    schedule: string;
    expectedRate: string;
    about: string;
    contact: string;
    isNannySharing: boolean;
}

export interface AdvancedSettings {
    cameras: string;
    travel: string;
    household: string;
    pets: string;
    night: string;
}

export interface NannyFormContextType {
    // Navigation
    currentStep: number;
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    totalSteps: number;

    // Form Data
    formData: NannyFormData;
    setFormData: React.Dispatch<React.SetStateAction<NannyFormData>>;

    advanced: AdvancedSettings;
    setAdvanced: React.Dispatch<React.SetStateAction<AdvancedSettings>>;

    childAges: string[];
    setChildAges: React.Dispatch<React.SetStateAction<string[]>>;

    skills: string[];
    setSkills: React.Dispatch<React.SetStateAction<string[]>>;

    photo: string | undefined;
    setPhoto: React.Dispatch<React.SetStateAction<string | undefined>>;

    // Verification & Trust
    isVerified: boolean;
    setIsVerified: React.Dispatch<React.SetStateAction<boolean>>;

    softSkills: SoftSkillsProfile | undefined;
    setSoftSkills: React.Dispatch<React.SetStateAction<SoftSkillsProfile | undefined>>;

    documents: DocumentVerification[];
    setDocuments: React.Dispatch<React.SetStateAction<DocumentVerification[]>>;

    resumeNormalized: NormalizedResume | undefined;
    setResumeNormalized: React.Dispatch<React.SetStateAction<NormalizedResume | undefined>>;
    applyResumeNormalized: (resume: NormalizedResume) => number;

    // Psychology
    riskProfile: NannyProfile['riskProfile'];
    setRiskProfile: React.Dispatch<React.SetStateAction<NannyProfile['riskProfile']>>;
    readinessSnapshot: NannyReadinessSnapshot;

    // Location logic helpers
    citySuggestions: string[];
    setCitySuggestions: React.Dispatch<React.SetStateAction<string[]>>;
    showCitySuggestions: boolean;
    setShowCitySuggestions: React.Dispatch<React.SetStateAction<boolean>>;
    detectingLocation: boolean;
    detectLocation: (lang: Language) => Promise<void>;

    // Computed / Actions
    isEditing: boolean;
    initialDataId?: string;
}

const NannyFormContext = createContext<NannyFormContextType | undefined>(undefined);

export const NannyFormProvider: React.FC<{ children: ReactNode; initialData?: NannyProfile; lang: Language }> = ({ children, initialData, lang }) => {
    const totalSteps = 4;
    const [currentStep, setStep] = useState(1);

    const [formData, setFormData] = useState<NannyFormData>({
        name: initialData?.name || '',
        city: initialData?.city || '',
        district: initialData?.district || '',
        metro: initialData?.metro || '',
        experience: initialData?.experience || '',
        schedule: initialData?.schedule || '',
        expectedRate: initialData?.expectedRate || '',
        about: initialData?.about || '',
        contact: initialData?.contact || '',
        isNannySharing: initialData?.isNannySharing || false
    });

    const [advanced, setAdvanced] = useState<AdvancedSettings>({
        cameras: 'ok',
        travel: 'yes',
        household: 'light',
        pets: 'ok',
        night: 'sometimes',
    });

    const [childAges, setChildAges] = useState<string[]>(initialData?.childAges || []);
    const [skills, setSkills] = useState<string[]>(initialData?.skills || []);
    const [photo, setPhoto] = useState<string | undefined>(initialData?.photo);
    const [isVerified, setIsVerified] = useState(initialData?.isVerified || false);
    const [softSkills, setSoftSkills] = useState<SoftSkillsProfile | undefined>(initialData?.softSkills);
    const [documents, setDocuments] = useState<DocumentVerification[]>(initialData?.documents || []);
    const [resumeNormalized, setResumeNormalized] = useState<NormalizedResume | undefined>(initialData?.resumeNormalized);

    const [riskProfile, setRiskProfile] = useState<NannyProfile['riskProfile']>({
        tantrumFirstStep: initialData?.riskProfile?.tantrumFirstStep || 'calm',
        routineStyle: initialData?.riskProfile?.routineStyle || 'balanced',
        conflictStyle: initialData?.riskProfile?.conflictStyle || 'discuss_now',
        emergencyReady: initialData?.riskProfile?.emergencyReady || 'yes',
        disciplineStyle: initialData?.riskProfile?.disciplineStyle || 'gentle',
        communicationStyle: initialData?.riskProfile?.communicationStyle || 'regular',
        strengths: initialData?.riskProfile?.strengths || [],
        notBestAt: initialData?.riskProfile?.notBestAt || '',
        pcmType: initialData?.riskProfile?.pcmType || 'harmonizer',
    });

    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const trackedReadyRef = useRef(false);
    const skillsRef = useRef<string[]>(initialData?.skills || []);

    useEffect(() => {
        skillsRef.current = skills;
    }, [skills]);

    const applyResumeNormalized = (resume: NormalizedResume): number => {
        let appliedCount = 0;

        setFormData((prev) => {
            const next = { ...prev };

            if (!prev.name && resume.fullName) {
                next.name = resume.fullName;
                appliedCount += 1;
            }
            if (!prev.city && resume.city) {
                next.city = resume.city;
                appliedCount += 1;
            }
            if (!prev.contact && (resume.phone || resume.email)) {
                next.contact = resume.phone || resume.email || '';
                appliedCount += 1;
            }
            if (!prev.about && resume.summary) {
                next.about = resume.summary;
                appliedCount += 1;
            }
            if (!prev.experience && typeof resume.experienceYears === 'number') {
                next.experience = String(resume.experienceYears);
                appliedCount += 1;
            }

            return next;
        });

        if (Array.isArray(resume.skills) && resume.skills.length > 0) {
            const currentSkills = skillsRef.current || [];
            const nextSkills = Array.from(new Set([...currentSkills, ...resume.skills]));
            if (nextSkills.length !== currentSkills.length) {
                appliedCount += 1;
                setSkills(nextSkills);
            }
        }

        return appliedCount;
    };

    const readinessSnapshot = useMemo(() => getNannyReadinessSnapshot({
        id: initialData?.id,
        ...formData,
        childAges,
        skills,
        isVerified,
        documents,
        resumeNormalized,
        riskProfile,
        softSkills,
        reviews: initialData?.reviews,
    }), [
        childAges,
        documents,
        formData,
        initialData?.id,
        initialData?.reviews,
        isVerified,
        resumeNormalized,
        riskProfile,
        skills,
        softSkills,
    ]);

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const detectLocation = async (lang: Language) => {
        setDetectingLocation(true);
        const result = await detectUserLocation(lang);

        if (result.success) {
            const value = [result.city, result.district].filter(Boolean).join(', ');
            setFormData((prev) => ({ ...prev, city: value || prev.city }));
            if (value) {
                trackLocationDetected('nanny');
            }
            if (!value) {
                alert(lang === 'ru' ? 'Не удалось определить город/район автоматически' : 'Could not detect city/district automatically');
            }
        } else if (result.error) {
            alert(result.error);
        }

        setDetectingLocation(false);
    };

    useEffect(() => {
        const q = formData.city.trim();
        if (q.length < 3) {
            setCitySuggestions([]);
            return;
        }

        const tmr = setTimeout(async () => {
            try {
                const nr = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5`);
                const nj = await nr.json().catch(() => []);
                const list = (Array.isArray(nj) ? nj : [])
                    .map((x: any) => x?.display_name)
                    .filter(Boolean)
                    .slice(0, 5);

                setCitySuggestions(list);
            } catch {
                setCitySuggestions([]);
            }
        }, 350);

        return () => clearTimeout(tmr);
    }, [formData.city]);

    useEffect(() => {
        if (readinessSnapshot.qualityApproved && !trackedReadyRef.current) {
            trackNannyReadyForMatch(readinessSnapshot.qualityScore);
            trackedReadyRef.current = true;
        }

        if (!readinessSnapshot.qualityApproved) {
            trackedReadyRef.current = false;
        }
    }, [readinessSnapshot.qualityApproved, readinessSnapshot.qualityScore]);

    return (
        <NannyFormContext.Provider value={{
            currentStep, setStep, nextStep, prevStep, totalSteps,
            formData, setFormData,
            advanced, setAdvanced,
            childAges, setChildAges,
            skills, setSkills,
            photo, setPhoto,
            isVerified, setIsVerified,
            softSkills, setSoftSkills,
            documents, setDocuments,
            resumeNormalized, setResumeNormalized,
            applyResumeNormalized,
            riskProfile, setRiskProfile,
            readinessSnapshot,
            citySuggestions, setCitySuggestions,
            showCitySuggestions, setShowCitySuggestions,
            detectingLocation, detectLocation,
            isEditing: !!initialData,
            initialDataId: initialData?.id
        }}>
            {children}
        </NannyFormContext.Provider>
    );
};

export const useNannyForm = () => {
    const context = useContext(NannyFormContext);
    if (context === undefined) {
        throw new Error('useNannyForm must be used within a NannyFormProvider');
    }
    return context;
};
