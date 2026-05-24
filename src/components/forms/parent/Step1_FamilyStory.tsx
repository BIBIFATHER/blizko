import React, { useRef } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useParentForm } from './ParentFormProvider';
import { Button } from '../../UI';
import { Language } from '@/core/types';

interface Props {
    lang: Language;
}

const AGE_CHIPS = {
    ru: [
        { label: 'Груднички (0–1)', value: 'Груднички (0-1)' },
        { label: 'Малыши (1–3)',    value: 'Тоддлеры (1-3)' },
        { label: 'Дошкольники (3–6)', value: 'Дошкольники (3-6)' },
        { label: 'Школьники (7+)', value: 'Школьники (7+)' },
    ],
    en: [
        { label: 'Infants (0–1)',    value: 'Infants (0-1)' },
        { label: 'Toddlers (1–3)',   value: 'Toddlers (1-3)' },
        { label: 'Preschool (3–6)', value: 'Preschool (3-6)' },
        { label: 'School (7+)',     value: 'School (7+)' },
    ],
};

const SCHEDULE_CHIPS = {
    ru: [
        { label: 'Дневной',       value: 'День' },
        { label: 'Ночной',        value: 'Ночь' },
        { label: 'Круглосуточно', value: 'Присмотр 24 часа' },
    ],
    en: [
        { label: 'Daytime',  value: 'Day' },
        { label: 'Nighttime', value: 'Night' },
        { label: '24-hour',  value: '24-hour care' },
    ],
};

// Эмоциональные/ситуативные чипы — только добавляют в рассказ (BLI-7)
const STORY_CHIPS = {
    ru: [
        { label: 'Нужна помощь вечером',  phrase: 'нужна помощь вечером' },
        { label: 'Сложный график',         phrase: 'у нас непростой и меняющийся график' },
        { label: 'Важен мягкий подход',    phrase: 'очень важен мягкий и терпеливый характер' },
        { label: 'Ребёнок тревожится',     phrase: 'ребёнок тревожный, нужен спокойный человек' },
        { label: 'Нужен опыт с малышами',  phrase: 'нужен опыт с детьми до 3 лет' },
        { label: 'Важны рекомендации',     phrase: 'важны проверенные рекомендации' },
    ],
    en: [
        { label: 'Help needed evenings',  phrase: 'need help in the evenings' },
        { label: 'Irregular schedule',    phrase: 'we have a complex and changing schedule' },
        { label: 'Gentle approach',       phrase: 'a gentle and patient personality is very important' },
        { label: 'Child gets anxious',    phrase: 'our child gets anxious easily, we need a calm person' },
        { label: 'Infant experience',     phrase: 'experience with children under 3 is essential' },
        { label: 'References required',   phrase: 'verified references are important' },
    ],
};

function appendPhrase(current: string, phrase: string): string {
    const trimmed = current.trim();
    if (!trimmed) return phrase.charAt(0).toUpperCase() + phrase.slice(1);
    if (trimmed.endsWith('.') || trimmed.endsWith(',')) return `${trimmed} ${phrase}`;
    return `${trimmed}, ${phrase}`;
}

