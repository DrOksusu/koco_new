export interface DiagnosisDefinition {
  id: string;
  name: string;
  unit: string;
  meanValue: number | null;

  // Tooltip information
  titleKo?: string | null;
  titleEn?: string | null;
  fullName?: string | null;
  description?: string | null;
  normalRangeMin?: number | null;
  normalRangeMax?: number | null;
  interpretationHigh?: string | null;
  interpretationLow?: string | null;
  clinicalNote?: string | null;
  calculationMethod?: string | null;
  referenceSource?: string | null;

  displayOrder: number;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface DiagnosisDefinitionResponse {
  success: boolean;
  definitions: DiagnosisDefinition[];
  count: number;
}

export interface DiagnosisTooltipData {
  title?: string;
  fullName?: string;
  description?: string;
  normalRange?: string;
  interpretation?: {
    high?: string;
    low?: string;
  };
  clinicalNote?: string;
  calculationMethod?: string;
}
