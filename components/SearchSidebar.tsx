import React, { useState, useEffect } from 'react';
import { Button, Input, ChipGroup } from './UI';
import { Search, MapPin, Sparkles } from 'lucide-react';
import { Language, ParentRequest } from '../types';
import { t } from '../src/core/i18n/translations';
import { detectUserLocation } from '../services/geolocation';

interface SearchSidebarProps {
  lang: Language;
  onSearch: (data: Partial<ParentRequest>) => void;
  isLoading?: boolean;
}

export const SearchSidebar: React.FC<SearchSidebarProps> = ({ lang, onSearch, isLoading }) => {
  const text = t[lang];
  const [formData, setFormData] = useState({
    city: 'Москва',
    district: '',
    childAge: '',
    schedule: '',
  });

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const detectLocation = async () => {
    setDetectingLocation(true);
    const result = await detectUserLocation(lang);
    if (result.success) {
      const value = [result.city, result.district].filter(Boolean).join(', ');
      setFormData((prev) => ({ ...prev, city: value || prev.city }));
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
        const list = (Array.isArray(nj) ? nj : []).map((x: any) => x?.display_name).filter(Boolean).slice(0, 5);
        setCitySuggestions(list);
      } catch {
        setCitySuggestions([]);
      }
    }, 350);
    return () => clearTimeout(tmr);
  }, [formData.city]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      city: formData.city,
      district: formData.district || undefined,
      childAge: formData.childAge,
      schedule: formData.schedule,
    });
  };

  const isFormValid = formData.city.trim() !== '' && formData.childAge !== '' && formData.schedule !== '';

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex flex-col h-full sticky top-24">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          {lang === 'ru' ? 'Кого вы ищете?' : 'Who are you looking for?'}
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          {lang === 'ru' ? 'AI найдет идеальную няню за секунды' : 'AI will find the perfect nanny in seconds'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
        
        {/* Location Section */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              label={lang === 'ru' ? 'Город' : 'City'}
              placeholder={lang === 'ru' ? 'Москва' : 'Moscow'}
              value={formData.city}
              onChange={e => {
                setFormData({ ...formData, city: e.target.value });
                setShowCitySuggestions(true);
              }}
              required
            />
            {showCitySuggestions && citySuggestions.length > 0 && (
              <div className="mt-1 absolute z-10 w-full border border-stone-200 rounded-lg bg-white shadow-lg max-h-40 overflow-auto">
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
              className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors"
            >
              <MapPin size={14} />
              {detectingLocation
                ? (lang === 'ru' ? 'Определяем...' : 'Detecting...')
                : (lang === 'ru' ? 'Мое местоположение' : 'My location')}
            </button>
          </div>

          <Input
            label={lang === 'ru' ? 'Район или метро (необязательно)' : 'District or metro (optional)'}
            placeholder={lang === 'ru' ? 'Хамовники' : 'Downtown'}
            value={formData.district}
            onChange={e => setFormData({ ...formData, district: e.target.value })}
          />
        </div>

        {/* Filters */}
        <div className="space-y-6">
          <ChipGroup
            label={text.childAgeLabel}
            options={text.ageOptions}
            selected={formData.childAge ? [formData.childAge] : []}
            onChange={(s) => setFormData({ ...formData, childAge: s[0] || '' })}
            single
          />

          <ChipGroup
            label={text.scheduleLabel}
            options={text.scheduleOptions}
            selected={formData.schedule ? [formData.schedule] : []}
            onChange={(s) => setFormData({ ...formData, schedule: s[0] || '' })}
            single
          />
        </div>

        {/* Submit */}
        <div className="mt-auto pt-6">
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!isFormValid || isLoading}
            className="w-full bg-stone-900 border-none shadow-lg hover:shadow-xl hover:bg-stone-800 text-white !py-4"
          >
            {isLoading 
              ? (lang === 'ru' ? 'AI ищет совпадения...' : 'AI is hunting...') 
              : <><Sparkles size={18} className="text-amber-400" /> {lang === 'ru' ? 'Найти няню' : 'Find ideal match'}</>}
          </Button>
          <p className="text-center text-[11px] text-stone-400 mt-3 flex justify-center items-center gap-1">
             <Search size={12} /> {lang === 'ru' ? 'Мгновенный подбор по 42 параметрам' : 'Instant match across 42 parameters'}
          </p>
        </div>
      </form>
    </div>
  );
};
