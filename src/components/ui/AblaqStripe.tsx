import React from 'react';

interface AblaqStripeProps {
  className?: string;
  height?: number;
}

export const AblaqStripe: React.FC<AblaqStripeProps> = ({
  className = '',
  height = 4,
}) => {
  return (
    <div
      className={`ablaq-stripe ${className}`}
      style={{ height: `${height}px` }}
      role="separator"
      aria-hidden="true"
    />
  );
};
