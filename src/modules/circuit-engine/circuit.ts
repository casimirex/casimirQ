/**
 * Circuit Builder
 *
 * Immutable quantum circuit construction.
 * All operations return new Circuit instances.
 */

import { IGate } from '../gate-library/interfaces/gate.interface';
import {
  XGate,
  YGate,
  ZGate,
  HGate,
  SGate,
  SdgGate,
  TGate,
  TdgGate,
  RxGate,
  RyGate,
  RzGate,
  PhaseGate,
} from '../gate-library/standard-gates/single-qubit-gates';
import { SwapGate } from '../gate-library/standard-gates/multi-qubit-gates';

/**
 * Represents a gate operation in a circuit
 */
export interface IGateOperation {
  readonly gate: IGate;
  readonly targets: number[];
  readonly controls?: number[];
}

/**
 * Quantum Circuit
 *
 * An immutable representation of a quantum circuit.
 * Built by chaining gate applications.
 */
export class Circuit {
  readonly numQubits: number;
  readonly operations: readonly IGateOperation[];
  readonly name?: string;

  constructor(numQubits: number, operations: IGateOperation[] = [], name?: string) {
    if (numQubits < 1) {
      throw new Error('Circuit must have at least 1 qubit');
    }
    this.numQubits = numQubits;
    this.operations = Object.freeze([...operations]);
    this.name = name;
  }

  /**
   * Create a new empty circuit
   */
  static create(numQubits: number, name?: string): Circuit {
    return new Circuit(numQubits, [], name);
  }

  /**
   * Apply a gate to target qubits
   */
  apply(gate: IGate, targets: number | number[], controls?: number[]): Circuit {
    const targetArray = Array.isArray(targets) ? targets : [targets];

    // Validate targets
    for (const target of targetArray) {
      if (target < 0 || target >= this.numQubits) {
        throw new Error(`Target qubit ${target} out of range (0 to ${this.numQubits - 1})`);
      }
    }

    // Validate controls
    if (controls) {
      for (const control of controls) {
        if (control < 0 || control >= this.numQubits) {
          throw new Error(`Control qubit ${control} out of range (0 to ${this.numQubits - 1})`);
        }
        if (targetArray.includes(control)) {
          throw new Error(`Control qubit ${control} cannot also be a target`);
        }
      }
    }

    const operation: IGateOperation = {
      gate,
      targets: targetArray,
      controls: controls ? [...controls] : undefined,
    };

    return new Circuit(this.numQubits, [...this.operations, operation], this.name);
  }

  /**
   * Apply Pauli-X gate
   */
  x(target: number): Circuit {
    return this.apply(new XGate(), target);
  }

  /**
   * Apply Pauli-Y gate
   */
  y(target: number): Circuit {
    return this.apply(new YGate(), target);
  }

  /**
   * Apply Pauli-Z gate
   */
  z(target: number): Circuit {
    return this.apply(new ZGate(), target);
  }

  /**
   * Apply Hadamard gate
   */
  h(target: number): Circuit {
    return this.apply(new HGate(), target);
  }

  /**
   * Apply S gate (phase)
   */
  s(target: number): Circuit {
    return this.apply(new SGate(), target);
  }

  /**
   * Apply T gate (π/8)
   */
  t(target: number): Circuit {
    return this.apply(new TGate(), target);
  }

  /**
   * Apply CNOT gate
   * CNOT is a controlled-X gate: applies X to target when control is |1⟩
   */
  cx(control: number, target: number): Circuit {
    // CNOT = controlled-X: apply X to target when control is |1⟩
    return this.apply(new XGate(), target, [control]);
  }

  /**
   * Apply CZ gate
   */
  cz(control: number, target: number): Circuit {
    return this.apply(new ZGate(), target, [control]);
  }

  /**
   * Apply a multi-controlled Z gate.
   *
   * Phase-flips the |1…1⟩ component: applies Z to `target` only when every
   * qubit in `controls` is |1⟩. Generalizes cz (one control) and ccz to any
   * number of controls. Since controlled-Z is symmetric in its qubits, the
   * choice of which qubit is the `target` is immaterial.
   */
  mcz(controls: number[], target: number): Circuit {
    return this.apply(new ZGate(), target, controls);
  }

  /**
   * Apply SWAP gate
   */
  swap(qubit1: number, qubit2: number): Circuit {
    return this.apply(new SwapGate(), [qubit1, qubit2]);
  }

