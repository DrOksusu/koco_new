import { Point, LandmarkCoordinates, AngleResult, Vector } from '@/lib/types/calculation.types';

/**
 * 3점을 이용한 각도 계산 (중심점 기준)
 */
export function calculateAngle(
  landmarks: LandmarkCoordinates,
  key1: string,
  key2: string, // 중심점 (vertex)
  key3: string
): AngleResult | null {
  // 검증
  if (!landmarks[key1] || !landmarks[key2] || !landmarks[key3]) {
    console.warn(`Missing landmark: ${[key1, key2, key3].find(k => !landmarks[k])}`);
    return null;
  }

  const p1 = landmarks[key1];
  const p2 = landmarks[key2]; // 꼭짓점
  const p3 = landmarks[key3];

  // 벡터 계산
  const v1: Vector = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2: Vector = { x: p3.x - p2.x, y: p3.y - p2.y };

  // 내적과 크기
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

  if (mag1 === 0 || mag2 === 0) {
    console.warn('Zero magnitude vector in angle calculation');
    return null;
  }

  // 각도 계산
  const cos = dot / (mag1 * mag2);
  const rad = Math.acos(Math.min(Math.max(cos, -1), 1));
  const deg = (rad * 180) / Math.PI;

  return {
    angle: Math.round(deg * 10) / 10,
    unit: '°',
    points: [key1, key2, key3]
  };
}

/**
 * 4점을 이용한 두 직선 간 각도 계산
 */
