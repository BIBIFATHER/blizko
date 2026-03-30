import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  X,
  Grid3X3,
  List,
  Check,
} from 'lucide-react';

interface ShortlistCompareMobileProps {
  onBack?: () => void;
  onSelectNanny?: (id: string) => void;
}

const mockShortlist = [
  {
    id: '1',
    name: 'Анна Морозова',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=500&fit=crop&crop=face',
    rating: 4.9,
    reviews: 47,
    experience: 8,
    rate: 1200,
    distance: '1.2 км',
    verified: 5,
    matchScore: 96,
    availability: 'Пн-Пт',
    responseTime: '15 мин',
  },
  {
    id: '2',
    name: 'Елена Козлова',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face',
    rating: 4.8,
    reviews: 32,
    experience: 5,
    rate: 1000,
    distance: '2.1 км',
    verified: 5,
    matchScore: 91,
    availability: 'Пн-Сб',
    responseTime: '30 мин',
  },
  {
    id: '3',
    name: 'Мария Петрова',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face',
    rating: 4.7,
    reviews: 28,
    experience: 6,
    rate: 950,
    distance: '3.4 км',
    verified: 4,
    matchScore: 87,
    availability: 'Весь день',
    responseTime: '1 час',
  },
];

export const ShortlistCompareMobile: React.FC<ShortlistCompareMobileProps> = ({
  onBack,
  onSelectNanny,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'compare'>('cards');
  const [selectedIds, setSelectedIds] = useState<string[]>(['1', '2']);
  const [shortlist, setShortlist] = useState(mockShortlist);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const removeFromShortlist = (id: string) => {
    setShortlist(prev => prev.filter(n => n.id !== id));
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const selectedNannies = shortlist.filter(n => selectedIds.includes(n.id));

  return (
    <div className={`min-h-screen bg-[#FDFCFB] transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <header className="bg-[#FDFCFB] sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-stone-500 active:bg-stone-100 transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={1} />
          </button>
          <div className="text-center">
            <h1 className="font-serif text-lg font-normal tracking-tight text-stone-700">Мой шортлист</h1>
            <p className="text-xs text-stone-500 font-light">{shortlist.length} кандидатов</p>
          </div>
          <div className="w-10" />
        </div>

        {/* View toggle - small centered serif container */}
        <div className="flex items-center justify-center pb-4">
          <div className="inline-flex items-center gap-4 px-4 py-2 bg-[#F7F5F2] rounded-full border-[0.5px] border-stone-200/50">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 text-xs font-serif transition-all ${
                viewMode === 'cards' ? 'text-stone-700' : 'text-stone-400'
              }`}
            >
              <List size={14} strokeWidth={1} />
              Карточки
            </button>
            <span className="text-stone-300">|</span>
            <button
              onClick={() => setViewMode('compare')}
              className={`flex items-center gap-1.5 text-xs font-serif transition-all ${
                viewMode === 'compare' ? 'text-stone-700' : 'text-stone-400'
              }`}
            >
              <Grid3X3 size={14} strokeWidth={1} />
              Сравнить
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'cards' ? (
        <div className="px-4 pb-28 space-y-4">
          {/* Nanny Cards - clickable, premium surface */}
          {shortlist.map((nanny, index) => (
            <div
              key={nanny.id}
              onClick={() => onSelectNanny?.(nanny.id)}
              className="bg-[#F7F5F2] rounded-2xl overflow-hidden border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)] cursor-pointer active:bg-[#F0EDE8] transition-colors"
            >
              {/* Card Image - aspect 3/4, rounded, inner shadow */}
              <div className="relative aspect-[3/4] max-h-[280px] m-3 rounded-2xl overflow-hidden">
                <img
                  src={nanny.photo}
                  alt={nanny.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2C2C2C]/50 via-transparent to-transparent" />
                
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromShortlist(nanny.id);
                  }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#FDFCFB]/90 backdrop-blur-sm flex items-center justify-center text-stone-500 active:bg-white transition-colors"
                >
                  <X size={12} strokeWidth={1} />
                </button>

                {/* Select checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(nanny.id);
                  }}
                  className={`absolute top-3 left-3 w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
                    selectedIds.includes(nanny.id) 
                      ? 'bg-[#6B9A8A] text-white' 
                      : 'bg-[#FDFCFB]/90 text-stone-500 border border-stone-300'
                  }`}
                >
                  {selectedIds.includes(nanny.id) && <Check size={12} strokeWidth={1.5} />}
                </button>

                {/* Best match badge - minimalist gold text */}
                {index === 0 && (
                  <div className="absolute top-3 left-12 px-2 py-1 rounded-full bg-[#FDFCFB]/90 backdrop-blur-sm">
                    <span className="text-[10px] text-[#9A7D4E] font-light tracking-wide">Best Match</span>
                  </div>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white text-lg font-serif font-normal tracking-tight mb-1">{nanny.name}</h3>
                  <div className="flex items-center gap-2 text-white/80 text-xs font-light">
                    <div className="flex items-center gap-1">
                      <Star size={10} className="text-[#C9A86C] fill-[#C9A86C]" />
                      <span>{nanny.rating}</span>
                    </div>
                    <span className="text-white/40">·</span>
                    <div className="flex items-center gap-1">
                      <MapPin size={10} strokeWidth={1} />
                      <span>{nanny.distance}</span>
                    </div>
                    <span className="text-white/40">·</span>
                    <span className="text-[#C9A86C]">{nanny.matchScore}%</span>
                  </div>
                </div>
              </div>

              {/* Card Body - Trust Row with minimalist line icons */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <div className="flex items-center gap-3 font-light">
                    <div className="flex items-center gap-1">
                      <Check size={12} className="text-[#8B9D83]" strokeWidth={1} />
                      <span>Verified</span>
                    </div>
                    <span className="text-stone-300">·</span>
                    <span>{nanny.experience} лет</span>
                    <span className="text-stone-300">·</span>
                    <span>{nanny.rate}₽/ч</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compare View */
        <div className="px-4 pb-28">
          {selectedNannies.length < 2 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-[#F7F5F2] flex items-center justify-center mx-auto mb-4 border-[0.5px] border-stone-200/50">
                <Grid3X3 size={20} className="text-stone-400" strokeWidth={1} />
              </div>
              <p className="text-stone-700 font-serif font-normal tracking-tight mb-1">Выберите для сравнения</p>
              <p className="text-stone-500 text-xs font-light">Минимум 2 кандидата</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Comparison Header - Photos - Sticky */}
              <div className="sticky top-28 z-20 bg-[#F7F5F2] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
                <div className="flex gap-3">
                  {selectedNannies.map((nanny) => (
                    <div key={nanny.id} className="flex-1 text-center">
                      <div className="relative mx-auto w-16 h-16 mb-2">
                        <img
                          src={nanny.photo}
                          alt={nanny.name}
                          className="w-full h-full rounded-full object-cover border-[0.5px] border-stone-200/50"
                        />
                        <button
                          onClick={() => toggleSelect(nanny.id)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-500 text-white flex items-center justify-center"
                        >
                          <X size={8} strokeWidth={1.5} />
                        </button>
                      </div>
                      <p className="text-xs text-stone-700 font-normal truncate">{nanny.name.split(' ')[0]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison Table - alternating rows, divide-y */}
              <div className="bg-[#FDFCFB] rounded-2xl overflow-hidden border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)] divide-y divide-stone-100">
                {[
                  { label: 'Совпадение', key: 'matchScore', suffix: '%', highlight: true },
                  { label: 'Рейтинг', key: 'rating' },
                  { label: 'Опыт', key: 'experience', suffix: ' лет' },
                  { label: 'Ставка', key: 'rate', suffix: '₽/ч' },
                  { label: 'Расстояние', key: 'distance' },
                  { label: 'Проверки', key: 'verified', suffix: '/5' },
                  { label: 'Ответ', key: 'responseTime' },
                ].map((row, i) => {
                  const values = selectedNannies.map(n => n[row.key as keyof typeof n]);
                  const numValues = values.filter(v => typeof v === 'number') as number[];
                  const maxVal = numValues.length > 0 ? Math.max(...numValues) : null;
                  
                  return (
                    <div
                      key={row.key}
                      className={`flex items-center px-4 py-3 ${i % 2 === 1 ? 'bg-[#F7F5F2]' : 'bg-[#FDFCFB]'}`}
                    >
                      <span className="w-20 text-xs text-stone-500 font-light shrink-0">{row.label}</span>
                      <div className="flex-1 flex gap-3">
                        {selectedNannies.map((nanny) => {
                          const value = nanny[row.key as keyof typeof nanny];
                          const isMax = typeof value === 'number' && maxVal !== null && value === maxVal;
                          return (
                            <div
                              key={nanny.id}
                              className={`flex-1 text-center py-1.5 rounded-lg text-xs ${
                                row.highlight && isMax
                                  ? 'bg-[#C9A86C]/15 text-[#9A7D4E] font-medium'
                                  : isMax
                                  ? 'text-stone-700 font-normal'
                                  : 'text-stone-500 font-light'
                              }`}
                            >
                              {value}{row.suffix || ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recommendation */}
              <div className="bg-[#F7F5F2] rounded-2xl p-4 border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-light mb-2">Рекомендация Blizko</p>
                <p className="text-xs text-stone-600 leading-relaxed font-light">
                  <span className="text-stone-700 font-normal">{selectedNannies[0]?.name}</span> лучше всего подходит по всем критериям.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA - elegant thin uppercase */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FDFCFB] border-t border-stone-200/30 p-4 pb-8">
        <button className="w-full h-12 rounded-xl bg-[#6B9A8A] text-white font-light text-xs uppercase tracking-wider active:bg-[#5A8677] transition-colors border border-[#5A8677]/30">
          Связаться с лучшим
        </button>
      </div>
    </div>
  );
};

export default ShortlistCompareMobile;
