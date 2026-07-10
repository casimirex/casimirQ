import { describe, it, expect, vi } from 'vitest';
import {
  cn,
  formatNumber,
  formatComplex,
  degToRad,
  radToDeg,
  clamp,
  generateId,
  formatOperation,
  indexToBinary,
  amplitudeToProbability,
  debounce,
  throttle,
} from './utils';

describe('cn', () => {
  it('merges class names and dedupes conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4'); // later wins
    expect(cn('text-sm', false && 'hidden', 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('number formatting', () => {
  it('formatNumber respects decimals', () => {
    expect(formatNumber(3.14159)).toBe('3.1416');
    expect(formatNumber(3.14159, 2)).toBe('3.14');
  });

  it('formatComplex renders a + bi with correct sign', () => {
    expect(formatComplex(0.5, 0.5, 2)).toBe('0.50 + 0.50i');
    expect(formatComplex(0.5, -0.5, 2)).toBe('0.50 - 0.50i');
  });

  it('indexToBinary pads to the qubit count', () => {
    expect(indexToBinary(3, 4)).toBe('0011');
    expect(indexToBinary(0, 2)).toBe('00');
  });

  it('amplitudeToProbability is |z|^2', () => {
    expect(amplitudeToProbability(0.6, 0.8)).toBeCloseTo(1, 6);
    expect(amplitudeToProbability(Math.SQRT1_2, 0)).toBeCloseTo(0.5, 6);
  });
});

describe('angles + clamp', () => {
  it('converts degrees and radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 6);
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 6);
  });

  it('clamps within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('generateId', () => {
  it('produces distinct short ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
    expect([...ids].every((id) => id.length > 0)).toBe(true);
  });
});

describe('formatOperation', () => {
  it('formats gates with and without params', () => {
    expect(formatOperation('h', [0])).toBe('H[0]');
    expect(formatOperation('cnot', [0, 1])).toBe('CNOT[0,1]');
    expect(formatOperation('rx', [0], [Math.PI])).toBe('RX(3.1416)[0]');
  });
});

describe('debounce', () => {
  it('invokes only once after the delay', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('throttle', () => {
  it('invokes immediately then suppresses within the window', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
