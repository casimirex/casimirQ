/**
 * Debug Simulation Test
 */

import { Circuit, createBellStateCircuit } from '../../modules/circuit-engine/circuit';
import { StatevectorEngine } from '../../modules/simulation-engines/engines/statevector-engine/statevector-engine';

describe('Debug Simulation', () => {
  it('should show intermediate states', () => {
    const engine = new StatevectorEngine();

    // Step 1: Just Hadamard
    console.log('\n=== Step 1: H on qubit 0 ===');
    const circuit1 = Circuit.create(2).h(0);
    const result1 = engine.simulate(circuit1);
    console.log('Statevector after H|00⟩:');
    for (const [idx, amp] of result1.statevector.entries()) {
      console.log(`  |${idx}⟩: ${amp.real.toFixed(4)} + ${amp.imag.toFixed(4)}i (prob: ${amp.magnitudeSquared().toFixed(4)})`);
    }
    // After H on qubit 0: should be |00⟩ (idx 0) and |10⟩ (idx 2)
    // Because qubit 0 is the first qubit (least significant in our indexing)

    // Step 2: Full Bell circuit
    console.log('\n=== Step 2: H then CNOT ===');
    const circuit2 = createBellStateCircuit();
    console.log('Circuit operations:');
    for (const op of circuit2.operations) {
      console.log(`  ${op.gate.name} on [${op.targets.join(',')}] controls=${op.controls}`);
    }

    const result2 = engine.simulate(circuit2);
    console.log('Statevector after Bell circuit:');
    for (const [idx, amp] of result2.statevector.entries()) {
      console.log(`  |${idx}⟩: ${amp.real.toFixed(4)} + ${amp.imag.toFixed(4)}i (prob: ${amp.magnitudeSquared().toFixed(4)})`);
    }

    // Just verify we have some output
    expect(result2.statevector.size).toBeGreaterThan(0);
  });

  it('should debug CNOT directly', () => {
    const engine = new StatevectorEngine();

    console.log('\n=== CNOT Test: |10⟩ → |11⟩ ===');
    const circuit = Circuit.create(2).x(0).cx(0, 1);

    console.log('Circuit: X(0), CNOT(0,1)');
    const result = engine.simulate(circuit);

    console.log('Result statevector:');
    for (const [idx, amp] of result.statevector.entries()) {
      console.log(`  |${idx}⟩: ${amp.real.toFixed(4)} + ${amp.imag.toFixed(4)}i`);
    }

    const amp11 = result.statevector.get(BigInt(3));
    console.log('|11⟩ amplitude:', amp11?.real);

    expect(true).toBe(true);
  });
});
