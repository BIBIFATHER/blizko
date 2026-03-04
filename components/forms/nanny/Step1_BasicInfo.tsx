import React from 'react';
import { Camera, MapPin } from 'lucide-react';
import { useNannyForm } from './NannyFormProvider';
import { Button, Input } from '../../UI';
import { t } from '../../../src/core/i18n/translations';
import { Language } from '../../../types';

interface Props {
    lang: Language;
}

export const Step1_BasicInfo: React.FC<Props> = ({ lang }) => {
    const text = t[lang];
    const {
        formData, setFormData,
        photo, setPhoto,
        citySuggestions, setCitySuggestions,
        showCitySuggestions, setShowCitySuggestions,
        detectingLocation, detectLocation,
        nextStep
    } = useNannyForm();

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setPhoto(ev.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const isFormValid = formData.name.trim() !== '' && formData.city.trim() !== '' && formData.contact.trim() !== '';

    const sectionLabel = "flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400 font-semibold";

    return (
        <div className="animate-fade-in space-y-6">
            <div className={sectionLabel}>
                <span className="h-px flex-1 bg-stone-200/70" />
                Основная информация
                <span className="h-px flex-1 bg-stone-200/70" />
            </div>

            {/* Photo Upload Block */}
            <div className="flex justify-center mb-6">
                <label className="relative cursor-pointer group">
                    <div className={`w-32 h-32 rounded-full overflow-hidden border-4 flex items-center justify-center transition-all shadow-md ring-1 ring-white/60 ${photo ? 'border-amber-300' : 'border-stone-200 bg-stone-100'}`}>
                        {photo ? (
                            <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <Camera size={40} className="text-stone-400" />
                        )}
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                            <Camera size={24} className="text-white" />
                        </div>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    <div className="text-center mt-2 text-sm text-stone-500 font-medium">
                        {photo ? text.changePhoto : text.uploadPhoto}
                    </div>
                </label>
            </div>

            <Input
                label={`${text.nameLabel} *`}
                placeholder={lang === 'ru' ? "Мария Иванова" : "Maria Ivanova"}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
            />

            <div className="relative">
                <Input
                    label={`${text.cityLabel} *`}
                    placeholder={lang === 'ru' ? "Москва, ЮАО" : "London, Soho"}
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

            <Input
                label={`${text.contactLabel} *`}
                placeholder="+7 900 000 00 00"
                value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                required
            />

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
