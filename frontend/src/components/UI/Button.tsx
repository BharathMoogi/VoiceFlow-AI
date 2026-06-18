import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger" | "gradient-purple" | "gradient-blue";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] select-none whitespace-nowrap";

  const variants: Record<string, string> = {
    primary:
      "btn-gradient-primary text-white",
    secondary:
      "btn-gradient-secondary text-white",
    accent:
      "bg-emerald-500/90 hover:bg-emerald-400 text-[#030712] font-bold shadow-[0_4px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_28px_rgba(34,197,94,0.45)] hover:-translate-y-0.5",
    outline:
      "border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-violet-500/30 text-gray-200 hover:text-white backdrop-blur-sm",
    ghost:
      "bg-transparent hover:bg-white/[0.05] text-gray-400 hover:text-white",
    danger:
      "bg-red-600/90 hover:bg-red-500 text-white shadow-[0_4px_16px_rgba(239,68,68,0.25)] hover:shadow-[0_6px_24px_rgba(239,68,68,0.4)] hover:-translate-y-0.5",
    "gradient-purple":
      "btn-gradient-primary text-white",
    "gradient-blue":
      "btn-gradient-secondary text-white",
  };

  const sizes: Record<string, string> = {
    xs: "px-2.5 py-1 text-[11px] gap-1.5",
    sm: "px-3.5 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-2.5 text-sm gap-2",
  };

  const spinnerSizes: Record<string, string> = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4.5 w-4.5",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className={`animate-spin ${spinnerSizes[size]} text-current flex-shrink-0`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading…</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
