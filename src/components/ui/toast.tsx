import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

/* ─── Types ─── */

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

/* ─── Context ─── */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ─── Provider ─── */

interface ToastProviderProps {
  children: React.ReactNode;
  duration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  duration = 4000,
}) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `toast-${++counter.current}`;
      setItems((prev) => [...prev, { id, message, variant }]);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — fixed bottom-center, above safe area */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        aria-live="polite"
        role="status"
      >
        {items.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            duration={duration}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/* ─── Individual Toast ─── */

const variantStyles: Record<
  ToastVariant,
  { bg: string; icon: React.ReactNode }
> = {
  success: {
    bg: "bg-green-50 border-green-200/60 text-green-800",
    icon: <CheckCircle size={18} className="text-green-600 shrink-0" />,
  },
  error: {
    bg: "bg-red-50 border-red-200/60 text-red-800",
    icon: <AlertCircle size={18} className="text-red-600 shrink-0" />,
  },
  warning: {
    bg: "bg-amber-50 border-amber-200/60 text-amber-800",
    icon: <AlertCircle size={18} className="text-amber-600 shrink-0" />,
  },
  info: {
    bg: "bg-stone-50 border-stone-200/60 text-stone-800",
    icon: <Info size={18} className="text-stone-500 shrink-0" />,
  },
};

interface ToastCardProps {
  item: ToastItem;
  duration: number;
  onDismiss: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ item, duration, onDismiss }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (exiting) {
      const timer = setTimeout(onDismiss, 300);
      return () => clearTimeout(timer);
    }
  }, [exiting, onDismiss]);

  const style = variantStyles[item.variant];

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 ${
        style.bg
      } ${exiting ? "translate-y-4 opacity-0" : "animate-slide-up"}`}
    >
      {style.icon}
      <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
      <button
        onClick={() => setExiting(true)}
        className="shrink-0 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Закрыть"
        type="button"
      >
        <X size={14} />
      </button>
    </div>
  );
};
