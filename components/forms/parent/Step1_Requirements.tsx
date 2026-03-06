import React from 'react';
import { MapPin, Lock, Sparkles } from 'lucide-react';
import { useParentForm } from './ParentFormProvider';
import { Button, Input, ChipGroup, RangeSlider } from '../../UI';
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
    const showAhaMoment = formData.city.trim() !== '' && formData.childAge.trim() !== '';

    return (
        <div className="animate-fade-in space-y-6 relative pb-24">
            <div className="section-label">{lang === 'ru' ? 'С чего начнем поиск?' : 'Where should we start?'}</div>

            <div className="relative">
                <Input
                    label={`${lang === 'ru' ? 'В каком городе вы ищете няню?' : 'Which city are you looking in?'} *`}
                    placeholder={lang === 'ru' ? "Москва, Хамовники" : "New York, Brooklyn"}
                    value={formData.city}
                    onChange={e => {
                        setFormData({ ...formData, city: e.target.value });
                        setShowCitySuggestions(true);
                    }}
                    required
                    autoAdvance
                />

                {showCitySuggestions && citySuggestions.length > 0 && (
                    <div className="mt-1 border border-stone-200 rounded-lg bg-white shadow-sm max-h-40 overflow-auto absolute z-10 w-full animate-slide-down">
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
                    className="btn-location mt-2"
                >
                    <MapPin size={13} />
                    {detectingLocation
                        ? (lang === 'ru' ? 'Определяем...' : 'Detecting...')
                        : (lang === 'ru' ? 'Определить местоположение' : 'Detect location')}
                </button>

                <div className="mt-3 flex items-start gap-2 text-[11px] text-stone-500 leading-tight bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    <Lock size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>{lang === 'ru' ? 'Ваш точный адрес видим только менеджеру. Няня получит его только перед выездом.' : 'Your exact address is visible only to the manager. Nanny gets it before departure.'}</span>
                </div>
            </div>

            <ChipGroup
                label={`${lang === 'ru' ? 'Какой возраст у малыша?' : 'What is the child\'s age?'} *`}
                options={text.ageOptions}
                selected={formData.childAge ? [formData.childAge] : []}
                onChange={(s) => setFormData({ ...formData, childAge: s[0] || '' })}
                single
            />

            <ChipGroup
                label={`${lang === 'ru' ? 'Какой нужен график?' : 'What schedule do you need?'} *`}
                options={text.scheduleOptions}
                selected={formData.schedule ? [formData.schedule] : []}
                onChange={(s) => setFormData({ ...formData, schedule: s[0] || '' })}
                single
            />

            <div className="section-label">{lang === 'ru' ? 'Финансовые рамки' : 'Financial expectations'}</div>
            <div className="flex flex-col gap-2 mt-4">
                <RangeSlider
                    label={`${lang === 'ru' ? 'Допустимая цена за час' : 'Acceptable hourly rate'} *`}
                    min={lang === 'ru' ? 300 : 10}
                    max={lang === 'ru' ? 1500 : 50}
                    step={lang === 'ru' ? 50 : 1}
                    value={
                        (formData.budgetHourly.match(/\d+/g) || [lang === 'ru' ? 600 : 20, lang === 'ru' ? 800 : 30]).map(Number).slice(0, 2) as [number, number]
                    }
                    onChange={(val) => setFormData({ ...formData, budgetHourly: lang === 'ru' ? `${val[0]} - ${val[1]} ₽/час` : `${val[0]} - ${val[1]} $/hour` })}
                    formatValue={(val) => lang === 'ru' ? `${val} ₽` : `$${val}`}
                    autoAdvance
                />
                <RangeSlider
                    label={`${lang === 'ru' ? 'Бюджет в месяц' : 'Monthly budget'} *`}
                    min={lang === 'ru' ? 50000 : 1000}
                    max={lang === 'ru' ? 300000 : 8000}
                    step={lang === 'ru' ? 10000 : 100}
                    value={
                        (formData.budgetMonthly.match(/\d+/g) || [lang === 'ru' ? 120000 : 2500, lang === 'ru' ? 180000 : 4000]).map(Number).slice(0, 2) as [number, number]
                    }
                    onChange={(val) => setFormData({ ...formData, budgetMonthly: lang === 'ru' ? `${val[0]} - ${val[1]} ₽/мес` : `${val[0]} - ${val[1]} $/month` })}
                    formatValue={(val) => lang === 'ru' ? `${val / 1000}k ₽` : `$${val}`}
                    autoAdvance
                />
                <div className="text-center mt-3 text-xs text-emerald-600 font-medium bg-emerald-50 py-1.5 px-3 rounded-full mx-auto w-fit">
                    ✨ {lang === 'ru' ? 'Мы не берем комиссию с зарплаты няни' : 'We take 0% commission from nanny\'s salary'}
                </div>
            </div>

            <div className="sticky bottom-0 z-10 pt-6 pb-6 -mx-2 px-2 sticky-footer-fade mt-8">
                {showAhaMoment && !isFormValid && (
                    <div className="relative mb-3 mx-auto w-[90%] bg-white/90 backdrop-blur-md shadow-xl border border-amber-100 rounded-2xl p-3 animate-slide-up flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={16} className="text-amber-600" />
                        </div>
                        <div className="text-xs text-stone-700 leading-tight">
                            {lang === 'ru' ?
                                <span>В вашем районе уже есть <strong>14 проверенных нянь</strong> с профилем Humanity+. Укажите график и бюджет, чтобы мы их показали.</span> :
                                <span>We found <strong>14 verified nannies</strong> with Humanity+ profile in your area. Add schedule and budget to see them.</span>}
                        </div>
                    </div>
                )}

                <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!isFormValid}
                    pulse={isFormValid}
                >
                    {lang === 'ru' ? 'Осталось 2 шага' : '2 steps left'}
                </Button>
            </div>
        </div>
    );
};
