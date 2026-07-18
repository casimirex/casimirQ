import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlgorithmResultView } from './AlgorithmResultView';

describe('<AlgorithmResultView />', () => {
  it('renders scalar result rows with humanised labels', () => {
    render(
      <AlgorithmResultView
        algorithm="Grover's Search"
        parameters={{ n: 4, markedItem: 9 }}
        result={{ executionTime: 2.5, successProbability: 0.9613, optimalIterations: 3 }}
      />,
    );

    expect(screen.getByText("Grover's Search")).toBeInTheDocument();
    expect(screen.getByText('Success Probability')).toBeInTheDocument();
    expect(screen.getByText('0.9613')).toBeInTheDocument();
    expect(screen.getByText('Optimal Iterations')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('omits the executionTime and output keys from the rows', () => {
    render(
      <AlgorithmResultView
        algorithm="X"
        parameters={{}}
        result={{ executionTime: 1, output: { huge: true }, factors: [3, 5] }}
      />,
    );

    expect(screen.queryByText('Execution Time')).not.toBeInTheDocument();
    expect(screen.queryByText('Output')).not.toBeInTheDocument();
    expect(screen.getByText('Factors')).toBeInTheDocument();
    expect(screen.getByText('[3, 5]')).toBeInTheDocument();
  });

  it('renders booleans as Yes/No and expands nested objects', () => {
    render(
      <AlgorithmResultView
        algorithm="Quantum Teleportation"
        parameters={{}}
        result={{
          verified: true,
          teleportedProbabilities: { prob0: 0.36, prob1: 0.64 },
        }}
      />,
    );

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    // nested object expanded one level
    expect(screen.getByText('Prob 0')).toBeInTheDocument();
    expect(screen.getByText('0.3600')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no scalar outputs', () => {
    render(
      <AlgorithmResultView
        algorithm="QFT"
        parameters={{ n: 3 }}
        result={{ executionTime: 0.5, output: {} }}
      />,
    );

    expect(screen.getByText(/no scalar outputs/i)).toBeInTheDocument();
  });
});
