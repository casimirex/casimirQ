import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import { IFormatAdapter, IOOptions, ConversionResult } from '../interfaces/format-adapter.interface';
import { GateRegistry } from '../../gate-library/gate-registry';

/**
 * OpenQASM 2.0 format adapter.
 *
 * OpenQASM (Open Quantum Assembly Language) is an intermediate
 * representation for quantum instructions.
 *
 * Reference: https://arxiv.org/abs/1707.03429
 */
export class OpenQASMAdapter implements IFormatAdapter {
  readonly name = 'OpenQASM';
  readonly version = '2.0';
  readonly extensions = ['.qasm'];

  private gateRegistry: GateRegistry;
  private qubitNames: Map<string, number> = new Map();
  private classicalNames: Map<string, number> = new Map();
  private qubitCount = 0;

  constructor() {
    this.gateRegistry = new GateRegistry();
  }

  /**
   * Parse OpenQASM 2.0 code to Circuit.
   */
  parse(data: string): Circuit {
    const lines = data.split('\n');
    this.qubitNames.clear();
    this.classicalNames.clear();
    this.qubitCount = 0;

    let builder: CircuitBuilder | null = null;
    let inGateDef = false;
    let customGates: Map<string, string[]> = new Map();
    let currentGateDef: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('OPENQASM')) {
        continue;
      }

      // Include statements
      if (trimmed.startsWith('include')) {
        // Standard library includes (qelib1.inc)
        continue;
      }

