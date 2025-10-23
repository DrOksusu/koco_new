import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MeasurementDefinition } from '@/types/measurementDefinition.types';

interface MeasurementStore {
  measurements: Record<string, number>;
  diagnosis: Record<string, number>;
  patientId: string | null;
  timestamp: string | null;

  // Measurement definitions from DB
  definitions: MeasurementDefinition[];
  definitionsLoading: boolean;
  definitionsError: string | null;
  definitionsLastFetched: number | null;

  updateMeasurements: (data: Record<string, number>) => void;
  updateDiagnosis: (data: Record<string, number>) => void;
  updateSingleMeasurement: (name: string, value: number) => void;
  clearAll: () => void;
  setPatientId: (id: string) => void;
  setTimestamp: (timestamp: string) => void;

  // Fetch definitions from DB
  fetchDefinitions: () => Promise<void>;
  clearDefinitionsCache: () => void;
}

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export const useMeasurementStore = create<MeasurementStore>()(
  devtools(
    (set, get) => ({
      measurements: {},
      diagnosis: {},
      patientId: null,
      timestamp: null,

      // Definitions state
      definitions: [],
      definitionsLoading: false,
      definitionsError: null,
      definitionsLastFetched: null,

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
        set({ timestamp }),

      fetchDefinitions: async () => {
        const state = get();
        const now = Date.now();

        // Check if cache is still valid
        if (
          state.definitions.length > 0 &&
          state.definitionsLastFetched &&
          now - state.definitionsLastFetched < CACHE_DURATION
        ) {
          console.log('Using cached measurement definitions');
          return;
        }

        set({ definitionsLoading: true, definitionsError: null });

        try {
          const response = await fetch('/api/measurements/definitions');
          const data = await response.json();

          if (data.success) {
            set({
              definitions: data.definitions,
              definitionsLoading: false,
              definitionsLastFetched: now,
              definitionsError: null
            });
            console.log(`Fetched ${data.count} measurement definitions from database`);
          } else {
            throw new Error(data.error || 'Failed to fetch definitions');
          }
        } catch (error) {
          console.error('Error fetching measurement definitions:', error);
          set({
            definitionsLoading: false,
            definitionsError: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      },

      clearDefinitionsCache: () =>
        set({
          definitions: [],
          definitionsLastFetched: null,
          definitionsError: null
        })
    })
  )
);