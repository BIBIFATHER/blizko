import React, { useRef } from 'react';
import { MapPin, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { useParentForm } from './ParentFormProvider';
import { Button, Input } from '../../UI';
import { Language } from '@/core/types';

interface Props {
    lang: Language;
}

// Chips that populate childAge (for matching) AND append to the story
const AGE_CHIPS = {
    ru: [
        { label: 'Груднички (0–1)', value: 'Груднички (0-1)', phrase: 'у нас грудничок' },
        { label: 'Тоддлеры (1–3)', value: 'Тоддлеры (1-3)',  phrase: 'ребёнку 1–3 года' },
        { label: 'Дошкольники (3–6)', value: 'Дошкольники (3-6)', phrase: 'ребёнок дошкольного возраста' },
        { label: 'Школьники (7+)', value: 'Школьники (7+)',  phrase: 'школьник 7+ лет' },
    ],
    en: [
        { label: 'Infants (0–1)',   value: 'Infants (0-1)',    phrase: 'our child is an infant' },
        { label: 'Toddlers (1–3)', value: 'Toddlers (1-3)',   phrase: 'our child is a toddler' },
        { label: 'Preschool (3–6)', value: 'Preschool (3-6)', phrase: 'our child is preschool age' },
        { label: 'School (7+)',    value: 'School (7+)',      phrase: 'school-age child 7+' },
    ],
};

// Chips that populate schedule (for matching) AND append to the story
const SCHEDULE_CHIPS = {
    ru: [
        { label: 'Дневной',      value: 'День',               phrase: 'нужна днём' },
        { label: 'Ночной',       value: 'Ночь',               phrase: 'нужна на ночь' },
        { label: 'Круглосуточно', value: 'Присмотр 24 часа',  phrase: 'нужен присмотр 24 часа' },
    ],
    en: [
        { label: 'Daytime',     value: 'Day',          phrase: 'daytime care needed' },
        { label: 'Nighttime',   value: 'Night',        phrase: 'nighttime care needed' },
        { label: '24-hour',     value: '24-hour care', phrase: '24-hour care needed' },
    ],
};

// Freeform extras — only append to story, no structured field
const EXTRA_CHIPS = {
    ru: [
        { label: '3 дня в нед.',      phrase: '3 раза в неделю' },
        { label: 'Каждый день',       phrase: 'каждый день' },
        { label: 'Только утром',      phrase: 'только утром' },
        { label: 'Вечером',           phrase: 'вечером после садика' },
        { label: 'Опыт с грудничками', phrase: 'нужен опыт с грудничками' },
        { label: 'Монтессори',        phrase: 'желателен монтессори подход' },
        { label: 'Английский',        phrase: 'знание английского приветствуется' },
        { label: 'С поездками',       phrase: 'готова ездить с семьёй' },
    ],
    en: [
        { label: '3x/week',       phrase: '3 days per week' },
        { label: 'Daily',         phrase: 'every day' },
        { label: 'Mornings',      phrase: 'mornings only' },
        { label: 'Afterschool',   phrase: 'after school pickup' },
        { label: 'Infant exp.',   phrase: 'experience with infants required' },
        { label: 'Montessori',    phrase: 'Montessori approach preferred' },
        { label: 'English',       phrase: 'English-speaking preferred' },
        { label: 'Travel',        phrase: 'willing to travel with the family' },
    ],
};

function appendPhrase(current: string, phrase: string): string {
    const trimmed = current.trim();
    if (!trimmed) return phrase.charAt(0).toUpperCase() + phrase.slice(1);
    if (trimmed.endsWith('.') || trimmed.endsWith(',')) return `${trimmed} ${phrase}`;
    return `${trimmed}, ${phrase}`;
}

export const Step1_FamilyStory: React.FC<Props> = ({ lang }) => {
    const {
        formData, setFormData,
        citySuggestions,
        showCitySuggestions, setShowCitySuggestions,
        detectingLocation, detectLocation,
        nextStep,
    } = useParentForm();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ru = lang === 'ru';

    const selectAge = (value: string, phrase: string) => {
        setFormData(prev => ({
            ...prev,
            childAge: value,
            comment: appendPhrase(prev.comment, phrase),
        }));
        textareaRef.current?.focus();
    };

    const selectSchedule = (value: string, phrase: string) => {
        setFormData(prev => ({
            ...prev,
            schedule: value,
            comment: appendPhrase(prev.comment, phrase),
        }));
        textareaRef.current?.focus();
    };

    const appendExtra = (phrase: string) => {
        setFormData(prev => ({ ...prev, comment: appendPhrase(prev.comment, phrase) }));
        textareaRef.current?.focus();
    };

    const isFormValid =
        formData.comment.trim().length >= 20 &&
        formData.city.trim() !== '' &&
        formData.childAge.trim() !== '' &&
        formData.schedule.trim() !== '';

    const placeholder = ru
        ? 'Например: нам нужна няня для дочки 2 лет, 3–4 раза в неделю с утра. Важен опыт с детьми до 3 лет и спокойный характер...'
        : 'For example: we need a nanny for our 2-year-old daughter, 3–4 mornings a week. Experience with toddlers and a calm personality are important...';

    const ageChips     = AGE_CHIPS[lang];
    const schedChips   = SCHEDULE_CHIPS[lang];
    const extraChips   = EXTRA_CHIPS[lang];

    return (
        <div className="animate-fade-in space-y-6 relative pb-24">
            <div className="wizard-hero-card">
                <div className="wizard-hero-copy">
                    <div className="wizard-kicker">
                        <Sparkles size={14} />
                        {ru ? 'Шаг 1. История семьи' : 'Step 1. Your family story'}
                    </div>
                    <div className="space-y-2">
                        <h3 className="wizard-section-title">
                            {ru ? 'Расскажите о вашей семье' : 'Tell us about your family'}
                        </h3>
                        <p className="wizard-section-body">
                            {ru
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
                            {ru ? 'Ваша история остаётся приватной' : 'Your story stays private'}
                        </div>
                        <div className="wizard-inline-proof-body">
                            {ru
                                ? 'Личные данные видит только команда Blizko. Няне передаётся только то, что вы разрешаете.'
                                : 'Personal details are visible only to the Blizko team. Only what you allow is shared with nannies.'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Age — sets childAge + appends to story */}
            <section className="wizard-block">
                <div className="section-label">{ru ? 'Возраст ребёнка *' : 'Child age *'}</div>
                <div className="grid grid-cols-1 gap-2">
                    {ageChips.map(({ label, value, phrase }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => selectAge(value, phrase)}
                            className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 active:scale-95 ${
                                formData.childAge === value
                                    ? 'chip-warm shadow-sm'
                                    : 'bg-white/60 backdrop-blur-sm border-stone-200/60 text-stone-600 hover:border-amber-200/60 hover:bg-amber-50/30'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Schedule — sets schedule + appends to story */}
            <section className="wizard-block">
                <div className="section-label">{ru ? 'Нужен график *' : 'Schedule needed *'}</div>
                <div className="grid grid-cols-1 gap-2">
                    {schedChips.map(({ label, value, phrase }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => selectSchedule(value, phrase)}
                            className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 active:scale-95 ${
                                formData.schedule === value
                                    ? 'chip-warm shadow-sm'
                                    : 'bg-white/60 backdrop-blur-sm border-stone-200/60 text-stone-600 hover:border-amber-200/60 hover:bg-amber-50/30'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Main freeform textarea */}
            <section className="wizard-block">
                <label className="ml-1 mb-2 block text-[13px] font-semibold tracking-[0.01em] text-stone-500/90">
                    {ru ? 'О семье и пожеланиях *' : 'About your family and needs *'}
                </label>

                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={formData.comment}
                        onChange={e => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder={placeholder}
                        rows={5}
                        className={`input-glass min-h-[130px] w-full resize-none px-4 py-3.5 text-stone-800 placeholder:text-stone-400/70 leading-relaxed ${
                            formData.comment.trim().length >= 20 ? 'input-success' : ''
                        }`}
                    />
                    {formData.comment.trim().length > 0 && formData.comment.trim().length < 20 && (
                        <p className="mt-1.5 ml-1 text-xs text-stone-400">
                            {ru
                                ? `Ещё ${20 - formData.comment.trim().length} симв.`
                                : `${20 - formData.comment.trim().length} more chars`}
                        </p>
                    )}
                </div>

                {/* Extra prompt chips — append to story only */}
                <div className="mt-4 space-y-2">
                    <p className="ml-1 text-xs font-medium text-stone-400">
                        {ru ? 'Добавить в описание:' : 'Add to description:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {extraChips.map(({ label, phrase }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => appendExtra(phrase)}
                                className="rounded-full border border-stone-200/60 bg-white/60 px-3.5 py-1.5 text-xs font-medium text-stone-600 backdrop-blur-sm transition-all duration-200 hover:border-amber-200/60 hover:bg-amber-50/50 active:scale-95"
                            >
                                + {label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* City — needed for geographic matching */}
            <section className="wizard-block">
                <div className="section-label">{ru ? 'Район поиска' : 'Location'}</div>

                <div className="relative">
                    <Input
                        label={`${ru ? 'Город или район' : 'City or district'} *`}
                        placeholder={ru ? 'Москва, Хамовники' : 'New York, Brooklyn'}
                        value={formData.city}
                        onChange={e => {
                            setFormData(prev => ({ ...prev, city: e.target.value }));
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
                            ? (ru ? 'Определяем...' : 'Detecting...')
                            : (ru ? 'Определить местоположение' : 'Detect location')}
                    </button>

                    <div className="wizard-note mt-3">
                        <Lock size={12} className="text-amber-700 mt-0.5 shrink-0" />
                        <span>{ru ? 'Ваш точный адрес видим только менеджеру.' : 'Your exact address is visible only to the manager.'}</span>
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
                    {ru ? 'Продолжить' : 'Continue'}
                </Button>
                {!isFormValid && (formData.childAge === '' || formData.schedule === '') && formData.comment.trim().length >= 20 && (
                    <p className="mt-2 text-center text-xs text-stone-400">
                        {ru
                            ? `Выберите ${formData.childAge === '' ? 'возраст' : ''}${formData.childAge === '' && formData.schedule === '' ? ' и ' : ''}${formData.schedule === '' ? 'график' : ''}`
                            : `Select ${formData.childAge === '' ? 'age' : ''}${formData.childAge === '' && formData.schedule === '' ? ' and ' : ''}${formData.schedule === '' ? 'schedule' : ''}`}
                    </p>
                )}
            </div>

        </div>
    );
};
