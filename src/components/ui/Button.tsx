import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-[#C23B22] text-white hover:bg-[#a9311b] shadow-sm hover:shadow active:bg-[#912814]',
    secondary:
      'bg-[#1E6B64] text-white hover:bg-[#17534d] shadow-sm hover:shadow active:bg-[#12423d]',
    outline:
      'bg-transparent border border-[#DDE5E3] text-[#1F2A2E] hover:bg-[#F5F7F6] active:bg-[#EAEFEA]',
    ghost:
      'bg-transparent text-[#1F2A2E] hover:bg-[#1F2A2E]/5 active:bg-[#1F2A2E]/10',
    danger:
      'bg-red-700 text-white hover:bg-red-800 shadow-sm active:bg-red-900',
  };

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
