import React from "react";
import { AlertCircle, Info, ShieldCheck } from "lucide-react";

import { Button } from "./form-primitives";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "trust" | "warning" | "status" | "success" | "danger" | "info" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "trust",
  icon,
  className = "",
}) => {
  const variants = {
    trust: "trust-badge",
    warning: "trust-badge trust-badge-warning",
    status: "trust-badge bg-red-100 text-red-700",
    success: "trust-badge bg-green-100 text-green-700",
    danger: "trust-badge bg-red-100 text-red-700",
    info: "trust-badge trust-badge-blue",
    neutral: "trust-badge bg-stone-100 text-stone-600",
  } as const;

  const defaultIcons = {
    trust: <ShieldCheck size={12} />,
    warning: <AlertCircle size={12} />,
    status: <AlertCircle size={12} />,
    success: <ShieldCheck size={12} />,
    danger: <AlertCircle size={12} />,
    info: <Info size={12} />,
    neutral: null,
  } as const;

  return (
    <span className={`${variants[variant]} ${className}`}>
      {icon !== undefined ? icon : defaultIcons[variant]}
      {children}
    </span>
  );
};

interface ProgressBarProps {
  value: number;
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showPercent = false,
  className = "",
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-xs font-medium text-stone-500">{label}</span>}
          {showPercent && (
            <span className="text-xs font-semibold text-amber-700">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
      >
        <div className="progress-bar-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
};

interface StatusIndicatorProps {
  status: "active" | "pending" | "inactive";
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  className = "",
}) => {
  const dotClass = {
    active: "status-dot status-dot-active",
    pending: "status-dot status-dot-pending",
    inactive: "status-dot status-dot-inactive",
  } as const;

  const labelColor = {
    active: "text-green-700",
    pending: "text-amber-700",
    inactive: "text-stone-400",
  } as const;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={dotClass[status]} />
      {label && <span className={`text-xs font-medium ${labelColor[status]}`}>{label}</span>}
    </div>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => (
  <div className={`empty-state ${className}`}>
    {icon && <div className="empty-state-icon">{icon}</div>}
    <h3 className="mb-1 text-lg font-semibold text-stone-700">{title}</h3>
    {description && <p className="mb-4 max-w-xs text-sm text-stone-400">{description}</p>}
    {actionLabel && onAction && (
      <Button className="w-auto px-6" onClick={onAction} variant="primary">
        {actionLabel}
      </Button>
    )}
  </div>
);

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  ...props
}) => (
  <div
    className={`animate-pulse rounded-2xl bg-stone-100/80 ${className}`}
    {...props}
  />
);

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Что-то пошло не так",
  description = "Произошла непредвиденная ошибка. Пожалуйста, попробуйте еще раз.",
  onRetry,
  className = "",
}) => (
  <div className={`empty-state ${className}`}>
    <div className="empty-state-icon bg-red-50 text-red-500">
      <AlertCircle size={32} />
    </div>
    <h3 className="mb-2 text-xl font-bold text-stone-800">{title}</h3>
    <p className="mb-6 max-w-sm text-stone-500">{description}</p>
    {onRetry && (
      <Button className="w-auto bg-white px-6 hover-lift" onClick={onRetry} variant="outline">
        Попробовать снова
      </Button>
    )}
  </div>
);
