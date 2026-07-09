import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import { IFormatAdapter, IOOptions } from '../interfaces/format-adapter.interface';

/**
 * Cirq JSON format adapter.
 *
 * Google's Cirq framework for quantum circuits.
 *
 * Reference: https://quantumai.google/cirq
 */
export class CirqAdapter implements IFormatAdapter {
  readonly name = 'Cirq';
  readonly version = '1.0';
  readonly extensions = ['.json', '.cirq'];

  /**
   * Parse Cirq JSON to Circuit.
   */
  parse(data: string): Circuit {
    const cirqData = JSON.parse(data);
    const moments = cirqData.moments || [];

    // Determine qubit count from qubits array
    const qubits = cirqData.qubits || [];
    const numQubits = qubits.length || this.inferQubitCount(cirqData);

    let builder = Circuit.builder(numQubits);

    // Process moments (time slices)
    for (const moment of moments) {
      const operations = moment.operations || [];
      for (const op of operations) {
        builder = this.parseOperation(op, builder);
      }
    }

    return builder.build();
  }

  /**
   * Infer qubit count from operations.
   */
  private inferQubitCount(cirqData: { operations?: { qubits?: number[] }[] }): number {
    let maxQubit = 0;
    const operations = cirqData.operations || [];
    for (const op of operations) {
      const qubits = op.qubits || [];
      for (const q of qubits) {
        maxQubit = Math.max(maxQubit, q + 1);
      }
    }
    return maxQubit;
  }

  /**
   * Parse a Cirq operation.
   */
  private parseOperation(op: unknown, builder: CircuitBuilder): CircuitBuilder {
    const operation = op as {
      gate: { name: string; params?: number[] };
      qubits: number[];
    };

    const gateName = operation.gate?.name?.toLowerCase() || '';
    const qubits = operation.qubits || [];
    const params = operation.gate?.params || [];

    const gateMap: Record<string, (b: CircuitBuilder) => CircuitBuilder> = {
      h: (b) => b.h(qubits[0]),
      x: (b) => b.x(qubits[0]),
      y: (b) => b.y(qubits[0]),
      z: (b) => b.z(qubits[0]),
      s: (b) => b.s(qubits[0]),
      t: (b) => b.t(qubits[0]),
      rx: (b) => b.rx(qubits[0], params[0]),
      ry: (b) => b.ry(qubits[0], params[0]),
      rz: (b) => b.rz(qubits[0], params[0]),
      cx: (b) => b.cx(qubits[0], qubits[1]),
      cnot: (b) => b.cx(qubits[0], qubits[1]),
      cz: (b) => b.cz(qubits[0], qubits[1]),
      swap: (b) => b.swap(qubits[0], qubits[1]),
      ccx: (b) => b.ccx(qubits[0], qubits[1], qubits[2]),
      toffoli: (b) => b.ccx(qubits[0], qubits[1], qubits[2]),
    };

    if (gateName in gateMap) {
      return gateMap[gateName](builder);
    }

    console.warn(`Unknown Cirq gate: ${gateName}`);
    return builder;
  }

  /**
   * Serialize Circuit to Cirq JSON format.
   */
  serialize(circuit: Circuit, options?: IOOptions): string {
    const metadata = circuit.getMetadata();

    const cirqData = {
      cirq_type: 'Circuit',
      qubits: Array.from({ length: metadata.qubitCount }, (_, i) => ({
        cirq_type: 'GridQubit',
        row: i,
        col: 0,
      })),
      moments: [],
      metadata: options?.includeMetadata
        ? {
            exported_from: 'casimirQ',
            gate_count: metadata.gateCount,
          }
        : undefined,
    };

    return JSON.stringify(cirqData, null, 2);
  }

  /**
   * Validate Cirq JSON data.
   */
  validate(data: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const parsed = JSON.parse(data);

      if (parsed.cirq_type !== 'Circuit') {
        errors.push('Missing or invalid cirq_type field (expected "Circuit")');
      }

      if (!Array.isArray(parsed.qubits) && !Array.isArray(parsed.moments)) {
        errors.push('Missing qubits or moments array');
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
