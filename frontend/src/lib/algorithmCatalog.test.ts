import { describe, it, expect } from 'vitest';
import { ALGORITHM_CATALOG, CATEGORY_LABELS } from './algorithmCatalog';

describe('algorithm catalog', () => {
  it('exposes the fourteen executable algorithms with unique slugs', () => {
    const slugs = ALGORITHM_CATALOG.map((a) => a.slug);
    expect(slugs.slice().sort()).toEqual(
      [
        'amplitude-amplification',
        'bernstein-vazirani',
        'deutsch-jozsa',
        'grover',
        'hamiltonian-simulation',
        'hhl',
        'phase-estimation',
        'qaoa',
        'qft',
        'quantum-walk',
        'shor',
        'simon',
        'teleport',
        'vqe',
      ].sort(),
    );
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every algorithm a known category label', () => {
    for (const algo of ALGORITHM_CATALOG) {
      expect(CATEGORY_LABELS[algo.category]).toBeTruthy();
    }
  });

  it('marks VQE and QAOA as example-driven and others as not', () => {
    const bySlug = Object.fromEntries(ALGORITHM_CATALOG.map((a) => [a.slug, a]));
    expect(bySlug.vqe.usesExample).toBe('vqe');
    expect(bySlug.qaoa.usesExample).toBe('qaoa');
    expect(bySlug.grover.usesExample).toBeUndefined();
    expect(bySlug.qft.usesExample).toBeUndefined();
  });

  it("declares Grover's numeric inputs (n, markedItem, optional iterations)", () => {
    const grover = ALGORITHM_CATALOG.find((a) => a.slug === 'grover')!;
    const keys = grover.fields.map((f) => f.key);
    expect(keys).toEqual(['n', 'markedItem', 'iterations']);
    expect(grover.fields.find((f) => f.key === 'iterations')?.optional).toBe(true);
  });

  it('bounds qubit counts so they never exceed the engine limit', () => {
    for (const algo of ALGORITHM_CATALOG) {
      const nField = algo.fields.find((f) => f.key === 'n');
      if (nField && nField.kind === 'int') {
        expect(nField.min).toBe(1);
        expect(nField.max).toBeLessThanOrEqual(16);
      }
    }
  });
});