  /**
   * Apply Toffoli (CCX) gate
   * Controlled-Controlled-X: applies X to target when both controls are |1⟩
   */
  ccx(control1: number, control2: number, target: number): Circuit {
    // CCX = controlled-controlled-X
    return this.apply(new XGate(), target, [control1, control2]);
  }

  /**
   * Apply rotation around X-axis
   */
  rx(theta: number, target: number): Circuit {
    return this.apply(new RxGate(theta), target);
  }

  /**
   * Apply rotation around Y-axis
   */
  ry(theta: number, target: number): Circuit {
    return this.apply(new RyGate(theta), target);
  }

  /**
   * Apply rotation around Z-axis
   */
  rz(theta: number, target: number): Circuit {
    return this.apply(new RzGate(theta), target);
  }

  /**
   * Apply phase gate
   */
  phase(lambda: number, target: number): Circuit {
    return this.apply(new PhaseGate(lambda), target);
  }

  /**
   * Apply measurement (represented as a gate operation)
   */
  measure(targets: number | number[]): Circuit {
    const targetArray = Array.isArray(targets) ? targets : [targets];
    // Measurement is handled specially by the simulator
    const operation: IGateOperation = {
      gate: {
        type: 'measure',
        name: 'Measure',
        matrix: null as any,
        numQubits: 1,
        isUnitary: () => false,
      },
      targets: targetArray,
    };
    return new Circuit(this.numQubits, [...this.operations, operation], this.name);
  }

  /**
   * Apply a barrier (synchronization point)
   */
  barrier(targets?: number | number[]): Circuit {
    const targetArray =
      targets === undefined
        ? Array.from({ length: this.numQubits }, (_, i) => i)
        : Array.isArray(targets)
          ? targets
          : [targets];

    const operation: IGateOperation = {
      gate: {
        type: 'barrier',
        name: 'Barrier',
        matrix: null as any,
        numQubits: targetArray.length,
        isUnitary: () => true,
      },
      targets: targetArray,
    };
    return new Circuit(this.numQubits, [...this.operations, operation], this.name);
  }

  /**
   * Chain this circuit with another
   */
  then(other: Circuit): Circuit {
    if (this.numQubits !== other.numQubits) {
      throw new Error('Cannot chain circuits with different number of qubits');
    }
    return new Circuit(this.numQubits, [...this.operations, ...other.operations], this.name);
  }

  /**
   * Repeat this circuit n times
   */
  repeat(n: number): Circuit {
    let result = new Circuit(this.numQubits, []);
    for (let i = 0; i < n; i++) {
      result = result.then(this);
    }
    return result;
  }

  /**
   * Get the depth of the circuit (number of time steps)
   */
  depth(): number {
    // Simple depth calculation - each gate adds 1
    // A more sophisticated version would account for parallelism
    return this.operations.length;
  }

  /**
   * Get the total number of gates
   */
  gateCount(): number {
    return this.operations.length;
  }

  /**
   * Count gates by type
   */
  gateCountByType(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const op of this.operations) {
      const type = op.gate.type;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    return counts;
  }

  /**
   * Check if this circuit is empty
   */
  isEmpty(): boolean {
    return this.operations.length === 0;
  }

  /**
   * Create a copy of this circuit
   */
  copy(): Circuit {
    return new Circuit(this.numQubits, [...this.operations], this.name);
  }

  /**
   * Get a string representation
   */
  toString(): string {
    const lines: string[] = [];
    lines.push(`Circuit: ${this.name || 'unnamed'} (${this.numQubits} qubits)`);
    for (let i = 0; i < this.operations.length; i++) {
      const op = this.operations[i];
      const controls = op.controls ? ` (controls: ${op.controls.join(', ')})` : '';
      lines.push(`  ${i + 1}. ${op.gate.name} on [${op.targets.join(', ')}]${controls}`);
    }
    return lines.join('\n');
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): object {
    return {
      numQubits: this.numQubits,
      name: this.name,
      operations: this.operations.map((op) => ({
        gate: {
          type: op.gate.type,
          name: op.gate.name,
        },
        targets: op.targets,
        controls: op.controls,
      })),
    };
  }

  /**
   * Get circuit metadata
   */
  getMetadata() {
    const gateCounts: Record<string, number> = {};
    let multiQubitGateCount = 0;

    for (const op of this.operations) {
      const name = op.gate.name || op.gate.type;
      gateCounts[name] = (gateCounts[name] || 0) + 1;
      if (op.targets.length > 1 || (op.controls && op.controls.length > 0)) {
        multiQubitGateCount++;
      }
    }

    return {
      qubitCount: this.numQubits,
      gateCount: this.operations.length,
      depth: this.depth(),
      operationCount: this.operations.length,
      gateCounts,
      multiQubitGateCount,
    };
  }

