import { Point, LandmarkCoordinates, DistanceResult } from '@/lib/types/calculation.types';

/**
 * 스케일 팩터 계산 (Ruler 기준 20mm)
 */
export function calculateScaleFactor(landmarks: LandmarkCoordinates): number {
  const start = landmarks['Ruler Start'];
  const end = landmarks['Ruler End'];

  if (!start || !end) {
    console.warn('Ruler landmarks not found, using default scale');
    return 1; // Default scale factor
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    console.warn('Ruler distance is zero, using default scale');
    return 1;
  }

  // Ruler represents 20mm in real world
  return Math.round((20 / distance) * 100) / 100;
}

/**
 * 두 점 사이의 거리 계산
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 두 점 사이의 스케일 적용 거리
 */
export function calculateScaledDistance(
  landmarks: LandmarkCoordinates,
  key1: string,
  key2: string
): DistanceResult | null {
  if (!landmarks[key1] || !landmarks[key2]) {
    console.warn(`Missing landmark: ${!landmarks[key1] ? key1 : key2}`);
    return null;
  }

  const scaleFactor = calculateScaleFactor(landmarks);
  const p1 = landmarks[key1];
  const p2 = landmarks[key2];

  const distance = calculateDistance(p1, p2);

  return {
    distance: Math.round(distance * 10) / 10,
    scaledDistance: Math.round(distance * scaleFactor * 10) / 10,
    unit: 'mm'
  };
}

/**
 * 점과 직선 사이의 수직 거리
 */
export function calculatePerpendicularDistance(
  landmarks: LandmarkCoordinates,
  lineKey1: string,
  lineKey2: string,
  pointKey: string
): number | null {
  if (!landmarks[lineKey1] || !landmarks[lineKey2] || !landmarks[pointKey]) {
    console.warn('Missing landmark in perpendicular distance calculation');
    return null;
  }

  const p1 = landmarks[lineKey1];
  const p2 = landmarks[lineKey2];
  const p3 = landmarks[pointKey];

  // 직선 방정식: Ax + By + C = 0
  const A = p2.y - p1.y;
  const B = p1.x - p2.x;
  const C = -A * p1.x - B * p1.y;

  const denominator = Math.sqrt(A * A + B * B);
  if (denominator === 0) {
    console.warn('Line has zero length');
    return null;
  }

  const distance = Math.abs(A * p3.x + B * p3.y + C) / denominator;

  // 방향 판별 (외적을 사용하여 좌/우 판단)
  const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  const sign = cross >= 0 ? 1 : -1;

  const scaleFactor = calculateScaleFactor(landmarks);
  return Math.round(distance * scaleFactor * sign * 10) / 10;
}

/**
 * 모든 필수 거리 계산
 */
