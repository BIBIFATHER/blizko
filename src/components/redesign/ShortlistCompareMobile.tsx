import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  MapPin,
  Clock,
  X,
  MessageCircle,
  Sparkles,
  MoreHorizontal,
  ArrowUpDown,
  Filter,
  Users,
  Check,
  Heart,
} from 'lucide-react';

interface ShortlistCompareMobileProps {
  onBack?: () => void;
  onSelectNanny?: (id: string) => void;
}

const mockShortlist = [
  {
    id: '1',
    name: 'Анна Морозова',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
    rating: 4.9,
    reviews: 47,
    experience: '8 лет',
    rate: 1200,
    location: 'Пресненский р-н',
    distance: '1.2 км',
    verified: true,
    matchScore: 96,
    availability: 'Пн-Пт',
    childAges: '6 мес - 7 лет',
    specialties: ['Раннее развитие', 'Монтессори'],
    highlights: ['Быстро отвечает', 'Топ-рейтинг'],
  },
  {
    id: '2',
    name: 'Елена Козлова',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    rating: 4.8,
    reviews: 32,
    experience: '5 лет',
    rate: 1000,
    location: 'Арбат',
    distance: '2.1 км',
    verified: true,
    matchScore: 91,
    availability: 'Пн-Сб',
    childAges: '1 - 6 лет',
    specialties: ['Подготовка к школе', 'Английский'],
    highlights: ['Гибкий график'],
  },
  {
    id: '3',
    name: 'Мария Петрова',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    rating: 4.7,
    reviews: 28,
    experience: '6 лет',
    rate: 950,
    location: 'Тверской р-н',
    distance: '3.4 км',
    verified: true,
    matchScore: 87,
    availability: 'Полный день',
    childAges: '0 - 5 лет',
    specialties: ['Младенцы', 'Первая помощь'],
    highlights: ['Медицинское образование'],
  },
];

const compareCategories = [
  { key: 'matchScore', label: 'Совпадение', format: (v: number) => `${v}%` },
  { key: 'rating', label: 'Рейтинг', format: (v: number) => v.toString() },
  { key: 'rate', label: 'Ставка', format: (v: number) => `${v}₽/ч` },
  { key: 'experience', label: 'Опыт', format: (v: string) => v },
  { key: 'distance', label: 'Расстояние', format: (v: string) => v },
];

