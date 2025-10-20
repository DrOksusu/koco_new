export interface MeasurementItem {
  name: string;
  meanDegree?: number;
  meanLength?: number;
  value: string | number;
  category: 'pink' | 'green' | 'red' | 'blue';
  unit: '°' | 'mm' | '%' | '';
  tooltip: string;
}

export interface DiagnosisIndicator {
  name: string;
  mean: number | string;
  value: number | string;
  status?: 'normal' | 'warning' | 'critical';
}

export interface AnalysisData {
  measurements: Record<string, number>;
  diagnosis: Record<string, number>;
  timestamp: string;
  patientId?: string;
}

export interface MeasurementCategory {
  name: string;
  color: string;
  bgColor: string;
  hoverColor: string;
}

export interface ExportData {
  measurements: Record<string, number>;
  diagnosis: Record<string, number>;
  patientInfo?: {
    id: string;
    name?: string;
    date: string;
  };
}