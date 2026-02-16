import { MeasurementResult } from './types';

const STORAGE_KEY = 'bodymeasure_history';

export function saveMeasurement(result: MeasurementResult): void {
  const history = getMeasurements();
  history.unshift(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function getMeasurements(): MeasurementResult[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function deleteMeasurement(id: string): void {
  const history = getMeasurements().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