export const ShortlistCompareMobile: React.FC<ShortlistCompareMobileProps> = ({
  onBack,
  onSelectNanny,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'compare'>('list');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [shortlist, setShortlist] = useState(mockShortlist);

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : prev.length < 3 
          ? [...prev, id]
          : prev
    );
  };

  const removeFromShortlist = (id: string) => {
    setShortlist(prev => prev.filter(n => n.id !== id));
    setSelectedForCompare(prev => prev.filter(x => x !== id));
  };

  const selectedNannies = shortlist.filter(n => selectedForCompare.includes(n.id));

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#F0EFED]">
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6B6660]"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-[#1A1A1A] font-serif">Мой шортлист</h1>
          <div className="w-8" />
        </div>

        {/* View Toggle */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 p-1 rounded-xl bg-[#F0EFED]">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-[#1A1A1A] shadow-sm'
                  : 'text-[#8B8680]'
              }`}
            >
              Список
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'compare'
                  ? 'bg-white text-[#1A1A1A] shadow-sm'
                  : 'text-[#8B8680]'
              }`}
            >
              Сравнить {selectedForCompare.length > 0 && `(${selectedForCompare.length})`}
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'list' ? (
        <>
          {/* Summary Card */}
          <div className="px-4 py-4">
            <div className="bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles size={22} />
                </div>
                <div>
                  <p className="text-sm opacity-80">В вашем шортлисте</p>
                  <p className="text-2xl font-semibold">{shortlist.length} кандидата</p>
                </div>
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                Выберите до 3 нянь для сравнения или свяжитесь с лучшим кандидатом
              </p>
            </div>
          </div>

          {/* Filter/Sort Bar */}
          <div className="px-4 pb-3 flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E8E6E3] text-sm text-[#4A4540] shadow-sm">
              <ArrowUpDown size={14} />
              <span>По совпадению</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E8E6E3] text-sm text-[#4A4540] shadow-sm">
              <Filter size={14} />
              <span>Фильтры</span>
            </button>
          </div>

          {/* Nanny Cards */}
          <div className="px-4 pb-32 space-y-3">
            {shortlist.map((nanny, index) => (
              <div
                key={nanny.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F0EFED]"
              >
                {/* Top match badge */}
                {index === 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 flex items-center gap-2 border-b border-amber-100">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700">Лучшее совпадение для вас</span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Checkbox for compare */}
                    <button
                      onClick={() => toggleCompareSelection(nanny.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                        selectedForCompare.includes(nanny.id)
                          ? 'bg-[#2D4A3E] border-[#2D4A3E]'
                          : 'border-[#D4D2CF] hover:border-[#2D4A3E]'
                      }`}
                    >
                      {selectedForCompare.includes(nanny.id) && (
                        <Check size={14} className="text-white" />
                      )}
                    </button>

                    {/* Avatar */}
                    <div 
                      className="relative shrink-0 cursor-pointer"
                      onClick={() => onSelectNanny?.(nanny.id)}
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md">
                        <img
                          src={nanny.photo}
                          alt={nanny.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {nanny.verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                          <CheckCircle2 size={10} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onSelectNanny?.(nanny.id)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-base font-semibold text-[#1A1A1A]">{nanny.name}</h3>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50">
                          <span className="text-xs font-bold text-emerald-700">{nanny.matchScore}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-semibold text-[#1A1A1A]">{nanny.rating}</span>
                        </div>
                        <span className="text-xs text-[#8B8680]">({nanny.reviews})</span>
                        <span className="text-[#D4D2CF]">|</span>
                        <span className="text-xs text-[#8B8680]">{nanny.experience}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {nanny.highlights.map((h, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-[#F5F4F2] text-[#6B6660]"
                          >
                            {h}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#8B8680]">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {nanny.distance}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {nanny.rate}₽/ч
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => removeFromShortlist(nanny.id)}
                        className="w-8 h-8 rounded-xl bg-[#F5F4F2] flex items-center justify-center text-[#8B8680] hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <button className="w-8 h-8 rounded-xl bg-[#F5F4F2] flex items-center justify-center text-[#8B8680]">
                        <Heart size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick action */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => onSelectNanny?.(nanny.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F5F4F2] text-[#4A4540] font-medium text-sm hover:bg-[#ECEAE7] transition-colors"
                  >
                    <span>Открыть профиль</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          {shortlist.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-[#F0EFED] px-4 py-4 pb-8">
              <button
                onClick={() => onSelectNanny?.(shortlist[0].id)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#2D4A3E] text-white font-medium shadow-lg shadow-[#2D4A3E]/20"
              >
                <MessageCircle size={18} />
                <span>Связаться с {shortlist[0].name.split(' ')[0]}</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Compare View */
        <>
          {selectedNannies.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#F0EFED] flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-[#8B8680]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2 font-serif">Выберите нянь для сравнения</h3>
              <p className="text-sm text-[#8B8680] mb-6">Отметьте до 3 кандидатов в списке</p>
              <button
                onClick={() => setViewMode('list')}
                className="px-6 py-3 rounded-xl bg-[#2D4A3E] text-white text-sm font-medium"
              >
                Перейти к списку
              </button>
            </div>
          ) : (
            <div className="pb-32">
              {/* Compare Header Cards */}
              <div className="px-4 py-4">
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {selectedNannies.map((nanny, index) => (
                    <div
                      key={nanny.id}
                      className={`flex-shrink-0 w-28 rounded-2xl p-3 text-center relative ${
                        index === 0 ? 'bg-gradient-to-b from-emerald-50 to-white border-2 border-emerald-200' : 'bg-white border border-[#E8E6E3]'
                      }`}
                    >
                      {index === 0 && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500 text-xs font-medium text-white whitespace-nowrap">
                          Лучший
                        </div>
                      )}
                      <button
                        onClick={() => toggleCompareSelection(nanny.id)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F0EFED] flex items-center justify-center text-[#8B8680] hover:bg-rose-100 hover:text-rose-500"
                      >
                        <X size={12} />
                      </button>
                      <div className="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-2 shadow-sm">
                        <img
                          src={nanny.photo}
                          alt={nanny.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-semibold text-[#1A1A1A] truncate">{nanny.name.split(' ')[0]}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs text-[#6B6660]">{nanny.rating}</span>
                      </div>
                    </div>
                  ))}
                  {selectedNannies.length < 3 && (
                    <button
                      onClick={() => setViewMode('list')}
                      className="flex-shrink-0 w-28 h-[124px] rounded-2xl border-2 border-dashed border-[#D4D2CF] flex flex-col items-center justify-center gap-2 text-[#8B8680] hover:border-[#2D4A3E] hover:text-[#2D4A3E] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#F0EFED] flex items-center justify-center">
                        <span className="text-xl">+</span>
                      </div>
                      <span className="text-xs font-medium">Добавить</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Comparison Table */}
              <div className="px-4 space-y-2">
                {compareCategories.map((category) => (
                  <div key={category.key} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#F0EFED]">
                    <div className="px-4 py-2.5 bg-[#FAF9F7] border-b border-[#F0EFED]">
                      <p className="text-xs font-semibold text-[#8B8680] uppercase tracking-wider">{category.label}</p>
                    </div>
                    <div className="flex">
                      {selectedNannies.map((nanny, index) => {
                        const value = nanny[category.key as keyof typeof nanny];
                        const isHighest = index === 0 && (category.key === 'matchScore' || category.key === 'rating');
                        return (
                          <div
                            key={nanny.id}
                            className={`flex-1 py-3 px-4 text-center border-r border-[#F0EFED] last:border-r-0 ${
                              isHighest ? 'bg-emerald-50/50' : ''
                            }`}
                          >
                            <span className={`text-sm font-semibold ${
                              isHighest ? 'text-emerald-700' : 'text-[#1A1A1A]'
                            }`}>
                              {category.format(value as never)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Specialties comparison */}
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#F0EFED]">
                  <div className="px-4 py-2.5 bg-[#FAF9F7] border-b border-[#F0EFED]">
                    <p className="text-xs font-semibold text-[#8B8680] uppercase tracking-wider">Специализация</p>
                  </div>
                  <div className="flex">
                    {selectedNannies.map((nanny) => (
                      <div key={nanny.id} className="flex-1 p-3 border-r border-[#F0EFED] last:border-r-0">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {nanny.specialties.map((s, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-[#F5F4F2] text-[#6B6660]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="px-4 py-4">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-800">Рекомендация Blizko</span>
                  </div>
                  <p className="text-sm text-emerald-700 leading-relaxed">
                    <span className="font-semibold">{selectedNannies[0]?.name}</span> — лучший выбор по совокупности критериев: высокий рейтинг, ближе всего к вам, опыт работы с детьми вашего возраста.
                  </p>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-[#F0EFED] px-4 py-4 pb-8">
                <button
                  onClick={() => onSelectNanny?.(selectedNannies[0]?.id)}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#2D4A3E] text-white font-medium shadow-lg shadow-[#2D4A3E]/20"
                >
                  <MessageCircle size={18} />
                  <span>Выбрать {selectedNannies[0]?.name.split(' ')[0]}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShortlistCompareMobile;
