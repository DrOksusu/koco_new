'use client';

import { useEffect, useState } from 'react';
import { useMeasurementStore } from '@/store/measurementStore';
import StatusBadge from '@/components/ui/StatusBadge';
import Tooltip from '@/components/ui/Tooltip';
import clsx from 'clsx';
import { DiagnosisDefinition, DiagnosisTooltipData } from '@/types/diagnosisDefinition.types';

interface DiagnosisData {
  name: string;
  mean: number;
  description: string;
}

const DIAGNOSIS_DATA: DiagnosisData[] = [
  { name: 'HGI', mean: 12, description: 'Horizontal Growth Index' },
  { name: 'VGI', mean: 8, description: 'Vertical Growth Index' },
  { name: 'APDI', mean: 85, description: 'Anteroposterior Dysplasia Indicator' },
  { name: 'ODI', mean: 75, description: 'Overbite Depth Indicator' },
  { name: 'IAPDI', mean: 80, description: 'Improved APDI' },
  { name: 'IODI', mean: 70, description: 'Improved ODI' },
  { name: '2APDL', mean: 90, description: '2 × Anteroposterior Dental Limit' },
  { name: 'VDL', mean: 65, description: 'Vertical Dental Limit' },
  { name: 'CFD', mean: 45, description: 'Chin-Face Depth' },
  { name: 'EI', mean: 30, description: 'Extraction Index' }
];

export default function DiagnosisTable() {
  const {
    diagnosis,
    updateDiagnosis,
    diagnosisDefinitions,
    fetchDiagnosisDefinitions,
    diagnosisDefinitionsLoading
  } = useMeasurementStore();

  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  console.log('🎯 DiagnosisTable component rendering');

  // Fetch definitions on mount
  useEffect(() => {
    console.log('🎯 DiagnosisTable useEffect running - fetching definitions');
    fetchDiagnosisDefinitions();
  }, [fetchDiagnosisDefinitions]);

  // Convert definition to rich tooltip data
  const convertToTooltipData = (def: DiagnosisDefinition): DiagnosisTooltipData => {
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
      calculationMethod: def.calculationMethod || undefined
    };
  };

  // Use definitions from DB if available, otherwise fall back to hardcoded data
  const displayData = diagnosisDefinitions.length > 0
    ? diagnosisDefinitions.map(def => ({
        name: def.name,
        mean: def.meanValue || 0,
        description: def.description || '',
        tooltipData: convertToTooltipData(def)
      }))
    : DIAGNOSIS_DATA.map(item => ({
        name: item.name,
        mean: item.mean,
        description: item.description,
        tooltipData: item.description // fallback to simple string
      }));

  console.log('🎯 DiagnosisTable displayData:', {
    count: displayData.length,
    fromDB: diagnosisDefinitions.length > 0,
    loading: diagnosisDefinitionsLoading
  });

  const handleCellEdit = (name: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateDiagnosis({ [name]: numValue });
    }
    setEditingCell(null);
    setTempValue('');
  };

  const getDifferenceClass = (value: number | undefined, mean: number): string => {
    if (!value) return '';
    const diff = Math.abs(value - mean);
    const percentage = (diff / mean) * 100;

    if (percentage > 20) return 'bg-red-50 border-red-200';
    if (percentage > 10) return 'bg-yellow-50 border-yellow-200';
    return '';
  };

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
      <table className="min-w-full bg-white">
        <thead className="bg-gradient-to-r from-blue-50 to-indigo-100">
          <tr className="border-b-2 border-indigo-200">
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              진단 지표
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
              설명
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
              평균값
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
              결과값
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
              상태
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {diagnosisDefinitionsLoading ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                  <span>진단지표 정의를 불러오는 중...</span>
                </div>
              </td>
            </tr>
          ) : (
            displayData.map((item, index) => {
              const currentValue = diagnosis[item.name];
              const rowClass = getDifferenceClass(currentValue, item.mean);

              return (
                <tr
                  key={`${item.name}-${index}`}
                  className={clsx(
                    'hover:bg-gray-50 transition-all duration-150',
                    rowClass
                  )}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Tooltip content={item.tooltipData} position="right">
                      <span className="text-sm font-bold text-indigo-600 cursor-help">
                        {item.name}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 text-center">
                    {item.description}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600">
                    {item.mean.toFixed(1)}
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
                      <span className="font-bold text-gray-900 hover:bg-blue-50 px-2 py-1 rounded">
                        {currentValue !== null && currentValue !== undefined ? currentValue.toFixed(1) : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge value={currentValue} mean={item.mean} />
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
