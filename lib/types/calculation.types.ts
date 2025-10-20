export interface Point {
  x: number;
  y: number;
}

export interface LandmarkCoordinates {
  [key: string]: Point;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Line {
  start: Point;
  end: Point;
}

export interface AngleResult {
  angle: number;
  unit: '°' | 'rad';
  points: string[];
}

export interface DistanceResult {
  distance: number;
  scaledDistance: number;
  unit: 'px' | 'mm';
}

export interface IntersectionResult {
  point: Point | null;
  exists: boolean;
  parallel: boolean;
}

export interface MeasurementResult {
  // Angles
  SNA?: number;
  SNB?: number;
  ANB?: number;
  FMA?: number;
  FMIA?: number;
  IMPA?: number;
  'SN to GoGn'?: number;
  'U1 to SN'?: number;
  'L1 to NB'?: number;
  'NA Angle'?: number;
  'NB Angle'?: number;
  'L1toNB'?: number;
  'U1toNA'?: number;
  'U1toFH'?: number;
  Interincisal?: number;
  ArGoGn?: number;
  NSAr?: number;
  SGoGn?: number;
  Sum?: number;

  // Distances
  'E-line Upper'?: number;
  'E-line Lower'?: number;
  'Incisor OverbBite'?: number;
  'Incisor Overjet'?: number;
  ACBL?: number;
  MBL?: number;
  AFH?: number;
  PFH?: number;
  UFH?: number;
  LFH?: number;
  FHR?: number;
  HR?: number;
}

export interface DiagnosisResult {
  measurements: MeasurementResult;
  indicators: {
    HGI: number;
    VGI: number;
    APDI: number;
    ODI: number;
    IAPDI: number;
    IODI: number;
    '2APDL': number;
    VDL: number;
    CFD: number;
    EI: number;
  };
  warnings: string[];
}