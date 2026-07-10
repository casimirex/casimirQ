import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimulationResults } from './SimulationResults';
import type { SimulationResult } from '@/types';

const bell: SimulationResult = {
  circuitId: 'c1',
  jobId: 'sim-1',
  status: 'completed',
  numQubits: 2,
  requestedEngine: 'statevector',
  shots: 1024,
  results: {
    statevector: [
      { state: '00', re: 0.7071, im: 0, probability: 0.5 },
      { state: '11', re: 0.7071, im: 0, probability: 0.5 },
    ],
    probabilities: { '00': 0.5, '11': 0.5 },
    counts: { '00': 512, '11': 512 },
  },
  metadata: { executionTimeMs: 1.23, memoryUsageBytes: 2048 },
};

describe('<SimulationResults />', () => {
  it('renders the summary tiles', () => {
    render(<SimulationResults result={bell} />);
    expect(screen.getByText('statevector')).toBeInTheDocument();
    expect(screen.getByText('1,024')).toBeInTheDocument(); // shots
    expect(screen.getByText('1.23 ms')).toBeInTheDocument(); // time
  });

  it('renders a probability row per basis state with percentages', () => {
    render(<SimulationResults result={bell} />);
    // Each basis state appears in both the probability list and the statevector.
    expect(screen.getAllByText('|00⟩').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('|11⟩').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('50.0%')).toHaveLength(2); // one per probability row
  });

  it('renders the statevector amplitudes', () => {
    render(<SimulationResults result={bell} />);
    expect(screen.getByText('Statevector')).toBeInTheDocument();
    expect(screen.getAllByText(/0\.7071 \+ 0\.0000i/).length).toBeGreaterThan(0);
  });

  it('handles an empty distribution gracefully', () => {
    const empty: SimulationResult = {
      ...bell,
      results: { statevector: [], probabilities: {}, counts: {} },
    };
    render(<SimulationResults result={empty} />);
    expect(screen.getByText('No non-zero amplitudes.')).toBeInTheDocument();
  });
});
