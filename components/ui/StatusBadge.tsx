'use client';

import clsx from 'clsx';

interface StatusBadgeProps {
  value: number | undefined;
  mean?: number;
  threshold?: number;
}

export default function StatusBadge({ value, mean, threshold = 5 }: StatusBadgeProps) {
  if (!value) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        -
      </span>
    );
  }

  const getStatus = () => {
    if (!mean) return 'normal';
    const diff = Math.abs(value - mean);
    if (diff < threshold) return 'normal';
    if (diff < threshold * 2) return 'warning';
    return 'critical';
  };

  const status = getStatus();

  const statusClasses = {
    normal: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800'
  };

  const statusText = {
    normal: '정상',
    warning: '주의',
    critical: '위험'
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        statusClasses[status]
      )}
    >
      {statusText[status]}
    </span>
  );
}