  /**
   * Compose this circuit with another (apply other after this)
   */
  compose(other: Circuit): Circuit {
    return this.then(other);
  }

  /**
   * Apply S† (S-dagger) gate
   */
  sdg(target: number): Circuit {
    return this.apply(new SdgGate(), target);
  }

  /**
   * Apply T† (T-dagger) gate
   */
  tdg(target: number): Circuit {
    return this.apply(new TdgGate(), target);
  }

  /**
   * Apply phase gate P(λ) = diag(1, e^(iλ))
   */
  p(lambda: number, target: number): Circuit {
    return this.apply(new PhaseGate(lambda), target);
  }

  /**
   * Apply controlled phase gate CP(λ)
   */
  cp(control: number, target: number, lambda: number): Circuit {
    return this.apply(new PhaseGate(lambda), target, [control]);
  }

  /**
   * Apply CY (controlled-Y) gate
   */
  cy(control: number, target: number): Circuit {
    return this.apply(new YGate(), target, [control]);
  }

  /**
   * Apply CH (controlled-Hadamard) gate
   */
  ch(control: number, target: number): Circuit {
    return this.apply(new HGate(), target, [control]);
  }

  /**
   * Apply CRX (controlled-RX) gate
   */
  crx(control: number, target: number, theta: number): Circuit {
    return this.apply(new RxGate(theta), target, [control]);
  }

  /**
   * Apply CRY (controlled-RY) gate
   */
  cry(control: number, target: number, theta: number): Circuit {
    return this.apply(new RyGate(theta), target, [control]);
  }

  /**
   * Apply CRZ (controlled-RZ) gate
   */
  crz(control: number, target: number, theta: number): Circuit {
    return this.apply(new RzGate(theta), target, [control]);
  }

  /**
   * Apply Fredkin (CSWAP) gate
   */
  cswap(control: number, target1: number, target2: number): Circuit {
    return this.apply(new SwapGate(), [target1, target2], [control]);
  }

  /**
   * Static builder method
   */
  static builder(numQubits: number): CircuitBuilder {
    return new CircuitBuilder(numQubits);
  }
}

/**
 * Create a Bell state circuit (|Φ+⟩)
 */
export function createBellStateCircuit(): Circuit {
  return Circuit.create(2, 'Bell State').h(0).cx(0, 1);
}

/**
 * Create a GHZ state circuit
 */
export function createGHZStateCircuit(n: number): Circuit {
  let circuit = Circuit.create(n, `GHZ State (${n} qubits)`).h(0);
  for (let i = 1; i < n; i++) {
    circuit = circuit.cx(0, i);
  }
  return circuit;
}

/**
 * Create a W state circuit
 */
export function createWStateCircuit(n: number): Circuit {
  // W state creation is more complex, simplified version
  let circuit = Circuit.create(n, `W State (${n} qubits)`);
  circuit = circuit.x(0);
  for (let i = 1; i < n; i++) {
    circuit = circuit.cx(i - 1, i);
  }
  return circuit;
}

/**
 * Create a QFT circuit
 */
export function createQFTCircuit(n: number): Circuit {
  let circuit = Circuit.create(n, `QFT (${n} qubits)`);

  for (let i = 0; i < n; i++) {
    circuit = circuit.h(i);
    for (let j = i + 1; j < n; j++) {
      // Controlled rotation
      const angle = Math.PI / Math.pow(2, j - i);
      circuit = circuit.cp(i, j, angle);
    }
  }

  // Swap qubits to reverse order
  for (let i = 0; i < Math.floor(n / 2); i++) {
    circuit = circuit.swap(i, n - 1 - i);
  }

  return circuit;
}

/**
 * Circuit Builder
 *
 * Mutable builder for constructing circuits fluently.
 * Provides a chainable API for adding gates.
 */
export class CircuitBuilder {
  private circuit: Circuit;

  constructor(numQubits: number) {
    this.circuit = Circuit.create(numQubits);
  }

  /**
   * Build and return the final circuit
   */
  build(): Circuit {
    return this.circuit;
  }

  /**
   * Apply Pauli-X gate
   */
  x(target: number): CircuitBuilder {
    this.circuit = this.circuit.x(target);
    return this;
  }

