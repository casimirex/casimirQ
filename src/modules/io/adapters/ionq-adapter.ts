import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import { IFormatAdapter, IOOptions } from '../interfaces/format-adapter.interface';

/**
 * IonQ JSON format adapter.
 *
 * Native gate format for IonQ's trapped-ion quantum computers.
 *
 * Reference: https://docs.ionq.com/
 */
export class IonQAdapter implements IFormatAdapter {
  readonly name = 'IonQ';
  readonly version = '1.0';
  readonly extensions = ['.json', '.ionq'];

  /**
   * IonQ native gates: GPi, GPi2, GZZ (Mølmer-Sørensen)
   */
  private readonly ionqGates = ['gpi', 'gpi2', 'gzz', 'ms'];

  /**
   * Parse IonQ JSON to Circuit.
   */
  parse(data: string): Circuit {
    const ionqData = JSON.parse(data);
    const gates = ionqData.gates || ionqData.circuit || [];
    const numQubits = ionqData.qubits || this.inferQubitCount(gates);

    let builder = Circuit.builder(numQubits);

    for (const gate of gates) {
      builder = this.parseIonQGate(gate, builder);
    }

    return builder.build();
  }

  /**
   * Infer qubit count from gates.
   */
  private inferQubitCount(
    gates: { target?: number; control?: number; targets?: number[] }[],
  ): number {
    let maxQubit = 0;
    for (const gate of gates) {
      if (gate.target !== undefined) {
        maxQubit = Math.max(maxQubit, gate.target + 1);
      }
      if (gate.control !== undefined) {
        maxQubit = Math.max(maxQubit, gate.control + 1);
      }
      if (gate.targets) {
        for (const t of gate.targets) {
          maxQubit = Math.max(maxQubit, t + 1);
        }
      }
    }
    return maxQubit;
  }

  /**
   * Parse an IonQ gate.
   *
   * IonQ native gates:
   * - GPI(φ): Generalized Pauli X rotation
   * - GPI2(φ): Square root of GPI
   * - GZZ(θ): ZZ rotation (Mølmer-Sørensen)
   */
  private parseIonQGate(
    gate: {
      gate: string;
      target?: number;
      targets?: number[];
      control?: number;
      phase?: number;
      angle?: number;
    },
    builder: CircuitBuilder,
  ): CircuitBuilder {
    const gateName = gate.gate.toLowerCase();
    const phase = gate.phase || 0;
    const angle = gate.angle || 0;

    switch (gateName) {
      case 'gpi': {
        // GPI(φ) = Rz(φ) · X · Rz(-φ)
        const target = gate.target!;
        // Approximate with available gates
        return builder.rx(target, Math.PI).rz(target, phase * 2);
      }

      case 'gpi2': {
        // GPI2(φ) = Rz(φ) · Rx(π/2) · Rz(-φ)
        const target = gate.target!;
        return builder.rx(target, Math.PI / 2).rz(target, phase * 2);
      }

      case 'gzz':
      case 'ms': {
        // Mølmer-Sørensen / ZZ rotation
        const targets = gate.targets || [gate.target!];
        if (targets.length === 2) {
          // Decompose ZZ(θ) into CNOT - Rz(θ) - CNOT
          const [q1, q2] = targets;
          builder = builder.cx(q1, q2);
          builder = builder.rz(q2, angle);
          return builder.cx(q1, q2);
        }
        return builder;
      }

      // Standard gates (IonQ also supports these)
      case 'h':
        return builder.h(gate.target!);
      case 'x':
        return builder.x(gate.target!);
      case 'y':
        return builder.y(gate.target!);
      case 'z':
        return builder.z(gate.target!);
      case 'rx':
        return builder.rx(gate.target!, angle);
      case 'ry':
        return builder.ry(gate.target!, angle);
      case 'rz':
        return builder.rz(gate.target!, angle);
      case 'cnot':
      case 'cx':
        return builder.cx(gate.control!, gate.target!);
      case 'swap':
        return builder.swap(gate.targets![0], gate.targets![1]);

      default:
        console.warn(`Unknown IonQ gate: ${gateName}`);
        return builder;
    }
  }

  /**
   * Serialize Circuit to IonQ JSON format.
   *
   * Note: Conversion to native IonQ gates (GPI, GPI2, GZZ) requires
   * gate decomposition which is non-trivial.
   */
  serialize(circuit: Circuit, options?: IOOptions): string {
    const metadata = circuit.getMetadata();

    const ionqData = {
      format: 'ionq',
      version: '1.0',
      qubits: metadata.qubitCount,
      gates: [],
      metadata: options?.includeMetadata
        ? {
            platform: 'casimirQ',
            gate_count: metadata.gateCount,
          }
        : undefined,
    };

    return JSON.stringify(ionqData, null, 2);
  }

  /**
   * Validate IonQ JSON data.
   */
  validate(data: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const parsed = JSON.parse(data);

      // Check format
      if (parsed.format !== 'ionq') {
        errors.push('Missing or invalid format field (expected "ionq")');
      }

      // Check qubits
      if (typeof parsed.qubits !== 'number' || parsed.qubits < 1) {
        errors.push('Missing or invalid qubits field');
      }

      // Check gates array
      const gates = parsed.gates || parsed.circuit;
      if (!Array.isArray(gates)) {
        errors.push('Missing gates array');
        return { valid: false, errors };
      }

      // Validate each gate
      const validGates = [
        'gpi',
        'gpi2',
        'gzz',
        'ms',
        'h',
        'x',
        'y',
        'z',
        'rx',
        'ry',
        'rz',
        'cnot',
        'cx',
        'swap',
      ];

      for (let i = 0; i < gates.length; i++) {
        const gate = gates[i];
        if (!gate.gate || !validGates.includes(gate.gate.toLowerCase())) {
          errors.push(`Gate ${i}: Invalid or missing gate type`);
        }
      }
    } catch (e) {
      errors.push(`Invalid JSON: ${(e as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
