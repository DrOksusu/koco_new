export const LANDMARKS = [
  'Nasion',
  'Sella',
  'Porion',
  'Orbitale',
  'Basion',
  'ANS',
  'PNS',
  'A-Point',
  'B-Point',
  'Pogonion',
  'Menton',
  'Corpus Lt.',
  'Ramus Down',
  'Ar',
  'Mx.1 cr',
  'Mx.1 root',
  'Mn.1 cr',
  'Mn.1 root',
  'Mn.6 distal',
  'Pronasale',
  'Columella',
  'Subnasale',
  'soft tissue A',
  'Upper lip',
  'Lower lip',
  'soft tissue B',
  'soft tissue Pogonion',
  'Ruler Start',
  'Ruler End'
] as const;

export type LandmarkType = typeof LANDMARKS[number];

export interface LandmarkPoint {
  x: number;
  y: number;
}

export interface LandmarkData {
  [key: string]: LandmarkPoint;
}

export interface AngleData {
  SNA: number;
  SNB: number;
  ANB: number;
  ODI: number;
  APDI: number;
  FMA: number;
  FMIA: number;
  IMPA: number;
  SN_GoGn: number;
  U1_to_SN: number;
  L1_to_NB: number;
}

// 각도 계산 함수
export function calculateAngles(landmarks: LandmarkData): Partial<AngleData> {
  const angles: Partial<AngleData> = {};

  // Helper function to calculate angle between three points
  const calculateAngle = (p1: LandmarkPoint, p2: LandmarkPoint, p3: LandmarkPoint): number => {
    const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    let angle = Math.abs((angle2 - angle1) * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  // Helper function to calculate angle between two lines
  const calculateLineAngle = (line1Start: LandmarkPoint, line1End: LandmarkPoint, 
                              line2Start: LandmarkPoint, line2End: LandmarkPoint): number => {
    const angle1 = Math.atan2(line1End.y - line1Start.y, line1End.x - line1Start.x);
    const angle2 = Math.atan2(line2End.y - line2Start.y, line2End.x - line2Start.x);
    let angle = Math.abs((angle2 - angle1) * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  // Calculate SNA (Sella - Nasion - A point)
  if (landmarks['Sella'] && landmarks['Nasion'] && landmarks['A-Point']) {
    angles.SNA = calculateAngle(landmarks['Sella'], landmarks['Nasion'], landmarks['A-Point']);
  }

  // Calculate SNB (Sella - Nasion - B point)
  if (landmarks['Sella'] && landmarks['Nasion'] && landmarks['B-Point']) {
    angles.SNB = calculateAngle(landmarks['Sella'], landmarks['Nasion'], landmarks['B-Point']);
  }

  // Calculate ANB (A point - Nasion - B point)
  if (landmarks['A-Point'] && landmarks['Nasion'] && landmarks['B-Point']) {
    angles.ANB = calculateAngle(landmarks['A-Point'], landmarks['Nasion'], landmarks['B-Point']);
  }

  // Calculate FMA (Frankfort plane - Mandibular plane angle)
  if (landmarks['Porion'] && landmarks['Orbitale'] && landmarks['Corpus Lt.'] && landmarks['Menton']) {
    angles.FMA = calculateLineAngle(
      landmarks['Porion'], landmarks['Orbitale'],
      landmarks['Corpus Lt.'], landmarks['Menton']
    );
  }

  // Calculate SN-GoGn
  if (landmarks['Sella'] && landmarks['Nasion'] && landmarks['Corpus Lt.'] && landmarks['Menton']) {
    angles.SN_GoGn = calculateLineAngle(
      landmarks['Sella'], landmarks['Nasion'],
      landmarks['Corpus Lt.'], landmarks['Menton']
    );
  }

  // Calculate U1 to SN
  if (landmarks['Mx.1 root'] && landmarks['Mx.1 cr'] && landmarks['Sella'] && landmarks['Nasion']) {
    angles.U1_to_SN = calculateLineAngle(
      landmarks['Mx.1 root'], landmarks['Mx.1 cr'],
      landmarks['Sella'], landmarks['Nasion']
    );
  }

  // Calculate IMPA (L1 to Mandibular plane)
  if (landmarks['Mn.1 root'] && landmarks['Mn.1 cr'] && landmarks['Corpus Lt.'] && landmarks['Menton']) {
    angles.IMPA = calculateLineAngle(
      landmarks['Mn.1 root'], landmarks['Mn.1 cr'],
      landmarks['Corpus Lt.'], landmarks['Menton']
    );
  }

  return angles;
}

// 랜드마크 색상 설정
export function getLandmarkColor(index: number): string {
  const colors = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#FFC0CB', // Pink
    '#A52A2A', // Brown
  ];
  return colors[index % colors.length];
}