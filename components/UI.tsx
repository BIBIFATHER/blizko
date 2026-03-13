
import React from 'react';
import { Check, ShieldCheck, AlertCircle, Info, Loader2 } from 'lucide-react';

const scrollToNext = (el: HTMLElement) => {
  const container = el.closest('form') || document.body;
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-auto-advance-target="true"], input, textarea, select, button'
    )
  ).filter((node) => !node.hasAttribute('disabled'));

  const idx = focusables.indexOf(el);
  const target = idx >= 0 ? focusables[idx + 1] : null;
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// --- Card ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, ...props }) => (
  <div
    onClick={onClick}
    className={`bg-white/95 backdrop-blur-sm rounded-3xl card-cloud border border-stone-100/80 p-5 sm:p-6 transition-all duration-300 hover-lift hover:shadow-lg ${onClick ? 'active:scale-[0.98] cursor-pointer' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  isLoading?: boolean;
  pulse?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  isLoading,
  pulse,
  ...props
}) => {
  const baseStyles = "w-full py-3.5 sm:py-4 rounded-full font-semibold transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2 text-base sm:text-lg touch-manipulation select-none hover-lift";

  const variants = {
    primary: `btn-honey ring-1 ring-amber-100/40 ${pulse && !props.disabled ? 'btn-honey-pulse' : ''}`,
    secondary: "bg-white/70 backdrop-blur-sm border border-stone-200/60 text-stone-700 hover:bg-white/90 shadow-sm",
    outline: "border border-stone-200/80 text-stone-600 hover:border-amber-200 hover:bg-amber-50/30",
    ghost: "text-stone-500 hover:text-stone-800 text-sm py-2",
    danger: "bg-red-50 border border-red-200/60 text-red-700 hover:bg-red-100/80 shadow-sm"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${isLoading || props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  autoAdvance?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, className = '', autoAdvance, onBlur, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-stone-500 mb-1.5 ml-1">{label}</label>
    <input
      data-auto-advance-target={autoAdvance ? 'true' : undefined}
      onBlur={(e) => {
        onBlur?.(e);
        if (autoAdvance && e.currentTarget.value.trim() !== '') {
          scrollToNext(e.currentTarget);
        }
      }}
      className={`input-glass w-full px-4 py-3.5 text-stone-800 placeholder:text-stone-300/80 ${props.value && String(props.value).trim() !== '' ? 'input-success' : ''} ${className}`}
      {...props}
    />
  </div>
);

// --- Textarea ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  autoAdvance?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', autoAdvance, onBlur, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-stone-500 mb-1.5 ml-1">{label}</label>
    <textarea
      data-auto-advance-target={autoAdvance ? 'true' : undefined}
      onBlur={(e) => {
        onBlur?.(e);
        if (autoAdvance && e.currentTarget.value.trim() !== '') {
          scrollToNext(e.currentTarget);
        }
      }}
      className={`input-glass w-full px-4 py-3.5 text-stone-800 placeholder:text-stone-300/80 min-h-[100px] resize-none ${props.value && String(props.value).trim() !== '' ? 'input-success' : ''} ${className}`}
      {...props}
    />
  </div>
);

// --- Checkbox ---
interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer py-3 px-1 rounded-xl transition-all -ml-1 select-none active:scale-[0.98] min-h-[44px]">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${checked
      ? 'chip-warm border border-amber-200/60'
      : 'border-2 border-stone-200 bg-white/60 hover:bg-white hover:border-stone-300'
      }`}>
      {checked && <Check className="w-3.5 h-3.5 animate-scale-in text-stone-700" strokeWidth={3} />}
    </div>
    <span className="text-stone-700 text-sm">{label}</span>
    <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  </label>
);

