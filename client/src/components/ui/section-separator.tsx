import React from 'react';

interface SectionSeparatorProps {
  className?: string;
}

export const SectionSeparator = ({ className = "" }: SectionSeparatorProps) => {
  return (
    <div className={`w-full flex items-center justify-center my-8 ${className}`}>
      <div className="h-[2px] bg-[#FF6B35] w-24 mx-auto"></div>
    </div>
  );
};
