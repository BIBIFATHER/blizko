import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea, ChipGroup } from './UI';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { ParentRequest, Language } from '../types';
import { ArrowLeft, Upload, MapPin } from 'lucide-react';
import { ParentOfferModal } from './ParentOfferModal';
import { DocumentUploadModal } from './DocumentUploadModal';
import { t } from '../src/core/i18n/translations';

interface ParentFormProps {
  onSubmit: (data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'> & { id?: string; status?: ParentRequest['status'] }) => Promise<void>;
  onBack: () => void;
  lang: Language;
  initialData?: ParentRequest;
}

export const ParentForm: React.FC<ParentFormProps> = ({ onSubmit, onBack, lang, initialData }) => {
  const text = t[lang];
  const [loading, setLoading] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
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

  const [formData, setFormData] = useState({
    city: initialData?.city || '',
    childAge: initialData?.childAge || '',
    schedule: initialData?.schedule || '',
    budgetHourly: parsedBudget.hourly,
    budgetMonthly: parsedBudget.monthly,
    comment: initialData?.comment || '',
    dateFrom: '',
    dateTo: '',
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
    deficitNeeds: initialData?.riskProfile?.deficitNeeds || [],
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
      const day = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][d] || '';
      const slot = ['08–10','10–12','12–14','14–16','16–18','18–20'][s] || '';
      return `${day} ${slot}`;
    }).join(', ');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOffer(true);
  };

  const handleOfferAccept = async () => {
    setShowOffer(false);
    setLoading(true);
    
    try {
      const budget = `за час: ${formData.budgetHourly || '—'}; за месяц: ${formData.budgetMonthly || '—'}`;
      const advancedNotes = `\n\n[Доп. условия]\nКамеры: ${advanced.cameras}; Поездки: ${advanced.travel}; Помощь по дому: ${advanced.household}; Дом.животные: ${advanced.pets}; Ночь: ${advanced.night}`;
      const calendarNotes = `\n\n[Календарь]\nДиапазон: ${formData.dateFrom || '—'} → ${formData.dateTo || '—'}\nСлоты: ${summarizeSlots() || '—'}`;

      await onSubmit({
        city: formData.city,
        childAge: formData.childAge,
        schedule: formData.schedule,
        budget,
        comment: `${formData.comment || ''}${advancedNotes}${calendarNotes}`.trim(),
        requirements,
        documents,
        riskProfile,
        id: initialData?.id,
        status: initialData?.status,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      alert(lang === 'ru' ? 'Геолокация не поддерживается браузером' : 'Geolocation is not supported');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=${lang}`;
          const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
          const data = await r.json().catch(() => null);

          const city = data?.address?.city || data?.address?.town || data?.address?.village || '';
          const district = data?.address?.suburb || data?.address?.city_district || data?.address?.neighbourhood || '';
          const value = [city, district].filter(Boolean).join(', ');

          setFormData((prev) => ({ ...prev, city: value || prev.city }));
          if (!value) {
            alert(lang === 'ru' ? 'Не удалось определить город/район автоматически' : 'Could not detect city/district automatically');
          }
        } catch {
          alert(lang === 'ru' ? 'Ошибка при определении местоположения' : 'Location detection failed');
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        setDetectingLocation(false);
        alert(lang === 'ru' ? 'Нет доступа к геолокации' : 'Location permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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

  return (
    <div className="animate-slide-up">
      <button onClick={onBack} className="text-stone-400 hover:text-stone-800 mb-6 flex items-center gap-2">
        <ArrowLeft size={20} /> {text.back}
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">{initialData ? 'Редактировать заявку' : text.pFormTitle}</h2>
        <p className="text-stone-500">{initialData ? 'Обновите данные вашей заявки' : text.pFormSubtitle}</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="relative">
          <Input 
            label={text.cityLabel}
            placeholder={lang === 'ru' ? "Москва, Хамовники" : "New York, Brooklyn"} 
            value={formData.city}
            onChange={e => {
              setFormData({...formData, city: e.target.value});
              setShowCitySuggestions(true);
            }}
            required
          />

          {showCitySuggestions && citySuggestions.length > 0 && (
            <div className="mt-1 border border-stone-200 rounded-lg bg-white shadow-sm max-h-40 overflow-auto">
              {citySuggestions.map((s, i) => (
                <button
                  key={`${s}-${i}`}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, city: s }));
                    setShowCitySuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50"
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
            className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ${detectingLocation ? 'bg-stone-100 text-stone-400' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
          >
            <MapPin size={14} />
            {detectingLocation
              ? (lang === 'ru' ? 'Определяем...' : 'Detecting...')
              : (lang === 'ru' ? 'Определить местоположение' : 'Detect location')}
          </button>
        </div>

        <ChipGroup 
          label={text.childAgeLabel}
          options={text.ageOptions}
          selected={formData.childAge ? [formData.childAge] : []}
          onChange={(s) => setFormData({...formData, childAge: s[0] || ''})}
          single
        />

        <ChipGroup 
          label={text.scheduleLabel}
          options={text.scheduleOptions}
          selected={formData.schedule ? [formData.schedule] : []}
          onChange={(s) => setFormData({...formData, schedule: s[0] || ''})}
          single
        />

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input 
            label={lang === 'ru' ? 'Цена за час' : 'Price per hour'}
            placeholder={lang === 'ru' ? '600 - 800 ₽/час' : '20 - 30 $/hour'}
            value={formData.budgetHourly}
            onChange={e => setFormData({...formData, budgetHourly: e.target.value})}
            required
          />
          <Input 
            label={lang === 'ru' ? 'Цена за месяц' : 'Price per month'}
            placeholder={lang === 'ru' ? '120 000 - 180 000 ₽/мес' : '2500 - 4000 $/month'}
            value={formData.budgetMonthly}
            onChange={e => setFormData({...formData, budgetMonthly: e.target.value})}
            required
          />
        </div>

        <ChipGroup 
          label={text.importantLabel}
          options={text.reqOptions}
          selected={requirements}
          onChange={setRequirements}
        />

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
          <div className="text-xs font-semibold text-violet-700 mb-2">Дополнительные параметры</div>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select className="text-xs border rounded px-2 py-2" value={advanced.cameras} onChange={(e) => setAdvanced((p) => ({ ...p, cameras: e.target.value }))}>
              <option value="ok">Камеры: допустимо</option>
              <option value="not_ok">Камеры: нежелательно</option>
            </select>
            <select className="text-xs border rounded px-2 py-2" value={advanced.travel} onChange={(e) => setAdvanced((p) => ({ ...p, travel: e.target.value }))}>
              <option value="no">Поездки: не нужны</option>
              <option value="yes">Поездки: возможны</option>
            </select>
            <select className="text-xs border rounded px-2 py-2" value={advanced.household} onChange={(e) => setAdvanced((p) => ({ ...p, household: e.target.value }))}>
              <option value="light">Дом: только легкая помощь</option>
              <option value="none">Дом: не требуется</option>
              <option value="extended">Дом: расширенная помощь</option>
            </select>
            <select className="text-xs border rounded px-2 py-2" value={advanced.pets} onChange={(e) => setAdvanced((p) => ({ ...p, pets: e.target.value }))}>
              <option value="has_pets">Дома есть животные</option>
              <option value="no_pets">Животных нет</option>
            </select>
            <select className="text-xs border rounded px-2 py-2" value={advanced.night} onChange={(e) => setAdvanced((p) => ({ ...p, night: e.target.value }))}>
              <option value="sometimes">Ночные смены: иногда</option>
              <option value="no">Ночные смены: не нужны</option>
              <option value="yes">Ночные смены: да</option>
            </select>
          </div>
        </div>

        <Textarea 
          label={text.commentLabel}
          placeholder={lang === 'ru' ? "Например: у нас есть кот..." : "Example: we have a cat..."}
          value={formData.comment}
          onChange={e => setFormData({...formData, comment: e.target.value})}
        />

        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-3">
          <div className="text-sm font-semibold text-violet-800">Психологический профиль семьи (для лучшего мэтчинга)</div>

          <label className="block text-xs text-stone-600">Стиль семьи</label>
          <select
            className="w-full text-sm border border-violet-200 rounded-lg px-2 py-2 bg-white"
            value={riskProfile?.familyStyle || 'balanced'}
            onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), familyStyle: e.target.value as any }))}
          >
            <option value="warm">Мягкий, эмпатичный</option>
            <option value="structured">Структурный, с правилами</option>
            <option value="balanced">Баланс</option>
          </select>

          <label className="block text-xs text-stone-600">Как ребёнок реагирует на стресс?</label>
          <select
            className="w-full text-sm border border-violet-200 rounded-lg px-2 py-2 bg-white"
            value={riskProfile?.childStress || 'tantrum'}
            onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), childStress: e.target.value as any }))}
          >
            <option value="cry">Плачет и ищет поддержку</option>
            <option value="withdraw">Замыкается</option>
            <option value="aggressive">Злится/агрессия</option>
            <option value="tantrum">Истерики</option>
          </select>

          <ChipGroup
            label={lang === 'ru' ? 'Триггеры ребёнка (выберите 1–3)' : 'Child triggers (1–3)'}
            options={lang === 'ru' ? ['Шум', 'Смена режима', 'Новые люди', 'Запреты', 'Усталость'] : ['Noise', 'Routine changes', 'New people', 'Restrictions', 'Fatigue']}
            selected={riskProfile?.triggers || []}
            onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), triggers: list }))}
          />

          <label className="block text-xs text-stone-600">Комфортный стиль няни</label>
          <select
            className="w-full text-sm border border-violet-200 rounded-lg px-2 py-2 bg-white"
            value={riskProfile?.nannyStylePreference || 'gentle'}
            onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), nannyStylePreference: e.target.value as any }))}
          >
            <option value="gentle">Мягкая и спокойная</option>
            <option value="strict">Структурная/строгая</option>
            <option value="playful">Игровая и творческая</option>
          </select>

          <label className="block text-xs text-stone-600">Коммуникация от няни</label>
          <select
            className="w-full text-sm border border-violet-200 rounded-lg px-2 py-2 bg-white"
            value={riskProfile?.communicationPreference || 'regular'}
            onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), communicationPreference: e.target.value as any }))}
          >
            <option value="minimal">Минимум сообщений</option>
            <option value="regular">Регулярно (2–3 апдейта)</option>
            <option value="frequent">Часто в течение дня</option>
          </select>

          <ChipGroup
            label={lang === 'ru' ? 'Чего не хватает семье' : 'What family needs more of'}
            options={lang === 'ru' ? ['Спокойствие', 'Структура', 'Игра', 'Обучение', 'Активность'] : ['Calm', 'Structure', 'Play', 'Learning', 'Activity']}
            selected={riskProfile?.deficitNeeds || []}
            onChange={(list) => setRiskProfile((prev) => ({ ...(prev || {}), deficitNeeds: list }))}
          />

          <label className="block text-xs text-stone-600">Стиль общения (PCM)</label>
          <select
            className="w-full text-sm border border-violet-200 rounded-lg px-2 py-2 bg-white"
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

          <div className="text-[11px] text-stone-500">Подскажем няню со схожим стилем общения.</div>

          <label className="block text-xs text-stone-600">Что важнее в стиле няни?</label>
          <select
            className="w-full text-sm border border-violet-200 rounded-lg px-2 py-2 bg-white"
            value={riskProfile?.priorityStyle || 'balanced'}
            onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), priorityStyle: e.target.value as any }))}
          >
            <option value="warmth">Теплый контакт и эмпатия</option>
            <option value="discipline">Дисциплина и четкие правила</option>
            <option value="balanced">Баланс</option>
          </select>

          <label className="block text-xs text-stone-600">Какой формат фото/видео-отчётности комфортен?</label>
          <select
            className="w-full text-sm border border-violet-200 rounded-lg px-2 py-2 bg-white"
            value={riskProfile?.reportingFrequency || '2_3_times'}
            onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), reportingFrequency: e.target.value as any }))}
          >
            <option value="daily">Итоговый отчёт в конце дня</option>
            <option value="2_3_times">2–3 коротких апдейта в день</option>
            <option value="frequent">Частые апдейты по ходу дня</option>
          </select>

          <label className="block text-xs text-stone-600">Готовность доверять решениям няни (1–5)</label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={riskProfile?.trustLevel || 3}
            onChange={(e) => setRiskProfile((prev) => ({ ...(prev || {}), trustLevel: Number(e.target.value) as 1|2|3|4|5 }))}
            className="w-full"
          />
          <div className="text-[11px] text-stone-500">Текущее значение: {riskProfile?.trustLevel || 3}</div>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-stone-600">
              {lang === 'ru' ? `Документы: ${documents.length}` : `Documents: ${documents.length}`}
            </div>
            <button
              type="button"
              onClick={() => setShowDocUpload(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 flex items-center gap-1"
            >
              <Upload size={14} /> {lang === 'ru' ? 'Загрузить документ' : 'Upload document'}
            </button>
          </div>
        </div>

        <Button
          type="button"
          isLoading={loading}
          className="mt-8"
          disabled={initialData?.status === 'approved'}
          onClick={() => setShowOffer(true)}
        >
          {initialData?.status === 'approved'
            ? 'Редактирование заблокировано (заявка одобрена)'
            : loading
            ? (lang === 'ru' ? 'AI подбирает няню...' : 'AI is searching...')
            : text.submitParent}
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
          onVerify={(doc) => setDocuments((prev) => [...prev, doc])}
          lang={lang}
        />
      )}
    </div>
  );
};