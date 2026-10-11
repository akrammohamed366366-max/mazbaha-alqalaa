import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div className="w-full text-start">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-[#1F2A2E] mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-[#1F2A2E] placeholder:text-[#1F2A2E]/40 focus:outline-none focus:ring-2 focus:ring-[#1E6B64]/20 transition-all ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-[#DDE5E3] focus:border-[#1E6B64]'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {helper && !error && <p className="text-xs text-[#1F2A2E]/60 mt-1">{helper}</p>}
    </div>
  );
};
