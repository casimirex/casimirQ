import { OpenQASMAdapter } from './openqasm-adapter';
import { QiskitAdapter } from './qiskit-adapter';
import { CirqAdapter } from './cirq-adapter';
import { QuilAdapter } from './quil-adapter';
import { IonQAdapter } from './ionq-adapter';
import { Circuit } from '../../circuit-engine/circuit';

describe('Format Adapters Extended', () => {
  describe('OpenQASMAdapter Extended', () => {
    let adapter: OpenQASMAdapter;

    beforeEach(() => {
      adapter = new OpenQASMAdapter();
    });

    it('should parse circuit with multiple qubits', () => {
      const qasm = `OPENQASM 2.0;
qreg q[5];
h q[0];
h q[1];
h q[2];
cx q[0], q[1];
cx q[1], q[2];
measure q[0] -> c[0];
measure q[1] -> c[1];`;
      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(5);
    });

    it('should parse circuit with S and T gates', () => {
      const qasm = `OPENQASM 2.0;
qreg q[2];
s q[0];
t q[1];
sdg q[0];
tdg q[1];`;
      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse circuit with swap gate', () => {
      const qasm = `OPENQASM 2.0;
qreg q[2];
swap q[0], q[1];`;
      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse circuit with classical register', () => {
      const qasm = `OPENQASM 2.0;
qreg q[2];
creg c[2];
h q[0];
measure q[0] -> c[0];`;
      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should handle empty lines and whitespace', () => {
      const qasm = `OPENQASM 2.0;

qreg q[1];

h q[0];

`;
      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(1);
    });

    it('should handle multiple statements on one line', () => {
      const qasm = `OPENQASM 2.0;
qreg q[2]; h q[0]; x q[1];`;
      const circuit = adapter.parse(qasm);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should serialize circuit with multiple gates', () => {
      const circuit = Circuit.builder(3).h(0).h(1).h(2).cx(0, 1).cx(1, 2).build();
      const output = adapter.serialize(circuit);
      expect(output).toContain('OPENQASM');
      expect(output).toContain('qreg q[3]');
    });

    it('should validate circuit with barrier', () => {
      const qasm = `OPENQASM 2.0;
qreg q[2];
h q[0];
barrier q;
cx q[0], q[1];`;
      const result = adapter.validate(qasm);
      expect(result.valid).toBe(true);
    });

    it('should parse circuit with all Pauli gates', () => {
      const qasm = `OPENQASM 2.0;
qreg q[2];
x q[0];
y q[0];
z q[0];
x q[1];
h q[1];`;
      const circuit = adapter.parse(qasm);
      expect(circuit).toBeDefined();
    });
  });

  describe('QiskitAdapter Extended', () => {
    let adapter: QiskitAdapter;

    beforeEach(() => {
      adapter = new QiskitAdapter();
    });

    it('should parse Qiskit with barriers', () => {
      const json = JSON.stringify({
        num_qubits: 2,
        instructions: [
          { name: 'h', qubits: [0] },
          { name: 'barrier', qubits: [0, 1] },
          { name: 'cx', qubits: [0, 1] },
        ],
      });
      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse Qiskit with measurements', () => {
      const json = JSON.stringify({
        num_qubits: 2,
        instructions: [
          { name: 'h', qubits: [0] },
          { name: 'measure', qubits: [0], memory: [0] },
          { name: 'measure', qubits: [1], memory: [1] },
        ],
      });
      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should serialize circuit without metadata', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const output = adapter.serialize(circuit, { includeMetadata: false });
      const parsed = JSON.parse(output);
      expect(parsed.num_qubits).toBe(2);
    });

    it('should validate with empty instructions', () => {
      const json = JSON.stringify({
        num_qubits: 2,
        instructions: [],
      });
      const result = adapter.validate(json);
      expect(result.valid).toBe(true);
    });

    it('should invalidate with negative qubits', () => {
      const json = JSON.stringify({
        num_qubits: -1,
        instructions: [],
      });
      const result = adapter.validate(json);
      expect(result.valid).toBe(false);
    });
  });

  describe('CirqAdapter Extended', () => {
    let adapter: CirqAdapter;

    beforeEach(() => {
      adapter = new CirqAdapter();
    });

    it('should parse Cirq with NamedQubit', () => {
      const json = JSON.stringify({
        cirq_type: 'Circuit',
        qubits: [
          { cirq_type: 'NamedQubit', name: 'q0' },
          { cirq_type: 'NamedQubit', name: 'q1' },
        ],
        moments: [
          {
            operations: [{ gate: { name: 'H' }, qubits: [0] }],
          },
        ],
      });
      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse Cirq with LineQubit', () => {
      const json = JSON.stringify({
        cirq_type: 'Circuit',
        qubits: [
          { cirq_type: 'LineQubit', x: 0 },
          { cirq_type: 'LineQubit', x: 1 },
        ],
        moments: [],
      });
      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should serialize circuit without metadata', () => {
      const circuit = Circuit.builder(2).h(0).build();
      const output = adapter.serialize(circuit, { includeMetadata: false });
      const parsed = JSON.parse(output);
      expect(parsed.cirq_type).toBe('Circuit');
    });

    it('should validate with empty qubits', () => {
      const json = JSON.stringify({
        cirq_type: 'Circuit',
        qubits: [],
        moments: [],
      });
      const result = adapter.validate(json);
      expect(result.valid).toBe(true);
    });

    it('should invalidate with wrong cirq_type', () => {
      const json = JSON.stringify({
        cirq_type: 'NotACircuit',
        qubits: [],
        moments: [],
      });
      const result = adapter.validate(json);
      expect(result.valid).toBe(false);
    });
  });

  describe('QuilAdapter Extended', () => {
    let adapter: QuilAdapter;

    beforeEach(() => {
      adapter = new QuilAdapter();
    });

    it('should parse Quil with CZ gate', () => {
      const quil = `H 0
H 1
CZ 0 1`;
      const circuit = adapter.parse(quil);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse Quil with S and T gates', () => {
      const quil = `S 0
T 1
PHASE(pi/4) 0`;
      const circuit = adapter.parse(quil);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse Quil with RX/RY/RZ gates', () => {
      const quil = `RX(pi/2) 0
RY(pi/4) 1
RZ(pi/8) 0`;
      const circuit = adapter.parse(quil);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse Quil with DEFGATE', () => {
      const quil = `DEFGATE MYGATE:
    1, 0
    0, 1

MYGATE 0`;
      const circuit = adapter.parse(quil);
      expect(circuit.getMetadata().qubitCount).toBeGreaterThan(0);
    });

    it('should parse Quil with measurements', () => {
      const quil = `DECLARE ro BIT[2]
H 0
MEASURE 0 ro[0]
MEASURE 1 ro[1]`;
      const circuit = adapter.parse(quil);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should serialize circuit with measurements', () => {
      const circuit = Circuit.builder(2).h(0).measure(0).measure(1).build();
      const output = adapter.serialize(circuit, { includeComments: false });
      expect(output).toContain('DECLARE');
      // Quil adapter generates measurement boilerplate
    });

    it('should validate Quil with PRAGMA', () => {
      const quil = `PRAGMA INITIAL_REWIRING "PARTIAL"
H 0`;
      const result = adapter.validate(quil);
      expect(result.valid).toBe(true);
    });

    it('should validate empty Quil with whitespace', () => {
      const result = adapter.validate('   \n\t  ');
      expect(result.valid).toBe(false);
    });
  });

  describe('IonQAdapter Extended', () => {
    let adapter: IonQAdapter;

    beforeEach(() => {
      adapter = new IonQAdapter();
    });

    it('should parse IonQ with zz gate', () => {
      const json = JSON.stringify({
        format: 'ionq',
        version: '1.0',
        qubits: 2,
        gates: [
          { gate: 'gpi', target: 0, phase: 0 },
          { gate: 'gpi', target: 1, phase: 0 },
          { gate: 'zz', targets: [0, 1], angle: 0.5 },
        ],
      });
      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should parse IonQ with ms gate', () => {
      const json = JSON.stringify({
        format: 'ionq',
        version: '1.0',
        qubits: 2,
        gates: [{ gate: 'ms', targets: [0, 1], phi: 0, theta: 0.5 }],
      });
      const circuit = adapter.parse(json);
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });

    it('should serialize circuit with IonQ native gates', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const output = adapter.serialize(circuit, { useNativeGates: true });
      const parsed = JSON.parse(output);
      expect(parsed.format).toBe('ionq');
    });

    it('should serialize without native gates', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const output = adapter.serialize(circuit, { useNativeGates: false });
      const parsed = JSON.parse(output);
      expect(parsed.format).toBe('ionq');
    });

    it('should validate with extra fields', () => {
      const json = JSON.stringify({
        format: 'ionq',
        version: '1.0',
        qubits: 2,
        gates: [{ gate: 'h', target: 0 }],
        extra: 'field',
      });
      const result = adapter.validate(json);
      expect(result.valid).toBe(true);
    });

    it('should validate gates with extra properties', () => {
      const json = JSON.stringify({
        format: 'ionq',
        version: '1.0',
        qubits: 2,
        gates: [{ gate: 'h', target: 0, extra: 'prop' }],
      });
      const result = adapter.validate(json);
      expect(result.valid).toBe(true);
    });

    it('should invalidate with zero qubits', () => {
      const json = JSON.stringify({
        format: 'ionq',
        version: '1.0',
        qubits: 0,
        gates: [],
      });
      const result = adapter.validate(json);
      expect(result.valid).toBe(false);
    });
  });
});
