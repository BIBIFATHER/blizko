import React from 'react';
import { CalendarDays, Clock3, Lock, MapPin } from 'lucide-react';
import { useParentForm } from './ParentFormProvider';
import { Button, Input } from '../../UI';
import { AvailabilityCalendar } from '../../AvailabilityCalendar';
import { Language } from '@/core/types';

interface Props {
  lang: Language;
}

export const Step2_Calendar: React.FC<Props> = ({ lang }) => {
  const {
    formData,
    setFormData,
    selectedSlots,
    setSelectedSlots,
    citySuggestions,
    showCitySuggestions,
    setShowCitySuggestions,
    detectingLocation,
    locationError,
    detectLocation,
    nextStep,
    prevStep,
  } = useParentForm();

  const toggleSlot = (dayIndex: number, slotIndex: number) => {
    const key = `${dayIndex}-${slotIndex}`;
    setSelectedSlots((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="animate-fade-in space-y-6 pb-32">
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
                ? 'Вы уже рассказали о ребёнке — теперь подберём няню под ваш ритм. Выберите даты и окна, которые действительно подходят семье.'
                : "You've told us about your child — now let's find the right schedule. Choose dates and windows that really fit your family."}
            </p>
          </div>
        </div>

        <div className="wizard-inline-proof">
          <div className="wizard-inline-proof-icon">
            <CalendarDays size={16} />
          </div>
          <div>
            <div className="wizard-inline-proof-title">
              {lang === 'ru'
                ? 'Можно отметить несколько сценариев'
                : 'You can mark several scenarios'}
            </div>
            <div className="wizard-inline-proof-body">
              {lang === 'ru'
                ? 'Например, будни днём и отдельные вечерние окна. Это помогает куратору найти подходящий вариант точнее.'
                : 'For example, weekday daytime and separate evening windows. This helps the curator find a better match.'}
            </div>
          </div>
        </div>
      </div>

      {/* Город — переехал сюда из шага 1 (BLI-7) */}
      <section className="wizard-block">
        <div className="section-label mb-3">{lang === 'ru' ? 'Район поиска *' : 'Location *'}</div>
        <div className="relative">
          <Input
            label={lang === 'ru' ? 'Город или район' : 'City or district'}
            placeholder={lang === 'ru' ? 'Москва, Хамовники' : 'New York, Brooklyn'}
            value={formData.city}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, city: e.target.value }));
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
                    setFormData((prev) => ({ ...prev, city: s }));
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
              ? lang === 'ru'
                ? 'Определяем...'
                : 'Detecting...'
              : lang === 'ru'
                ? 'Определить местоположение'
                : 'Detect location'}
          </button>
          {locationError && <p className="mt-2 ml-1 text-xs text-red-500">{locationError}</p>}
          <div className="wizard-note mt-3">
            <Lock size={12} className="text-amber-700 mt-0.5 shrink-0" />
            <span>
              {lang === 'ru'
                ? 'Ваш точный адрес видим только менеджеру.'
                : 'Your exact address is visible only to the manager.'}
            </span>
          </div>
        </div>
      </section>

      <div className="wizard-block space-y-4">
        <div className="section-label">{lang === 'ru' ? 'Календарь' : 'Calendar'}</div>

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
          subtitle={
            lang === 'ru'
              ? 'Можно отметить несколько слотов в неделю'
              : 'Mark multiple slots across the week'
          }
          statusMap={Object.fromEntries(
            Object.entries(selectedSlots).map(([k, v]) => [k, v ? 'selected' : 'available']),
          )}
          onToggle={toggleSlot}
          legend
        />
      </div>

      <div className="sticky-action-rail sticky-footer-fade flex gap-4">
        <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
          {lang === 'ru' ? 'Назад' : 'Back'}
        </Button>
        <Button type="button" className="flex-1" onClick={nextStep} pulse={true}>
          {lang === 'ru' ? 'Продолжить' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};
