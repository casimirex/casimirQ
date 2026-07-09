import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with fixed decimal places
 */
export function formatNumber(num: number, decimals = 4): string {
  return num.toFixed(decimals);
}

/**
 * Format a complex number for display
 */
export function formatComplex(real: number, imag: number, decimals = 4): string {
  const r = formatNumber(real, decimals);
  const i = formatNumber(Math.abs(imag), decimals);
  const sign = imag >= 0 ? '+' : '-';
  return `${r} ${sign} ${i}i`;
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Format circuit operation for display
 */
export function formatOperation(gate: string, targets: number[], params?: number[]): string {
  const targetStr = targets.join(',');
  const paramStr = params && params.length > 0 ? `(${params.map((p) => formatNumber(p)).join(', ')})` : '';
  return `${gate.toUpperCase()}${paramStr}[${targetStr}]`;
}

/**
 * Convert state index to binary string
 */
export function indexToBinary(index: number, numQubits: number): string {
  return index.toString(2).padStart(numQubits, '0');
}

/**
 * Calculate probability from amplitude
 */
export function amplitudeToProbability(real: number, imag: number): number {
  return real * real + imag * imag;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