      // Gate definitions
      if (trimmed.startsWith('gate')) {
        inGateDef = true;
        const match = trimmed.match(/gate\s+(\w+)\s*\(([^)]*)\)?/);
        if (match) {
          currentGateDef = match[1];
          customGates.set(currentGateDef, []);
        }
        continue;
      }

      if (inGateDef) {
        if (trimmed === '}') {
          inGateDef = false;
          currentGateDef = null;
        } else if (currentGateDef) {
          const gateBody = customGates.get(currentGateDef) || [];
          gateBody.push(trimmed);
          customGates.set(currentGateDef, gateBody);
        }
        continue;
      }

      // Qubit register declaration
      const qregMatch = trimmed.match(/qreg\s+(\w+)\[(\d+)]/);
      if (qregMatch) {
        const name = qregMatch[1];
        const count = parseInt(qregMatch[2], 10);

        // Initialize builder on first qreg
        if (!builder) {
          builder = Circuit.builder(count);
          this.qubitCount = count;
        }

        // Map qubit names
        for (let i = 0; i < count; i++) {
          this.qubitNames.set(`${name}[${i}]`, i);
          this.qubitNames.set(`${name}_${i}`, i);
        }
        continue;
      }

      // Classical register declaration
      const cregMatch = trimmed.match(/creg\s+(\w+)\[(\d+)]/);
      if (cregMatch) {
        const name = cregMatch[1];
        const count = parseInt(cregMatch[2], 10);
        for (let i = 0; i < count; i++) {
          this.classicalNames.set(`${name}[${i}]`, i);
        }
        continue;
      }

      // Barrier (ignored in simulation)
      if (trimmed.startsWith('barrier')) {
        continue;
      }

      // Measurements
      const measureMatch = trimmed.match(/measure\s+(\S+)\s*->?\s*(\S+)/);
      if (measureMatch) {
        // Measurements are handled implicitly in our circuit model
        // or could be added as a special measurement instruction
        continue;
      }

      // Gate applications
      if (builder) {
        builder = this.parseGateApplication(trimmed, builder);
      }
    }

    if (!builder) {
      throw new Error('No qubit registers defined in QASM file');
    }

    return builder.build();
  }

  /**
   * Parse a gate application line.
   */
  private parseGateApplication(line: string, builder: CircuitBuilder): CircuitBuilder {
    // Strip trailing semicolon if present
    const trimmedLine = line.replace(/;$/, '');

    // Handle parameterized gates: gate(params) qubits
    const paramMatch = trimmedLine.match(/(\w+)\s*\(([^)]+)\)\s+(\S+(?:\s*,\s*\S+)*)/);
    if (paramMatch) {
      const gateName = paramMatch[1];
      const params = paramMatch[2].split(',').map((p) => {
        const val = parseFloat(p.trim());
        if (isNaN(val)) {
          // Try to evaluate simple expressions
          if (p.includes('pi')) {
            return this.evaluatePiExpression(p.trim());
          }
          return 0;
        }
        return val;
      });
      const qubits = paramMatch[3].split(',').map((q) => this.parseQubit(q.trim()));

      return this.applyGate(builder, gateName, qubits, params);
    }

    // Handle non-parameterized gates: gate qubits
    const gateMatch = trimmedLine.match(/(\w+)\s+([^,\s]+(?:\s*,\s*[^,\s]+)*)/);
    if (gateMatch) {
      const gateName = gateMatch[1];
      const qubits = gateMatch[2].split(',').map((q) => this.parseQubit(q.trim()));

      return this.applyGate(builder, gateName, qubits, []);
    }

    return builder;
  }

  /**
   * Parse qubit reference.
   */
  private parseQubit(ref: string): number {
    // Try direct lookup
    if (this.qubitNames.has(ref)) {
      return this.qubitNames.get(ref)!;
    }

    // Try parsing array notation
    const match = ref.match(/(\w+)\[(\d+)]/);
    if (match) {
      const name = match[1];
      const index = parseInt(match[2], 10);
      const fullRef = `${name}[${index}]`;
      if (this.qubitNames.has(fullRef)) {
        return this.qubitNames.get(fullRef)!;
      }
    }

    // Try bare number (for simple circuits)
    const num = parseInt(ref, 10);
    if (!isNaN(num)) {
      return num;
    }

    throw new Error(`Unknown qubit reference: ${ref}`);
  }

  /**
   * Evaluate expressions involving pi.
   */
  private evaluatePiExpression(expr: string): number {
    // Replace pi with Math.PI
    const replaced = expr.replace(/pi/g, `(${Math.PI})`);

    try {
      // eslint-disable-next-line no-new-func
      return new Function('return ' + replaced)();
    } catch {
      return 0;
    }
  }

  /**
   * Apply a gate to the circuit.
   */
  private applyGate(
    builder: CircuitBuilder,
    name: string,
    qubits: number[],
    params: number[],
  ): CircuitBuilder {
    const gateMap: Record<
      string,
      (b: CircuitBuilder, q: number[], p: number[]) => CircuitBuilder
    > = {
      // Single-qubit gates
      h: (b, q) => b.h(q[0]),
      x: (b, q) => b.x(q[0]),
      y: (b, q) => b.y(q[0]),
      z: (b, q) => b.z(q[0]),
      s: (b, q) => b.s(q[0]),
      sdg: (b, q) => b.sdg(q[0]),
      t: (b, q) => b.t(q[0]),
      tdg: (b, q) => b.tdg(q[0]),
      rx: (b, q, p) => b.rx(q[0], p[0]),
      ry: (b, q, p) => b.ry(q[0], p[0]),
      rz: (b, q, p) => b.rz(q[0], p[0]),
      u1: (b, q, p) => b.rz(q[0], p[0]),
      u2: (b, q, p) => {
        // U2(φ, λ) = Rz(φ)Ry(π/2)Rz(λ)
        let bb = b.rz(q[0], p[1]);
        bb = bb.ry(q[0], Math.PI / 2);
        return bb.rz(q[0], p[0]);
      },
      u3: (b, q, p) => {
        // U3(θ, φ, λ) = Rz(φ)Ry(θ)Rz(λ)
        let bb = b.rz(q[0], p[2]);
        bb = bb.ry(q[0], p[0]);
        return bb.rz(q[0], p[1]);
      },

      // Multi-qubit gates
      cx: (b, q) => b.cx(q[0], q[1]),
      cy: (b, q) => b.cy(q[0], q[1]),
      cz: (b, q) => b.cz(q[0], q[1]),
      swap: (b, q) => b.swap(q[0], q[1]),
      ch: (b, q) => b.ch(q[0], q[1]),

      // Toffoli
      ccx: (b, q) => b.ccx(q[0], q[1], q[2]),

      // Controlled rotations
      crx: (b, q, p) => b.crx(q[0], q[1], p[0]),
      cry: (b, q, p) => b.cry(q[0], q[1], p[0]),
      crz: (b, q, p) => b.crz(q[0], q[1], p[0]),
      cu1: (b, q, p) => b.cp(q[0], q[1], p[0]),
    };

    const lowerName = name.toLowerCase();
    if (lowerName in gateMap) {
      return gateMap[lowerName](builder, qubits, params);
    }

    throw new Error(`Unknown gate: ${name}`);
  }

  /**
   * Serialize Circuit to OpenQASM 2.0.
   */
  serialize(circuit: Circuit, options?: IOOptions): string {
    const metadata = circuit.getMetadata();
    const lines: string[] = [];

    // Header
    lines.push('OPENQASM 2.0;');
    lines.push('include "qelib1.inc";');
    lines.push('');

    if (options?.includeComments) {
      lines.push(`// Generated by casimirQ`);
      lines.push(`// Qubits: ${metadata.qubitCount}`);
      lines.push(`// Gates: ${metadata.gateCount}`);
      lines.push('');
    }

    // Qubit register
    lines.push(`qreg q[${metadata.qubitCount}];`);
    lines.push('');

    // Get operations from circuit
    // Note: This is a simplified serialization
    // Full implementation would need access to circuit's internal operations

    // For now, add placeholder comment
    lines.push('// Circuit operations would be serialized here');
    lines.push('// (Full serialization requires Circuit.getOperations() method)');

    return lines.join('\n');
  }

  /**
   * Validate OpenQASM data.
   */
  validate(data: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check header
    if (!data.includes('OPENQASM')) {
      errors.push('Missing OPENQASM header');
    }

    // Check for qreg declarations
    if (!data.includes('qreg')) {
      errors.push('No qubit register declared');
    }

    // Basic syntax checks
    const lines = data.split('\n');
    let bracketBalance = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      bracketBalance += (line.match(/\{/g) || []).length;
      bracketBalance -= (line.match(/\}/g) || []).length;

      if (bracketBalance < 0) {
        errors.push(`Line ${i + 1}: Unbalanced braces`);
        break;
      }
    }

    if (bracketBalance !== 0) {
      errors.push('Unbalanced braces in gate definition');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
