import React from 'react';

interface PillProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const Pill: React.FC<PillProps> = ({
  label,
  active = false,
  count,
  onClick,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${sizeClasses} ${
        active
          ? 'bg-[#1E6B64] text-white shadow-xs'
          : 'bg-white text-[#1F2A2E] border border-[#DDE5E3] hover:bg-[#F5F7F6]'
      } ${className}`}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`ms-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            active ? 'bg-white/20 text-white' : 'bg-[#DDE5E3] text-[#1F2A2E]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
