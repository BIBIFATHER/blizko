
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
    className={`bg-white rounded-2xl shadow-sm border border-stone-100 p-6 transition-transform duration-200 ${onClick ? 'active:scale-[0.98] cursor-pointer' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading, 
  ...props 
}) => {
  const baseStyles = "w-full py-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.96] flex items-center justify-center gap-2 text-lg touch-manipulation select-none";
  
  const variants = {
    primary: "bg-amber-300 hover:bg-amber-400 text-stone-900 shadow-sm hover:shadow-md",
    secondary: "bg-sky-100 hover:bg-sky-200 text-sky-900",
    outline: "border-2 border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50",
    ghost: "text-stone-500 hover:text-stone-800 text-sm py-2"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
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
      className={`w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-200/50 focus:border-amber-300 transition-all placeholder:text-stone-300 ${className}`}
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
      className={`w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-200/50 focus:border-amber-300 transition-all placeholder:text-stone-300 min-h-[100px] resize-none ${className}`}
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
  <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-stone-50 rounded-lg transition-colors -ml-2 select-none active:scale-[0.98]">
    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-sky-200 border-sky-300' : 'border-stone-300 bg-white'}`}>
      {checked && <svg className="w-4 h-4 text-sky-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
    </div>
    <span className="text-stone-700">{label}</span>
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
      <label className="block text-sm font-medium text-stone-500 mb-2 ml-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isActive = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95 flex items-center gap-2 select-none ${
                isActive 
                  ? 'bg-stone-800 text-white shadow-md ring-2 ring-stone-800 ring-offset-1' 
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              {!single && isActive && <Check size={14} strokeWidth={3} />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};
