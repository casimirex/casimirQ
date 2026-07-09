import { Injectable } from '@nestjs/common';
import { BlochSphereService } from './services/bloch-sphere.service';
import { CircuitDiagramService } from './services/circuit-diagram.service';
import { ObservabilityService } from './services/observability.service';
import {
  IBlochSphereData,
  ICircuitDiagram,
  IQubitState,
  IAmplitudeVisualization,
  IEntanglementGraph,
} from './interfaces/visualization.interface';
import { Circuit } from '../circuit-engine/circuit';
import { Complex } from '../../common/utils/complex';

/**
 * Visualization Service
 *
 * Main service for quantum visualization features.
 * Coordinates Bloch spheres, circuit diagrams, and observability effects.
 */
@Injectable()
export class VisualizationService {
  constructor(
    private readonly blochService: BlochSphereService,
    private readonly diagramService: CircuitDiagramService,
    private readonly observabilityService: ObservabilityService,
  ) {}

  /**
   * Generate Bloch sphere data for a qubit state
   */
  generateBlochSphere(
    alpha: Complex,
    beta: Complex,
    radius: number = 1,
  ): IBlochSphereData {
    const bloch = this.blochService.amplitudesToBloch(alpha, beta);

    const state: IQubitState = {
      bloch,
      alpha: { re: alpha.real, im: alpha.imag },
      beta: { re: beta.real, im: beta.imag },
      probabilities: this.blochService.calculateProbabilities({ bloch } as IQubitState),
      isSuperposition: bloch.theta > 0.01 && bloch.theta < Math.PI - 0.01,
      entangledWith: [],
    };

    return this.blochService.generateBlochSphereData(state, radius);
  }

  /**
   * Generate circuit diagram
   */
  generateCircuitDiagram(circuit: Circuit): ICircuitDiagram {
    return this.diagramService.generateDiagram(circuit);
  }

  /**
   * Export circuit to SVG
   */
  exportCircuitToSVG(circuit: Circuit): string {
    return this.diagramService.generateSVG(circuit);
  }

  /**
   * Generate amplitude visualization from statevector
   */
  generateAmplitudeVisualization(
    statevector: Map<bigint, Complex>,
    numQubits: number,
  ): IAmplitudeVisualization {
    const basisStates: string[] = [];
    const magnitudes: number[] = [];
    const phases: number[] = [];
    const probabilities: number[] = [];

    const dim = 1 << numQubits;
    let maxMagnitude = 0;
    let totalProbability = 0;

    for (let i = 0; i < dim; i++) {
      const amp = statevector.get(BigInt(i)) || new Complex(0, 0);
      const magnitude = amp.magnitude();
      const probability = magnitude * magnitude;

      basisStates.push(i.toString(2).padStart(numQubits, '0'));
      magnitudes.push(magnitude);
      phases.push(amp.phase());
      probabilities.push(probability);

      maxMagnitude = Math.max(maxMagnitude, magnitude);
      totalProbability += probability;
    }

    return {
      basisStates,
      magnitudes,
      phases,
      probabilities,
      maxMagnitude: maxMagnitude || 1,
      totalProbability,
    };
  }

  /**
   * Generate entanglement graph
   */
  generateEntanglementGraph(
    numQubits: number,
    entanglementPairs: Array<{ q1: number; q2: number; type: string }>,
  ): IEntanglementGraph {
    const nodes: IEntanglementGraph['nodes'] = Array.from(
      { length: numQubits },
      (_, i) => ({
        id: i,
        label: `q${i}`,
        x: Math.cos((2 * Math.PI * i) / numQubits) * 100 + 150,
        y: Math.sin((2 * Math.PI * i) / numQubits) * 100 + 150,
        state: 'superposition',
      }),
    );

    const edges: IEntanglementGraph['edges'] = entanglementPairs.map((pair) => ({
      source: pair.q1,
      target: pair.q2,
      strength: 1.0,
      type: pair.type as 'bell' | 'ghz' | 'w' | 'custom',
      correlation: 1.0,
    }));

    return { nodes, edges };
  }

  /**
   * Generate animation frames for state transition
   */
  generateStateTransition(
    fromAlpha: Complex,
    fromBeta: Complex,
    toAlpha: Complex,
    toBeta: Complex,
    frames: number = 60,
  ): IQubitState[] {
    const fromBloch = this.blochService.amplitudesToBloch(fromAlpha, fromBeta);
    const toBloch = this.blochService.amplitudesToBloch(toAlpha, toBeta);

    const fromState: IQubitState = {
      bloch: fromBloch,
      alpha: { re: fromAlpha.real, im: fromAlpha.imag },
      beta: { re: fromBeta.real, im: fromBeta.imag },
      probabilities: this.blochService.calculateProbabilities({ bloch: fromBloch } as IQubitState),
      isSuperposition: fromBloch.theta > 0.01 && fromBloch.theta < Math.PI - 0.01,
      entangledWith: [],
    };

    const toState: IQubitState = {
      bloch: toBloch,
      alpha: { re: toAlpha.real, im: toAlpha.imag },
      beta: { re: toBeta.real, im: toBeta.imag },
      probabilities: this.blochService.calculateProbabilities({ bloch: toBloch } as IQubitState),
      isSuperposition: toBloch.theta > 0.01 && toBloch.theta < Math.PI - 0.01,
      entangledWith: [],
    };

    return this.blochService.generateAnimationFrames(fromState, toState, frames);
  }

  /**
   * Preview observer effect
   */
  previewObserverEffect(config?: unknown): void {
    this.observabilityService.previewEffect(config as any);
  }

  /**
   * Get measurement events stream
   */
  getMeasurementEvents() {
    return this.observabilityService.getMeasurementEvents();
  }

  /**
   * Get collapse animations stream
   */
  getCollapseAnimations() {
    return this.observabilityService.getCollapseAnimations();
  }
}