export function calculateIntersectionAngle(
  landmarks: LandmarkCoordinates,
  key1: string,
  key2: string,
  key3: string,
  key4: string
): AngleResult | null {
  if (!landmarks[key1] || !landmarks[key2] || !landmarks[key3] || !landmarks[key4]) {
    console.warn(`Missing landmark in intersection angle calculation`);
    return null;
  }

  const p1 = landmarks[key1];
  const p2 = landmarks[key2];
  const p3 = landmarks[key3];
  const p4 = landmarks[key4];

  // 두 직선의 방향 벡터
  const v1: Vector = { x: p2.x - p1.x, y: p2.y - p1.y };
  const v2: Vector = { x: p4.x - p3.x, y: p4.y - p3.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

  if (mag1 === 0 || mag2 === 0) {
    console.warn('Zero magnitude vector in intersection angle calculation');
    return null;
  }

  const cos = dot / (mag1 * mag2);
  const rad = Math.acos(Math.min(Math.max(cos, -1), 1));
  let deg = (rad * 180) / Math.PI;

  // 예각으로 변환
  if (deg > 90) {
    deg = 180 - deg;
  }

  return {
    angle: Math.round(deg * 10) / 10,
    unit: '°',
    points: [key1, key2, key3, key4]
  };
}

/**
 * 모든 필수 각도 계산
 */
export function calculateAllAngles(landmarks: LandmarkCoordinates): Record<string, number> {
  const angles: Record<string, number> = {};

  console.log('=== Starting angle calculations ===');
  console.log('Available landmarks:', Object.keys(landmarks));

  // SNA (Sella - Nasion - A point)
  const sna = calculateAngle(landmarks, 'Sella', 'Nasion', 'A-Point');
  if (sna) {
    angles.SNA = sna.angle;
    console.log('✅ SNA calculated:', sna.angle);
  } else {
    console.warn('❌ SNA failed - missing:', ['Sella', 'Nasion', 'A-Point'].filter(k => !landmarks[k]));
  }

  // SNB (Sella - Nasion - B point)
  const snb = calculateAngle(landmarks, 'Sella', 'Nasion', 'B-Point');
  if (snb) {
    angles.SNB = snb.angle;
    console.log('✅ SNB calculated:', snb.angle);
  } else {
    console.warn('❌ SNB failed - missing:', ['Sella', 'Nasion', 'B-Point'].filter(k => !landmarks[k]));
  }

  // ANB (A point - Nasion - B point)
  const anb = calculateAngle(landmarks, 'A-Point', 'Nasion', 'B-Point');
  if (anb) {
    angles.ANB = anb.angle;
    console.log('✅ ANB calculated:', anb.angle);
  } else {
    console.warn('❌ ANB failed');
  }

  // FMA (Frankfort plane - Mandibular plane angle)
  const fma = calculateIntersectionAngle(
    landmarks,
    'Porion', 'Orbitale',
    'Corpus Lt.', 'Menton'
  );
  if (fma) angles.FMA = fma.angle;

  // SN-GoGn
  const snGoGn = calculateIntersectionAngle(
    landmarks,
    'Sella', 'Nasion',
    'Go', 'Gn'
  );
  if (snGoGn) {
    angles['SN to GoGn'] = snGoGn.angle;
    console.log('✅ SN-GoGn calculated:', snGoGn.angle);
  } else {
    console.warn('❌ SN-GoGn failed - missing:', ['Sella', 'Nasion', 'Go', 'Gn'].filter(k => !landmarks[k]));
  }

  // U1 to SN (Upper incisor to SN)
  const u1SN = calculateIntersectionAngle(
    landmarks,
    'Mx.1 cr', 'Mx.1 root',
    'Sella', 'Nasion'
  );
  if (u1SN) angles['U1 to SN'] = u1SN.angle;

  // IMPA (L1 to Mandibular plane)
  const impa = calculateIntersectionAngle(
    landmarks,
    'Mn.1 cr', 'Mn.1 root',
    'Corpus Lt.', 'Menton'
  );
  if (impa) angles.IMPA = 180 - impa.angle; // 보각 사용

  // FMIA (Frankfort Mandibular Incisor Angle)
  if (angles.FMA && angles.IMPA) {
    angles.FMIA = 180 - angles.FMA - angles.IMPA;
    angles.FMIA = Math.round(angles.FMIA * 10) / 10;
  }

  // Interincisal Angle
  const interincisal = calculateIntersectionAngle(
    landmarks,
    'Mx.1 cr', 'Mx.1 root',
    'Mn.1 cr', 'Mn.1 root'
  );
  if (interincisal) angles.Interincisal = 180 - interincisal.angle;

  // ArGoGn (Articulare - Gonion - Gnathion)
  const arGoGn = calculateAngle(landmarks, 'Ar', 'Go', 'Gn');
  if (arGoGn) {
    angles.ArGoGn = arGoGn.angle;
    console.log('✅ ArGoGn calculated:', arGoGn.angle);
  } else {
    console.warn('❌ ArGoGn failed - missing:', ['Ar', 'Go', 'Gn'].filter(k => !landmarks[k]));
  }

  // NSAr (Nasion - Sella - Articulare)
  const nsAr = calculateAngle(landmarks, 'Nasion', 'Sella', 'Ar');
  if (nsAr) angles.NSAr = nsAr.angle;

  // SGoGn (Sella - Gonion - Gnathion)
  const sGoGn = calculateAngle(landmarks, 'Sella', 'Go', 'Gn');
  if (sGoGn) {
    angles.SGoGn = sGoGn.angle;
    console.log('✅ SGoGn calculated:', sGoGn.angle);
  } else {
    console.warn('❌ SGoGn failed - missing:', ['Sella', 'Go', 'Gn'].filter(k => !landmarks[k]));
  }

  // Sum of posterior angles
  if (angles.NSAr && angles.SGoGn && angles.ArGoGn) {
    angles.Sum = angles.NSAr + angles.SGoGn + angles.ArGoGn;
    angles.Sum = Math.round(angles.Sum * 10) / 10;
  }

  // PMA (Palatal-Mandibular Angle)
  const pma = calculateIntersectionAngle(
    landmarks,
    'ANS', 'PNS',
    'Go', 'Menton'
  );
  if (pma) angles.PMA = 180 - pma.angle;

  // SN-GoMe
  const snGoMe = calculateIntersectionAngle(
    landmarks,
    'Sella', 'Nasion',
    'Go', 'Menton'
  );
  if (snGoMe) angles['SN-GoMe'] = snGoMe.angle;

  // FA'B' (Facial axis - soft tissue)
  const fabSoft = calculateIntersectionAngle(
    landmarks,
    'Porion', 'Orbitale',
    'soft tissue A', 'soft tissue B'
  );
  if (fabSoft) angles["FA'B'"] = 180 - fabSoft.angle;

  // FABA (Facial axis - bony)
  const faba = calculateIntersectionAngle(
    landmarks,
    'Porion', 'Orbitale',
    'A-Point', 'B-Point'
  );
  if (faba) angles.FABA = 180 - faba.angle;

  // Y-angle
  const yAngle = calculateIntersectionAngle(
    landmarks,
    'Porion', 'Orbitale',
    'Sella', 'Gn'
  );
  if (yAngle) angles['Y-angle'] = yAngle.angle;

  // UGA (Upper Gonial Angle)
  const uga = calculateAngle(landmarks, 'Ar', 'Go', 'Nasion');
  if (uga) angles.UGA = uga.angle;

  // LGA (Lower Gonial Angle)
  const lga = calculateAngle(landmarks, 'Nasion', 'Go', 'Menton');
  if (lga) angles.LGA = lga.angle;

  // S-A (Sella-Articulare angle)
  const sa = calculateAngle(landmarks, 'Nasion', 'Sella', 'Ar');
  if (sa) angles['S-A'] = sa.angle;

  // UIOP (Upper Incisor to Occlusal Plane)
  const uiop = calculateIntersectionAngle(
    landmarks,
    'Mn.1 cr', 'Mn.6 distal',
    'Mx.1 cr', 'Mx.1 root'
  );
  if (uiop) angles.UIOP = uiop.angle;

  // MOP (Mandibular Occlusal Plane)
  const mop = calculateIntersectionAngle(
    landmarks,
    'Mn.6 distal', 'Mn.1 cr',
    'Menton', 'Go'
  );
  if (mop) angles.MOP = 180 - mop.angle;

  // FH<Ans
  const fhAns = calculateIntersectionAngle(
    landmarks,
    'Porion', 'Orbitale',
    'Sella', 'ANS'
  );
  if (fhAns) angles['FH<Ans'] = fhAns.angle;

  // FH<Pr
  const fhPr = calculateIntersectionAngle(
    landmarks,
    'Porion', 'Orbitale',
    'Sella', 'Porion'
  );
  if (fhPr) angles['FH<Pr'] = 180 - fhPr.angle;

  // Na-S-BaA (Nasion-Sella-Basion angle)
  const naSBaA = calculateAngle(landmarks, 'Nasion', 'Sella', 'Basion');
  if (naSBaA) angles['Na-S-BaA'] = naSBaA.angle;

  // NALA (Nasolabial Angle)
  const nala = calculateAngle(landmarks, 'Columella', 'Subnasale', 'soft tissue A');
  if (nala) angles.NALA = nala.angle;

  console.log('=== Angle calculation summary ===');
  console.log('Total angles calculated:', Object.keys(angles).length);
  console.log('Calculated angles:', Object.keys(angles));

  return angles;
}