export const Step1_FamilyStory: React.FC<Props> = ({ lang }) => {
    const { formData, setFormData, nextStep } = useParentForm();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ru = lang === 'ru';

    const toggleStoryChip = (phrase: string) => {
        setFormData(prev => {
            const already = prev.extraPhrases.includes(phrase);
            return {
                ...prev,
                extraPhrases: already
                    ? prev.extraPhrases.filter(p => p !== phrase)
                    : [...prev.extraPhrases, phrase],
                comment: already ? prev.comment : appendPhrase(prev.comment, phrase),
            };
        });
        textareaRef.current?.focus();
    };

    const selectAge = (value: string) =>
        setFormData(prev => ({ ...prev, childAge: prev.childAge === value ? '' : value }));

    const selectSchedule = (value: string) =>
        setFormData(prev => ({ ...prev, schedule: prev.schedule === value ? '' : value }));

    const isFormValid = formData.comment.trim().length >= 20;

    const placeholder = ru
        ? 'Например: нам нужна няня для дочки 2 лет, 3–4 раза в неделю с утра. Важен опыт с малышами и спокойный характер...'
        : 'For example: we need a nanny for our 2-year-old, 3–4 mornings a week. Experience with toddlers and a calm personality matter most...';

    return (
        <div className="animate-fade-in space-y-6 relative pb-32">
            <div className="wizard-hero-card">
                <div className="wizard-hero-copy">
                    <div className="wizard-kicker">
                        <Sparkles size={14} />
                        {ru ? 'Шаг 1. История семьи' : 'Step 1. Your family story'}
                    </div>
                    <div className="space-y-2">
                        <h3 className="wizard-section-title">
                            {ru ? 'Расскажите, что сейчас нужно семье' : 'Tell us what your family needs'}
                        </h3>
                        <p className="wizard-section-body">
                            {ru
                                ? 'Несколько фраз — и куратор сразу поймёт контекст. Просто расскажите своими словами.'
                                : 'A few sentences and the curator will understand. Just tell us in your own words.'}
                        </p>
                    </div>
                </div>

                <div className="wizard-inline-proof">
                    <div className="wizard-inline-proof-icon">
                        <ShieldCheck size={16} />
                    </div>
                    <div>
                        <div className="wizard-inline-proof-title">
                            {ru ? 'Куратор прочитает лично' : 'A curator reads this personally'}
                        </div>
                        <div className="wizard-inline-proof-body">
                            {ru
                                ? 'Ваш рассказ видит только команда Blizko. Няне передаётся только то, что вы разрешаете.'
                                : 'Your story is visible only to the Blizko team. Only what you allow is shared with nannies.'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Textarea — главный элемент */}
            <section className="wizard-block">
                <label className="ml-1 mb-2 block text-[13px] font-semibold tracking-[0.01em] text-stone-500/90">
                    {ru ? 'Расскажите о ситуации *' : 'Describe your situation *'}
                </label>
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={formData.comment}
                        onChange={e => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder={placeholder}
                        rows={5}
                        className={`input-glass min-h-[130px] w-full resize-none px-4 py-3.5 text-stone-800 placeholder:text-stone-400/70 leading-relaxed ${
                            isFormValid ? 'input-success' : ''
                        }`}
                    />
                    {formData.comment.trim().length > 0 && !isFormValid && (
                        <p className="mt-1.5 ml-1 text-xs text-stone-400">
                            {ru
                                ? `Ещё ${20 - formData.comment.trim().length} симв.`
                                : `${20 - formData.comment.trim().length} more chars`}
                        </p>
                    )}
                </div>

                {/* Story chips — добавляют в textarea */}
                <div className="mt-4 space-y-2">
                    <p className="ml-1 text-xs font-medium text-stone-400">
                        {ru ? 'Быстро добавить в рассказ:' : 'Quick add to your story:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {STORY_CHIPS[lang].map(({ label, phrase }) => {
                            const active = formData.extraPhrases.includes(phrase);
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => toggleStoryChip(phrase)}
                                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm transition-all duration-200 active:scale-95 ${
                                        active
                                            ? 'chip-warm border-transparent'
                                            : 'border-stone-200/60 bg-white/60 text-stone-600 hover:border-amber-200/60 hover:bg-amber-50/50'
                                    }`}
                                >
                                    {active ? '✓ ' : '+ '}{label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Возраст — опционально, помогает с матчингом */}
            <section>
                <div className="section-label mb-2">
                    {ru ? 'Возраст ребёнка' : 'Child age'}
                    <span className="ml-1 text-stone-400 font-normal text-xs">
                        {ru ? '(необязательно)' : '(optional)'}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {AGE_CHIPS[lang].map(({ label, value }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => selectAge(value)}
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

            {/* График — опционально */}
            <section>
                <div className="section-label mb-2">
                    {ru ? 'Нужен график' : 'Schedule needed'}
                    <span className="ml-1 text-stone-400 font-normal text-xs">
                        {ru ? '(необязательно)' : '(optional)'}
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {SCHEDULE_CHIPS[lang].map(({ label, value }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => selectSchedule(value)}
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

            <div className="sticky-action-rail sticky-footer-fade">
                <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!isFormValid}
                    pulse={isFormValid}
                >
                    {ru ? 'Продолжить' : 'Continue'}
                </Button>
            </div>
        </div>
    );
};
