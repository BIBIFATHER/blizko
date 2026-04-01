import React from "react";
import { ShieldCheck } from "lucide-react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  badge?: "verified" | "premium";
  className?: string;
}

const sizeMap: Record<AvatarSize, { box: string; text: string; badge: string }> = {
  sm: { box: "h-8 w-8", text: "text-xs", badge: "h-3.5 w-3.5 -bottom-0.5 -right-0.5" },
  md: { box: "h-11 w-11", text: "text-sm", badge: "h-4 w-4 -bottom-0.5 -right-0.5" },
  lg: { box: "h-16 w-16", text: "text-lg", badge: "h-5 w-5 -bottom-0.5 -right-0.5" },
  xl: { box: "h-24 w-24", text: "text-2xl", badge: "h-6 w-6 -bottom-1 -right-1" },
};

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  badge,
  className = "",
}) => {
  const s = sizeMap[size];
  const [imgError, setImgError] = React.useState(false);
  const showImage = src && !imgError;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${s.box} flex items-center justify-center rounded-full overflow-hidden transition-all duration-300`}
        aria-label={name ? `Аватар: ${name}` : "Аватар"}
      >
        {showImage ? (
          <img
            src={src}
            alt={name || ""}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-amber-50 ${s.text} font-semibold text-amber-700`}>
            {getInitials(name)}
          </div>
        )}
      </div>

      {badge && (
        <span
          className={`absolute ${s.badge} flex items-center justify-center rounded-full ${
            badge === "verified"
              ? "bg-green-500 text-white"
              : "bg-amber-400 text-white"
          } ring-2 ring-white`}
          aria-label={badge === "verified" ? "Проверена" : "Премиум"}
        >
          <ShieldCheck size={size === "sm" ? 8 : size === "md" ? 10 : 12} strokeWidth={3} />
        </span>
      )}
    </div>
  );
};
