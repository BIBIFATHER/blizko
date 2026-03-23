import React from 'react';
import { Camera, MapPin, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { useNannyForm } from './NannyFormProvider';
import { Button, Input, Checkbox } from '../../UI';
import { t } from '@/core/i18n/translations';
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
    const showAhaMoment = formData.name.trim() !== '' && formData.city.trim() !== '';

    return (
        <div className="animate-fade-in space-y-6 relative pb-24">
            <div className="section-label">{lang === 'ru' ? 'Давайте знакомиться' : 'Let\'s get to know you'}</div>

            {/* Photo Upload Block */}
            <div className="flex justify-center mb-6">
                <label className="relative cursor-pointer group">
                    <div className={`w-32 h-32 rounded-full overflow-hidden flex items-center justify-center transition-all shadow-cloud-soft bg-white/40 backdrop-blur-sm border-2 ${photo ? 'border-amber-300' : 'border-amber-100/50'}`}>
                        {photo ? (
                            <img src={photo} alt="Profile" className="w-full h-full object-cover shadow-inner" />
                        ) : (
                            <div className="flex flex-col items-center gap-1.5">
                                <Camera size={28} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-semibold text-amber-700/60 uppercase tracking-tighter">{lang === 'ru' ? 'Добавить' : 'Add'}</span>
                            </div>
                        )}
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-amber-900/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                            <Sparkles size={20} className="text-amber-400/40" />
                        </div>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    <div className="text-center mt-3 text-sm text-stone-500 font-medium mb-2">
                        {photo ? text.changePhoto : text.uploadPhoto}
                    </div>
                    <div className="flex justify-center items-center gap-1.5 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full mx-auto w-fit">
                        <ShieldCheck size={12} /> {lang === 'ru' ? 'Защищено AES шифрованием' : 'AES Encrypted & Secured'}
                    </div>
                </label>
            </div>

            <Input
                label={`${lang === 'ru' ? 'Как вас зовут?' : 'What is your name?'} *`}
                placeholder={lang === 'ru' ? "Мария Иванова" : "Maria Ivanova"}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                autoAdvance
            />

            <div className="relative">
                <Input
                    label={`${lang === 'ru' ? 'В каком городе вы ищете работу?' : 'Which city are you looking to work in?'} *`}
                    placeholder={lang === 'ru' ? "Москва, ЮАО" : "London, Soho"}
                    value={formData.city}
                    onChange={e => {
                        setFormData({ ...formData, city: e.target.value });
                        setShowCitySuggestions(true);
                    }}
                    required
                    autoAdvance
                />

                {showCitySuggestions && citySuggestions.length > 0 && (
                    <div className="mt-1 border border-white/60 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg max-h-40 overflow-auto absolute z-10 w-full animate-slide-down">
                        {citySuggestions.map((s, i) => (
                            <button
                                key={`${s}-${i}`}
                                type="button"
                                onClick={() => {
                                    setFormData((prev) => ({ ...prev, city: s }));
                                    setShowCitySuggestions(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50/50 transition-colors text-stone-700"
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
                    className="btn-location mt-2"
                >
                    <MapPin size={13} />
                    {detectingLocation
                        ? (lang === 'ru' ? 'Определяем...' : 'Detecting...')
                        : (lang === 'ru' ? 'Определить местоположение' : 'Detect location')}
                </button>
                <div className="mt-3 flex items-start gap-2 text-[11px] text-stone-500 leading-tight bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    <Lock size={12} className="text-amber-600 mt-0.5 shrink-0" />
                    <span>{lang === 'ru' ? 'Ваши контакты скрыты. Семья увидит их только после взаимной симпатии.' : 'Your contacts are hidden. Family will see them only after a mutual match.'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                    label={lang === 'ru' ? 'Район' : 'District'}
                    placeholder={lang === 'ru' ? 'Хамовники, Бутово...' : 'Brooklyn...'}
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                />
                <Input
                    label={lang === 'ru' ? 'Ближайшее метро' : 'Nearest metro'}
                    placeholder={lang === 'ru' ? 'Парк Культуры' : 'Central'}
                    value={formData.metro}
                    onChange={e => setFormData({ ...formData, metro: e.target.value })}
                />
            </div>

            <Input
                label={`${lang === 'ru' ? 'Где с вами можно связаться?' : 'How can we contact you?'} (Телефон) *`}
                placeholder="+7 900 000 00 00"
                value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                required
                autoAdvance
            />

            <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-2xl p-4 mt-6 animate-fade-in mb-6">
                <div className="flex items-start gap-3">
                    <div className="mt-1">
                        <Checkbox
                            label={lang === 'ru' ? 'Готов(а) работать с двумя семьями поблизости' : 'Ready to work with two nearby families'}
                            checked={formData.isNannySharing}
                            onChange={(checked) => setFormData({ ...formData, isNannySharing: checked })}
                        />
                    </div>
                </div>
                <p className="text-xs text-stone-500 mt-2 pl-9">
                    {lang === 'ru'
                        ? 'Nanny Sharing: работа у двух семей в одном районе (до 3 км). Гарантирует полную занятость и стабильный доход.'
                        : 'Work with two families in the same area. Guarantees full-time employment and stable income.'}
                </p>
            </div>

            <div className="sticky bottom-0 z-10 pt-4 pb-6 -mx-2 px-2 sticky-footer-fade mt-4">
                {showAhaMoment && !isFormValid && (
                    <div className="w-full bg-violet-50/70 backdrop-blur-md shadow-cloud-soft border border-violet-100 rounded-2xl p-3 animate-slide-up flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <Sparkles size={16} className="text-violet-600" />
                        </div>
                        <div className="text-[11px] text-stone-700 leading-tight">
                            {lang === 'ru' ?
                                <span>Вам очень рады! В вашем районе прямо сейчас <strong>28 семей</strong> ищут няню. Переходите к следующему шагу!</span> :
                                <span>We're excited to have you! There are <strong>28 families</strong> looking for a nanny in your area right now. Proceed to the next step!</span>}
                        </div>
                    </div>
                )}

                <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!isFormValid}
                    pulse={isFormValid}
                >
                    {lang === 'ru' ? 'Осталось 3 шага' : '3 steps left'}
                </Button>
            </div>
        </div >
    );
};
