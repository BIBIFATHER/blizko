import React from 'react';
import { useParentForm } from './ParentFormProvider';
import { Button, Input } from '../../UI';
import { AvailabilityCalendar } from '../../AvailabilityCalendar';
import { t } from '@/core/i18n/translations';
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

    return (
        <div className="animate-fade-in space-y-6">
            <div className="section-label">
                Календарь
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-white/60 shadow-sm rounded-3xl p-4 sm:p-5 space-y-4">
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

            <div className="sticky bottom-0 z-10 flex gap-4 mt-8 pt-6 pb-6 -mx-2 px-2 sticky-footer-fade">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={nextStep} pulse={true}>
                    {lang === 'ru' ? 'Остался 1 шаг' : '1 step left'}
                </Button>
            </div>
        </div>
    );
};
