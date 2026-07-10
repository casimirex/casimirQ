import { QuantumMLService, ANSATZ_TEMPLATES, FEATURE_MAPS } from './quantum-ml.service';

describe('QuantumMLService', () => {
  let service: QuantumMLService;

  beforeEach(() => {
    service = new QuantumMLService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Ansatz Templates', () => {
    it('should return available ansaetze', () => {
      const ansaetze = service.getAvailableAnsatze();
      expect(ansaetze.length).toBeGreaterThan(0);
    });

    it('should get hardware efficient ansatz', () => {
      const ansatz = service.getAnsatzTemplate('hardware_efficient');
      expect(ansatz).toBeDefined();
      expect(ansatz?.name).toBe('Hardware Efficient');
      expect(ansatz?.structure).toBe('hardware_efficient');
    });

    it('should get circuit 15 ansatz', () => {
      const ansatz = service.getAnsatzTemplate('circuit_15');
      expect(ansatz).toBeDefined();
      expect(ansatz?.structure).toBe('circuit_15');
    });

    it('should return undefined for unknown ansatz', () => {
      const ansatz = service.getAnsatzTemplate('unknown');
      expect(ansatz).toBeUndefined();
    });
  });

  describe('Feature Maps', () => {
    it('should return available feature maps', () => {
      const maps = service.getAvailableFeatureMaps();
      expect(maps.length).toBeGreaterThan(0);
    });

    it('should get ZZ feature map', () => {
      const map = service.getFeatureMap('zz');
      expect(map).toBeDefined();
      expect(map?.encoding).toBe('angle');
    });

    it('should return undefined for unknown feature map', () => {
      const map = service.getFeatureMap('unknown');
      expect(map).toBeUndefined();
    });
  });

  describe('Variational Parameters', () => {
    it('should create variational parameters', () => {
      const params = service.createVariationalParams(8);
      expect(params).toBeDefined();
      expect(params.values.length).toBe(8);
      expect(params.names?.length).toBe(8);
      expect(params.bounds?.length).toBe(8);
    });

    it('should create params with custom bounds', () => {
      const bounds = Array(4).fill({ min: 0, max: Math.PI });
      const params = service.createVariationalParams(4, bounds);
      expect(params.bounds).toEqual(bounds);
    });

    it('should initialize values in [0, 2π]', () => {
      const params = service.createVariationalParams(10);
      params.values.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(2 * Math.PI);
      });
    });
  });

  describe('Kernel Methods', () => {
    it('should compute kernel element', () => {
      const featureMap = FEATURE_MAPS.zz;
      const kernel = service.computeKernelElement([1, 0], [1, 0], featureMap);
      expect(kernel).toBeGreaterThan(0);
      expect(kernel).toBeLessThanOrEqual(1);
    });

    it('should compute kernel matrix', () => {
      const featureMap = FEATURE_MAPS.zz;
      const X = [
        [1, 0],
        [0, 1],
        [1, 1],
      ];
      const matrix = service.computeKernelMatrix(X, featureMap);
      expect(matrix.length).toBe(3);
      expect(matrix[0].length).toBe(3);
      expect(matrix[0][0]).toBe(1); // Diagonal should be 1
    });

    it('should return symmetric matrix', () => {
      const featureMap = FEATURE_MAPS.zz;
      const X = [
        [1, 0],
        [0, 1],
      ];
      const matrix = service.computeKernelMatrix(X, featureMap);
      expect(matrix[0][1]).toBe(matrix[1][0]);
    });
  });

  describe('VQE', () => {
    it('should run VQE', async () => {
      const config = {
        hamiltonian: [
          { pauli: 'Z', coefficient: 0.5 },
          { pauli: 'X', coefficient: 0.3 },
        ],
        ansatz: ANSATZ_TEMPLATES.hardware_efficient,
        optimizer: {
          type: 'SPSA' as const,
          maxIter: 10,
          learningRate: 0.1,
        },
      };

      const result = await service.runVQE(config);
      expect(result).toBeDefined();
      expect(result.minEnergy).toBeDefined();
      expect(result.optimalParams).toBeDefined();
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle initial parameters', async () => {
      const config = {
        hamiltonian: [{ pauli: 'Z', coefficient: 1.0 }],
        ansatz: ANSATZ_TEMPLATES.hardware_efficient,
        optimizer: {
          type: 'COBYLA' as const,
          maxIter: 5,
        },
        initialParams: Array(16).fill(0),
      };

      const result = await service.runVQE(config);
      expect(result).toBeDefined();
    });

    it('should track optimization history', async () => {
      const config = {
        hamiltonian: [{ pauli: 'Z', coefficient: 1.0 }],
        ansatz: ANSATZ_TEMPLATES.hardware_efficient,
        optimizer: {
          type: 'SPSA' as const,
          maxIter: 5,
          learningRate: 0.1,
        },
      };

      const result = await service.runVQE(config);
      expect(result.history.length).toBeGreaterThan(0);
    });

    it('should report convergence', async () => {
      const config = {
        hamiltonian: [{ pauli: 'Z', coefficient: 1.0 }],
        ansatz: ANSATZ_TEMPLATES.hardware_efficient,
        optimizer: {
          type: 'SPSA' as const,
          maxIter: 100,
          tol: 0.001,
          learningRate: 0.1,
        },
      };

      const result = await service.runVQE(config);
      expect(typeof result.converged).toBe('boolean');
    });
  });

  describe('Quantum Classifier Training', () => {
    it('should train quantum classifier', async () => {
      const data = [
        { features: [0.1, 0.2], label: 0 },
        { features: [0.8, 0.9], label: 1 },
      ];

      const config = {
        featureMap: FEATURE_MAPS.zz,
        ansatz: ANSATZ_TEMPLATES.hardware_efficient,
        nClasses: 2,
        optimizer: {
          type: 'SPSA' as const,
          maxIter: 5,
          learningRate: 0.1,
        },
        lossFunction: 'cross_entropy' as const,
      };

      const result = await service.trainQuantumClassifier(data, config);
      expect(result).toBeDefined();
      expect(result.finalLoss).toBeDefined();
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
      expect(result.epochs).toBeGreaterThan(0);
    });

    it('should track loss history', async () => {
      const data = [
        { features: [0.1], label: 0 },
        { features: [0.9], label: 1 },
      ];

      const config = {
        featureMap: FEATURE_MAPS.zz,
        nClasses: 2,
        optimizer: {
          type: 'SPSA' as const,
          maxIter: 5,
          learningRate: 0.1,
        },
        lossFunction: 'mse' as const,
      };

      const result = await service.trainQuantumClassifier(data, config);
      expect(result.lossHistory.length).toBeGreaterThan(0);
    });

    it('should report convergence', async () => {
      const data = [
        { features: [0.1], label: 0 },
        { features: [0.9], label: 1 },
      ];

      const config = {
        featureMap: FEATURE_MAPS.zz,
        nClasses: 2,
        optimizer: {
          type: 'SPSA' as const,
          maxIter: 5,
          tol: 0.01,
          learningRate: 0.1,
        },
        lossFunction: 'cross_entropy' as const,
      };

      const result = await service.trainQuantumClassifier(data, config);
      expect(typeof result.converged).toBe('boolean');
    });
  });

  describe('Classification', () => {
    it('should classify data point', async () => {
      const features = [0.5, 0.5];
      const params = Array(16).fill(0.1);

      const config = {
        featureMap: FEATURE_MAPS.zz,
        ansatz: ANSATZ_TEMPLATES.hardware_efficient,
        nClasses: 2,
        optimizer: {
          type: 'SPSA' as const,
          maxIter: 1,
          learningRate: 0.1,
        },
        lossFunction: 'cross_entropy' as const,
      };

      const result = service.classify(features, params, config);
      expect(result).toBeDefined();
      expect(result.predictedClass).toBeGreaterThanOrEqual(0);
      expect(result.probabilities.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return probabilities summing to 1', async () => {
      const features = [0.5];
      const params = [0.1, 0.2];

      const config = {
        featureMap: FEATURE_MAPS.zz,
        nClasses: 2,
        optimizer: {
          type: 'SPSA' as const,
          maxIter: 1,
          learningRate: 0.1,
        },
        lossFunction: 'cross_entropy' as const,
      };

      const result = service.classify(features, params, config);
      const sum = result.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
    });
  });

  describe('Resource Estimation', () => {
    it('should estimate resources', () => {
      const ansatz = ANSATZ_TEMPLATES.hardware_efficient;
      const estimate = service.estimateResources(ansatz, 100);

      expect(estimate).toBeDefined();
      expect(estimate.nQubits).toBe(ansatz.nQubits);
      expect(estimate.nGates).toBeGreaterThan(0);
      expect(estimate.estimatedTimeMs).toBeGreaterThan(0);
    });

    it('should scale with data size', () => {
      const ansatz = ANSATZ_TEMPLATES.hardware_efficient;
      const estimate1 = service.estimateResources(ansatz, 10);
      const estimate2 = service.estimateResources(ansatz, 100);

      expect(estimate2.estimatedTimeMs).toBeGreaterThan(estimate1.estimatedTimeMs);
    });
  });

  describe('Constants', () => {
    it('should export ansatz templates', () => {
      expect(ANSATZ_TEMPLATES.hardware_efficient).toBeDefined();
      expect(ANSATZ_TEMPLATES.circuit_15).toBeDefined();
    });

    it('should export feature maps', () => {
      expect(FEATURE_MAPS.zz).toBeDefined();
      expect(FEATURE_MAPS.pauli).toBeDefined();
    });
  });
});
