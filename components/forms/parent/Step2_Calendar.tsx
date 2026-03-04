import React from 'react';
import { useParentForm } from './ParentFormProvider';
import { Button, Input } from '../../UI';
import { AvailabilityCalendar } from '../../AvailabilityCalendar';
import { t } from '../../../src/core/i18n/translations';
import { Language } from '../../../types';

interface Props {
    lang: Language;
}

export const Step2_Calendar: React.FC<Props> = ({ lang }) => {
    const text = t[lang];
    const {
        formData, setFormData,
        selectedSlots, setSelectedSlots,
        nextStep, prevStep
    } = useParentForm();

    const toggleSlot = (dayIndex: number, slotIndex: number) => {
        const key = `${dayIndex}-${slotIndex}`;
        setSelectedSlots((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const sectionLabel = "flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400 font-semibold";

    return (
        <div className="animate-fade-in space-y-6">
            <div className={sectionLabel}>
                <span className="h-px flex-1 bg-stone-200/70" />
                Календарь
                <span className="h-px flex-1 bg-stone-200/70" />
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
                <div className="text-sm font-semibold text-stone-700">Календарь бронирования</div>
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

            <div className="flex gap-4 mt-8">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={nextStep}>
                    {lang === 'ru' ? 'Далее' : 'Next'}
                </Button>
            </div>
        </div>
    );
};
