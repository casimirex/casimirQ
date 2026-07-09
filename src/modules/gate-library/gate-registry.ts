import { IGate } from './interfaces/gate.interface';

/**
 * Gate Registry
 *
 * Provides centralized access to quantum gates and their metadata.
 */
export class GateRegistry {
  private gates: Map<string, IGate> = new Map();

  constructor() {
    this.registerStandardGates();
  }

  /**
   * Register standard gates
   */
  private registerStandardGates(): void {
    // Standard gates will be registered as needed
  }

  /**
   * Get a gate by name
   */
  getGate(name: string): IGate | undefined {
    return this.gates.get(name.toLowerCase());
  }

  /**
   * Register a custom gate
   */
  registerGate(name: string, gate: IGate): void {
    this.gates.set(name.toLowerCase(), gate);
  }

  /**
   * Get all registered gates
   */
  getAllGates(): Map<string, IGate> {
    return new Map(this.gates);
  }

  /**
   * Check if a gate exists
   */
  hasGate(name: string): boolean {
    return this.gates.has(name.toLowerCase());
  }
}