export function calculateAllDistances(landmarks: LandmarkCoordinates): Record<string, number> {
  const distances: Record<string, number> = {};

  // E-line distances
  const eLineUpper = calculatePerpendicularDistance(
    landmarks,
    'Pronasale', 'soft tissue Pogonion',
    'Upper lip'
  );
  if (eLineUpper !== null) distances['E-line Upper'] = eLineUpper;

  const eLineLower = calculatePerpendicularDistance(
    landmarks,
    'Pronasale', 'soft tissue Pogonion',
    'Lower lip'
  );
  if (eLineLower !== null) distances['E-line Lower'] = eLineLower;

  // Incisor measurements
  const overbite = calculateScaledDistance(landmarks, 'Mx.1 cr', 'Mn.1 cr');
  if (overbite) {
    // Vertical component only
    const p1 = landmarks['Mx.1 cr'];
    const p2 = landmarks['Mn.1 cr'];
    const verticalDistance = Math.abs(p1.y - p2.y);
    const scaleFactor = calculateScaleFactor(landmarks);
    distances['Incisor OverbBite'] = Math.round(verticalDistance * scaleFactor * 10) / 10;
  }

  const overjet = calculateScaledDistance(landmarks, 'Mx.1 cr', 'Mn.1 cr');
  if (overjet) {
    // Horizontal component only
    const p1 = landmarks['Mx.1 cr'];
    const p2 = landmarks['Mn.1 cr'];
    const horizontalDistance = Math.abs(p1.x - p2.x);
    const scaleFactor = calculateScaleFactor(landmarks);
    distances['Incisor Overjet'] = Math.round(horizontalDistance * scaleFactor * 10) / 10;
  }

  // Skeletal measurements
  const acbl = calculateScaledDistance(landmarks, 'Nasion', 'Sella');
  if (acbl) distances.ACBL = acbl.scaledDistance;

  const mbl = calculateScaledDistance(landmarks, 'Go', 'Gn');
  if (mbl) distances.MBL = mbl.scaledDistance;

  // Facial heights
  const afh = calculateScaledDistance(landmarks, 'Nasion', 'Menton');
  if (afh) distances.AFH = afh.scaledDistance;

  const pfh = calculateScaledDistance(landmarks, 'Sella', 'Go');
  if (pfh) distances.PFH = pfh.scaledDistance;

  const ufh = calculateScaledDistance(landmarks, 'Nasion', 'ANS');
  if (ufh) distances.UFH = ufh.scaledDistance;

  const lfh = calculateScaledDistance(landmarks, 'ANS', 'Menton');
  if (lfh) distances.LFH = lfh.scaledDistance;

  // Facial Height Ratio
  if (distances.PFH && distances.AFH) {
    distances.FHR = Math.round((distances.PFH / distances.AFH) * 100 * 10) / 10;
  }

  // Additional measurements
  const hr = calculateScaledDistance(landmarks, 'Porion', 'Orbitale');
  if (hr) distances.HR = hr.scaledDistance;

  // NA and NB distances
  const naDistance = calculatePerpendicularDistance(
    landmarks,
    'Nasion', 'A-Point',
    'Mx.1 cr'
  );
  if (naDistance !== null) distances['U1 to NA'] = naDistance;

  const nbDistance = calculatePerpendicularDistance(
    landmarks,
    'Nasion', 'B-Point',
    'Mn.1 cr'
  );
  if (nbDistance !== null) distances['L1 to NB'] = nbDistance;

  // SN distance (same as ACBL but labeled as SN)
  const sn = calculateScaledDistance(landmarks, 'Sella', 'Nasion');
  if (sn) distances.SN = sn.scaledDistance;

  // Ramus height
  const ramusHeight = calculateScaledDistance(landmarks, 'Ar', 'Go');
  if (ramusHeight) distances['Ramus height'] = ramusHeight.scaledDistance;

  // MxBL (Maxillary Base Length)
  const mxbl = calculateScaledDistance(landmarks, 'ANS', 'PNS');
  if (mxbl) distances.MxBL = mxbl.scaledDistance;

  // PCBL (Posterior Cranial Base Length)
  const pcbl = calculateScaledDistance(landmarks, 'Sella', 'Basion');
  if (pcbl) distances.PCBL = pcbl.scaledDistance;

  // S-Por (Sella to Porion distance)
  const sPor = calculateScaledDistance(landmarks, 'Sella', 'Porion');
  if (sPor) distances['S-Por'] = sPor.scaledDistance;

  // S-A (Sella to A-point distance)
  const sA = calculateScaledDistance(landmarks, 'Sella', 'A-Point');
  if (sA) distances['S-A'] = sA.scaledDistance;

  // E-line measurements
  const eline = calculatePerpendicularDistance(
    landmarks,
    'Pronasale', 'soft tissue Pogonion',
    'Lower lip'
  );
  if (eline !== null) distances['E-line'] = -eline; // Negative for convention

  const elineUpper = calculatePerpendicularDistance(
    landmarks,
    'Pronasale', 'soft tissue Pogonion',
    'Upper lip'
  );
  if (elineUpper !== null) distances['E-line Upper'] = -elineUpper;

  const elineLower = calculatePerpendicularDistance(
    landmarks,
    'Pronasale', 'soft tissue Pogonion',
    'Lower lip'
  );
  if (elineLower !== null) distances['E-line Lower'] = -elineLower;

  // Naperp-A (Nasion perpendicular to A-point)
  const naperpA = calculateNasionPerpendicularToA(landmarks);
  if (naperpA !== null) distances['Naperp-A'] = naperpA;

  // Cal (Calibration factor)
  distances.Cal = calculateScaleFactor(landmarks);

  // Incisor Overbite and Overjet
  const overbiteOverjet = calculateXYDifference(landmarks, 'Mn.1 cr', 'Mx.1 cr');
  if (overbiteOverjet) {
    distances['Incisor Overbite'] = overbiteOverjet.yDiff;
    distances['Incisor Overjet'] = overbiteOverjet.xDiff;
  }

  return distances;
}

/**
 * X-Y 좌표 차이 계산
 */
export function calculateXYDifference(
  landmarks: LandmarkCoordinates,
  key1: string,
  key2: string
): { xDiff: number; yDiff: number } | null {
  if (!landmarks[key1] || !landmarks[key2]) {
    console.warn(`Missing landmark for XY difference`);
    return null;
  }

  const scaleFactor = calculateScaleFactor(landmarks);
  const p1 = landmarks[key1];
  const p2 = landmarks[key2];

  const xDiff = Math.round((p2.x - p1.x) * scaleFactor * 10) / 10;
  const yDiff = Math.round((p2.y - p1.y) * scaleFactor * 10) / 10;

  return { xDiff, yDiff };
}

/**
 * Nasion perpendicular to A-point distance
 */
export function calculateNasionPerpendicularToA(landmarks: LandmarkCoordinates): number | null {
  const Po = landmarks['Porion'];
  const Or = landmarks['Orbitale'];
  const Nasion = landmarks['Nasion'];
  const Apoint = landmarks['A-Point'];

  if (!Po || !Or || !Nasion || !Apoint) {
    console.warn('Missing landmarks for Naperp-A calculation');
    return null;
  }

  const scaleFactor = calculateScaleFactor(landmarks);

  // Calculate FH plane slope
  const m = (Or.y - Po.y) / (Or.x - Po.x);

  // Perpendicular slope through Nasion
  const perpendicularSlope = -1 / m;
  const A = perpendicularSlope;
  const B = -1;
  const C = -perpendicularSlope * Nasion.x + Nasion.y;

  // Distance from A-point to the perpendicular line
  const distance = Math.abs(A * Apoint.x + B * Apoint.y + C) / Math.sqrt(A * A + B * B);

  // Determine sign based on position
  const dx = Apoint.x - Nasion.x;
  const dy = Apoint.y - Nasion.y;
  const dot = dx * A + dy * B;
  const sign = dot < 0 ? -1 : 1;

  return Math.round(distance * scaleFactor * sign * 10) / 10;
}

/**
 * 두 점 사이의 중점 계산
 */
export function calculateMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
}

/**
 * 점들의 중심점 계산
 */
export function calculateCentroid(points: Point[]): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const sum = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}