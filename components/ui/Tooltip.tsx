'use client';

import { ReactNode, useState } from 'react';
import { TooltipData } from '@/types/measurementDefinition.types';

interface TooltipProps {
  content: string | TooltipData;
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

  // Check if content is rich data or simple string
  const isRichContent = typeof content === 'object' && content !== null;

  const renderSimpleContent = (text: string) => (
    <div className="whitespace-nowrap">
      {text}
    </div>
  );

  const renderRichContent = (data: TooltipData) => (
    <div className="max-w-md space-y-2 whitespace-normal">
      {/* Title */}
      {data.title && (
        <div className="font-bold text-base border-b border-gray-700 pb-1">
          {data.title}
        </div>
      )}

      {/* Full Name */}
      {data.fullName && (
        <div className="text-xs text-gray-300 italic">
          {data.fullName}
        </div>
      )}

      {/* Description */}
      {data.description && (
        <div className="text-sm leading-relaxed">
          {data.description}
        </div>
      )}

      {/* Normal Range */}
      {data.normalRange && (
        <div className="bg-blue-900 bg-opacity-50 rounded px-2 py-1 text-sm">
          <span className="font-semibold">정상 범위:</span> {data.normalRange}
        </div>
      )}

      {/* Interpretation */}
      {data.interpretation && (
        <div className="space-y-1 text-xs">
          {data.interpretation.high && (
            <div className="flex items-start">
              <span className="text-red-400 mr-1">▲</span>
              <span>{data.interpretation.high}</span>
            </div>
          )}
          {data.interpretation.low && (
            <div className="flex items-start">
              <span className="text-blue-400 mr-1">▼</span>
              <span>{data.interpretation.low}</span>
            </div>
          )}
        </div>
      )}

      {/* Clinical Note */}
      {data.clinicalNote && (
        <div className="bg-yellow-900 bg-opacity-30 rounded px-2 py-1 text-xs border-l-2 border-yellow-500">
          <span className="font-semibold">임상참고:</span> {data.clinicalNote}
        </div>
      )}

      {/* Measurement Method */}
      {data.measurementMethod && (
        <div className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-700">
          📏 {data.measurementMethod}
        </div>
      )}
    </div>
  );

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
            absolute z-50 px-4 py-3 text-white bg-gray-900 rounded-lg shadow-xl
            pointer-events-none
            ${positionClasses[position]}
            animate-fadeIn
            ${isRichContent ? 'min-w-[320px]' : ''}
          `}
        >
          {isRichContent ? renderRichContent(content as TooltipData) : renderSimpleContent(content as string)}
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