// --- Select / Chip Group ---
interface ChipGroupProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  single?: boolean;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({ label, options, selected, onChange, single = false }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const toggle = (option: string) => {
    if (single) {
      if (!selected.includes(option)) {
        onChange([option]);
        // Smart predictive scroll to next element
        setTimeout(() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const isMobile = window.innerWidth < 768;
            if (isMobile && rect.bottom > window.innerHeight * 0.7) {
              window.scrollBy({ top: rect.height + 40, behavior: 'smooth' });
            }
          }
        }, 150);
      }
    } else {
      if (selected.includes(option)) {
        onChange(selected.filter(i => i !== option));
      } else {
        onChange([...selected, option]);
      }
    }
  };

  return (
    <div className="mb-5" ref={containerRef}>
      <label className="block text-sm font-medium text-stone-500 mb-2.5 ml-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isActive = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all duration-200 active:scale-95 flex items-center gap-2 select-none border hover-lift ${isActive
                ? 'chip-warm shadow-sm'
                : 'bg-white/60 backdrop-blur-sm border-stone-200/60 text-stone-600 hover:border-amber-200/60 hover:bg-amber-50/30'
                }`}
            >
              {!single && isActive && <Check className="animate-scale-in" size={14} strokeWidth={3} />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Range Slider ---
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

export const RangeSlider: React.FC<RangeSliderProps> = ({ label, min, max, step, value, onChange, formatValue = (v) => v.toString(), autoAdvance }) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState<'min' | 'max' | null>(null);

  const getPercent = (val: number) => ((val - min) / (max - min)) * 100;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, type: 'min' | 'max') => {
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

    if (isDragging === 'min') {
      onChange([Math.min(newValue, value[1] - step), value[1]]);
    } else {
      onChange([value[0], Math.max(newValue, value[0] + step)]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (autoAdvance && wrapperRef.current) {
        scrollToNext(wrapperRef.current);
      }
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
    <div className="mb-6 select-none touch-none" data-auto-advance-target="true" ref={wrapperRef}>
      <div className="flex justify-between items-end mb-3 ml-1">
        <label className="block text-sm font-medium text-stone-500">{label}</label>
        <div className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100/50">
          {formatValue(value[0])} - {formatValue(value[1])}
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative h-2 bg-stone-200/70 rounded-full cursor-pointer mt-4"
        onClick={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="absolute h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full"
          style={{ left: `${getPercent(value[0])}%`, right: `${100 - getPercent(value[1])}%` }}
        />

        <div
          className="absolute top-1/2 -ml-[18px] -mt-[18px] w-9 h-9 bg-white border border-stone-200 rounded-full shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center hover:scale-110 active:scale-95 active:shadow-inner transition-transform"
          style={{ left: `${getPercent(value[0])}%` }}
          onPointerDown={(e) => handlePointerDown(e, 'min')}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>

        <div
          className="absolute top-1/2 -ml-[18px] -mt-[18px] w-9 h-9 bg-white border border-stone-200 rounded-full shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center hover:scale-110 active:scale-95 active:shadow-inner transition-transform"
          style={{ left: `${getPercent(value[1])}%` }}
          onPointerDown={(e) => handlePointerDown(e, 'max')}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>
      </div>
    </div>
  );
};

// --- Badge (Trust / Status / Info) ---
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'trust' | 'warning' | 'info' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'trust', icon, className = '' }) => {
  const variants = {
    trust: 'trust-badge',
    warning: 'trust-badge trust-badge-warning',
    info: 'trust-badge trust-badge-blue',
    neutral: 'trust-badge bg-stone-100 text-stone-600',
  };

  const defaultIcons = {
    trust: <ShieldCheck size={12} />,
    warning: <AlertCircle size={12} />,
    info: <Info size={12} />,
    neutral: null,
  };

  return (
    <span className={`${variants[variant]} ${className}`}>
      {icon !== undefined ? icon : defaultIcons[variant]}
      {children}
    </span>
  );
};

// --- ProgressBar (Goal-Gradient) ---
interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, showPercent = false, className = '' }) => {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs font-medium text-stone-500">{label}</span>}
          {showPercent && <span className="text-xs font-semibold text-amber-700">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
};

// --- StatusIndicator ---
interface StatusIndicatorProps {
  status: 'active' | 'pending' | 'inactive';
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label, className = '' }) => {
  const dotClass = {
    active: 'status-dot status-dot-active',
    pending: 'status-dot status-dot-pending',
    inactive: 'status-dot status-dot-inactive',
  };

  const labelColor = {
    active: 'text-green-700',
    pending: 'text-amber-700',
    inactive: 'text-stone-400',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={dotClass[status]} />
      {label && <span className={`text-xs font-medium ${labelColor[status]}`}>{label}</span>}
    </div>
  );
};

// --- EmptyState (Activation Energy) ---
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction, className = '' }) => (
  <div className={`empty-state ${className}`}>
    {icon && <div className="empty-state-icon">{icon}</div>}
    <h3 className="text-lg font-semibold text-stone-700 mb-1">{title}</h3>
    {description && <p className="text-sm text-stone-400 max-w-xs mb-4">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="primary" onClick={onAction} className="w-auto px-6">
        {actionLabel}
      </Button>
    )}
  </div>
);

// --- ErrorState (Fallback UI) ---
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Что-то пошло не так',
  description = 'Произошла непредвиденная ошибка. Пожалуйста, попробуйте еще раз.',
  onRetry,
  className = ''
}) => (
  <div className={`empty-state ${className}`}>
    <div className="empty-state-icon bg-red-50 text-red-500">
      <AlertCircle size={32} />
    </div>
    <h3 className="text-xl font-bold text-stone-800 mb-2">{title}</h3>
    <p className="text-stone-500 max-w-sm mb-6">{description}</p>
    {onRetry && (
      <Button variant="outline" onClick={onRetry} className="w-auto px-6 hover-lift bg-white">
        Попробовать снова
      </Button>
    )}
  </div>
);
