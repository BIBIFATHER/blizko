import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  MapPin,
  X,
  MessageCircle,
  Sparkles,
  Check,
  Grid3X3,
  List,
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
  const topMatch = shortlist[0];

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 border-b border-[#E8E4DF]">
        <div className="flex items-center justify-between px-4 pt-12 pb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#F5F3F0] flex items-center justify-center text-[#4A4A4A] active:bg-[#E8E4DF] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-[#3D3D3D]">Мой шортлист</h1>
            <p className="text-xs text-[#8B8680]">{shortlist.length} кандидатов</p>
          </div>
          <div className="w-10" />
        </div>

        {/* View toggle */}
        <div className="flex gap-1 mx-4 mb-3 p-1 rounded-xl bg-[#F5F3F0]">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'cards' ? 'bg-white text-[#3D3D3D] shadow-sm' : 'text-[#8B8680]'
            }`}
          >
            <List size={16} />
            Карточки
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'compare' ? 'bg-white text-[#3D3D3D] shadow-sm' : 'text-[#8B8680]'
            }`}
          >
            <Grid3X3 size={16} />
            Сравнить
          </button>
        </div>
      </header>

      {viewMode === 'cards' ? (
        <div className="p-4 pb-32 space-y-4">
          {/* Top recommendation */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#81B29A] to-[#6A9B83] p-4">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <img
                  src={topMatch.photo}
                  alt={topMatch.name}
                  className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/30"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F2CC8F] flex items-center justify-center">
                  <Sparkles size={10} className="text-[#3D3D3D]" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">Лучший выбор</span>
                </div>
                <p className="text-white font-semibold">{topMatch.name}</p>
                <p className="text-white/70 text-sm">Совпадение {topMatch.matchScore}%</p>
              </div>
              <button
                onClick={() => onSelectNanny?.(topMatch.id)}
                className="px-4 py-2 rounded-xl bg-white text-[#5D8A72] text-sm font-semibold active:bg-[#F5F3F0] transition-colors"
              >
                Открыть
              </button>
            </div>
          </div>

          {/* Nanny Cards */}
          {shortlist.map((nanny, index) => (
            <div
              key={nanny.id}
              className="bg-white rounded-2xl overflow-hidden border border-[#E8E4DF]"
            >
              {/* Card Image Header */}
              <div className="relative h-48">
                <img
                  src={nanny.photo}
                  alt={nanny.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#3D3D3D]/70 via-transparent to-transparent" />
                
                {/* Remove button */}
                <button
                  onClick={() => removeFromShortlist(nanny.id)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#4A4A4A] active:bg-white transition-colors"
                >
                  <X size={16} />
                </button>

                {/* Match badge */}
                {index === 0 && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#81B29A] text-white text-xs font-semibold flex items-center gap-1">
                    <Sparkles size={12} />
                    Лучшее совпадение
                  </div>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-white text-lg font-semibold mb-1">{nanny.name}</h3>
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-[#F2CC8F] fill-[#F2CC8F]" />
                          <span className="font-semibold">{nanny.rating}</span>
                        </div>
                        <span className="text-white/50">|</span>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{nanny.distance}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-xl font-semibold">{nanny.rate}₽</p>
                      <p className="text-white/60 text-xs">в час</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                {/* Quick stats */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5 text-sm text-[#4A4A4A]">
                    <ShieldCheck size={16} className="text-[#81B29A]" />
                    <span>{nanny.verified}/5</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-[#4A4A4A]">
                    <span className="font-medium">{nanny.experience}</span> лет опыта
                  </div>
                  <div className="text-sm text-[#8B8680]">
                    Ответ: {nanny.responseTime}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleSelect(nanny.id)}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                      selectedIds.includes(nanny.id)
                        ? 'bg-[#5D8A72] text-white'
                        : 'bg-[#F5F3F0] text-[#4A4A4A]'
                    }`}
                  >
                    {selectedIds.includes(nanny.id) && <Check size={16} />}
                    {selectedIds.includes(nanny.id) ? 'Выбрана' : 'Сравнить'}
                  </button>
                  <button
                    onClick={() => onSelectNanny?.(nanny.id)}
                    className="flex-1 py-3 rounded-xl bg-[#F5F3F0] text-[#3D3D3D] font-medium text-sm active:bg-[#E8E4DF] transition-colors"
                  >
                    Подробнее
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compare View */
        <div className="p-4 pb-32">
          {selectedNannies.length < 2 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#F5F3F0] flex items-center justify-center mx-auto mb-4">
                <Grid3X3 size={24} className="text-[#8B8680]" />
              </div>
              <p className="text-[#4A4A4A] font-medium mb-1">Выберите для сравнения</p>
              <p className="text-[#8B8680] text-sm">Минимум 2 кандидата</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Comparison Header - Photos */}
              <div className="bg-white rounded-2xl p-4 overflow-hidden border border-[#E8E4DF]">
                <div className="flex gap-3">
                  {selectedNannies.map((nanny) => (
                    <div key={nanny.id} className="flex-1 text-center">
                      <div className="relative mx-auto w-20 h-20 mb-2">
                        <img
                          src={nanny.photo}
                          alt={nanny.name}
                          className="w-full h-full rounded-2xl object-cover"
                        />
                        <button
                          onClick={() => toggleSelect(nanny.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#4A4A4A] text-white flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="font-medium text-[#3D3D3D] text-sm truncate">{nanny.name.split(' ')[0]}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Star size={12} className="text-[#F2CC8F] fill-[#F2CC8F]" />
                        <span className="text-xs text-[#4A4A4A]">{nanny.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison Table */}
              <div className="bg-white rounded-2xl overflow-hidden border border-[#E8E4DF]">
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
                      className={`flex items-center px-4 py-3.5 ${i !== 0 ? 'border-t border-[#E8E4DF]' : ''}`}
                    >
                      <span className="w-24 text-sm text-[#8B8680] shrink-0">{row.label}</span>
                      <div className="flex-1 flex gap-3">
                        {selectedNannies.map((nanny) => {
                          const value = nanny[row.key as keyof typeof nanny];
                          const isMax = typeof value === 'number' && value === maxVal;
                          return (
                            <div
                              key={nanny.id}
                              className={`flex-1 text-center py-1.5 rounded-lg text-sm font-medium ${
                                row.highlight && isMax
                                  ? 'bg-[#81B29A]/15 text-[#5D8A72]'
                                  : isMax
                                  ? 'bg-[#F5F3F0] text-[#3D3D3D]'
                                  : 'text-[#4A4A4A]'
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
              <div className="bg-gradient-to-br from-[#81B29A] to-[#6A9B83] rounded-2xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-[#F2CC8F]" />
                  <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">Рекомендация Blizko</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  <span className="text-white font-semibold">{selectedNannies[0]?.name}</span> лучше всего подходит: высокий рейтинг, ближе к вам и быстрее отвечает.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E4DF] p-4 pb-8">
        <button className="w-full h-14 rounded-2xl bg-[#5D8A72] text-white font-medium text-[15px] flex items-center justify-center gap-2 active:bg-[#4A7A62] transition-colors shadow-lg shadow-[#5D8A72]/20">
          <MessageCircle size={20} />
          Написать {viewMode === 'compare' && selectedNannies.length > 0 ? selectedNannies[0].name.split(' ')[0] : 'выбранным'}
        </button>
      </div>
    </div>
  );
};

export default ShortlistCompareMobile;
