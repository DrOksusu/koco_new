import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface MeasurementStore {
  measurements: Record<string, number>;
  diagnosis: Record<string, number>;
  patientId: string | null;
  timestamp: string | null;

  updateMeasurements: (data: Record<string, number>) => void;
  updateDiagnosis: (data: Record<string, number>) => void;
  updateSingleMeasurement: (name: string, value: number) => void;
  clearAll: () => void;
  setPatientId: (id: string) => void;
  setTimestamp: (timestamp: string) => void;
}

export const useMeasurementStore = create<MeasurementStore>()(
  devtools(
    (set) => ({
      measurements: {},
      diagnosis: {},
      patientId: null,
      timestamp: null,

      updateMeasurements: (data) =>
        set((state) => ({
          measurements: { ...state.measurements, ...data },
          timestamp: new Date().toISOString()
        })),

      updateDiagnosis: (data) =>
        set((state) => ({
          diagnosis: { ...state.diagnosis, ...data },
          timestamp: new Date().toISOString()
        })),

      updateSingleMeasurement: (name, value) =>
        set((state) => ({
          measurements: { ...state.measurements, [name]: value },
          timestamp: new Date().toISOString()
        })),

      clearAll: () =>
        set({
          measurements: {},
          diagnosis: {},
          patientId: null,
          timestamp: null
        }),

      setPatientId: (id) =>
        set({ patientId: id }),

      setTimestamp: (timestamp) =>
        set({ timestamp })
    })
  )
);