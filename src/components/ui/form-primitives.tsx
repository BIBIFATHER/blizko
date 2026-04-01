import React from "react";
import { Check, Loader2 } from "lucide-react";

import { scrollToNext } from "./helpers";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  isLoading?: boolean;
  pulse?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  className = "",
  isLoading,
  pulse,
  ...props
}) => {
  const baseStyles =
    "w-full min-h-[48px] py-3 sm:min-h-[52px] sm:py-4 rounded-full font-semibold transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2 text-sm sm:text-base tracking-[0.01em] touch-manipulation select-none hover-lift";

  const variants = {
    primary: `btn-honey ${pulse && !props.disabled ? "btn-honey-pulse" : ""}`,
    secondary:
      "surface-panel cta-secondary border-white/70 text-stone-700 hover:bg-white/95",
    outline:
      "bg-transparent border border-(--cloud-border-strong) text-stone-700 hover:border-amber-300 hover:bg-white/60",
    ghost: "text-stone-500 hover:text-stone-800 text-sm py-2 min-h-0",
    danger:
      "bg-red-50 border border-red-200/60 text-red-700 hover:bg-red-100/80 shadow-sm",
  } as const;

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${
        isLoading || props.disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  autoAdvance?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  className = "",
  autoAdvance,
  onBlur,
  ...props
}) => (
  <div className="mb-4">
    <label className="ml-1 mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-stone-500/90">
      {label}
    </label>
    <input
      data-auto-advance-target={autoAdvance ? "true" : undefined}
      onBlur={(e) => {
        onBlur?.(e);
        if (autoAdvance && e.currentTarget.value.trim() !== "") {
          scrollToNext(e.currentTarget);
        }
      }}
      className={`input-glass w-full px-4 py-3.5 text-stone-800 placeholder:text-stone-400/70 ${
        props.value && String(props.value).trim() !== "" ? "input-success" : ""
      } ${className}`}
      {...props}
    />
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  autoAdvance?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  className = "",
  autoAdvance,
  onBlur,
  ...props
}) => (
  <div className="mb-4">
    <label className="ml-1 mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-stone-500/90">
      {label}
    </label>
    <textarea
      data-auto-advance-target={autoAdvance ? "true" : undefined}
      onBlur={(e) => {
        onBlur?.(e);
        if (autoAdvance && e.currentTarget.value.trim() !== "") {
          scrollToNext(e.currentTarget);
        }
      }}
      className={`input-glass min-h-[100px] w-full resize-none px-4 py-3.5 text-stone-800 placeholder:text-stone-400/70 ${
        props.value && String(props.value).trim() !== "" ? "input-success" : ""
      } ${className}`}
      {...props}
    />
  </div>
);

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
}) => (
  <label className="ml-[-0.25rem] flex min-h-[44px] cursor-pointer select-none items-center gap-3 rounded-xl px-1 py-3 transition-all active:scale-[0.98]">
    <div
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ${
        checked
          ? "chip-warm border border-amber-200/60"
          : "border-2 border-stone-200 bg-white/60 hover:bg-white hover:border-stone-300"
      }`}
    >
      {checked && (
        <Check className="animate-scale-in text-stone-700" size={14} strokeWidth={3} />
      )}
    </div>
    <span className="text-sm text-stone-700">{label}</span>
    <input
      checked={checked}
      className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]"
      onChange={(e) => onChange(e.target.checked)}
      type="checkbox"
    />
  </label>
);

interface ChipGroupProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  single?: boolean;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({
  label,
  options,
  selected,
  onChange,
  single = false,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const toggle = (option: string) => {
    if (single) {
      if (!selected.includes(option)) {
        onChange([option]);

        setTimeout(() => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const isMobile = window.innerWidth < 768;

          if (isMobile && rect.bottom > window.innerHeight * 0.7) {
            window.scrollBy({ top: rect.height + 40, behavior: "smooth" });
          }
        }, 150);
      }

      return;
    }

    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }

    onChange([...selected, option]);
  };

  return (
    <div className="mb-5" ref={containerRef}>
      <label className="ml-1 mb-2.5 block text-sm font-medium text-stone-500">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = selected.includes(opt);

          return (
            <button
              className={`hover-lift flex min-h-[44px] select-none items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
                isActive
                  ? "chip-warm shadow-sm"
                  : "bg-white/60 backdrop-blur-sm border-stone-200/60 text-stone-600 hover:border-amber-200/60 hover:bg-amber-50/30"
              }`}
              key={opt}
              onClick={() => toggle(opt)}
              type="button"
            >
              {!single && isActive && (
                <Check className="animate-scale-in" size={14} strokeWidth={3} />
              )}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (val: number) => string;
  autoAdvance?: boolean;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue = (v) => v.toString(),
  autoAdvance,
}) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState<"min" | "max" | null>(null);

  const getPercent = (val: number) => ((val - min) / (max - min)) * 100;

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    type: "min" | "max"
  ) => {
    e.preventDefault();
    setIsDragging(type);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    let newValue = min + percent * (max - min);
    newValue = Math.round(newValue / step) * step;

    if (isDragging === "min") {
      onChange([Math.min(newValue, value[1] - step), value[1]]);
      return;
    }

    onChange([value[0], Math.max(newValue, value[0] + step)]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    setIsDragging(null);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (autoAdvance && wrapperRef.current) {
      scrollToNext(wrapperRef.current);
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    let newValue = min + percent * (max - min);
    newValue = Math.round(newValue / step) * step;

    const distToMin = Math.abs(newValue - value[0]);
    const distToMax = Math.abs(newValue - value[1]);

    if (distToMin < distToMax) {
      onChange([Math.min(newValue, value[1] - step), value[1]]);
    } else {
      onChange([value[0], Math.max(newValue, value[0] + step)]);
    }

    if (autoAdvance && wrapperRef.current) {
      scrollToNext(wrapperRef.current);
    }
  };

  return (
    <div
      className="mb-6 select-none touch-none"
      data-auto-advance-target="true"
      ref={wrapperRef}
    >
      <div className="mb-3 ml-1 flex items-end justify-between">
        <label className="block text-sm font-medium text-stone-500">{label}</label>
        <div className="rounded-full border border-amber-100/50 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
          {formatValue(value[0])} - {formatValue(value[1])}
        </div>
      </div>

      <div
        className="relative mt-4 h-2 cursor-pointer rounded-full bg-stone-200/70"
        onClick={handleTrackClick}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={trackRef}
      >
        <div
          className="absolute h-full rounded-full bg-linear-to-r from-amber-300 to-amber-500"
          style={{
            left: `${getPercent(value[0])}%`,
            right: `${100 - getPercent(value[1])}%`,
          }}
        />

        <div
          className="absolute top-1/2 -ml-[18px] -mt-[18px] flex h-9 w-9 cursor-grab items-center justify-center rounded-full border border-stone-200 bg-white shadow-md transition-transform hover:scale-110 active:scale-95 active:cursor-grabbing active:shadow-inner"
          onPointerDown={(e) => handlePointerDown(e, "min")}
          style={{ left: `${getPercent(value[0])}%` }}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        </div>

        <div
          className="absolute top-1/2 -ml-[18px] -mt-[18px] flex h-9 w-9 cursor-grab items-center justify-center rounded-full border border-stone-200 bg-white shadow-md transition-transform hover:scale-110 active:scale-95 active:cursor-grabbing active:shadow-inner"
          onPointerDown={(e) => handlePointerDown(e, "max")}
          style={{ left: `${getPercent(value[1])}%` }}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        </div>
      </div>
    </div>
  );
};

/* ─── Select ─── */

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoAdvance?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Выберите…",
  className = "",
  autoAdvance,
}) => {
  const ref = React.useRef<HTMLSelectElement>(null);

  return (
    <div className="mb-4">
      <label className="ml-1 mb-2 block text-[13px] font-semibold uppercase tracking-[0.08em] text-stone-500/90">
        {label}
      </label>
      <select
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (autoAdvance && e.target.value && ref.current) {
            scrollToNext(ref.current);
          }
        }}
        className={`input-glass w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_16px_center] bg-no-repeat px-4 py-3.5 pr-10 text-stone-800 ${
          value ? "input-success" : ""
        } ${className}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

