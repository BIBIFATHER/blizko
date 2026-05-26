import React from 'react';
import { Lock, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { useParentForm } from './ParentFormProvider';
import { Button, Input, ChipGroup, RangeSlider, Checkbox } from '../../UI';
import { t } from '@/core/i18n/translations';
import { Language } from '@/core/types';

interface Props {
  lang: Language;
}

export const Step1_Requirements: React.FC<Props> = ({ lang }) => {
  const text = t[lang];
  const {
    formData,
    setFormData,
    citySuggestions,
    showCitySuggestions,
    setShowCitySuggestions,
    detectingLocation,
    detectLocation,
    requirements,
    setRequirements,
    nextStep,
  } = useParentForm();

  const isFormValid =
    formData.city.trim() !== '' &&
    formData.childAge.trim() !== '' &&
    formData.schedule.trim() !== '' &&
    formData.budgetHourly.trim() !== '' &&
    formData.budgetMonthly.trim() !== '';
  const showAhaMoment = formData.city.trim() !== '' && formData.childAge.trim() !== '';

  return (
    <div className="animate-fade-in space-y-6 relative pb-32">
      <div className="wizard-hero-card">
        <div className="wizard-hero-copy">
          <div className="wizard-kicker">
            <Sparkles size={14} />
            {lang === 'ru' ? 'Шаг 1. Основа подбора' : 'Step 1. Match foundation'}
          </div>
          <div className="space-y-2">
            <h3 className="wizard-section-title">
              {lang === 'ru' ? 'Расскажите, кого вы ищете' : 'Tell us who you need'}
            </h3>
            <p className="wizard-section-body">
              {lang === 'ru'
                ? 'Сначала фиксируем город, возраст ребёнка, график и комфортный бюджет — чтобы куратор понял, кого именно искать.'
                : 'We start with city, child age, schedule, and budget — so the curator knows exactly what to look for.'}
            </p>
          </div>
        </div>

        <div className="wizard-inline-proof">
          <div className="wizard-inline-proof-icon">
            <ShieldCheck size={16} />
          </div>
          <div>
            <div className="wizard-inline-proof-title">
              {lang === 'ru' ? 'Подбор не начинается вслепую' : 'Matching does not start blindly'}
            </div>
            <div className="wizard-inline-proof-body">
              {lang === 'ru'
                ? 'Няням будут показаны только релевантные требования, а ваш адрес останется скрытым.'
                : 'Only relevant requirements are shown to nannies, and your address stays private.'}
            </div>
          </div>
        </div>
      </div>

      <section className="wizard-block">
        <div className="section-label">{lang === 'ru' ? 'Основные параметры' : 'Core details'}</div>

        <div className="relative">
          <Input
            label={`${lang === 'ru' ? 'В каком городе вы ищете няню?' : 'Which city are you looking in?'} *`}
            placeholder={lang === 'ru' ? 'Москва, Хамовники' : 'New York, Brooklyn'}
            value={formData.city}
            onChange={(e) => {
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

          <div className="wizard-note mt-3">
            <Lock size={12} className="text-amber-700 mt-0.5 shrink-0" />
            <span>
              {lang === 'ru'
                ? 'Ваш точный адрес видим только менеджеру. Няня получит его только перед выездом.'
                : 'Your exact address is visible only to the manager. Nanny gets it before departure.'}
            </span>
          </div>
        </div>

        <ChipGroup
          label={`${lang === 'ru' ? 'Какой возраст у малыша?' : "What is the child's age?"} *`}
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
      </section>

      <section className="wizard-block">
        <div className="section-label">
          {lang === 'ru' ? 'Финансовые рамки' : 'Financial expectations'}
        </div>
        <div className="flex flex-col gap-2">
          <RangeSlider
            label={`${lang === 'ru' ? 'Допустимая цена за час' : 'Acceptable hourly rate'} *`}
            min={lang === 'ru' ? 300 : 10}
            max={lang === 'ru' ? 1500 : 50}
            step={lang === 'ru' ? 50 : 1}
            value={
              (
                formData.budgetHourly.match(/\d+/g) || [
                  lang === 'ru' ? 600 : 20,
                  lang === 'ru' ? 800 : 30,
                ]
              )
                .map(Number)
                .slice(0, 2) as [number, number]
            }
            onChange={(val) =>
              setFormData({
                ...formData,
                budgetHourly:
                  lang === 'ru' ? `${val[0]} - ${val[1]} ₽/час` : `${val[0]} - ${val[1]} $/hour`,
              })
            }
            formatValue={(val) => (lang === 'ru' ? `${val} ₽` : `$${val}`)}
            autoAdvance
          />
          <RangeSlider
            label={`${lang === 'ru' ? 'Бюджет в месяц' : 'Monthly budget'} *`}
            min={lang === 'ru' ? 50000 : 1000}
            max={lang === 'ru' ? 300000 : 8000}
            step={lang === 'ru' ? 10000 : 100}
            value={
              (
                formData.budgetMonthly.match(/\d+/g) || [
                  lang === 'ru' ? 120000 : 2500,
                  lang === 'ru' ? 180000 : 4000,
                ]
              )
                .map(Number)
                .slice(0, 2) as [number, number]
            }
            onChange={(val) =>
              setFormData({
                ...formData,
                budgetMonthly:
                  lang === 'ru' ? `${val[0]} - ${val[1]} ₽/мес` : `${val[0]} - ${val[1]} $/month`,
              })
            }
            formatValue={(val) => (lang === 'ru' ? `${val / 1000}k ₽` : `$${val}`)}
            autoAdvance
          />
          <div className="wizard-trust-pill">
            <Sparkles size={12} />
            {lang === 'ru'
              ? 'Прозрачные условия без скрытых комиссий'
              : 'Transparent terms with no hidden fees'}
          </div>
        </div>
      </section>

      <section className="wizard-block wizard-block-muted">
        <div className="section-label">{text.importantLabel}</div>
        <ChipGroup
          label={
            lang === 'ru' ? 'Что особенно важно для семьи?' : 'What matters most to your family?'
          }
          options={text.reqOptions}
          selected={requirements}
          onChange={setRequirements}
        />
      </section>

      <div className="wizard-sharing-card">
        <Checkbox
          label={
            lang === 'ru'
              ? 'Делить няню с соседями (Nanny Sharing)'
              : 'Share a nanny with neighbors'
          }
          checked={formData.isNannySharing}
          onChange={(checked) => setFormData({ ...formData, isNannySharing: checked })}
        />
        <p className="text-xs leading-relaxed text-stone-500 sm:pl-9">
          {lang === 'ru'
            ? 'Шеринг — это как каршеринг, только для нянь. Вы делите часы няни с семьёй поблизости и экономите до 50% стоимости.'
            : 'Share a nanny with a nearby family and save up to 50% on costs.'}
        </p>
      </div>

      <div className="sticky-action-rail sticky-footer-fade">
        {showAhaMoment && !isFormValid && (
          <div className="wizard-aha-card animate-slide-up">
            <div className="wizard-aha-icon">
              <Sparkles size={16} className="text-amber-600" />
            </div>
            <div className="text-[11px] text-stone-700 leading-tight">
              {lang === 'ru' ? (
                <span>
                  В вашем районе уже есть <strong>14 проверенных нянь</strong>. Укажите график и
                  бюджет, чтобы мы их показали.
                </span>
              ) : (
                <span>
                  We found <strong>14 verified nannies</strong> in your area. Add schedule and
                  budget to see them.
                </span>
              )}
            </div>
          </div>
        )}

        <Button type="button" onClick={nextStep} disabled={!isFormValid} pulse={isFormValid}>
          {lang === 'ru' ? 'Продолжить к графику и календарю' : 'Continue to schedule and calendar'}
        </Button>
      </div>
    </div>
  );
};
