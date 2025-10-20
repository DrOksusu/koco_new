import { Point, LandmarkCoordinates, IntersectionResult, Line } from '@/lib/types/calculation.types';

/**
 * 두 직선의 교차점 계산
 */
export function calculateIntersectionPoint(
  landmarks: LandmarkCoordinates,
  line1Key1: string,
  line1Key2: string,
  line2Key1: string,
  line2Key2: string
): IntersectionResult {
  // 랜드마크 검증
  if (!landmarks[line1Key1] || !landmarks[line1Key2] ||
      !landmarks[line2Key1] || !landmarks[line2Key2]) {
    console.warn('Missing landmarks for intersection calculation');
    return { point: null, exists: false, parallel: false };
  }

  const p1 = landmarks[line1Key1];
  const p2 = landmarks[line1Key2];
  const p3 = landmarks[line2Key1];
  const p4 = landmarks[line2Key2];

  // 직선 방정식: Ax + By = C
  const A1 = p2.y - p1.y;
  const B1 = p1.x - p2.x;
  const C1 = A1 * p1.x + B1 * p1.y;

  const A2 = p4.y - p3.y;
  const B2 = p3.x - p4.x;
  const C2 = A2 * p3.x + B2 * p3.y;

  const det = A1 * B2 - A2 * B1;

  // 평행선 체크
  if (Math.abs(det) < 0.0001) {
    return { point: null, exists: false, parallel: true };
  }

  // 교차점 계산
  const x = (C1 * B2 - C2 * B1) / det;
  const y = (A1 * C2 - A2 * C1) / det;

  return {
    point: {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10
    },
    exists: true,
    parallel: false
  };
}

/**
 * 선분과 선분의 교차점 계산 (선분 내에 있는지 확인)
 */
export function calculateSegmentIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): IntersectionResult {
  const A1 = p2.y - p1.y;
  const B1 = p1.x - p2.x;
  const C1 = A1 * p1.x + B1 * p1.y;

  const A2 = p4.y - p3.y;
  const B2 = p3.x - p4.x;
  const C2 = A2 * p3.x + B2 * p3.y;

  const det = A1 * B2 - A2 * B1;

  if (Math.abs(det) < 0.0001) {
    return { point: null, exists: false, parallel: true };
  }

  const x = (C1 * B2 - C2 * B1) / det;
  const y = (A1 * C2 - A2 * C1) / det;

  // 교차점이 두 선분 내에 있는지 확인
  const onSegment1 =
    Math.min(p1.x, p2.x) <= x && x <= Math.max(p1.x, p2.x) &&
    Math.min(p1.y, p2.y) <= y && y <= Math.max(p1.y, p2.y);

  const onSegment2 =
    Math.min(p3.x, p4.x) <= x && x <= Math.max(p3.x, p4.x) &&
    Math.min(p3.y, p4.y) <= y && y <= Math.max(p3.y, p4.y);

  if (onSegment1 && onSegment2) {
    return {
      point: {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10
      },
      exists: true,
      parallel: false
    };
  }

  return { point: null, exists: false, parallel: false };
}

/**
 * Go (Gonion) 점 계산
 * Ar-Ramus Down과 Menton-Corpus Lt.의 교차점
 */
export function calculateGo(landmarks: LandmarkCoordinates): Point | null {
  const result = calculateIntersectionPoint(
    landmarks,
    'Ar', 'Ramus Down',
    'Menton', 'Corpus Lt.'
  );

  return result.point;
}

/**
 * Gn (Gnathion) 점 계산
 * Nasion-Pogonion과 Menton-Corpus Lt.의 교차점
 */
export function calculateGn(landmarks: LandmarkCoordinates): Point | null {
  const result = calculateIntersectionPoint(
    landmarks,
    'Nasion', 'Pogonion',
    'Menton', 'Corpus Lt.'
  );

  return result.point;
}

/**
 * 필수 교차점들을 계산하고 랜드마크에 추가
 */
export function addCalculatedLandmarks(landmarks: LandmarkCoordinates): LandmarkCoordinates {
  const extendedLandmarks = { ...landmarks };

  console.log('Adding calculated landmarks. Input landmarks:', Object.keys(landmarks));

  // Go 점 계산 및 추가
  if (!extendedLandmarks.Go) {
    const go = calculateGo(landmarks);
    if (go) {
      extendedLandmarks.Go = go;
      console.log('✅ Calculated Go point:', go);
    } else {
      console.warn('❌ Failed to calculate Go point');
      console.log('Required landmarks: Ar, Ramus Down, Menton, Corpus Lt.');
      console.log('Available:', {
        Ar: !!landmarks.Ar,
        'Ramus Down': !!landmarks['Ramus Down'],
        Menton: !!landmarks.Menton,
        'Corpus Lt.': !!landmarks['Corpus Lt.']
      });
    }
  }

  // Gn 점 계산 및 추가
  if (!extendedLandmarks.Gn) {
    const gn = calculateGn(landmarks);
    if (gn) {
      extendedLandmarks.Gn = gn;
      console.log('✅ Calculated Gn point:', gn);
    } else {
      console.warn('❌ Failed to calculate Gn point');
      console.log('Required landmarks: Nasion, Pogonion, Menton, Corpus Lt.');
      console.log('Available:', {
        Nasion: !!landmarks.Nasion,
        Pogonion: !!landmarks.Pogonion,
        Menton: !!landmarks.Menton,
        'Corpus Lt.': !!landmarks['Corpus Lt.']
      });
    }
  }

  console.log('Extended landmarks:', Object.keys(extendedLandmarks));
  return extendedLandmarks;
}

/**
 * 점이 직선 위에 있는지 확인
 */
export function isPointOnLine(point: Point, lineStart: Point, lineEnd: Point, tolerance = 0.1): boolean {
  // 직선 방정식으로 확인
  const A = lineEnd.y - lineStart.y;
  const B = lineStart.x - lineEnd.x;
  const C = A * lineStart.x + B * lineStart.y;

  const distance = Math.abs(A * point.x + B * point.y - C) / Math.sqrt(A * A + B * B);

  return distance < tolerance;
}

/**
 * 직선과 원의 교점 계산
 */
export function calculateLineCircleIntersection(
  lineStart: Point,
  lineEnd: Point,
  center: Point,
  radius: number
): Point[] {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const fx = lineStart.x - center.x;
  const fy = lineStart.y - center.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return []; // 교점 없음
  }

  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

  const points: Point[] = [];

  if (t1 >= 0 && t1 <= 1) {
    points.push({
      x: lineStart.x + t1 * dx,
      y: lineStart.y + t1 * dy
    });
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 0.0001) {
    points.push({
      x: lineStart.x + t2 * dx,
      y: lineStart.y + t2 * dy
    });
  }

  return points;
}