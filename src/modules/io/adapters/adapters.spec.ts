import { OpenQASMAdapter } from './openqasm-adapter';
import { QiskitAdapter } from './qiskit-adapter';
import { CirqAdapter } from './cirq-adapter';
import { QuilAdapter } from './quil-adapter';
import { IonQAdapter } from './ionq-adapter';

describe('Format Adapters', () => {
  describe('OpenQASMAdapter', () => {
    let adapter: OpenQASMAdapter;

    beforeEach(() => {
      adapter = new OpenQASMAdapter();
    });

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('OpenQASM');
      expect(adapter.version).toBe('2.0');
      expect(adapter.extensions).toContain('.qasm');
    });

    it('should parse simple circuit', () => {
      const qasm = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
h q[0];
x q[1];`;

      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse circuit with CNOT', () => {
      const qasm = `OPENQASM 2.0;
qreg q[2];
cx q[0], q[1];`;

      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse circuit with rotations', () => {
      const qasm = `OPENQASM 2.0;
qreg q[1];
rx(1.57079632679) q[0];
ry(pi/2) q[0];
rz(pi) q[0];`;

      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(1);
    });

    it('should parse circuit with pi expressions', () => {
      const qasm = `OPENQASM 2.0;
qreg q[1];
rx(pi/2) q[0];
ry(2*pi) q[0];
rz(3*pi/4) q[0];`;

      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(1);
    });

    it('should serialize circuit to QASM', () => {
      const { Circuit } = require('../../circuit-engine/circuit');
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();

      const output = adapter.serialize(circuit, { includeComments: true });
      expect(output).toContain('OPENQASM');
      expect(output).toContain('qreg');
    });

    it('should serialize without comments', () => {
      const { Circuit } = require('../../circuit-engine/circuit');
      const circuit = Circuit.builder(2).h(0).build();

      const output = adapter.serialize(circuit, { includeComments: false });
      expect(output).toContain('OPENQASM');
    });

    it('should validate correct QASM', () => {
      const qasm = `OPENQASM 2.0;
qreg q[2];
h q[0];`;

      const result = adapter.validate(qasm);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate QASM without header', () => {
      const qasm = `qreg q[2];
h q[0];`;

      const result = adapter.validate(qasm);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing OPENQASM header');
    });

    it('should invalidate QASM without qreg', () => {
      const qasm = `OPENQASM 2.0;
h q[0];`;

      const result = adapter.validate(qasm);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No qubit register declared');
    });

    it('should handle empty lines and comments', () => {
      const qasm = `OPENQASM 2.0;
// This is a comment
qreg q[1];

h q[0];
// Another comment`;

      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(1);
    });
  });

  describe('QiskitAdapter', () => {
    let adapter: QiskitAdapter;

    beforeEach(() => {
      adapter = new QiskitAdapter();
    });

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('Qiskit');
      expect(adapter.version).toBe('1.0');
      expect(adapter.extensions).toContain('.json');
    });

    it('should parse Qiskit JSON', () => {
      const json = JSON.stringify({
        num_qubits: 2,
        instructions: [
          { name: 'h', qubits: [0] },
          { name: 'cx', qubits: [0, 1] },
        ],
      });

      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse with alternative field names', () => {
      const json = JSON.stringify({
        n_qubits: 2,
        ops: [
          { name: 'x', qubits: [0] },
        ],
      });

      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse parametric gates', () => {
      const json = JSON.stringify({
        num_qubits: 1,
        instructions: [
          { name: 'rx', qubits: [0], params: [1.57079632679] },
          { name: 'rz', qubits: [0], params: [3.14159265359] },
        ],
      });

      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(1);
    });

    it('should serialize circuit', () => {
      const { Circuit } = require('../../circuit-engine/circuit');
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();

      const output = adapter.serialize(circuit, { includeMetadata: true });
      const parsed = JSON.parse(output);
      expect(parsed.num_qubits).toBe(2);
    });

    it('should validate correct JSON', () => {
      const json = JSON.stringify({
        num_qubits: 2,
        instructions: [{ name: 'h', qubits: [0] }],
      });

      const result = adapter.validate(json);
      expect(result.valid).toBe(true);
    });

    it('should invalidate missing num_qubits', () => {
      const json = JSON.stringify({
        instructions: [{ name: 'h', qubits: [0] }],
      });

      const result = adapter.validate(json);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('num_qubits');
    });

    it('should invalidate invalid JSON', () => {
      const result = adapter.validate('invalid json');
      expect(result.valid).toBe(false);
    });
  });

  describe('CirqAdapter', () => {
    let adapter: CirqAdapter;

    beforeEach(() => {
      adapter = new CirqAdapter();
    });

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('Cirq');
      expect(adapter.version).toBe('1.0');
      expect(adapter.extensions).toContain('.json');
    });

    it('should parse Cirq JSON', () => {
      const json = JSON.stringify({
        cirq_type: 'Circuit',
        qubits: [
          { cirq_type: 'GridQubit', row: 0, col: 0 },
          { cirq_type: 'GridQubit', row: 0, col: 1 },
        ],
        moments: [
          {
            operations: [
              { gate: { name: 'H' }, qubits: [0] },
              { gate: { name: 'CNOT' }, qubits: [0, 1] },
            ],
          },
        ],
      });

      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse with operations array', () => {
      const json = JSON.stringify({
        cirq_type: 'Circuit',
        qubits: [{ cirq_type: 'GridQubit', row: 0, col: 0 }],
        operations: [{ gate: { name: 'X' }, qubits: [0] }],
      });

      const circuit = adapter.parse(json);
      expect(circuit).toBeDefined();
    });

    it('should serialize circuit', () => {
      const { Circuit } = require('../../circuit-engine/circuit');
      const circuit = Circuit.builder(2).h(0).build();

      const output = adapter.serialize(circuit, { includeMetadata: true });
      const parsed = JSON.parse(output);
      expect(parsed.cirq_type).toBe('Circuit');
    });

    it('should validate correct JSON', () => {
      const json = JSON.stringify({
        cirq_type: 'Circuit',
        qubits: [{ cirq_type: 'GridQubit', row: 0, col: 0 }],
        moments: [],
      });

      const result = adapter.validate(json);
      expect(result.valid).toBe(true);
    });

    it('should invalidate missing cirq_type', () => {
      const json = JSON.stringify({
        qubits: [{ cirq_type: 'GridQubit', row: 0, col: 0 }],
        moments: [],
      });

      const result = adapter.validate(json);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('cirq_type');
    });
  });

  describe('QuilAdapter', () => {
    let adapter: QuilAdapter;

    beforeEach(() => {
      adapter = new QuilAdapter();
    });

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('Quil');
      expect(adapter.version).toBe('3.0');
      expect(adapter.extensions).toContain('.quil');
    });

    it('should parse Quil code', () => {
      const quil = `H 0
CNOT 0 1`;

      const circuit = adapter.parse(quil);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse basic gates', () => {
      const quil = `H 0
X 1`;

      const circuit = adapter.parse(quil);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse with comments', () => {
      const quil = `# Initialize qubits
H 0
X 1`;

      const circuit = adapter.parse(quil);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse parametric gates', () => {
      const quil = `RX(1.57079632679) 0
RY(1.57079632679) 1`;

      const circuit = adapter.parse(quil);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should serialize circuit', () => {
      const { Circuit } = require('../../circuit-engine/circuit');
      const circuit = Circuit.builder(2).h(0).build();

      const output = adapter.serialize(circuit, { includeComments: true });
      expect(output).toContain('DECLARE');
    });

    it('should validate correct Quil', () => {
      const quil = `H 0
X 1`;

      const result = adapter.validate(quil);
      expect(result.valid).toBe(true);
    });

    it('should invalidate empty Quil', () => {
      const result = adapter.validate('');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('No valid quantum gates');
    });

    it('should invalidate unknown instructions', () => {
      const quil = `UNKNOWN 0`;

      const result = adapter.validate(quil);
      expect(result.valid).toBe(false);
    });
  });

  describe('IonQAdapter', () => {
    let adapter: IonQAdapter;

    beforeEach(() => {
      adapter = new IonQAdapter();
    });

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('IonQ');
      expect(adapter.version).toBe('1.0');
      expect(adapter.extensions).toContain('.json');
    });

    it('should parse IonQ JSON', () => {
      const json = JSON.stringify({
        format: 'ionq',
        version: '1.0',
        qubits: 2,
        gates: [
          { gate: 'h', target: 0 },
          { gate: 'cnot', control: 0, target: 1 },
        ],
      });

      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse native IonQ gates', () => {
      const json = JSON.stringify({
        format: 'ionq',
        qubits: 2,
        gates: [
          { gate: 'gpi', target: 0, phase: 0 },
          { gate: 'gpi2', target: 1, phase: 0 },
          { gate: 'gzz', targets: [0, 1], angle: 0.5 },
        ],
      });

      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse circuit array format', () => {
      const json = JSON.stringify({
        format: 'ionq',
        qubits: 1,
        circuit: [{ gate: 'x', target: 0 }],
      });

      const circuit = adapter.parse(json);
      expect(circuit).toBeDefined();
    });

    it('should serialize circuit', () => {
      const { Circuit } = require('../../circuit-engine/circuit');
      const circuit = Circuit.builder(2).h(0).build();

      const output = adapter.serialize(circuit, { includeMetadata: true });
      const parsed = JSON.parse(output);
      expect(parsed.format).toBe('ionq');
    });

    it('should validate correct JSON', () => {
      const json = JSON.stringify({
        format: 'ionq',
        version: '1.0',
        qubits: 2,
        gates: [{ gate: 'h', target: 0 }],
      });

      const result = adapter.validate(json);
      expect(result.valid).toBe(true);
    });

    it('should invalidate missing format', () => {
      const json = JSON.stringify({
        qubits: 2,
        gates: [],
      });

      const result = adapter.validate(json);
      expect(result.valid).toBe(false);
    });

    it('should invalidate invalid qubits', () => {
      const json = JSON.stringify({
        format: 'ionq',
        qubits: -1,
        gates: [],
      });

      const result = adapter.validate(json);
      expect(result.valid).toBe(false);
    });

    it('should invalidate missing gates array', () => {
      const json = JSON.stringify({
        format: 'ionq',
        qubits: 2,
      });

      const result = adapter.validate(json);
      expect(result.valid).toBe(false);
    });

    it('should validate gate types', () => {
      const json = JSON.stringify({
        format: 'ionq',
        qubits: 2,
        gates: [{ gate: 'invalid_gate', target: 0 }],
      });

      const result = adapter.validate(json);
      expect(result.valid).toBe(false);
    });
  });
});
