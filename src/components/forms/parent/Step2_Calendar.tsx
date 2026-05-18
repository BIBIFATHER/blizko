import React from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { useParentForm } from './ParentFormProvider';
import { Button, Input } from '../../UI';
import { AvailabilityCalendar } from '../../AvailabilityCalendar';
import { Language } from '@/core/types';

interface Props {
    lang: Language;
}

export const Step2_Calendar: React.FC<Props> = ({ lang }) => {
    const {
        formData, setFormData,
        selectedSlots, setSelectedSlots,
        nextStep, prevStep
    } = useParentForm();

    const toggleSlot = (dayIndex: number, slotIndex: number) => {
        const key = `${dayIndex}-${slotIndex}`;
        setSelectedSlots((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="animate-fade-in space-y-6 pb-24">
            <div className="wizard-hero-card">
                <div className="wizard-hero-copy">
                    <div className="wizard-kicker">
                        <Clock3 size={14} />
                        {lang === 'ru' ? 'Шаг 2. Ритм семьи' : 'Step 2. Family rhythm'}
                    </div>
                    <div className="space-y-2">
                        <h3 className="wizard-section-title">
                            {lang === 'ru' ? 'Когда вам нужна помощь' : 'When you need help'}
                        </h3>
                        <p className="wizard-section-body">
                            {lang === 'ru'
                                ? 'Чем точнее график, тем меньше случайных рекомендаций. Выберите даты и окна, которые действительно подходят семье.'
                                : 'The clearer your timing, the less random the recommendations. Choose dates and windows that really fit your family.'}
                        </p>
                    </div>
                </div>

                <div className="wizard-inline-proof">
                    <div className="wizard-inline-proof-icon">
                        <CalendarDays size={16} />
                    </div>
                    <div>
                        <div className="wizard-inline-proof-title">
                            {lang === 'ru' ? 'Можно отметить несколько сценариев' : 'You can mark several scenarios'}
                        </div>
                        <div className="wizard-inline-proof-body">
                            {lang === 'ru'
                                ? 'Например, будни днём и отдельные вечерние окна. Это помогает shortlist быть реалистичнее.'
                                : 'For example, weekday daytime and separate evening windows. This helps keep the shortlist realistic.'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="wizard-block space-y-4">
                <div className="section-label">
                    {lang === 'ru' ? 'Календарь' : 'Calendar'}
                </div>

                <div className="text-sm font-semibold text-stone-700">
                    {lang === 'ru' ? 'Календарь бронирования' : 'Availability calendar'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label={lang === 'ru' ? 'Дата начала' : 'Start date'}
                        type="date"
                        value={formData.dateFrom}
                        onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
                    />
                    <Input
                        label={lang === 'ru' ? 'Дата окончания' : 'End date'}
                        type="date"
                        value={formData.dateTo}
                        onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                    />
                </div>
                <AvailabilityCalendar
                    title={lang === 'ru' ? 'Выберите удобные окна' : 'Select preferred slots'}
                    subtitle={lang === 'ru' ? 'Можно отметить несколько слотов в неделю' : 'Mark multiple slots across the week'}
                    statusMap={Object.fromEntries(Object.entries(selectedSlots).map(([k, v]) => [k, v ? 'selected' : 'available']))}
                    onToggle={toggleSlot}
                    legend
                />
            </div>

            <div className="sticky-action-rail sticky-footer-fade flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={nextStep} pulse={true}>
                    {lang === 'ru' ? 'Продолжить к профилю семьи' : 'Continue to family profile'}
                </Button>
            </div>
        </div>
    );
};
