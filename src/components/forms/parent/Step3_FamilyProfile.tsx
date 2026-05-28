import React, { useState } from 'react';
import { useParentForm } from './ParentFormProvider';
import { Button, ChipGroup, Card, RangeSlider, Checkbox } from '../../UI';
import { DocumentUploadModal } from '../../DocumentUploadModal';
import { t } from '@/core/i18n/translations';
import { Language, ParentRiskProfile } from '@/core/types';
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  HeartHandshake,
  Sparkles,
  Upload,
} from 'lucide-react';

interface Props {
  lang: Language;
  onFinalSubmit: () => void;
  loading: boolean;
}

// Maps display labels to enum values for ChipGroup.
// ChipGroup stores/returns the label string; we convert at boundary.
function useEnumChip<T extends string>(
  options: { label: string; value: T }[],
  selected: T | undefined,
  onChange: (value: T) => void,
) {
  const selectedLabel = selected ? (options.find((o) => o.value === selected)?.label ?? '') : '';
  return {
    chipOptions: options.map((o) => o.label),
    chipSelected: selectedLabel ? [selectedLabel] : [],
    chipOnChange: (labels: string[]) => {
      const found = options.find((o) => o.label === labels[0]);
      if (found) onChange(found.value);
    },
  };
}

export const Step3_FamilyProfile: React.FC<Props> = ({ lang, onFinalSubmit, loading }) => {
  const text = t[lang];
  const {
    formData,
    setFormData,
    advanced,
    setAdvanced,
    documents,
    setDocuments,
    riskProfile,
    setRiskProfile,
    requirements,
    setRequirements,
    prevStep,
    isEditing,
  } = useParentForm();

  const [showDocUpload, setShowDocUpload] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  const ru = lang === 'ru';

  // ── Nanny style ─────────────────────────────────────────────────────────
  const nannyStyleOpts: {
    label: string;
    value: NonNullable<ParentRiskProfile['nannyStylePreference']>;
  }[] = [
    { label: ru ? 'Мягкая и спокойная' : 'Gentle & calm', value: 'gentle' },
    { label: ru ? 'Структурная' : 'Structured', value: 'strict' },
    { label: ru ? 'Игровая' : 'Playful', value: 'playful' },
  ];
  const nannyStyle = useEnumChip(nannyStyleOpts, riskProfile?.nannyStylePreference, (v) =>
    setRiskProfile((prev) => ({ ...(prev ?? {}), nannyStylePreference: v })),
  );

  // ── Family style (optional) ──────────────────────────────────────────────
  const familyStyleOpts: { label: string; value: NonNullable<ParentRiskProfile['familyStyle']> }[] =
    [
      { label: ru ? 'Мягкий, эмпатичный' : 'Gentle, empathetic', value: 'warm' },
      { label: ru ? 'Структурный, с правилами' : 'Structured, rules-based', value: 'structured' },
      { label: ru ? 'Баланс' : 'Balanced', value: 'balanced' },
    ];
  const familyStyle = useEnumChip(familyStyleOpts, riskProfile?.familyStyle, (v) =>
    setRiskProfile((prev) => ({ ...(prev ?? {}), familyStyle: v })),
  );

  // ── Child stress (optional) ──────────────────────────────────────────────
  const childStressOpts: { label: string; value: NonNullable<ParentRiskProfile['childStress']> }[] =
    [
      { label: ru ? 'Ищет поддержку' : 'Seeks support', value: 'cry' },
      { label: ru ? 'Замыкается' : 'Withdraws', value: 'withdraw' },
      { label: ru ? 'Злится' : 'Gets angry', value: 'aggressive' },
      { label: ru ? 'Бурно реагирует' : 'Tantrums', value: 'tantrum' },
    ];
  const childStress = useEnumChip(childStressOpts, riskProfile?.childStress, (v) =>
    setRiskProfile((prev) => ({ ...(prev ?? {}), childStress: v })),
  );

  // ── Communication preference (optional) ─────────────────────────────────
  const commPrefOpts: {
    label: string;
    value: NonNullable<ParentRiskProfile['communicationPreference']>;
  }[] = [
    { label: ru ? 'Минимум' : 'Minimal', value: 'minimal' },
    { label: ru ? 'Регулярно (2–3)' : 'Regular (2–3)', value: 'regular' },
    { label: ru ? 'Часто' : 'Frequent', value: 'frequent' },
  ];
  const commPref = useEnumChip(commPrefOpts, riskProfile?.communicationPreference, (v) =>
    setRiskProfile((prev) => ({ ...(prev ?? {}), communicationPreference: v })),
  );

  const arrChildTriggers = ru
    ? ['Шум', 'Смена режима', 'Новые люди', 'Запреты', 'Усталость']
    : ['Noise', 'Routine changes', 'New people', 'Restrictions', 'Fatigue'];

  const arrNeeds = ru
    ? ['Спокойствие', 'Структура', 'Игра', 'Обучение', 'Активность']
    : ['Calm', 'Structure', 'Play', 'Learning', 'Activity'];

  return (
    <div className="animate-fade-in space-y-6 pb-32">
      <div className="wizard-hero-card">
        <div className="wizard-hero-copy">
          <div className="wizard-kicker">
            <HeartHandshake size={14} />
            {ru ? 'Шаг 3. Последние детали' : 'Step 3. Final details'}
          </div>
          <div className="space-y-2">
            <h3 className="wizard-section-title">
              {ru ? 'Ещё несколько деталей' : 'A few more details'}
            </h3>
            <p className="wizard-section-body">
              {ru
                ? 'Вы рассказали главное. Осталось пара моментов — и мы начнём поиск.'
                : "You've shared the essentials. Just a couple more things — then we'll start the search."}
            </p>
          </div>
        </div>
      </div>

      {/* Бюджет */}
      <section className="wizard-block">
        <div className="section-label mb-3">{ru ? 'Финансовые рамки' : 'Budget'}</div>
        <div className="flex flex-col gap-3">
          <RangeSlider
            label={ru ? 'Цена за час' : 'Hourly rate'}
            min={ru ? 300 : 10}
            max={ru ? 1500 : 50}
            step={ru ? 50 : 1}
            value={
              (formData.budgetHourly.match(/\d+/g) || [ru ? 600 : 20, ru ? 800 : 30])
                .map(Number)
                .slice(0, 2) as [number, number]
            }
            onChange={(val) =>
              setFormData((p) => ({
                ...p,
                budgetHourly: ru ? `${val[0]} - ${val[1]} ₽/час` : `${val[0]} - ${val[1]} $/hour`,
              }))
            }
            formatValue={(val) => (ru ? `${val} ₽` : `$${val}`)}
          />
          <RangeSlider
            label={ru ? 'Бюджет в месяц' : 'Monthly budget'}
            min={ru ? 50000 : 1000}
            max={ru ? 300000 : 8000}
            step={ru ? 10000 : 100}
            value={
              (formData.budgetMonthly.match(/\d+/g) || [ru ? 120000 : 2500, ru ? 180000 : 4000])
                .map(Number)
                .slice(0, 2) as [number, number]
            }
            onChange={(val) =>
              setFormData((p) => ({
                ...p,
                budgetMonthly: ru ? `${val[0]} - ${val[1]} ₽/мес` : `${val[0]} - ${val[1]} $/month`,
              }))
            }
            formatValue={(val) => (ru ? `${Math.round(val / 1000)}k ₽` : `$${val}`)}
          />
          <div className="wizard-trust-pill">
            <Sparkles size={12} />
            {ru ? 'Прозрачные условия без скрытых комиссий' : 'Transparent terms, no hidden fees'}
          </div>
        </div>
      </section>

      {/* Nanny sharing */}
      <div className="wizard-sharing-card">
        <Checkbox
          label={ru ? 'Делить няню с соседями (няня на две семьи)' : 'Share a nanny with neighbors'}
          checked={formData.isNannySharing}
          onChange={(checked) => setFormData((p) => ({ ...p, isNannySharing: checked }))}
        />
        <p className="text-xs leading-relaxed text-stone-500 sm:pl-9">
          {ru
            ? 'Вы можете разделить часы няни с семьёй поблизости и сэкономить до 50%.'
            : 'Share a nanny with a nearby family and save up to 50% on costs.'}
        </p>
      </div>

      {/* Essential matching details */}
      <section className="wizard-block">
        <div className="section-label">{ru ? 'Условия работы' : 'Working conditions'}</div>

        <ChipGroup
          label={ru ? 'Видеонаблюдение' : 'Cameras'}
          options={ru ? ['Да, ок', 'Лучше без камер'] : ['Yes, fine', 'Prefer without']}
          selected={advanced.cameras ? [advanced.cameras] : []}
          onChange={(s) => setAdvanced((p) => ({ ...p, cameras: s[0] || '' }))}
          single
        />
        <ChipGroup
          label={ru ? 'Помощь по дому' : 'Household help'}
          options={ru ? ['Лёгкая', 'Расширенная', 'Не нужна'] : ['Light', 'Extended', 'None']}
          selected={advanced.household ? [advanced.household] : []}
          onChange={(s) => setAdvanced((p) => ({ ...p, household: s[0] || '' }))}
          single
        />
        <ChipGroup
          label={ru ? 'Животные дома' : 'Pets at home'}
          options={ru ? ['Есть', 'Нет'] : ['Yes', 'No']}
          selected={advanced.pets ? [advanced.pets] : []}
          onChange={(s) => setAdvanced((p) => ({ ...p, pets: s[0] || '' }))}
          single
        />
        <ChipGroup
          label={ru ? 'Стиль общения няни' : 'Nanny style'}
          options={nannyStyle.chipOptions}
          selected={nannyStyle.chipSelected}
          onChange={nannyStyle.chipOnChange}
          single
        />
      </section>

      {/* Optional extras — collapsed by default */}
      <section className="wizard-block wizard-block-muted">
        <button
          type="button"
          onClick={() => setShowExtras((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-stone-600"
        >
          <span>{ru ? 'Дополнительно (необязательно)' : 'More details (optional)'}</span>
          {showExtras ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showExtras && (
          <div className="mt-5 space-y-1 animate-fade-in">
            <ChipGroup
              label={ru ? 'Важно для семьи' : 'What matters most'}
              options={text.reqOptions}
              selected={requirements}
              onChange={setRequirements}
            />
            <ChipGroup
              label={ru ? 'Поездки с няней' : 'Travel with nanny'}
              options={ru ? ['Возможны', 'Не нужны'] : ['Possible', 'Not needed']}
              selected={advanced.travel ? [advanced.travel] : []}
              onChange={(s) => setAdvanced((p) => ({ ...p, travel: s[0] || '' }))}
              single
            />
            <ChipGroup
              label={ru ? 'Ночные смены' : 'Night shifts'}
              options={ru ? ['Да', 'Иногда', 'Не нужны'] : ['Yes', 'Sometimes', 'Not needed']}
              selected={advanced.night ? [advanced.night] : []}
              onChange={(s) => setAdvanced((p) => ({ ...p, night: s[0] || '' }))}
              single
            />
            <ChipGroup
              label={ru ? 'Стиль семьи' : 'Family style'}
              options={familyStyle.chipOptions}
              selected={familyStyle.chipSelected}
              onChange={familyStyle.chipOnChange}
              single
            />
            <ChipGroup
              label={ru ? 'Реакция ребёнка на стресс' : 'Child stress response'}
              options={childStress.chipOptions}
              selected={childStress.chipSelected}
              onChange={childStress.chipOnChange}
              single
            />
            <ChipGroup
              label={ru ? 'Триггеры ребёнка' : 'Child triggers'}
              options={arrChildTriggers}
              selected={riskProfile?.triggers || []}
              onChange={(list) => setRiskProfile((prev) => ({ ...(prev ?? {}), triggers: list }))}
            />
            <ChipGroup
              label={ru ? 'Частота сообщений от няни' : 'Nanny check-in frequency'}
              options={commPref.chipOptions}
              selected={commPref.chipSelected}
              onChange={commPref.chipOnChange}
              single
            />
            <ChipGroup
              label={ru ? 'Потребности семьи' : 'Family needs'}
              options={arrNeeds}
              selected={riskProfile?.needs || []}
              onChange={(list) => setRiskProfile((prev) => ({ ...(prev ?? {}), needs: list }))}
            />
          </div>
        )}
      </section>

      {/* Documents — optional */}
      <Card
        className={`transition-all duration-300 ${
          documents.length > 0
            ? 'bg-[#EFF3F2] border-[#2A6B6E]/20'
            : 'bg-white/60 backdrop-blur-md border border-white/60 shadow-sm'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-full shrink-0 ${
              documents.length > 0
                ? 'bg-[#2A6B6E]/10 text-[#2A6B6E]'
                : 'bg-[#EFF3F2] text-[#1C2B2D]/40'
            }`}
          >
            <FileText size={22} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#1C2B2D] mb-1">
              {ru ? 'Договоры и документы' : 'Contracts & documents'}
            </h3>

            {documents.length === 0 && (
              <>
                <p className="text-sm text-[#1C2B2D]/50 mb-3">
                  {ru
                    ? 'Договор или документы для менеджера — по желанию'
                    : 'Contract template or documents for the manager — optional'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowDocUpload(true)}
                  className="flex items-center gap-2 rounded-lg bg-[#EFF3F2] px-4 py-2 text-sm font-medium text-[#2A6B6E] transition-colors hover:bg-[#2A6B6E]/10"
                >
                  <Upload size={15} />
                  {ru ? 'Загрузить' : 'Upload'}
                </button>
              </>
            )}

            {documents.length > 0 && (
              <div className="animate-fade-in space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[#2A6B6E] mb-2">
                  <Check size={15} />
                  {documents.length} {ru ? 'документов загружено' : 'documents uploaded'}
                </div>
                {documents.map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-[#2A6B6E]/10 bg-white/60 p-2"
                  >
                    <span className="text-xs font-semibold text-[#1C2B2D]">
                      {ru ? `Документ ${i + 1}` : `Document ${i + 1}`}
                    </span>
                    <span className="rounded bg-[#EFF3F2] px-1.5 py-0.5 text-[10px] font-bold text-[#2A6B6E]">
                      {ru ? 'Загружен' : 'Uploaded'}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowDocUpload(true)}
                  className="mt-2 text-xs text-[#2A6B6E] underline underline-offset-2"
                >
                  + {ru ? 'Добавить ещё' : 'Add more'}
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="wizard-note-panel text-sm text-[#1C2B2D]/65">
        <div>{text.parentEtaLine}</div>
        <div className="mt-1 text-[#1C2B2D]/40">{text.parentSafetyLine}</div>
      </div>

      <div className="sticky-action-rail sticky-footer-fade flex gap-4">
        <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
          {ru ? 'Назад' : 'Back'}
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={onFinalSubmit}
          isLoading={loading}
          pulse={!loading}
        >
          {isEditing
            ? ru
              ? 'Сохранить изменения'
              : 'Save Changes'
            : ru
              ? 'Начать поиск'
              : 'Start search'}
        </Button>
      </div>

      {showDocUpload && (
        <DocumentUploadModal
          onClose={() => setShowDocUpload(false)}
          onVerify={(doc) => setDocuments((prev) => [...prev, doc])}
          lang={lang}
        />
      )}
    </div>
  );
};
