import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col space-y-1">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-zinc-400">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200 ${
          error ? "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/30" : ""
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col space-y-1">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-zinc-400">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-200 min-h-[100px] resize-y ${
          error ? "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/30" : ""
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
    </div>
  );
};
