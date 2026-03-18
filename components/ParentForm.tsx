import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Textarea, ChipGroup, Badge } from './UI';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { ParentRequest, Language } from '../types';
import { ArrowLeft, Upload, MapPin, ChevronDown, ChevronUp, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ParentOfferModal } from './ParentOfferModal';
import { DocumentUploadModal } from './DocumentUploadModal';
import { t } from '../src/core/i18n/translations';
import { detectUserLocation } from '../services/geolocation';
import {
  trackCTA,
  trackDocumentUploaded,
  trackFormStep,
  trackLocationDetected,
  trackOfferAccepted,
  trackParentFormStarted,
} from '../services/analytics';

interface ParentFormProps {
  onSubmit: (data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'> & { id?: string; status?: ParentRequest['status'] }) => Promise<void>;
  lang: Language;
}

export const ParentForm: React.FC<ParentFormProps> = ({ onSubmit, lang }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialData: ParentRequest | undefined = location.state?.editData;
  const onBack = () => navigate(-1);
  const text = t[lang];
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [trackedMilestones, setTrackedMilestones] = useState<number[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPsychology, setShowPsychology] = useState(false);
  const [advanced, setAdvanced] = useState({
    cameras: 'ok',
    travel: 'no',
    household: 'light',
    pets: 'has_pets',
    night: 'sometimes',
  });

  const parseBudget = (raw?: string) => {
    const text = String(raw || '');
    const hourMatch = text.match(/за час:\s*([^\n;]+)/i);
    const monthMatch = text.match(/за месяц:\s*([^\n;]+)/i);
    return {
      hourly: hourMatch?.[1]?.trim() || '',
      monthly: monthMatch?.[1]?.trim() || '',
    };
  };

  const parsedBudget = parseBudget(initialData?.budget);
  const selectClass = "w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200/50 focus:border-amber-300 transition-all";

  const [formData, setFormData] = useState({
    city: initialData?.city || '',
    district: initialData?.district || '',
    metro: initialData?.metro || '',
    childAge: initialData?.childAge || '',
    schedule: initialData?.schedule || '',
    budgetHourly: parsedBudget.hourly,
    budgetMonthly: parsedBudget.monthly,
    comment: initialData?.comment || '',
    dateFrom: '',
    dateTo: '',
    analysisNotes: '',
  });

  const [selectedSlots, setSelectedSlots] = useState<Record<string, boolean>>({});

  const [requirements, setRequirements] = useState<string[]>(initialData?.requirements || []);
  const [documents, setDocuments] = useState(initialData?.documents || []);
  const [riskProfile, setRiskProfile] = useState<ParentRequest['riskProfile']>({
    priorityStyle: initialData?.riskProfile?.priorityStyle || 'balanced',
    reportingFrequency: initialData?.riskProfile?.reportingFrequency || '2_3_times',
    trustLevel: initialData?.riskProfile?.trustLevel || 3,
    familyStyle: initialData?.riskProfile?.familyStyle || 'balanced',
    childStress: initialData?.riskProfile?.childStress || 'tantrum',
    triggers: initialData?.riskProfile?.triggers || [],
    nannyStylePreference: initialData?.riskProfile?.nannyStylePreference || 'gentle',
    communicationPreference: initialData?.riskProfile?.communicationPreference || 'regular',
    needs: initialData?.riskProfile?.needs || [],
    pcmType: initialData?.riskProfile?.pcmType || 'harmonizer',
  });

  const toggleSlot = (dayIndex: number, slotIndex: number) => {
    const key = `${dayIndex}-${slotIndex}`;
    setSelectedSlots((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const summarizeSlots = () => {
    const keys = Object.keys(selectedSlots).filter((k) => selectedSlots[k]);
    if (keys.length === 0) return '';
    return keys.map((k) => {
      const [d, s] = k.split('-').map(Number);
      const day = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][d] || '';
      const slot = ['08–10', '10–12', '12–14', '14–16', '16–18', '18–20'][s] || '';
      return `${day} ${slot}`;
    }).join(', ');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData?.id) {
      void handleOfferAccept();
      return;
    }
    trackCTA('parent_offer_open', initialData ? 'parent_form_edit' : 'parent_form');
    setShowOffer(true);
  };

  const buildParentRequestPayload = () => {
    const budget = `за час: ${formData.budgetHourly || '—'}; за месяц: ${formData.budgetMonthly || '—'}`;
    const advancedNotes = `\n\n[Доп. условия]\nКамеры: ${advanced.cameras}; Поездки: ${advanced.travel}; Помощь по дому: ${advanced.household}; Дом.животные: ${advanced.pets}; Ночь: ${advanced.night}`;
    const calendarNotes = `\n\n[Календарь]\nДиапазон: ${formData.dateFrom || '—'} → ${formData.dateTo || '—'}\nСлоты: ${summarizeSlots() || '—'}`;
    const analysisNotes = formData.analysisNotes?.trim()
      ? `\n\n[Для анализа]\n${formData.analysisNotes.trim()}`
      : '';

    return {
      city: formData.city,
      district: formData.district || undefined,
      metro: formData.metro || undefined,
      childAge: formData.childAge,
      schedule: formData.schedule,
      budget,
      comment: `${formData.comment || ''}${advancedNotes}${calendarNotes}${analysisNotes}`.trim(),
      requirements,
      documents,
      riskProfile,
      id: initialData?.id,
      status: initialData?.status,
    };
  };

  const handleOfferAccept = async () => {
    setLoading(true);
    trackOfferAccepted('parent');

    try {
      const payload = buildParentRequestPayload();
      await onSubmit(payload);
    } catch (e) {
      console.error(e);
      setToast({ message: lang === 'ru' ? 'Не удалось отправить заявку. Попробуйте ещё раз.' : 'Failed to submit. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    const result = await detectUserLocation(lang);

    if (result.success) {
      const value = [result.city, result.district].filter(Boolean).join(', ');
      setFormData((prev) => ({ ...prev, city: value || prev.city }));
      if (value) {
        trackLocationDetected('parent');
      }
      if (!value) {
        setToast({ message: lang === 'ru' ? 'Не удалось определить район автоматически. Введите вручную.' : 'Could not detect location. Please enter manually.', type: 'info' });
      }
    } else if (result.error) {
      setToast({ message: result.error, type: 'error' });
    }

    setDetectingLocation(false);
  };

  useEffect(() => {
    const q = formData.city.trim();
    if (q.length < 3) {
      setCitySuggestions([]);
      return;
    }

    const tmr = setTimeout(async () => {
      try {
        const nr = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5`);
        const nj = await nr.json().catch(() => []);
        const list = (Array.isArray(nj) ? nj : [])
          .map((x: any) => x?.display_name)
          .filter(Boolean)
          .slice(0, 5);

        setCitySuggestions(list);
      } catch {
        setCitySuggestions([]);
      }
    }, 350);

    return () => clearTimeout(tmr);
  }, [formData.city]);

  // Required fields check
  const requiredFilled = formData.city.trim() && formData.childAge && formData.schedule && formData.budgetHourly.trim() && formData.budgetMonthly.trim();

  // Current act for progress dots
  const currentAct = !formData.city.trim() || !formData.childAge || !formData.schedule ? 1 : !formData.budgetHourly.trim() || !formData.budgetMonthly.trim() ? 2 : 3;

  useEffect(() => {
    trackParentFormStarted();
  }, []);

  useEffect(() => {
    const milestones = [
      { threshold: 1, step: 1, label: 'parent_act_1' },
      { threshold: 2, step: 2, label: 'parent_act_2' },
      { threshold: 3, step: 3, label: 'parent_act_3' },
    ];

    milestones.forEach((milestone) => {
      if (currentAct >= milestone.threshold && !trackedMilestones.includes(milestone.threshold)) {
        trackFormStep('parent', milestone.step, milestone.label);
        setTrackedMilestones((prev) => [...prev, milestone.threshold]);
      }
    });
  }, [currentAct, trackedMilestones]);

  const Eyebrow: React.FC<{ step: number; label: string; active: boolean }> = ({ step, label, active }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`w-2 h-2 rounded-full transition-colors ${n === step && active ? 'bg-stone-800' : n < step ? 'bg-stone-300' : 'bg-stone-200'}`}
          />
        ))}
      </div>
      <span className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400">
        {label}
      </span>
    </div>
  );

  return (
    <div className="app-shell animate-fade-in">
      <button onClick={onBack} className="text-stone-400 hover:text-stone-800 mb-5 flex items-center gap-2 transition-colors">
        <ArrowLeft size={18} /> {text.back}
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-stone-900 tracking-[-0.03em]">
          {initialData ? 'Редактировать заявку' : text.pFormTitle}
        </h2>
        <p className="text-sm text-stone-500 mt-1.5 leading-relaxed max-w-sm">
          {initialData
            ? 'Обновите данные вашей заявки'
            : (lang === 'ru'
              ? 'Расскажите о семье — мы подберём 2-3 кандидата с объяснениями, почему они подходят.'
              : 'Tell us about your family — we\'ll find 2-3 candidates with clear reasons why they fit.'
            )}
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">

        {/* Inline toast — Gentler Streak pattern */}
        {toast && (
          <div
            className={`rounded-[16px] px-4 py-3 text-sm flex items-center justify-between animate-fade-in ${
              toast.type === 'error'
                ? 'bg-rose-50 border border-rose-200/60 text-rose-700'
                : 'bg-amber-50 border border-amber-200/60 text-amber-700'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-3 text-stone-400 hover:text-stone-600 shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* ===== Акт 1: О семье ===== */}
        <section className="rounded-[24px] bg-white/95 border border-stone-200/80 shadow-sm p-5">
          <Eyebrow step={1} label={lang === 'ru' ? 'О семье' : 'About your family'} active={currentAct === 1} />

          <div className="space-y-1">
            <div className="relative">
              <Input
                label={`${text.cityLabel} *`}
                placeholder={lang === 'ru' ? "Москва, Хамовники" : "New York, Brooklyn"}
                value={formData.city}
                onChange={e => {
                  setFormData({ ...formData, city: e.target.value });
                  setShowCitySuggestions(true);
                }}
                required
              />

              {showCitySuggestions && citySuggestions.length > 0 && (
                <div className="mt-1 border border-stone-200 rounded-xl bg-white shadow-sm max-h-40 overflow-auto absolute z-10 left-0 right-0">
                  {citySuggestions.map((s, i) => (
                    <button
                      key={`${s}-${i}`}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, city: s }));
                        setShowCitySuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-stone-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={detectLocation}
                disabled={detectingLocation}
                className={`mt-1 mb-3 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ${detectingLocation ? 'bg-stone-100 text-stone-400' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'}`}
              >
                <MapPin size={13} />
                {detectingLocation
                  ? (lang === 'ru' ? 'Определяем...' : 'Detecting...')
                  : (lang === 'ru' ? 'Определить автоматически' : 'Detect location')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={lang === 'ru' ? 'Район' : 'District'}
                placeholder={lang === 'ru' ? 'Хамовники, ЮАО, Бутово...' : 'Brooklyn, Soho...'}
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value })}
              />
              <Input
                label={lang === 'ru' ? 'Ближайшее метро' : 'Nearest metro'}
                placeholder={lang === 'ru' ? 'Парк Культуры' : 'Central Station'}
                value={formData.metro}
                onChange={e => setFormData({ ...formData, metro: e.target.value })}
              />
            </div>

            <ChipGroup
              label={`${text.childAgeLabel} *`}
              options={text.ageOptions}
              selected={formData.childAge ? [formData.childAge] : []}
              onChange={(s) => setFormData({ ...formData, childAge: s[0] || '' })}
              single
            />

            <ChipGroup
              label={`${text.scheduleLabel} *`}
              options={text.scheduleOptions}
              selected={formData.schedule ? [formData.schedule] : []}
              onChange={(s) => setFormData({ ...formData, schedule: s[0] || '' })}
              single
            />
          </div>
        </section>

        {/* ===== Акт 2: Условия и бюджет ===== */}
        <section className="rounded-[24px] bg-white/95 border border-stone-200/80 shadow-sm p-5">
          <Eyebrow step={2} label={lang === 'ru' ? 'Условия и бюджет' : 'Terms & budget'} active={currentAct === 2} />

          <div className="space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={`${lang === 'ru' ? 'Цена за час' : 'Price per hour'} *`}
                placeholder={lang === 'ru' ? '600 - 800 ₽/час' : '20 - 30 $/hour'}
                value={formData.budgetHourly}
                onChange={e => setFormData({ ...formData, budgetHourly: e.target.value })}
                required
              />
              <Input
                label={`${lang === 'ru' ? 'Цена за месяц' : 'Price per month'} *`}
                placeholder={lang === 'ru' ? '120 000 - 180 000 ₽/мес' : '2500 - 4000 $/month'}
                value={formData.budgetMonthly}
                onChange={e => setFormData({ ...formData, budgetMonthly: e.target.value })}
                required
              />
            </div>

            {/* Additional params */}
            <div className="rounded-[16px] bg-stone-50/90 border border-stone-200/70 p-4 space-y-2">
              <div className="text-[12px] font-semibold text-stone-500 mb-1">
                {lang === 'ru' ? 'Дополнительные условия' : 'Additional conditions'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select className={selectClass} value={advanced.cameras} onChange={(e) => setAdvanced((p) => ({ ...p, cameras: e.target.value }))}>
                  <option value="ok">Камеры: допустимо</option>
                  <option value="not_ok">Камеры: нежелательно</option>
                </select>
                <select className={selectClass} value={advanced.travel} onChange={(e) => setAdvanced((p) => ({ ...p, travel: e.target.value }))}>
                  <option value="no">Поездки: не нужны</option>
                  <option value="yes">Поездки: возможны</option>
                </select>
                <select className={selectClass} value={advanced.household} onChange={(e) => setAdvanced((p) => ({ ...p, household: e.target.value }))}>
                  <option value="light">Дом: только легкая помощь</option>
                  <option value="none">Дом: не требуется</option>
                  <option value="extended">Дом: расширенная помощь</option>
                </select>
                <select className={selectClass} value={advanced.pets} onChange={(e) => setAdvanced((p) => ({ ...p, pets: e.target.value }))}>
                  <option value="has_pets">Дома есть животные</option>
                  <option value="no_pets">Животных нет</option>
                </select>
                <select className={selectClass} value={advanced.night} onChange={(e) => setAdvanced((p) => ({ ...p, night: e.target.value }))}>
                  <option value="sometimes">Ночные смены: иногда</option>
                  <option value="no">Ночные смены: не нужны</option>
                  <option value="yes">Ночные смены: да</option>
                </select>
              </div>
            </div>

            {/* Calendar — collapsed by default */}
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between rounded-[16px] bg-stone-50/90 border border-stone-200/70 px-4 py-3 text-sm text-stone-600 font-medium hover:bg-stone-100/70 transition-colors"
            >
              <span>{lang === 'ru' ? '📅 Добавить расписание' : '📅 Add schedule'}</span>
              {showCalendar ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showCalendar && (
              <div className="rounded-[16px] bg-white border border-stone-200/70 p-4 space-y-3 animate-fade-in">
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
            )}

            <Textarea
              label={text.commentLabel}
              placeholder={lang === 'ru' ? "Например: у нас есть кот, ребёнок засыпает с книгой..." : "Example: we have a cat, the child falls asleep with a book..."}
              value={formData.comment}
              onChange={e => setFormData({ ...formData, comment: e.target.value })}
            />
          </div>
        </section>

        {/* ===== Акт 3: Для точного подбора (optional) ===== */}
        <section className="rounded-[24px] bg-white/95 border border-stone-200/80 shadow-sm p-5">
          <Eyebrow step={3} label={lang === 'ru' ? 'Для точного подбора' : 'For precise matching'} active={currentAct === 3} />

          <button
            type="button"
            onClick={() => setShowPsychology(!showPsychology)}
            className="w-full flex items-center justify-between rounded-[16px] bg-violet-50/80 border border-violet-200/60 px-4 py-3 text-sm text-violet-700 font-medium hover:bg-violet-100/60 transition-colors mb-3"
          >
            <span>{lang === 'ru' ? '🧠 Психологический профиль семьи' : '🧠 Family psychology profile'}</span>
            {showPsychology ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showPsychology && (
            <div className="rounded-[16px] bg-violet-50/50 border border-violet-200/40 p-4 space-y-3 animate-fade-in mb-3">
              <div className="text-[11px] text-stone-500 mb-2">
                {lang === 'ru' ? 'Помогает подобрать няню со совместимым стилем общения.' : 'Helps match a nanny with a compatible communication style.'}
              </div>

              <label className="block text-xs text-stone-600">{lang === 'ru' ? 'Стиль семьи' : 'Family style'}</label>
              <select
                className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                value={riskProfile?.familyStyle || 'balanced'}
                onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), familyStyle: e.target.value as any }))}
              >
                <option value="warm">Мягкий, эмпатичный</option>
                <option value="structured">Структурный, с правилами</option>
                <option value="balanced">Баланс</option>
              </select>

              <label className="block text-xs text-stone-600">{lang === 'ru' ? 'Реакция ребёнка на стресс' : 'Child stress reaction'}</label>
              <select
                className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                value={riskProfile?.childStress || 'tantrum'}
                onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), childStress: e.target.value as any }))}
              >
                <option value="cry">Плачет и ищет поддержку</option>
                <option value="withdraw">Замыкается</option>
                <option value="aggressive">Злится/агрессия</option>
                <option value="tantrum">Истерики</option>
              </select>

              <ChipGroup
                label={lang === 'ru' ? 'Триггеры ребёнка (1–3)' : 'Child triggers (1–3)'}
                options={lang === 'ru' ? ['Шум', 'Смена режима', 'Новые люди', 'Запреты', 'Усталость'] : ['Noise', 'Routine changes', 'New people', 'Restrictions', 'Fatigue']}
                selected={riskProfile?.triggers || []}
                onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), triggers: list }))}
              />

              <label className="block text-xs text-stone-600">{lang === 'ru' ? 'Комфортный стиль няни' : 'Preferred nanny style'}</label>
              <select
                className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                value={riskProfile?.nannyStylePreference || 'gentle'}
                onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), nannyStylePreference: e.target.value as any }))}
              >
                <option value="gentle">Мягкая и спокойная</option>
                <option value="strict">Структурная/строгая</option>
                <option value="playful">Игровая и творческая</option>
              </select>

              <label className="block text-xs text-stone-600">{lang === 'ru' ? 'Коммуникация от няни' : 'Communication preference'}</label>
              <select
                className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                value={riskProfile?.communicationPreference || 'regular'}
                onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), communicationPreference: e.target.value as any }))}
              >
                <option value="minimal">Минимум сообщений</option>
                <option value="regular">Регулярно (2–3 апдейта)</option>
                <option value="frequent">Часто в течение дня</option>
              </select>

              <ChipGroup
                label={lang === 'ru' ? 'Потребности семьи' : 'Family needs'}
                options={lang === 'ru' ? ['Спокойствие', 'Структура', 'Игра', 'Обучение', 'Активность'] : ['Calm', 'Structure', 'Play', 'Learning', 'Activity']}
                selected={riskProfile?.needs || []}
                onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), needs: list }))}
              />

              <label className="block text-xs text-stone-600">{lang === 'ru' ? 'Стиль общения (PCM)' : 'Communication style (PCM)'}</label>
              <select
                className={`${selectClass} border-violet-200 focus:ring-violet-200/40`}
                value={riskProfile?.pcmType || 'harmonizer'}
                onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), pcmType: e.target.value as any }))}
              >
                <option value="thinker">Мыслитель — логика, структура</option>
                <option value="persister">Надёжный — ценности, ответственность</option>
                <option value="harmonizer">Тёплый — эмпатия, забота</option>
                <option value="rebel">Игривый — лёгкость, юмор</option>
                <option value="imaginer">Спокойный — тишина, пространство</option>
                <option value="promoter">Действенный — результат, скорость</option>
              </select>
            </div>
          )}

          <Textarea
            label={lang === 'ru' ? 'Что важно знать о ребёнке и семье?' : 'What should we know about your family?'}
            placeholder={lang === 'ru' ? 'Режим, привычки, что недопустимо — всё, что поможет подобрать подходящего кандидата.' : 'Routine, triggers, non-negotiables — anything helping match the right person.'}
            value={formData.analysisNotes}
            onChange={e => setFormData({ ...formData, analysisNotes: e.target.value })}
          />

          <div className="flex items-center justify-between rounded-[16px] bg-stone-50/90 border border-stone-200/70 px-4 py-3">
            <div className="text-sm text-stone-600">
              {lang === 'ru' ? `Документы: ${documents.length}` : `Documents: ${documents.length}`}
            </div>
            <button
              type="button"
              onClick={() => setShowDocUpload(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 flex items-center gap-1"
            >
              <Upload size={13} /> {lang === 'ru' ? 'Загрузить' : 'Upload'}
            </button>
          </div>
        </section>

        {/* ===== What you get ===== */}
        {!initialData && (
          <section className="rounded-[24px] bg-stone-50/95 border border-stone-200/80 p-5 space-y-3">
            <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-stone-400 mb-1">
              {lang === 'ru' ? 'Что вы получите' : 'What you get'}
            </div>
            <div className="space-y-2">
              {(lang === 'ru' ? [
                'Shortlist 2-3 кандидата с объяснениями',
                'Модерация профилей',
                'Поддержка на следующем шаге',
              ] : [
                'Shortlist of 2-3 candidates with explanations',
                'Moderated profiles',
                'Support for the next step',
              ]).map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-stone-600">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-200/60">
              {lang === 'ru' ? 'Бесплатно для родителей' : 'Free for parents'}
            </div>
          </section>
        )}

        {/* ===== Trust Footer ===== */}
        <div className="flex items-center gap-2 px-1">
          <Badge variant="trust"><ShieldCheck size={11} /> {lang === 'ru' ? 'Данные зашифрованы' : 'Data encrypted'}</Badge>
        </div>

        {/* ===== Submit CTA ===== */}
        <Button
          type="button"
          isLoading={loading}
          pulse={!!requiredFilled && !loading}
          disabled={initialData?.status === 'approved'}
          onClick={() => setShowOffer(true)}
          className="!bg-stone-900 !text-white !border-stone-900 hover:!bg-stone-800 shadow-[0_12px_30px_rgba(17,24,39,0.18)]"
        >
          {initialData?.status === 'approved'
            ? (lang === 'ru' ? 'Заявка одобрена' : 'Request approved')
            : loading
              ? (lang === 'ru' ? 'Обрабатываем...' : 'Processing...')
              : (lang === 'ru' ? 'Начать подбор' : 'Start matching')}
        </Button>
      </form>

      {showOffer && (
        <ParentOfferModal
          onClose={() => setShowOffer(false)}
          onAccept={handleOfferAccept}
          lang={lang}
        />
      )}

      {showDocUpload && (
        <DocumentUploadModal
          onClose={() => setShowDocUpload(false)}
          onVerify={(doc) => {
            trackDocumentUploaded('parent', doc.type);
            setDocuments((prev) => [...prev, doc]);
          }}
          lang={lang}
        />
      )}
    </div>
  );
};
