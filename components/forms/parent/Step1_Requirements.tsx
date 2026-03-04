import React from 'react';
import { MapPin } from 'lucide-react';
import { useParentForm } from './ParentFormProvider';
import { Button, Input, ChipGroup } from '../../UI';
import { t } from '../../../src/core/i18n/translations';
import { Language } from '../../../types';

interface Props {
    lang: Language;
}

export const Step1_Requirements: React.FC<Props> = ({ lang }) => {
    const text = t[lang];
    const {
        formData, setFormData,
        citySuggestions, setCitySuggestions,
        showCitySuggestions, setShowCitySuggestions,
        detectingLocation, detectLocation,
        nextStep
    } = useParentForm();

    const isFormValid = formData.city.trim() !== '' && formData.childAge.trim() !== '' && formData.schedule.trim() !== '' && formData.budgetHourly.trim() !== '' && formData.budgetMonthly.trim() !== '';

    const sectionLabel = "flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400 font-semibold";

    return (
        <div className="animate-fade-in space-y-6">
            <div className={sectionLabel}>
                <span className="h-px flex-1 bg-stone-200/70" />
                Кого мы ищем
                <span className="h-px flex-1 bg-stone-200/70" />
            </div>

            <div className="relative">
                <Input
                    label={`${text.cityLabel} *`}
                    placeholder={lang === 'ru' ? "Москва, Хамовники" : "New York, Brooklyn"}
                    value={formData.city}
                    onChange={e => {
                        setFormData({ ...formData, city: e.target.value });
                        setShowCitySuggestions(true);
                    }}
                    required
                />

                {showCitySuggestions && citySuggestions.length > 0 && (
                    <div className="mt-1 border border-stone-200 rounded-lg bg-white shadow-sm max-h-40 overflow-auto absolute z-10 w-full">
                        {citySuggestions.map((s, i) => (
                            <button
                                key={`${s}-${i}`}
                                type="button"
                                onClick={() => {
                                    setFormData((prev) => ({ ...prev, city: s }));
                                    setShowCitySuggestions(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => detectLocation(lang)}
                    disabled={detectingLocation}
                    className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ${detectingLocation ? 'bg-stone-100 text-stone-400' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
                >
                    <MapPin size={14} />
                    {detectingLocation
                        ? (lang === 'ru' ? 'Определяем...' : 'Detecting...')
                        : (lang === 'ru' ? 'Определить местоположение' : 'Detect location')}
                </button>
            </div>

            <ChipGroup
                label={`${text.childAgeLabel} *`}
                options={text.ageOptions}
                selected={formData.childAge ? [formData.childAge] : []}
                onChange={(s) => setFormData({ ...formData, childAge: s[0] || '' })}
                single
            />

            <ChipGroup
                label={`${text.scheduleLabel} *`}
                options={text.scheduleOptions}
                selected={formData.schedule ? [formData.schedule] : []}
                onChange={(s) => setFormData({ ...formData, schedule: s[0] || '' })}
                single
            />

            <div className={sectionLabel}>
                <span className="h-px flex-1 bg-stone-200/70" />
                Бюджет
                <span className="h-px flex-1 bg-stone-200/70" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                    label={`${lang === 'ru' ? 'Цена за час' : 'Price per hour'} *`}
                    placeholder={lang === 'ru' ? '600 - 800 ₽/час' : '20 - 30 $/hour'}
                    value={formData.budgetHourly}
                    onChange={e => setFormData({ ...formData, budgetHourly: e.target.value })}
                    required
                />
                <Input
                    label={`${lang === 'ru' ? 'Цена за месяц' : 'Price per month'} *`}
                    placeholder={lang === 'ru' ? '120 000 - 180 000 ₽/мес' : '2500 - 4000 $/month'}
                    value={formData.budgetMonthly}
                    onChange={e => setFormData({ ...formData, budgetMonthly: e.target.value })}
                    required
                />
            </div>

            <Button
                type="button"
                className="mt-8"
                onClick={nextStep}
                disabled={!isFormValid}
            >
                {lang === 'ru' ? 'Далее' : 'Next'}
            </Button>
        </div>
    );
};
