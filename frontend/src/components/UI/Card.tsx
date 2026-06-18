import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glow?: "purple" | "blue" | "green" | "none";
  variant?: "default" | "glass" | "outlined" | "elevated";
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  hoverEffect = false,
  glow = "none",
  variant = "glass",
  ...props
}) => {
  const glowMap = {
    purple: "hover:shadow-[0_8px_40px_rgba(139,92,246,0.2)] hover:border-violet-500/30",
    blue:   "hover:shadow-[0_8px_40px_rgba(59,130,246,0.18)] hover:border-blue-500/30",
    green:  "hover:shadow-[0_8px_40px_rgba(34,197,94,0.15)] hover:border-emerald-500/30",
    none:   "",
  };

  const variantMap = {
    default:  "bg-[#1F2937]/70 border border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.35)]",
    glass:    "glass-card",
    outlined: "bg-transparent border border-white/[0.08]",
    elevated: "bg-[#1F2937] border border-white/[0.06] shadow-[0_16px_48px_rgba(0,0,0,0.5)]",
  };

  return (
    <div
      className={`rounded-2xl p-6 transition-all duration-300 ease-out stat-card ${variantMap[variant]} ${
        hoverEffect
          ? `hover:-translate-y-1 cursor-pointer ${glowMap[glow]}`
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`mb-4 flex flex-col space-y-1.5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <h3
    className={`text-base font-semibold leading-none tracking-tight text-white ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <p className={`text-sm text-gray-400 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`mt-6 flex items-center space-x-2 ${className}`} {...props}>
    {children}
  </div>
);
