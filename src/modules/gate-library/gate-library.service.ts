/**
 * Gate Library Service
 *
 * Central registry for all quantum gates in casimirQ.
 * Provides gate lookup, validation, and metadata.
 */

import { Injectable } from '@nestjs/common';
import {
  IGate,
  ISingleQubitGate,
  ITwoQubitGate,
  IThreeQubitGate,
  IParametricGate,
  IGateMetadata,
} from './interfaces/gate.interface';
import {
  createGate,
  XGate,
  YGate,
  ZGate,
  HGate,
  SGate,
  TGate,
  RxGate,
  RyGate,
  RzGate,
  PhaseGate,
  UGate,
} from './standard-gates/single-qubit-gates';
import {
  createMultiQubitGate,
  CnotGate,
  CzGate,
  SwapGate,
  ToffoliGate,
} from './standard-gates/multi-qubit-gates';

@Injectable()
export class GateLibraryService {
  /**
   * Registry of gate constructors
   */
  private readonly gateRegistry = new Map<string, (params?: Record<string, number>) => IGate>();

  constructor() {
    this.registerStandardGates();
  }

  /**
   * Register all standard gates on initialization
   */
  private registerStandardGates(): void {
    // Single-qubit gates
    this.registerGate('x', () => new XGate());
    this.registerGate('y', () => new YGate());
    this.registerGate('z', () => new ZGate());
    this.registerGate('h', () => new HGate());
    this.registerGate('s', () => new SGate());
    this.registerGate('sdg', () => new SGate()); // S† will be added
    this.registerGate('t', () => new TGate());
    this.registerGate('tdg', () => new TGate()); // T† will be added
    this.registerGate('i', () => new XGate()); // Identity placeholder
    this.registerGate('id', () => new XGate()); // Identity placeholder
    this.registerGate('rx', (params) => new RxGate(params?.theta ?? 0));
    this.registerGate('ry', (params) => new RyGate(params?.theta ?? 0));
    this.registerGate('rz', (params) => new RzGate(params?.theta ?? 0));
    this.registerGate('p', (params) => new PhaseGate(params?.lambda ?? 0));
    this.registerGate('phase', (params) => new PhaseGate(params?.lambda ?? 0));
    this.registerGate('u', (params) =>
      new UGate(params?.theta ?? 0, params?.phi ?? 0, params?.lambda ?? 0),
    );

    // Multi-qubit gates
    this.registerGate('cx', () => new CnotGate());
    this.registerGate('cnot', () => new CnotGate());
    this.registerGate('cz', () => new CzGate());
    this.registerGate('swap', () => new SwapGate());
    this.registerGate('ccx', () => new ToffoliGate());
    this.registerGate('toffoli', () => new ToffoliGate());
  }

  /**
   * Register a new gate type
   */
  registerGate(type: string, factory: (params?: Record<string, number>) => IGate): void {
    this.gateRegistry.set(type.toLowerCase(), factory);
  }

  /**
   * Get a gate by type
   */
  getGate(type: string, params?: Record<string, number>): IGate {
    const factory = this.gateRegistry.get(type.toLowerCase());
    if (!factory) {
      throw new Error(`Unknown gate type: ${type}`);
    }
    return factory(params);
  }

  /**
   * Check if a gate type is registered
   */
  hasGate(type: string): boolean {
    return this.gateRegistry.has(type.toLowerCase());
  }

  /**
   * Get all registered gate types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.gateRegistry.keys());
  }

  /**
   * Get gate metadata
   */
  getGateMetadata(type: string): IGateMetadata {
    const gate = this.getGate(type);
    const metadata: IGateMetadata = {
      type: gate.type,
      numQubits: gate.numQubits,
      description: gate.name,
      isParametric: 'params' in gate,
    };

    if (metadata.isParametric) {
      const paramGate = gate as IParametricGate;
      metadata.params = Object.keys(paramGate.params);
    }

    return metadata;
  }

  /**
   * Validate that a gate is unitary
   */
  validateGate(gate: IGate): boolean {
    return gate.isUnitary();
  }

  /**
   * Get all single-qubit gates
   */
  getSingleQubitGates(): string[] {
    return ['x', 'y', 'z', 'h', 's', 'sdg', 't', 'tdg', 'i', 'id', 'rx', 'ry', 'rz', 'p', 'u'];
  }

  /**
   * Get all two-qubit gates
   */
  getTwoQubitGates(): string[] {
    return ['cx', 'cnot', 'cz', 'swap'];
  }

  /**
   * Get all three-qubit gates
   */
  getThreeQubitGates(): string[] {
    return ['ccx', 'toffoli'];
  }

  /**
   * Get parametric gate types
   */
  getParametricGates(): string[] {
    return ['rx', 'ry', 'rz', 'p', 'phase', 'u'];
  }

  /**
   * Create a controlled version of a single-qubit gate
   * This constructs the controlled gate matrix on the fly
   */
  createControlledGate(gateType: string, numControls: number = 1): IGate {
    if (numControls < 1) {
      return this.getGate(gateType);
    }

    // For now, return predefined controlled gates
    if (numControls === 1) {
      switch (gateType.toLowerCase()) {
        case 'x':
          return new CnotGate();
        case 'z':
          return new CzGate();
        default:
          throw new Error(`Controlled version of ${gateType} not yet implemented`);
      }
    }

    if (numControls === 2 && gateType.toLowerCase() === 'x') {
      return new ToffoliGate();
    }

    throw new Error(`Controlled version with ${numControls} controls not implemented`);
  }

  /**
   * Bind parameters to a parametric gate
   */
  bindParameters(gate: IParametricGate, params: Record<string, number>): IParametricGate {
    return gate.bind(params);
  }

  /**
   * Get default parameters for a parametric gate
   */
  getDefaultParameters(type: string): Record<string, number> | undefined {
    switch (type.toLowerCase()) {
      case 'rx':
      case 'ry':
      case 'rz':
        return { theta: 0 };
      case 'p':
      case 'phase':
        return { lambda: 0 };
      case 'u':
        return { theta: 0, phi: 0, lambda: 0 };
      default:
        return undefined;
    }
  }
}
