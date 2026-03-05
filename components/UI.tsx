
import React from 'react';
import { Check } from 'lucide-react';

// --- Card ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, ...props }) => (
  <div
    onClick={onClick}
    className={`bg-white/95 backdrop-blur-sm rounded-3xl card-cloud border border-stone-100/80 p-5 sm:p-6 transition-transform duration-200 ${onClick ? 'active:scale-[0.98] cursor-pointer' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
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
  const baseStyles = "w-full py-3.5 sm:py-4 rounded-full font-semibold transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 text-base sm:text-lg touch-manipulation select-none";

  const variants = {
    primary: `btn-honey ring-1 ring-amber-100/40 ${pulse && !props.disabled ? 'btn-honey-pulse' : ''}`,
    secondary: "bg-white/70 backdrop-blur-sm border border-stone-200/60 text-stone-700 hover:bg-white/90 shadow-sm",
    outline: "border border-stone-200/80 text-stone-600 hover:border-amber-200 hover:bg-amber-50/30",
    ghost: "text-stone-500 hover:text-stone-800 text-sm py-2"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${isLoading || props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-stone-700 border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-stone-500 mb-1.5 ml-1">{label}</label>
    <input
      className={`input-glass w-full px-4 py-3.5 text-stone-800 placeholder:text-stone-300/80 ${className}`}
      {...props}
    />
  </div>
);

// --- Textarea ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-stone-500 mb-1.5 ml-1">{label}</label>
    <textarea
      className={`input-glass w-full px-4 py-3.5 text-stone-800 placeholder:text-stone-300/80 min-h-[100px] resize-none ${className}`}
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
  <label className="flex items-center gap-3 cursor-pointer py-2 px-1 rounded-xl transition-all -ml-1 select-none active:scale-[0.98]">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${checked
        ? 'chip-warm border border-amber-200/60'
        : 'border-2 border-stone-200 bg-white/60'
      }`}>
      {checked && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}
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
  const toggle = (option: string) => {
    if (single) {
      onChange([option]);
    } else {
      if (selected.includes(option)) {
        onChange(selected.filter(i => i !== option));
      } else {
        onChange([...selected, option]);
      }
    }
  };

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-stone-500 mb-2.5 ml-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isActive = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 flex items-center gap-2 select-none border ${isActive
                  ? 'chip-warm shadow-sm'
                  : 'bg-white/60 backdrop-blur-sm border-stone-200/60 text-stone-600 hover:border-amber-200/60 hover:bg-amber-50/30'
                }`}
            >
              {!single && isActive && <Check size={13} strokeWidth={3} />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};
