import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MEASUREMENT_DATA, DIAGNOSIS_INDICATORS } from '@/lib/constants/measurements';

export async function exportToExcel(
  measurements: Record<string, number>,
  diagnosis: Record<string, number>,
  patientInfo?: {
    id?: string;
    name?: string;
    date?: string;
  }
) {
  // Create measurement data
  const measurementData = MEASUREMENT_DATA.map(item => ({
    '계측항목': item.name,
    '카테고리': item.category,
    '평균값': item.meanDegree || item.meanLength || '',
    '계측값': measurements[item.name] || '',
    '차이': measurements[item.name]
      ? (measurements[item.name] - (item.meanDegree || item.meanLength || 0)).toFixed(1)
      : '',
    '단위': item.unit,
    '설명': item.tooltip
  }));

  // Create diagnosis data
  const diagnosisData = DIAGNOSIS_INDICATORS.map(indicator => ({
    '진단지표': indicator,
    '결과값': diagnosis[indicator] || ''
  }));

  // Create patient info data
  const patientData = [
    { '항목': '환자 ID', '값': patientInfo?.id || '-' },
    { '항목': '환자명', '값': patientInfo?.name || '-' },
    { '항목': '분석일시', '값': patientInfo?.date || new Date().toLocaleString('ko-KR') }
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Add sheets
  const ws1 = XLSX.utils.json_to_sheet(patientData);
  const ws2 = XLSX.utils.json_to_sheet(measurementData);
  const ws3 = XLSX.utils.json_to_sheet(diagnosisData);

  // Set column widths
  const measurementCols = [
    { wch: 15 }, // 계측항목
    { wch: 12 }, // 카테고리
    { wch: 10 }, // 평균값
    { wch: 10 }, // 계측값
    { wch: 10 }, // 차이
    { wch: 8 },  // 단위
    { wch: 40 }  // 설명
  ];

  const diagnosisCols = [
    { wch: 15 }, // 진단지표
    { wch: 15 }  // 결과값
  ];

  ws2['!cols'] = measurementCols;
  ws3['!cols'] = diagnosisCols;

  // Append sheets to workbook
  XLSX.utils.book_append_sheet(wb, ws1, '환자정보');
  XLSX.utils.book_append_sheet(wb, ws2, '계측값');
  XLSX.utils.book_append_sheet(wb, ws3, '진단지표');

  // Generate filename with timestamp
  const fileName = `xray_analysis_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;

  // Save file
  XLSX.writeFile(wb, fileName);

  return fileName;
}

export async function exportToPDF(elementId: string, filename?: string) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    // Convert HTML to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 297; // A4 width in landscape
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Save PDF
    const pdfFileName = filename || `analysis_report_${Date.now()}.pdf`;
    pdf.save(pdfFileName);

    return pdfFileName;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export function exportToCSV(
  measurements: Record<string, number>,
  diagnosis: Record<string, number>
): string {
  let csv = 'Category,Name,Mean,Value,Difference,Unit\\n';

  // Add measurements
  MEASUREMENT_DATA.forEach(item => {
    const value = measurements[item.name];
    const mean = item.meanDegree || item.meanLength || 0;
    const diff = value ? (value - mean).toFixed(1) : '-';

    csv += `${item.category},${item.name},${mean},${value || '-'},${diff},${item.unit}\\n`;
  });

  csv += '\\nDiagnosis Indicators\\n';
  csv += 'Indicator,Value\\n';

  // Add diagnosis
  DIAGNOSIS_INDICATORS.forEach(indicator => {
    csv += `${indicator},${diagnosis[indicator] || '-'}\\n`;
  });

  // Create download link
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analysis_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return csv;
}