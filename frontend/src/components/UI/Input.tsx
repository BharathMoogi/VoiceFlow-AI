import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-[12px] font-semibold text-gray-400 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          className={`w-full bg-[#1F2937]/60 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 backdrop-blur-sm transition-all duration-200 ${
            leftIcon ? "pl-9" : ""
          } ${
            error ? "border-red-500/40 focus:border-red-500/40 focus:ring-red-500/10" : ""
          } ${className}`}
          {...props}
        />
      </div>
      {hint && !error && <span className="text-[11px] text-gray-700">{hint}</span>}
      {error && <span className="text-[11px] text-red-400 font-medium">{error}</span>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  hint,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-[12px] font-semibold text-gray-400 tracking-wide">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full bg-[#1F2937]/60 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 backdrop-blur-sm transition-all duration-200 min-h-[110px] resize-y ${
          error ? "border-red-500/40 focus:border-red-500/40 focus:ring-red-500/10" : ""
        } ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-[11px] text-gray-700">{hint}</span>}
      {error && <span className="text-[11px] text-red-400 font-medium">{error}</span>}
    </div>
  );
};
