export interface MeasurementDefinition {
  id: string;
  name: string;
  category: string;
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
  measurementMethod?: string | null;
  referenceSource?: string | null;

  displayOrder: number;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface MeasurementDefinitionResponse {
  success: boolean;
  definitions: MeasurementDefinition[];
  count: number;
}

export interface TooltipData {
  title?: string;
  fullName?: string;
  description?: string;
  normalRange?: string;
  interpretation?: {
    high?: string;
    low?: string;
  };
  clinicalNote?: string;
  measurementMethod?: string;
}
