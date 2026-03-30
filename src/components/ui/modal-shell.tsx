import React, { useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";

type ModalVariant = "sheet" | "card";

interface ModalShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  closeLabel?: string;
  onClose?: () => void;
  panelClassName?: string;
  showCloseButton?: boolean;
  variant?: ModalVariant;
}

const overlayClasses: Record<ModalVariant, string> = {
  sheet:
    "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/45 backdrop-blur-sm animate-fade-in",
  card:
    "fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in",
};

const panelClasses: Record<ModalVariant, string> = {
  sheet:
    "w-full max-w-md sheet-modal card-cloud overflow-hidden animate-slide-up relative border-b-0 sm:border-b",
  card:
    "w-full max-w-md rounded-3xl card-cloud border border-stone-100/80 overflow-hidden animate-slide-up flex flex-col max-h-[85vh]",
};

export const ModalShell: React.FC<ModalShellProps> = ({
  children,
  className = "",
  closeLabel = "Закрыть",
  onClose,
  panelClassName = "",
  showCloseButton = false,
  variant = "card",
  ...props
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClose && panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div
      className={`${overlayClasses[variant]} ${className}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={closeLabel}
      {...props}
    >
      <div ref={panelRef} className={`${panelClasses[variant]} ${panelClassName}`}>
        {showCloseButton && onClose && (
          <button
            aria-label={closeLabel}
            className="absolute right-4 top-4 z-10 rounded-full border border-white/70 bg-white/80 p-2 text-stone-400 shadow-sm transition-colors hover:text-stone-800"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};
