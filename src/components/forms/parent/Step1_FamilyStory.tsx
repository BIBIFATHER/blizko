import React, { useRef } from 'react';
import { MapPin, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { useParentForm } from './ParentFormProvider';
import { Button, Input } from '../../UI';
import { Language } from '@/core/types';

interface Props {
    lang: Language;
}

const PROMPT_CHIPS = {
    ru: [
        { label: 'До года', phrase: 'у нас ребёнок до года' },
        { label: '1–2 года', phrase: 'у нас ребёнок 1–2 лет' },
        { label: '2–4 года', phrase: 'у нас ребёнок 2–4 лет' },
        { label: '4–7 лет', phrase: 'ребёнку 4–7 лет' },
        { label: '7+ лет', phrase: 'школьник 7+' },
        { label: '3 дня в нед.', phrase: '3 раза в неделю' },
        { label: 'Каждый день', phrase: 'каждый день' },
        { label: 'Полный день', phrase: 'на полный день' },
        { label: 'Только утром', phrase: 'только утром' },
        { label: 'Вечером', phrase: 'вечером после садика' },
        { label: 'Опыт с грудничками', phrase: 'нужен опыт с грудничками' },
        { label: 'Монтессори', phrase: 'предпочтительно монтессори подход' },
        { label: 'Английский', phrase: 'знание английского приветствуется' },
        { label: 'С поездками', phrase: 'готова ездить с семьёй' },
    ],
    en: [
        { label: 'Under 1 yr', phrase: 'our child is under 1 year old' },
        { label: '1–2 yrs', phrase: 'our child is 1–2 years old' },
        { label: '2–4 yrs', phrase: 'our child is 2–4 years old' },
        { label: '4–7 yrs', phrase: 'our child is 4–7 years old' },
        { label: '7+ yrs', phrase: 'school-age child 7+' },
        { label: '3x/week', phrase: '3 days per week' },
        { label: 'Daily', phrase: 'every day' },
        { label: 'Full day', phrase: 'full-time' },
        { label: 'Mornings', phrase: 'mornings only' },
        { label: 'Afterschool', phrase: 'after school pickup' },
        { label: 'Infant exp.', phrase: 'experience with infants required' },
        { label: 'Montessori', phrase: 'Montessori approach preferred' },
        { label: 'English', phrase: 'English-speaking preferred' },
        { label: 'Travel', phrase: 'willing to travel with the family' },
    ],
};

export const Step1_FamilyStory: React.FC<Props> = ({ lang }) => {
    const {
        formData, setFormData,
        citySuggestions,
        showCitySuggestions, setShowCitySuggestions,
        detectingLocation, detectLocation,
        nextStep
    } = useParentForm();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chips = PROMPT_CHIPS[lang];

    const appendChip = (phrase: string) => {
        const current = formData.comment.trim();
        const next = current
            ? current.endsWith('.') || current.endsWith(',')
                ? `${current} ${phrase}`
                : `${current}, ${phrase}`
            : phrase.charAt(0).toUpperCase() + phrase.slice(1);
        setFormData({ ...formData, comment: next });
        textareaRef.current?.focus();
    };

    const isFormValid = formData.comment.trim().length >= 20 && formData.city.trim() !== '';

    const placeholder = lang === 'ru'
        ? 'Например: нам нужна няня для дочки 2 лет, 3–4 раза в неделю с утра. Важен опыт с детьми до 3 лет и спокойный характер...'
        : 'For example: we need a nanny for our 2-year-old daughter, 3–4 mornings a week. Experience with toddlers and a calm personality are important...';

    return (
        <div className="animate-fade-in space-y-6 relative pb-24">
            <div className="wizard-hero-card">
                <div className="wizard-hero-copy">
                    <div className="wizard-kicker">
                        <Sparkles size={14} />
                        {lang === 'ru' ? 'Шаг 1. История семьи' : 'Step 1. Your family story'}
                    </div>
                    <div className="space-y-2">
                        <h3 className="wizard-section-title">
                            {lang === 'ru' ? 'Расскажите о вашей семье' : 'Tell us about your family'}
                        </h3>
                        <p className="wizard-section-body">
                            {lang === 'ru'
                                ? 'Несколько фраз о ребёнке, графике и ожиданиях — и команда Blizko сразу понимает, кого вы ищете. Используйте подсказки ниже.'
                                : 'A few sentences about your child, schedule, and expectations — and the Blizko team knows exactly who to find. Use the hints below.'}
                        </p>
                    </div>
                </div>

                <div className="wizard-inline-proof">
                    <div className="wizard-inline-proof-icon">
                        <ShieldCheck size={16} />
                    </div>
                    <div>
                        <div className="wizard-inline-proof-title">
                            {lang === 'ru' ? 'Ваша история остаётся приватной' : 'Your story stays private'}
                        </div>
                        <div className="wizard-inline-proof-body">
                            {lang === 'ru'
                                ? 'Личные данные видит только команда Blizko. Няне передаётся только то, что вы разрешаете.'
                                : 'Personal details are visible only to the Blizko team. Only what you allow is shared with nannies.'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main freeform textarea */}
            <section className="wizard-block">
                <label className="ml-1 mb-2 block text-[13px] font-semibold tracking-[0.01em] text-stone-500/90">
                    {lang === 'ru' ? 'О семье и пожеланиях *' : 'About your family and needs *'}
                </label>

                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={formData.comment}
                        onChange={e => setFormData({ ...formData, comment: e.target.value })}
                        placeholder={placeholder}
                        rows={5}
                        className={`input-glass min-h-[130px] w-full resize-none px-4 py-3.5 text-stone-800 placeholder:text-stone-400/70 leading-relaxed ${
                            formData.comment.trim().length >= 20 ? 'input-success' : ''
                        }`}
                    />
                    {formData.comment.trim().length > 0 && formData.comment.trim().length < 20 && (
                        <p className="mt-1.5 ml-1 text-xs text-stone-400">
                            {lang === 'ru'
                                ? `Ещё ${20 - formData.comment.trim().length} симв.`
                                : `${20 - formData.comment.trim().length} more chars`}
                        </p>
                    )}
                </div>

                {/* Prompt chips */}
                <div className="mt-4 space-y-2">
                    <p className="ml-1 text-xs font-medium text-stone-400">
                        {lang === 'ru' ? 'Добавить в описание:' : 'Add to description:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {chips.map(({ label, phrase }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => appendChip(phrase)}
                                className="rounded-full border border-stone-200/60 bg-white/60 px-3.5 py-1.5 text-xs font-medium text-stone-600 backdrop-blur-sm transition-all duration-200 hover:border-amber-200/60 hover:bg-amber-50/50 active:scale-95"
                            >
                                + {label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* City — still needed for matching */}
            <section className="wizard-block">
                <div className="section-label">{lang === 'ru' ? 'Район поиска' : 'Location'}</div>

                <div className="relative">
                    <Input
                        label={`${lang === 'ru' ? 'Город или район' : 'City or district'} *`}
                        placeholder={lang === 'ru' ? 'Москва, Хамовники' : 'New York, Brooklyn'}
                        value={formData.city}
                        onChange={e => {
                            setFormData({ ...formData, city: e.target.value });
                            setShowCitySuggestions(true);
                        }}
                        required
                        autoAdvance
                    />

                    {showCitySuggestions && citySuggestions.length > 0 && (
                        <div className="wizard-suggestion-panel animate-slide-down">
                            {citySuggestions.map((s, i) => (
                                <button
                                    key={`${s}-${i}`}
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, city: s }));
                                        setShowCitySuggestions(false);
                                    }}
                                    className="w-full text-left rounded-xl px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
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

                    <div className="wizard-note mt-3">
                        <Lock size={12} className="text-amber-700 mt-0.5 shrink-0" />
                        <span>{lang === 'ru' ? 'Ваш точный адрес видим только менеджеру.' : 'Your exact address is visible only to the manager.'}</span>
                    </div>
                </div>
            </section>

            <div className="sticky-action-rail sticky-footer-fade">
                <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!isFormValid}
                    pulse={isFormValid}
                >
                    {lang === 'ru' ? 'Продолжить' : 'Continue'}
                </Button>
            </div>
        </div>
    );
};
