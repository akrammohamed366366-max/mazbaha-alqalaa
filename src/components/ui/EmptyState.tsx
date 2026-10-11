import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white rounded-3xl border border-[#DDE5E3]">
      <div className="w-16 h-16 rounded-2xl bg-[#1E6B64]/10 text-[#1E6B64] flex items-center justify-center mb-4">
        {icon || <UtensilsCrossed className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-bold font-headline text-[#1F2A2E] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#1F2A2E]/60 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
