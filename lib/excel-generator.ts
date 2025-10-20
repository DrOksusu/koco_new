import * as XLSX from 'xlsx';

interface LandmarkData {
  [key: string]: { x: number; y: number };
}

interface AngleData {
  [key: string]: number;
}

export function generateExcelFile(
  fileName: string,
  landmarks: LandmarkData,
  angles: Partial<AngleData>
) {
  // 워크북 생성
  const workbook = XLSX.utils.book_new();

  // 1. 랜드마크 좌표 시트
  const landmarkRows = Object.entries(landmarks).map(([name, coords]) => ({
    'Landmark Name': name,
    'X Coordinate': coords.x.toFixed(4),
    'Y Coordinate': coords.y.toFixed(4),
    'X (pixels)': Math.round(coords.x * 1000), // 1000px 기준 변환
    'Y (pixels)': Math.round(coords.y * 1000),
  }));

  const landmarkSheet = XLSX.utils.json_to_sheet(landmarkRows);
  XLSX.utils.book_append_sheet(workbook, landmarkSheet, 'Landmarks');

  // 2. 각도 측정 시트
  const angleRows = Object.entries(angles).map(([name, value]) => ({
    'Measurement': name,
    'Value (degrees)': value?.toFixed(2) || 'N/A',
    'Normal Range': getNormalRange(name),
    'Status': getStatus(name, value),
  }));

  const angleSheet = XLSX.utils.json_to_sheet(angleRows);
  XLSX.utils.book_append_sheet(workbook, angleSheet, 'Angles');

  // 3. 요약 정보 시트
  const summaryData = [
    { Item: 'File Name', Value: fileName },
    { Item: 'Analysis Date', Value: new Date().toLocaleString('ko-KR') },
    { Item: 'Total Landmarks', Value: Object.keys(landmarks).length },
    { Item: 'Total Measurements', Value: Object.keys(angles).length },
    { Item: 'Analysis Type', Value: 'Cephalometric Landmark Analysis' },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // 열 너비 조정
  const wscols = [
    { wch: 20 }, // A열
    { wch: 15 }, // B열
    { wch: 15 }, // C열
    { wch: 15 }, // D열
    { wch: 15 }, // E열
  ];
  landmarkSheet['!cols'] = wscols;
  angleSheet['!cols'] = wscols;
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }];

  // 파일 다운로드
  const excelFileName = `landmark_analysis_${fileName}_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, excelFileName);

  return excelFileName;
}

// 정상 범위 가져오기
function getNormalRange(measurement: string): string {
  const normalRanges: { [key: string]: string } = {
    'SNA': '80-84°',
    'SNB': '78-82°',
    'ANB': '2-4°',
    'FMA': '22-28°',
    'FMIA': '65-75°',
    'IMPA': '85-95°',
    'SN_GoGn': '27-37°',
    'U1_to_SN': '100-110°',
    'L1_to_NB': '25-30°',
    'ODI': '68-80',
    'APDI': '77-85',
  };
  return normalRanges[measurement] || 'N/A';
}

// 상태 판단
function getStatus(measurement: string, value?: number): string {
  if (!value) return 'N/A';

  const normalRanges: { [key: string]: [number, number] } = {
    'SNA': [80, 84],
    'SNB': [78, 82],
    'ANB': [2, 4],
    'FMA': [22, 28],
    'FMIA': [65, 75],
    'IMPA': [85, 95],
    'SN_GoGn': [27, 37],
    'U1_to_SN': [100, 110],
    'L1_to_NB': [25, 30],
  };

  const range = normalRanges[measurement];
  if (!range) return 'N/A';

  if (value < range[0]) return '↓ Low';
  if (value > range[1]) return '↑ High';
  return '✓ Normal';
}