  /**
   * Apply Pauli-Y gate
   */
  y(target: number): CircuitBuilder {
    this.circuit = this.circuit.y(target);
    return this;
  }

  /**
   * Apply Pauli-Z gate
   */
  z(target: number): CircuitBuilder {
    this.circuit = this.circuit.z(target);
    return this;
  }

  /**
   * Apply Hadamard gate
   */
  h(target: number): CircuitBuilder {
    this.circuit = this.circuit.h(target);
    return this;
  }

  /**
   * Apply S gate
   */
  s(target: number): CircuitBuilder {
    this.circuit = this.circuit.s(target);
    return this;
  }

  /**
   * Apply S† gate
   */
  sdg(target: number): CircuitBuilder {
    this.circuit = this.circuit.sdg(target);
    return this;
  }

  /**
   * Apply T gate
   */
  t(target: number): CircuitBuilder {
    this.circuit = this.circuit.t(target);
    return this;
  }

  /**
   * Apply T† gate
   */
  tdg(target: number): CircuitBuilder {
    this.circuit = this.circuit.tdg(target);
    return this;
  }

  /**
   * Apply CNOT gate
   */
  cx(control: number, target: number): CircuitBuilder {
    this.circuit = this.circuit.cx(control, target);
    return this;
  }

  /**
   * Apply CY gate
   */
  cy(control: number, target: number): CircuitBuilder {
    this.circuit = this.circuit.cy(control, target);
    return this;
  }

  /**
   * Apply CZ gate
   */
  cz(control: number, target: number): CircuitBuilder {
    this.circuit = this.circuit.cz(control, target);
    return this;
  }

  /**
   * Apply a multi-controlled Z gate (generalized CZ over any number of controls).
   */
  mcz(controls: number[], target: number): CircuitBuilder {
    this.circuit = this.circuit.mcz(controls, target);
    return this;
  }

  /**
   * Apply CH gate
   */
  ch(control: number, target: number): CircuitBuilder {
    this.circuit = this.circuit.ch(control, target);
    return this;
  }

  /**
   * Apply SWAP gate
   */
  swap(qubit1: number, qubit2: number): CircuitBuilder {
    this.circuit = this.circuit.swap(qubit1, qubit2);
    return this;
  }

  /**
   * Apply Toffoli (CCX) gate
   */
  ccx(control1: number, control2: number, target: number): CircuitBuilder {
    this.circuit = this.circuit.ccx(control1, control2, target);
    return this;
  }

  /**
   * Apply CSWAP (Fredkin) gate
   */
  cswap(control: number, target1: number, target2: number): CircuitBuilder {
    this.circuit = this.circuit.cswap(control, target1, target2);
    return this;
  }

  /**
   * Apply RX rotation
   */
  rx(target: number, theta: number): CircuitBuilder {
    this.circuit = this.circuit.rx(theta, target);
    return this;
  }

  /**
   * Apply RY rotation
   */
  ry(target: number, theta: number): CircuitBuilder {
    this.circuit = this.circuit.ry(theta, target);
    return this;
  }

  /**
   * Apply RZ rotation
   */
  rz(target: number, theta: number): CircuitBuilder {
    this.circuit = this.circuit.rz(theta, target);
    return this;
  }

  /**
   * Apply Phase gate
   */
  p(target: number, lambda: number): CircuitBuilder {
    this.circuit = this.circuit.p(lambda, target);
    return this;
  }

  /**
   * Apply controlled phase gate
   */
  cp(control: number, target: number, lambda: number): CircuitBuilder {
    this.circuit = this.circuit.cp(control, target, lambda);
    return this;
  }

  /**
   * Apply CRX gate
   */
  crx(control: number, target: number, theta: number): CircuitBuilder {
    this.circuit = this.circuit.crx(control, target, theta);
    return this;
  }

  /**
   * Apply CRY gate
   */
  cry(control: number, target: number, theta: number): CircuitBuilder {
    this.circuit = this.circuit.cry(control, target, theta);
    return this;
  }

  /**
   * Apply CRZ gate
   */
  crz(control: number, target: number, theta: number): CircuitBuilder {
    this.circuit = this.circuit.crz(control, target, theta);
    return this;
  }

  /**
   * Apply measurement
   */
  measure(targets: number | number[]): CircuitBuilder {
    this.circuit = this.circuit.measure(targets);
    return this;
  }

  /**
   * Apply barrier
   */
  barrier(targets?: number | number[]): CircuitBuilder {
    this.circuit = this.circuit.barrier(targets);
    return this;
  }
}
