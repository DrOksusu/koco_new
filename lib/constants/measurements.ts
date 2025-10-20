import { MeasurementItem, MeasurementCategory } from '@/types/measurement.types';

export const MEASUREMENT_DATA: MeasurementItem[] = [
  // 지정된 순서대로 정렬
  { name: "SNA", meanDegree: 81, value: "", category: "pink", unit: "°", tooltip: "Sella-Nasion-A point angle" },
  { name: "SNB", meanDegree: 79, value: "", category: "pink", unit: "°", tooltip: "Sella-Nasion-B point angle" },
  { name: "IMPA", meanDegree: 91, value: "", category: "pink", unit: "°", tooltip: "Incisor Mandibular Plane Angle" },
  { name: "SN", meanLength: 71, value: "", category: "blue", unit: "mm", tooltip: "Sella-Nasion distance" },
  { name: "FMA", meanDegree: 27, value: "", category: "pink", unit: "°", tooltip: "Frankfort Mandibular Plane Angle" },
  { name: "PMA", meanDegree: 30, value: "", category: "blue", unit: "°", tooltip: "Palatal-Mandibular Angle" },
  { name: "SN-GoMe", meanDegree: 34, value: "", category: "pink", unit: "°", tooltip: "SN to Gonion-Menton angle" },
  { name: "FA'B'", meanDegree: 85, value: "", category: "blue", unit: "°", tooltip: "Facial axis angle" },
  { name: "FABA", meanDegree: 90, value: "", category: "blue", unit: "°", tooltip: "Facial Angle of Bony A point" },
  { name: "Y-angle", meanDegree: 60, value: "", category: "blue", unit: "°", tooltip: "Y-axis angle" },
  { name: "UGA", meanDegree: 130, value: "", category: "blue", unit: "°", tooltip: "Upper Gonial Angle" },
  { name: "LGA", meanDegree: 70, value: "", category: "blue", unit: "°", tooltip: "Lower Gonial Angle" },
  { name: "S-A", meanLength: 82, value: "", category: "blue", unit: "mm", tooltip: "Sella to A point distance" },
  { name: "UIOP", meanDegree: 8, value: "", category: "green", unit: "°", tooltip: "Upper Incisor to Occlusal Plane" },
  { name: "MOP", meanDegree: 14, value: "", category: "blue", unit: "°", tooltip: "Mandibular Occlusal Plane" },
  { name: "FH<Ans", meanDegree: 85, value: "", category: "blue", unit: "°", tooltip: "FH to Anterior Nasal Spine angle" },
  { name: "FH<Pr", meanDegree: 90, value: "", category: "blue", unit: "°", tooltip: "FH to Prosthion angle" },
  { name: "Na-S-BaA", meanDegree: 130, value: "", category: "blue", unit: "°", tooltip: "Nasion-Sella-Basion angle" },
  { name: "Incisor Overbite", meanLength: 2, value: "", category: "green", unit: "mm", tooltip: "Vertical overlap of incisors" },
  { name: "Incisor Overjet", meanLength: 3, value: "", category: "green", unit: "mm", tooltip: "Horizontal overlap of incisors" },
  { name: "NALA", meanDegree: 110, value: "", category: "blue", unit: "°", tooltip: "Nasolabial Angle" },
  { name: "HR", meanLength: 50, value: "", category: "red", unit: "mm", tooltip: "Horizontal Reference" },
  { name: "Cal", meanLength: 20, value: "", category: "blue", unit: "mm", tooltip: "Calvarium length" },
  { name: "ACBL", meanLength: 90, value: "", category: "blue", unit: "mm", tooltip: "Anterior Cranial Base Length" },
  { name: "MBL", meanLength: 70, value: "", category: "blue", unit: "mm", tooltip: "Mandibular Body Length" },
  { name: "AFH", meanLength: 120, value: "", category: "blue", unit: "mm", tooltip: "Anterior Facial Height" },
  { name: "PFH", meanLength: 80, value: "", category: "blue", unit: "mm", tooltip: "Posterior Facial Height" },
  { name: "E-line", meanLength: -2, value: "", category: "pink", unit: "mm", tooltip: "E-line to lips" },
  { name: "Ramus height", meanLength: 45, value: "", category: "blue", unit: "mm", tooltip: "Height of mandibular ramus" },
  { name: "Naperp-A", meanLength: 0, value: "", category: "blue", unit: "mm", tooltip: "A point to Nasion perpendicular" },
  { name: "MxBL", meanLength: 95, value: "", category: "blue", unit: "mm", tooltip: "Maxillary Base Length" },
  { name: "PCBL", meanLength: 35, value: "", category: "blue", unit: "mm", tooltip: "Posterior Cranial Base Length" },
  { name: "S-Por", meanLength: 17, value: "", category: "blue", unit: "mm", tooltip: "Sella to Porion distance" }
];

export const DIAGNOSIS_INDICATORS = [
  "HGI", "VGI", "APDI", "ODI", "IAPDI",
  "IODI", "2APDL", "VDL", "CFD", "EI"
];

export const CATEGORIES: Record<string, MeasurementCategory> = {
  pink: {
    name: "필수 계측항목",
    color: "text-pink-800",
    bgColor: "bg-pink-100",
    hoverColor: "hover:bg-pink-200"
  },
  green: {
    name: "Incisor 측정",
    color: "text-green-800",
    bgColor: "bg-green-100",
    hoverColor: "hover:bg-green-200"
  },
  red: {
    name: "참조 측정",
    color: "text-red-800",
    bgColor: "bg-red-100",
    hoverColor: "hover:bg-red-200"
  },
  blue: {
    name: "기타 측정",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    hoverColor: "hover:bg-blue-200"
  }
};