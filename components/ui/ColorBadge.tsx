'use client';

import clsx from 'clsx';

interface ColorBadgeProps {
  category: 'pink' | 'green' | 'red' | 'blue';
  text: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ColorBadge({ category, text, size = 'md' }: ColorBadgeProps) {
  const colorClasses = {
    pink: 'bg-pink-100 text-pink-800 border-pink-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border font-medium',
        colorClasses[category],
        sizeClasses[size]
      )}
    >
      {text}
    </span>
  );
}