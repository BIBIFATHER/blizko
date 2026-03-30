import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  X,
  Grid3X3,
  List,
  CheckCircle2,
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
      <header className="bg-[#FDFCFB] sticky top-0 z-30 border-b border-stone-200/50">
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-stone-500 active:bg-stone-100 transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <div className="text-center">
            <h1 className="font-serif text-xl text-stone-700">Мой шортлист</h1>
            <p className="text-xs text-stone-400 font-light mt-0.5">{shortlist.length} кандидатов</p>
          </div>
          <div className="w-10" />
        </div>

        {/* View toggle - text-only links */}
        <div className="flex items-center justify-center gap-6 pb-4">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-2 text-sm font-light tracking-wide transition-all ${
              viewMode === 'cards' ? 'text-stone-700' : 'text-stone-400'
            }`}
          >
            <List size={16} strokeWidth={1.5} />
            Карточки
          </button>
          <span className="text-stone-200">|</span>
          <button
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-2 text-sm font-light tracking-wide transition-all ${
              viewMode === 'compare' ? 'text-stone-700' : 'text-stone-400'
            }`}
          >
            <Grid3X3 size={16} strokeWidth={1.5} />
            Сравнить
          </button>
        </div>
      </header>

      {viewMode === 'cards' ? (
        <div className="px-5 pt-6 pb-32 space-y-6">
          {/* Nanny Cards - clickable, no duplicate button */}
          {shortlist.map((nanny, index) => (
            <div
              key={nanny.id}
              onClick={() => onSelectNanny?.(nanny.id)}
              className="bg-[#F0EDE8] rounded-2xl overflow-hidden border border-stone-200/50 cursor-pointer active:bg-[#E8E5E0] transition-colors"
            >
              {/* Card Image Header */}
              <div className="relative h-56">
                <img
                  src={nanny.photo}
                  alt={nanny.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2C2C2C]/60 via-transparent to-transparent" />
                
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromShortlist(nanny.id);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FDFCFB]/90 backdrop-blur-sm flex items-center justify-center text-stone-500 active:bg-white transition-colors"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>

                {/* Heart icon - moved to top left */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(nanny.id);
                  }}
                  className={`absolute top-4 left-4 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
                    selectedIds.includes(nanny.id) 
                      ? 'bg-[#C17F5E] text-white' 
                      : 'bg-[#FDFCFB]/90 text-stone-500'
                  }`}
                >
                  {selectedIds.includes(nanny.id) ? (
                    <CheckCircle2 size={14} strokeWidth={1.5} />
                  ) : (
                    <span className="text-xs">+</span>
                  )}
                </button>

                {/* Match badge - gold/bronze subtle style */}
                {index === 0 && (
                  <div className="absolute top-4 left-14 px-3 py-1 rounded-full bg-[#FDFCFB]/90 backdrop-blur-sm flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border border-[#C9A86C] flex items-center justify-center">
                      <span className="text-[8px] text-[#C9A86C]">1</span>
                    </div>
                    <span className="text-xs text-stone-600 font-light">Лучшее совпадение</span>
                  </div>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-white text-xl font-serif mb-1">{nanny.name}</h3>
                      <div className="flex items-center gap-2 text-white/80 text-sm font-light">
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-[#C9A86C] fill-[#C9A86C]" />
                          <span>{nanny.rating}</span>
                        </div>
                        <span className="text-white/40">|</span>
                        <div className="flex items-center gap-1">
                          <MapPin size={11} strokeWidth={1.5} />
                          <span>{nanny.distance}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-xl font-light">{nanny.rate}₽</p>
                      <p className="text-white/50 text-xs font-light">в час</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body - verification row */}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-stone-500 font-light">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-[#8B9D83]" strokeWidth={1.5} />
                      <span>Verified</span>
                    </div>
                    <span className="text-stone-300">|</span>
                    <span>{nanny.experience} лет опыта</span>
                    <span className="text-stone-300">|</span>
                    <span>Ответ {nanny.responseTime}</span>
                  </div>
                  {/* Trust score - subtle gold circle */}
                  <div className="w-10 h-10 rounded-full border border-[#C9A86C] flex items-center justify-center">
                    <span className="text-xs text-[#C9A86C]">{nanny.matchScore}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compare View */
        <div className="px-5 pt-6 pb-32">
          {selectedNannies.length < 2 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#F0EDE8] flex items-center justify-center mx-auto mb-4">
                <Grid3X3 size={22} className="text-stone-400" strokeWidth={1.5} />
              </div>
              <p className="text-stone-700 font-serif mb-1">Выберите для сравнения</p>
              <p className="text-stone-400 text-sm font-light">Минимум 2 кандидата</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Comparison Header - Photos */}
              <div className="bg-[#F0EDE8] rounded-2xl p-5 overflow-hidden border border-stone-200/50">
                <div className="flex gap-4">
                  {selectedNannies.map((nanny) => (
                    <div key={nanny.id} className="flex-1 text-center">
                      <div className="relative mx-auto w-20 h-20 mb-3">
                        <img
                          src={nanny.photo}
                          alt={nanny.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                        <button
                          onClick={() => toggleSelect(nanny.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stone-600 text-white flex items-center justify-center"
                        >
                          <X size={10} strokeWidth={1.5} />
                        </button>
                      </div>
                      <p className="text-sm text-stone-700 truncate">{nanny.name.split(' ')[0]}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Star size={11} className="text-[#C9A86C] fill-[#C9A86C]" />
                        <span className="text-xs text-stone-500 font-light">{nanny.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison Table */}
              <div className="bg-[#FDFCFB] rounded-2xl overflow-hidden border border-stone-200/50">
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
                  const maxVal = Math.max(...values.filter(v => typeof v === 'number') as number[]);
                  
                  return (
                    <div
                      key={row.key}
                      className={`flex items-center px-5 py-4 ${i !== 0 ? 'border-t border-stone-200/50' : ''}`}
                    >
                      <span className="w-24 text-sm text-stone-400 font-light shrink-0">{row.label}</span>
                      <div className="flex-1 flex gap-4">
                        {selectedNannies.map((nanny) => {
                          const value = nanny[row.key as keyof typeof nanny];
                          const isMax = typeof value === 'number' && value === maxVal;
                          return (
                            <div
                              key={nanny.id}
                              className={`flex-1 text-center py-2 rounded-lg text-sm ${
                                row.highlight && isMax
                                  ? 'bg-[#C9A86C]/15 text-[#9A7D4E] font-medium'
                                  : isMax
                                  ? 'bg-[#F0EDE8] text-stone-700'
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
              <div className="bg-[#F0EDE8] rounded-2xl p-5 border border-stone-200/50">
                <p className="text-xs text-stone-400 uppercase tracking-wider font-light mb-2">Рекомендация Blizko</p>
                <p className="text-sm text-stone-600 leading-relaxed font-light">
                  <span className="text-stone-700">{selectedNannies[0]?.name}</span> лучше всего подходит: высокий рейтинг, ближе к вам и быстрее отвечает.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FDFCFB] border-t border-stone-200/50 p-5 pb-8">
        <button className="w-full h-14 rounded-xl bg-stone-800 text-white font-light text-sm uppercase tracking-widest active:bg-stone-700 transition-colors">
          Связаться
        </button>
      </div>
    </div>
  );
};

export default ShortlistCompareMobile;
