import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    <div className={`min-h-screen bg-[#FDFCFB] transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header - clean, serif */}
      <header className="px-6 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center text-stone-500"
          >
            <ArrowLeft size={18} strokeWidth={1} />
          </button>
          <h1 className="font-serif text-xl text-stone-800">Шортлист</h1>
          <div className="w-10" />
        </div>

        {/* View toggle - minimal text links */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 text-sm transition-all ${
              viewMode === 'cards' ? 'text-stone-800' : 'text-stone-400 font-light'
            }`}
          >
            <List size={14} strokeWidth={1} />
            Карточки
          </button>
          <span className="text-stone-300">|</span>
          <button
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-1.5 text-sm transition-all ${
              viewMode === 'compare' ? 'text-stone-800' : 'text-stone-400 font-light'
            }`}
          >
            <Grid3X3 size={14} strokeWidth={1} />
            Сравнить
          </button>
        </div>
      </header>

      {viewMode === 'cards' ? (
        <div className="px-6 pb-32 space-y-6">
          {/* Candidates count */}
          <p className="text-xs text-stone-400 font-light uppercase tracking-wider">
            {shortlist.length} кандидатов
          </p>

          {/* Nanny Cards - circular avatars, minimal */}
          {shortlist.map((nanny, index) => (
            <div
              key={nanny.id}
              onClick={() => onSelectNanny?.(nanny.id)}
              className="py-5 border-b border-stone-200/50 cursor-pointer active:bg-stone-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Circular avatar */}
                <div className="relative">
                  <img
                    src={nanny.photo}
                    alt={nanny.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  {/* Select checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(nanny.id);
                    }}
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      selectedIds.includes(nanny.id) 
                        ? 'bg-[#333333] text-white' 
                        : 'bg-white border border-stone-300 text-transparent'
                    }`}
                  >
                    <Check size={10} strokeWidth={2} />
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-serif text-lg text-stone-800">{nanny.name}</h3>
                    {index === 0 && (
                      <span className="text-[10px] text-[#9A7D4E] uppercase tracking-wider font-light">Best</span>
                    )}
                  </div>
                  
                  {/* Verified */}
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 font-light mb-2">
                    <span className="w-1 h-1 rounded-full bg-[#C9A86C]" />
                    <span className="uppercase tracking-wider">Verified</span>
                  </div>

                  {/* Stats row - serif numbers */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-[#C9A86C] fill-[#C9A86C]" />
                      <span className="font-serif text-stone-700">{nanny.rating}</span>
                    </div>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-500 font-light">{nanny.experience} лет</span>
                    <span className="text-stone-300">·</span>
                    <span className="font-serif text-stone-700">{nanny.rate}₽</span>
                  </div>
                </div>

                {/* Match score - bronze */}
                <div className="text-right">
                  <p className="font-serif text-xl text-[#9A7D4E]">{nanny.matchScore}%</p>
                  <p className="text-[10px] text-stone-400 font-light">совпадение</p>
                </div>

                {/* Remove */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromShortlist(nanny.id);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-stone-400"
                >
                  <X size={14} strokeWidth={1} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compare View */
        <div className="px-6 pb-32">
          {selectedNannies.length < 2 ? (
            <div className="text-center py-20">
              <p className="font-serif text-lg text-stone-700 mb-2">Выберите для сравнения</p>
              <p className="text-stone-400 text-sm font-light">Минимум 2 кандидата</p>
            </div>
          ) : (
            <div>
              {/* Comparison Header - Sticky, circular avatars */}
              <div className="sticky top-0 z-20 bg-[#FDFCFB] py-4 border-b border-stone-200/50">
                <div className="flex">
                  <div className="w-24 shrink-0" />
                  {selectedNannies.map((nanny) => (
                    <div key={nanny.id} className="flex-1 text-center px-2">
                      <div className="relative inline-block mb-2">
                        <img
                          src={nanny.photo}
                          alt={nanny.name}
                          className="w-14 h-14 rounded-full object-cover mx-auto"
                        />
                        <button
                          onClick={() => toggleSelect(nanny.id)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-400 text-white flex items-center justify-center"
                        >
                          <X size={8} strokeWidth={2} />
                        </button>
                      </div>
                      <p className="text-xs text-stone-700 truncate">{nanny.name.split(' ')[0]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison Table - transparent bg, centered serif data, increased padding */}
              <div className="divide-y divide-stone-200/50">
                {[
                  { label: 'Совпадение', key: 'matchScore', suffix: '%', highlight: true },
                  { label: 'Рейтинг', key: 'rating' },
                  { label: 'Опыт', key: 'experience', suffix: ' лет' },
                  { label: 'Ставка', key: 'rate', suffix: '₽' },
                  { label: 'Расстояние', key: 'distance' },
                  { label: 'Ответ', key: 'responseTime' },
                ].map((row, i) => {
                  const values = selectedNannies.map(n => n[row.key as keyof typeof n]);
                  const numValues = values.filter(v => typeof v === 'number') as number[];
                  const maxVal = numValues.length > 0 ? Math.max(...numValues) : null;
                  
                  return (
                    <div
                      key={row.key}
                      className={`flex items-center py-8 ${i % 2 === 1 ? 'bg-stone-50/50' : ''}`}
                    >
                      <span className="w-24 shrink-0 text-sm text-stone-400 font-light">{row.label}</span>
                      {selectedNannies.map((nanny) => {
                        const value = nanny[row.key as keyof typeof nanny];
                        const isMax = typeof value === 'number' && maxVal !== null && value === maxVal;
                        return (
                          <div
                            key={nanny.id}
                            className="flex-1 text-center px-2"
                          >
                            <span className={`font-serif text-base ${
                              row.highlight && isMax
                                ? 'text-[#9A7D4E]'
                                : isMax
                                ? 'text-stone-800'
                                : 'text-stone-500'
                            }`}>
                              {value}{row.suffix || ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Recommendation - minimal */}
              <div className="mt-8 py-6 border-t border-stone-200/50">
                <p className="text-[10px] text-stone-400 uppercase tracking-wider font-light mb-2">Рекомендация</p>
                <p className="text-sm text-stone-600 font-light">
                  <span className="text-stone-800">{selectedNannies[0]?.name}</span> лучше всего соответствует вашим критериям.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA - Warm Charcoal, rounded-none, 60px, uppercase */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FDFCFB] px-6 py-5 pb-8">
        <button className="w-full h-[60px] bg-[#333333] text-white text-sm font-light uppercase tracking-[0.2em] active:bg-[#444444] transition-colors">
          Связаться
        </button>
      </div>
    </div>
  );
};

export default ShortlistCompareMobile;
