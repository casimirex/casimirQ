/**
 * Quantum Machine Learning Interfaces
 *
 * Defines types for variational quantum circuits, quantum kernels,
 * and QML training algorithms.
 */

/**
 * Variational circuit parameters
 */
export interface IVariationalParams {
  /**
   * Parameter values
   */
  readonly values: number[];

  /**
   * Parameter bounds
   */
  readonly bounds?: { min: number; max: number }[];

  /**
   * Parameter names
   */
  readonly names?: string[];
}

/**
 * Variational quantum circuit (Ansatz)
 */
export interface IAnsatz {
  /**
   * Ansatz name
   */
  readonly name: string;

  /**
   * Number of qubits
   */
  readonly nQubits: number;

  /**
   * Number of layers
   */
  readonly nLayers: number;

  /**
   * Number of parameters
   */
  readonly nParams: number;

  /**
   * Circuit structure type
   */
  readonly structure: 'hardware_efficient' | 'circuit_15' | 'UCC' | 'custom';

  /**
   * Entanglement pattern
   */
  readonly entanglement: 'linear' | 'circular' | 'full' | 'sca';
}

/**
 * Quantum feature map
 */
export interface IFeatureMap {
  /**
   * Feature map name
   */
  readonly name: string;

  /**
   * Number of qubits
   */
  readonly nQubits: number;

  /**
   * Feature dimension
   */
  readonly featureDimension: number;

  /**
   * Number of repetitions
   */
  readonly reps: number;

  /**
   * Encoding method
   */
  readonly encoding: 'angle' | 'amplitude' | 'custom';
}

/**
 * Quantum kernel
 */
export interface IQuantumKernel {
  /**
   * Kernel name
   */
  readonly name: string;

  /**
   * Feature map used
   */
  readonly featureMap: IFeatureMap;

  /**
   * Kernel type
   */
  readonly type: 'fidelity' | 'projected' | 'custom';

  /**
   * Compute kernel matrix element
   */
  compute(x: number[], y: number[]): number;
}

/**
 * Training data point
 */
export interface ITrainingData {
  /**
   * Input features
   */
  readonly features: number[];

  /**
   * Target label
   */
  readonly label: number;

  /**
   * Weight (for weighted training)
   */
  readonly weight?: number;
}

/**
 * Optimizer configuration
 */
export interface IOptimizerConfig {
  /**
   * Optimizer type
   */
  readonly type: 'SPSA' | 'COBYLA' | 'L-BFGS-B' | 'ADAM' | 'SGD';

  /**
   * Maximum iterations
   */
  readonly maxIter: number;

  /**
   * Learning rate / step size
   */
  readonly learningRate?: number;

  /**
   * Convergence tolerance
   */
  readonly tol?: number;

  /**
   * Callback function
   */
  readonly callback?: (params: number[], loss: number, iteration: number) => void;
}

/**
 * VQE (Variational Quantum Eigensolver) configuration
 */
export interface IVQEConfig {
  /**
   * Hamiltonian to minimize
   */
  readonly hamiltonian: { pauli: string; coefficient: number }[];

  /**
   * Ansatz circuit
   */
  readonly ansatz: IAnsatz;

  /**
   * Optimizer configuration
   */
  readonly optimizer: IOptimizerConfig;

  /**
   * Initial parameters
   */
  readonly initialParams?: number[];

  /**
   * Number of shots
   */
  readonly shots?: number;
}

/**
 * VQE result
 */
export interface IVQEResult {
  /**
   * Minimum energy found
   */
  readonly minEnergy: number;

  /**
   * Optimal parameters
   */
  readonly optimalParams: number[];

  /**
   * Convergence history
   */
  readonly history: { iteration: number; energy: number; params: number[] }[];

  /**
   * Number of iterations
   */
  readonly iterations: number;

  /**
   * Whether converged
   */
  readonly converged: boolean;

  /**
   * Execution time
   */
  readonly executionTimeMs: number;
}

/**
 * QML training result
 */
export interface IQMLTrainingResult {
  /**
   * Final loss
   */
  readonly finalLoss: number;

  /**
   * Training accuracy
   */
  readonly accuracy: number;

  /**
   * Optimal parameters
   */
  readonly optimalParams: number[];

  /**
   * Loss history
   */
  readonly lossHistory: number[];

  /**
   * Validation history
   */
  readonly validationHistory?: number[];

  /**
   * Number of epochs
   */
  readonly epochs: number;

  /**
   * Whether training converged
   */
  readonly converged: boolean;

  /**
   * Execution time
   */
  readonly executionTimeMs: number;
}

/**
 * Quantum classifier configuration
 */
export interface IQuantumClassifierConfig {
  /**
   * Feature map
   */
  readonly featureMap: IFeatureMap;

  /**
   * Ansatz (for variational classifier)
   */
  readonly ansatz?: IAnsatz;

  /**
   * Number of classes
   */
  readonly nClasses: number;

  /**
   * Optimizer configuration
   */
  readonly optimizer: IOptimizerConfig;

  /**
   * Loss function
   */
  readonly lossFunction: 'cross_entropy' | 'hinge' | 'mse';
}

/**
 * Classification result
 */
export interface IClassificationResult {
  /**
   * Predicted class
   */
  readonly predictedClass: number;

  /**
   * Class probabilities
   */
  readonly probabilities: number[];

  /**
   * Confidence score
   */
  readonly confidence: number;
}
