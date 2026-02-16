import React, { useMemo } from 'react';
import { Card } from './UI';

export type SlotStatus = 'available' | 'busy' | 'reserved' | 'selected';

interface AvailabilityCalendarProps {
  title: string;
  subtitle?: string;
  days?: string[];
  slots?: string[];
  statusMap?: Record<string, SlotStatus>; // key: dayIndex-slotIndex
  onToggle?: (dayIndex: number, slotIndex: number) => void;
  readonly?: boolean;
  legend?: boolean;
}

const defaultDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const defaultSlots = ['08–10', '10–12', '12–14', '14–16', '16–18', '18–20'];

const statusClass = (status?: SlotStatus) => {
  if (status === 'selected') return 'bg-amber-300 text-stone-900 border-amber-300';
  if (status === 'reserved') return 'bg-sky-200 text-sky-900 border-sky-200';
  if (status === 'busy') return 'bg-stone-200 text-stone-500 border-stone-200';
  return 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50';
};

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  title,
  subtitle,
  days = defaultDays,
  slots = defaultSlots,
  statusMap = {},
  onToggle,
  readonly,
  legend = true,
}) => {
  const grid = useMemo(() => {
    return days.map((_, dayIdx) =>
      slots.map((_, slotIdx) => statusMap[`${dayIdx}-${slotIdx}`] || 'available')
    );
  }, [days, slots, statusMap]);

  return (
    <Card className="!p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-stone-800">{title}</div>
        {subtitle && <div className="text-xs text-stone-500">{subtitle}</div>}
      </div>

      <div className="grid grid-cols-[40px_1fr] gap-2 text-[11px]">
        <div></div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <div key={d} className="text-center text-stone-400 font-semibold">
              {d}
            </div>
          ))}
        </div>

        {slots.map((slot, slotIdx) => (
          <React.Fragment key={slot}>
            <div className="text-[10px] text-stone-400 flex items-center">{slot}</div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((_, dayIdx) => {
                const status = grid[dayIdx][slotIdx];
                const key = `${dayIdx}-${slotIdx}`;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => !readonly && onToggle && onToggle(dayIdx, slotIdx)}
                    className={`h-8 rounded-lg border text-[10px] font-semibold transition-colors ${statusClass(status)} ${readonly ? 'cursor-default' : 'active:scale-95'}`}
                    title={status}
                  >
                    {status === 'busy' ? '✕' : status === 'reserved' ? 'R' : status === 'selected' ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>

      {legend && (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-stone-500">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-stone-200" /> свободно</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300" /> выбранный диапазон</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-200" /> резерв/приоритет</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-stone-200" /> занято</span>
        </div>
      )}
    </Card>
  );
};
