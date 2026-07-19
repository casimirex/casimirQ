/**
 * Auto-selection regression tests.
 *
 * The engine auto-selector must not route a circuit to the Clifford engine
 * unless the tableau can actually represent every gate. A controlled SWAP
 * (Fredkin), CY, or CH are *not* Clifford-representable even though their base
 * gate type (swap/y/h) is — routing them to Clifford used to throw a 500. These
 * drive the full auto-select path (no engine specified) and assert a correct
 * result instead.
 */

import {
  SimulationRunnerService,
  CircuitOperationSpec,
} from '../../api/services/simulation-runner.service';
import { SimulationEnginesService } from '../simulation-engines.service';
import { StatevectorEngine } from '../engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../engines/mps-engine/mps-engine';
import { CliffordEngine } from '../engines/clifford-engine/clifford-engine';

describe('engine auto-selection for controlled gates', () => {
  let runner: SimulationRunnerService;

  beforeEach(() => {
    const engines = new SimulationEnginesService(
      new StatevectorEngine(),
      new MPSEngine(),
      new CliffordEngine(),
    );
    runner = new SimulationRunnerService(engines);
  });

  /** Run with no engine specified, exercising auto-selection. */
  function autoRun(numQubits: number, operations: CircuitOperationSpec[]) {
    return runner.run({ numQubits, operations }, { shots: 1 }).results.probabilities;
  }

  it('simulates a controlled-SWAP (Fredkin) instead of misrouting it to Clifford', () => {
    // q0=1, q1=1, q2=0; cswap(control=q0, q1, q2) swaps q1,q2 -> q0=1,q1=0,q2=1.
    const probs = autoRun(3, [
      { gate: 'x', targets: [0] },
      { gate: 'x', targets: [1] },
      { gate: 'cswap', targets: [0, 1, 2] },
    ]);
    expect(probs['101']).toBeCloseTo(1, 6); // bitstring is q2 q1 q0
  });

  it('simulates a controlled-Y', () => {
    // q0=1; CY applies Y to q1 -> |1> (with a phase). Both bits become 1.
    const probs = autoRun(2, [
      { gate: 'x', targets: [0] },
      { gate: 'cy', targets: [0, 1] },
    ]);
    expect(probs['11']).toBeCloseTo(1, 6);
  });

  it('simulates a controlled-H', () => {
    // q0=1; CH puts q1 into |+>, so q1 is 0 or 1 with equal probability.
    const probs = autoRun(2, [
      { gate: 'x', targets: [0] },
      { gate: 'ch', targets: [0, 1] },
    ]);
    expect(probs['01']).toBeCloseTo(0.5, 6);
    expect(probs['11']).toBeCloseTo(0.5, 6);
  });

  it('still routes genuinely Clifford circuits (Bell) without error', () => {
    const probs = autoRun(2, [
      { gate: 'h', targets: [0] },
      { gate: 'cx', targets: [0, 1] },
    ]);
    expect(probs['00']).toBeCloseTo(0.5, 6);
    expect(probs['11']).toBeCloseTo(0.5, 6);
  });
});
