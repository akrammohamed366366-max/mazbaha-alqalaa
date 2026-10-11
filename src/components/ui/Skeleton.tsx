import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => {
  return (
    <div
      className={`animate-pulse bg-[#1F2A2E]/10 rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
};
