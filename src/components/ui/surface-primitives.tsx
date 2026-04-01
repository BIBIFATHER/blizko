import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  onClick,
  ...props
}) => (
  <div
    onClick={onClick}
    className={`surface-card card-cloud p-5 sm:p-6 transition-all duration-300 hover-lift ${
      onClick ? "active:scale-[0.985] cursor-pointer" : ""
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

/* ─── Divider ─── */

interface DividerProps {
  className?: string;
}

/**
 * Tonal divider — uses background color shift instead of a border line.
 * Follows the design system "No-Line" rule.
 */
export const Divider: React.FC<DividerProps> = ({ className = "" }) => (
  <div
    className={`my-4 h-px bg-stone-100/80 ${className}`}
    role="separator"
    aria-orientation="horizontal"
  />
);

/* ─── Section ─── */

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  className = "",
  ...props
}) => (
  <section
    className={`section-shell p-5 sm:p-6 ${className}`}
    {...props}
  >
    {children}
  </section>
);

/* ─── Curator's Note ─── */

interface CuratorsNoteProps {
  children: React.ReactNode;
  author?: string;
  className?: string;
}

/**
 * Signature editorial card for platform recommendations.
 * Uses Newsreader Italic typography and asymmetric padding.
 */
export const CuratorsNote: React.FC<CuratorsNoteProps> = ({
  children,
  author = "Команда Blizko",
  className = "",
}) => (
  <div
    className={`relative rounded-2xl bg-amber-50/50 px-6 pt-8 pb-6 ${className}`}
  >
    <span className="absolute top-3.5 left-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-600/70">
      Заметка куратора
    </span>
    <blockquote className="font-serif italic text-stone-700 leading-relaxed text-[15px]">
      {children}
    </blockquote>
    {author && (
      <p className="mt-3 text-xs font-medium text-stone-400">— {author}</p>
    )}
  </div>
);
