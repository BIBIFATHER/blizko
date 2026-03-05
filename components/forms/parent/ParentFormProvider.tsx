import { ParentRequest, Language } from '../../../types';
import { detectUserLocation } from '../../../services/geolocation';

export interface ParentFormData {
    city: string;
    childAge: string;
    schedule: string;
    budgetHourly: string;
    budgetMonthly: string;
    comment: string;
    dateFrom: string;
    dateTo: string;
    analysisNotes: string;
}

export interface ParentAdvancedSettings {
    cameras: string;
    travel: string;
    household: string;
    pets: string;
    night: string;
}

export interface ParentFormContextType {
    // Navigation
    currentStep: number;
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    totalSteps: number;

    // Form Data
    formData: ParentFormData;
    setFormData: React.Dispatch<React.SetStateAction<ParentFormData>>;

    advanced: ParentAdvancedSettings;
    setAdvanced: React.Dispatch<React.SetStateAction<ParentAdvancedSettings>>;

    selectedSlots: Record<string, boolean>;
    setSelectedSlots: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

    requirements: string[];
    setRequirements: React.Dispatch<React.SetStateAction<string[]>>;

    documents: any[];
    setDocuments: React.Dispatch<React.SetStateAction<any[]>>;

    // Psychology
    riskProfile: ParentRequest['riskProfile'];
    setRiskProfile: React.Dispatch<React.SetStateAction<ParentRequest['riskProfile']>>;

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
    initialDataStatus?: ParentRequest['status'];
}

const ParentFormContext = createContext<ParentFormContextType | undefined>(undefined);

export const ParentFormProvider: React.FC<{ children: ReactNode; initialData?: ParentRequest; lang: Language }> = ({ children, initialData, lang }) => {
    const totalSteps = 3;
    const [currentStep, setStep] = useState(1);

    const parseBudget = (raw?: string) => {
        const text = String(raw || '');
        const hourMatch = text.match(/за час:\s*([^\n;]+)/i);
        const monthMatch = text.match(/за месяц:\s*([^\n;]+)/i);
        return {
            hourly: hourMatch?.[1]?.trim() || '',
            monthly: monthMatch?.[1]?.trim() || '',
        };
    };
    const parsedBudget = parseBudget(initialData?.budget);

    const [formData, setFormData] = useState<ParentFormData>({
        city: initialData?.city || '',
        childAge: initialData?.childAge || '',
        schedule: initialData?.schedule || '',
        budgetHourly: parsedBudget.hourly,
        budgetMonthly: parsedBudget.monthly,
        comment: initialData?.comment || '',
        dateFrom: '',
        dateTo: '',
        analysisNotes: '',
    });

    const [advanced, setAdvanced] = useState<ParentAdvancedSettings>({
        cameras: 'ok',
        travel: 'no',
        household: 'light',
        pets: 'has_pets',
        night: 'sometimes',
    });

    const [selectedSlots, setSelectedSlots] = useState<Record<string, boolean>>({});
    const [requirements, setRequirements] = useState<string[]>(initialData?.requirements || []);
    const [documents, setDocuments] = useState(initialData?.documents || []);

    const [riskProfile, setRiskProfile] = useState<ParentRequest['riskProfile']>({
        priorityStyle: initialData?.riskProfile?.priorityStyle || 'balanced',
        reportingFrequency: initialData?.riskProfile?.reportingFrequency || '2_3_times',
        trustLevel: initialData?.riskProfile?.trustLevel || 3,
        familyStyle: initialData?.riskProfile?.familyStyle || 'balanced',
        childStress: initialData?.riskProfile?.childStress || 'tantrum',
        triggers: initialData?.riskProfile?.triggers || [],
        nannyStylePreference: initialData?.riskProfile?.nannyStylePreference || 'gentle',
        communicationPreference: initialData?.riskProfile?.communicationPreference || 'regular',
        needs: initialData?.riskProfile?.needs || [],
        pcmType: initialData?.riskProfile?.pcmType || 'harmonizer',
    });

    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const detectLocation = async (lang: Language) => {
        setDetectingLocation(true);
        const result = await detectUserLocation(lang);

        if (result.success) {
            const value = [result.city, result.district].filter(Boolean).join(', ');
            setFormData((prev) => ({ ...prev, city: value || prev.city }));
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

    return (
        <ParentFormContext.Provider value={{
            currentStep, setStep, nextStep, prevStep, totalSteps,
            formData, setFormData,
            advanced, setAdvanced,
            selectedSlots, setSelectedSlots,
            requirements, setRequirements,
            documents, setDocuments,
            riskProfile, setRiskProfile,
            citySuggestions, setCitySuggestions,
            showCitySuggestions, setShowCitySuggestions,
            detectingLocation, detectLocation,
            isEditing: !!initialData,
            initialDataId: initialData?.id,
            initialDataStatus: initialData?.status
        }}>
            {children}
        </ParentFormContext.Provider>
    );
};

export const useParentForm = () => {
    const context = useContext(ParentFormContext);
    if (context === undefined) {
        throw new Error('useParentForm must be used within a ParentFormProvider');
    }
    return context;
};
