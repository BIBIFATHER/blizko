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
