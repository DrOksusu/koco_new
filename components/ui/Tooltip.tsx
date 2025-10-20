'use client';

import { ReactNode, useState } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({
  content,
  children,
  position = 'top'
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={`
            absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg
            whitespace-nowrap pointer-events-none
            ${positionClasses[position]}
            animate-fadeIn
          `}
        >
          {content}
          <div
            className={`
              absolute w-0 h-0 border-4 border-transparent
              ${position === 'top' ? 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900' : ''}
              ${position === 'bottom' ? 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900' : ''}
              ${position === 'left' ? 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900' : ''}
              ${position === 'right' ? 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
}