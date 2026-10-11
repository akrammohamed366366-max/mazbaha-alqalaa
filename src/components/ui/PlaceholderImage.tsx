import React, { useState } from 'react';
import { Flame } from 'lucide-react';

interface PlaceholderImageProps {
  imageUrl?: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const PlaceholderImage: React.FC<PlaceholderImageProps> = ({
  imageUrl,
  alt,
  className = 'w-full h-full',
  width = 400,
  height = 300,
}) => {
  const [hasError, setHasError] = useState(false);

  // If no imageUrl or if loading fails, render an elegant grill artwork placeholder
  if (!imageUrl || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#1F2A2E]/5 border border-[#DDE5E3] text-[#1E6B64] p-4 text-center select-none ${className}`}
        aria-label={alt}
      >
        <div className="w-10 h-10 rounded-full bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center mb-1">
          <Flame className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-medium text-[#1F2A2E]/70 line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
      decoding="async"
    />
  );
};
