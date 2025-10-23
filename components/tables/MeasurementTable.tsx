'use client';

import { useEffect, useState } from 'react';
import { useMeasurementStore } from '@/store/measurementStore';
import { MEASUREMENT_DATA, CATEGORIES } from '@/lib/constants/measurements';
import Tooltip from '@/components/ui/Tooltip';
import clsx from 'clsx';
import { MeasurementDefinition, TooltipData } from '@/types/measurementDefinition.types';

export default function MeasurementTable() {
  const {
    measurements,
    updateSingleMeasurement,
    definitions,
    fetchDefinitions,
    definitionsLoading
  } = useMeasurementStore();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Fetch definitions on mount
  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  // Convert definition to rich tooltip data
  const convertToTooltipData = (def: MeasurementDefinition): TooltipData => {
    let normalRange = '';
    if (def.normalRangeMin !== null && def.normalRangeMax !== null) {
      normalRange = `${def.normalRangeMin}~${def.normalRangeMax}${def.unit}`;
    }

    return {
      title: def.titleKo || def.name,
      fullName: def.fullName || undefined,
      description: def.description || undefined,
      normalRange: normalRange || undefined,
      interpretation: {
        high: def.interpretationHigh || undefined,
        low: def.interpretationLow || undefined
      },
      clinicalNote: def.clinicalNote || undefined,
      measurementMethod: def.measurementMethod || undefined
    };
  };

  // Use definitions from DB if available, otherwise fall back to hardcoded data
  const displayData = definitions.length > 0
    ? definitions.map(def => ({
        name: def.name,
        category: def.category,
        unit: def.unit,
        meanValue: def.meanValue,
        tooltipData: convertToTooltipData(def)
      }))
    : MEASUREMENT_DATA.map(item => ({
        name: item.name,
        category: item.category,
        unit: item.unit,
        meanValue: item.meanDegree || item.meanLength || 0,
        tooltipData: item.tooltip // fallback to simple string
      }));

  const getCategoryStyle = (category: string) => {
    return CATEGORIES[category] || CATEGORIES.blue;
  };

  const formatValue = (value: number | string | undefined, unit: string): string => {
    if (value === undefined || value === '' || value === null) return '-';
    // 숫자인 경우 소수점 첫째 자리로 반올림
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue) && numValue !== null) {
      return `${numValue.toFixed(1)}${unit}`;
    }
    return `${value}${unit}`;
  };

  const calculateDifference = (actual: number | undefined, mean: number | undefined): string => {
    if (!actual || !mean) return '-';
    const diff = actual - mean;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`;
  };

  const getDifferenceColor = (actual: number | undefined, mean: number | undefined): string => {
    if (!actual || !mean) return '';
    const diff = Math.abs(actual - mean);
    const percentage = (diff / mean) * 100;

    if (percentage > 15) return 'text-red-600 font-bold';
    if (percentage > 10) return 'text-orange-500 font-semibold';
    if (percentage > 5) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const handleCellEdit = (name: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateSingleMeasurement(name, numValue);
    }
    setEditingCell(null);
    setTempValue('');
  };

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
      <table className="min-w-full bg-white">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
          <tr className="border-b-2 border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              계측항목
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
              카테고리
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
              평균값
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
              계측값
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
              차이
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {definitionsLoading ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                  <span>계측값 정의를 불러오는 중...</span>
                </div>
              </td>
            </tr>
          ) : (
            displayData.map((item, index) => {
              const currentValue = measurements[item.name];
              const meanValue = item.meanValue || 0;
              const categoryStyle = getCategoryStyle(item.category);

              return (
                <tr
                  key={`${item.name}-${index}`}
                  className="hover:bg-gray-50 transition-all duration-150"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Tooltip content={item.tooltipData} position="right">
                      <span className="text-sm font-medium text-gray-900 cursor-help">
                        {item.name}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={clsx(
                        'inline-flex px-2 py-1 text-xs rounded-full font-medium',
                        categoryStyle.bgColor,
                        categoryStyle.color
                      )}
                    >
                      {categoryStyle.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600">
                    {formatValue(meanValue, item.unit)}
                  </td>
                <td
                  className="px-4 py-3 whitespace-nowrap text-sm text-center cursor-pointer"
                  onClick={() => {
                    setEditingCell(item.name);
                    setTempValue(currentValue?.toString() || '');
                  }}
                >
                  {editingCell === item.name ? (
                    <input
                      type="number"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={() => handleCellEdit(item.name, tempValue)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCellEdit(item.name, tempValue);
                        }
                      }}
                      className="w-20 px-2 py-1 border rounded text-center"
                      autoFocus
                    />
                  ) : (
                    <span className="font-semibold text-gray-900 hover:bg-blue-50 px-2 py-1 rounded">
                      {formatValue(currentValue, item.unit)}
                    </span>
                  )}
                </td>
                <td
                  className={clsx(
                    'px-4 py-3 whitespace-nowrap text-sm text-center',
                    getDifferenceColor(currentValue, meanValue)
                  )}
                >
                  {calculateDifference(currentValue, meanValue)}
                  {currentValue && meanValue && item.unit}
                </td>
              </tr>
            );
          })
          )}
        </tbody>
      </table>
    </div>
  );
}