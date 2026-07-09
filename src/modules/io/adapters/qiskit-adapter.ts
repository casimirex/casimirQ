import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import { IFormatAdapter, IOOptions, ConversionResult } from '../interfaces/format-adapter.interface';

/**
 * Qiskit QuantumCircuit JSON format adapter.
 *
 * Handles conversion between casimirQ circuits and Qiskit's
 * JSON representation.
 *
 * Reference: https://docs.quantum.ibm.com/
 */
export class QiskitAdapter implements IFormatAdapter {
  readonly name = 'Qiskit';
  readonly version = '1.0';
  readonly extensions = ['.json', '.qiskit'];

  /**
   * Parse Qiskit JSON to Circuit.
   */
  parse(data: string): Circuit {
    const qiskitData = JSON.parse(data);
    const numQubits = qiskitData.num_qubits || qiskitData.n_qubits || 1;

    let builder = Circuit.builder(numQubits);

    // Parse instructions
    const instructions = qiskitData.instructions || qiskitData.ops || [];

    for (const instr of instructions) {
      builder = this.parseInstruction(instr, builder);
    }

    return builder.build();
  }

  /**
   * Parse a Qiskit instruction.
   */
  private parseInstruction(instr: unknown, builder: CircuitBuilder): CircuitBuilder {
    const instruction = instr as {
      name: string;
      qubits: number[];
      params?: number[];
    };

    const name = instruction.name.toLowerCase();
    const qubits = instruction.qubits;
    const params = instruction.params || [];

    // Map Qiskit gate names to casimirQ methods
    const gateMap: Record<string, (b: CircuitBuilder) => CircuitBuilder> = {
      h: (b) => b.h(qubits[0]),
      x: (b) => b.x(qubits[0]),
      y: (b) => b.y(qubits[0]),
      z: (b) => b.z(qubits[0]),
      s: (b) => b.s(qubits[0]),
      sdg: (b) => b.sdg(qubits[0]),
      t: (b) => b.t(qubits[0]),
      tdg: (b) => b.tdg(qubits[0]),
      rx: (b) => b.rx(qubits[0], params[0]),
      ry: (b) => b.ry(qubits[0], params[0]),
      rz: (b) => b.rz(qubits[0], params[0]),
      cx: (b) => b.cx(qubits[0], qubits[1]),
      cy: (b) => b.cy(qubits[0], qubits[1]),
      cz: (b) => b.cz(qubits[0], qubits[1]),
      swap: (b) => b.swap(qubits[0], qubits[1]),
      ch: (b) => b.ch(qubits[0], qubits[1]),
      crx: (b) => b.crx(qubits[0], qubits[1], params[0]),
      cry: (b) => b.cry(qubits[0], qubits[1], params[0]),
      crz: (b) => b.crz(qubits[0], qubits[1], params[0]),
      ccx: (b) => b.ccx(qubits[0], qubits[1], qubits[2]),
      cswap: (b) => b.cswap(qubits[0], qubits[1], qubits[2]),
      u1: (b) => b.rz(qubits[0], params[0]),
      u2: (b) => {
        // U2(φ, λ) = Rz(λ)Ry(π/2)Rz(φ)
        let bb = b.rz(qubits[0], params[1]);
        bb = bb.ry(qubits[0], Math.PI / 2);
        return bb.rz(qubits[0], params[0]);
      },
      u3: (b) => {
        // U3(θ, φ, λ)
        let bb = b.rz(qubits[0], params[2]);
        bb = bb.ry(qubits[0], params[0]);
        return bb.rz(qubits[0], params[1]);
      },
      p: (b) => b.p(qubits[0], params[0]),
      cp: (b) => b.cp(qubits[0], qubits[1], params[0]),
    };

    if (name in gateMap) {
      return gateMap[name](builder);
    }

    // Unknown gate - skip with warning
    console.warn(`Unknown Qiskit gate: ${name}`);
    return builder;
  }

  /**
   * Serialize Circuit to Qiskit JSON format.
   */
  serialize(circuit: Circuit, options?: IOOptions): string {
    const metadata = circuit.getMetadata();

    const qiskitData = {
      version: 2,
      num_qubits: metadata.qubitCount,
      metadata: options?.includeMetadata
        ? {
            description: 'Exported from casimirQ',
            gate_count: metadata.gateCount,
            depth: metadata.depth,
          }
        : undefined,
      instructions: [],
    };

    // Note: Full serialization requires Circuit.getOperations() method
    // For now, export metadata only

    return JSON.stringify(qiskitData, null, 2);
  }

  /**
   * Validate Qiskit JSON data.
   */
  validate(data: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const parsed = JSON.parse(data);

      if (typeof parsed !== 'object') {
        errors.push('Data must be a JSON object');
        return { valid: false, errors };
      }

      // Check required fields
      const numQubits = parsed.num_qubits || parsed.n_qubits;
      if (typeof numQubits !== 'number' || numQubits < 1) {
        errors.push('Missing or invalid num_qubits field');
      }

      // Check instructions array
      const instructions = parsed.instructions || parsed.ops;
      if (!Array.isArray(instructions)) {
        errors.push('Missing instructions array');
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
