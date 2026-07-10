/**
 * Qubit state representation for visualization
 */
export interface IQubitState {
  /** Bloch sphere coordinates */
  bloch: {
    theta: number; // Polar angle (0 to π)
    phi: number; // Azimuthal angle (0 to 2π)
  };

  /** Probability amplitudes */
  alpha: { re: number; im: number };
  beta: { re: number; im: number };

  /** Measurement probabilities */
  probabilities: {
    zero: number;
    one: number;
  };

  /** Is this qubit in superposition? */
  isSuperposition: boolean;

  /** Is this qubit entangled with others? */
  entangledWith: number[];
}

/**
 * Bloch sphere visualization data
 */
export interface IBlochSphereData {
  /** Sphere radius */
  radius: number;

  /** Qubit position on sphere surface */
  position: {
    x: number;
    y: number;
    z: number;
  };

  /** State vector arrow */
  arrow: {
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
  };

  /** Measurement axes */
  axes: {
    x: { start: number[]; end: number[]; color: string };
    y: { start: number[]; end: number[]; color: string };
    z: { start: number[]; end: number[]; color: string };
  };

  /** Equator and meridian circles */
  circles: {
    equator: number[][];
    meridian: number[][];
  };
}

/**
 * Circuit diagram visualization
 */
export interface ICircuitDiagram {
  /** SVG width */
  width: number;

  /** SVG height */
  height: number;

  /** Wire positions */
  wires: {
    index: number;
    y: number;
    label: string;
  }[];

  /** Gate elements */
  gates: {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    targets: number[];
    controls?: number[];
    params?: Record<string, number>;
  }[];

  /** Connection lines */
  connections: {
    from: { gate: string; port: string };
    to: { gate: string; port: string };
    path: string; // SVG path
  }[];
}

/**
 * Amplitude visualization data
 */
export interface IAmplitudeVisualization {
  /** Basis states */
  basisStates: string[];

  /** Amplitude magnitudes */
  magnitudes: number[];

  /** Amplitude phases (in radians) */
  phases: number[];

  /** Probabilities */
  probabilities: number[];

  /** Max amplitude for scaling */
  maxMagnitude: number;

  /** Total probability (should be ~1) */
  totalProbability: number;
}

/**
 * Entanglement graph data
 */
export interface IEntanglementGraph {
  /** Nodes (qubits) */
  nodes: {
    id: number;
    label: string;
    x: number;
    y: number;
    state: 'superposition' | 'collapsed' | 'entangled';
  }[];

  /** Edges (entanglement correlations) */
  edges: {
    source: number;
    target: number;
    strength: number; // 0 to 1
    type: 'bell' | 'ghz' | 'w' | 'custom';
    correlation: number; // -1 to 1
  }[];
}

/**
 * Measurement event for observability
 */
export interface IMeasurementEvent {
  /** Circuit ID */
  circuitId: string;

  /** Qubit index */
  qubit: number;

  /** Measurement outcome */
  outcome: 0 | 1;

  /** Probability of this outcome */
  probability: number;

  /** Timestamp */
  timestamp: number;

  /** Qubits entangled with this one */
  entangledWith: number[];

  /** State before measurement (for animation) */
  preState: IQubitState;

  /** State after measurement (collapsed) */
  postState: IQubitState;
}

/**
 * Real-time visualization update
 */
export interface IVisualizationUpdate {
  /** Update type */
  type: 'state-change' | 'measurement' | 'entanglement' | 'animation';

  /** Circuit ID */
  circuitId: string;

  /** Timestamp */
  timestamp: number;

  /** Update payload */
  payload: unknown;
}

/**
 * Animation configuration
 */
export interface IAnimationConfig {
  /** Animation duration in ms */
  duration: number;

  /** Easing function */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';

  /** Delay before animation starts */
  delay: number;

  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * "Universe Looks Back" effect configuration
 */
export interface IObserverEffectConfig {
  /** Enable visual effects */
  visual: boolean;

  /** Enable audio effects */
  audio: boolean;

  /** Enable haptic feedback */
  haptic: boolean;

  /** Effect intensity (0-1) */
  intensity: number;

  /** Screen shake amount */
  shakeIntensity: number;

  /** Flash duration in ms */
  flashDuration: number;

  /** Sound frequency (Hz) */
  soundFrequency: number;
}
