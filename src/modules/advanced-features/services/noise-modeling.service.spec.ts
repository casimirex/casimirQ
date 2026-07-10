import { NoiseModelingService, NOISE_MODELS } from './noise-modeling.service';
import { Complex } from '../../../common/utils/complex';

describe('NoiseModelingService', () => {
  let service: NoiseModelingService;

  beforeEach(() => {
    service = new NoiseModelingService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Available Models', () => {
    it('should return available noise models', () => {
      const models = service.getAvailableModels();
      expect(models).toContain('ideal');
      expect(models).toContain('depolarizing');
      expect(models).toContain('ibmq_lagos');
    });

    it('should get ideal model', () => {
      const model = service.getModel('ideal');
      expect(model).toBeDefined();
      expect(model?.name).toBe('Ideal');
      expect(model?.singleQubitErrors.length).toBe(0);
    });

    it('should get depolarizing model', () => {
      const model = service.getModel('depolarizing');
      expect(model).toBeDefined();
      expect(model?.singleQubitErrors.length).toBeGreaterThan(0);
    });

    it('should return undefined for unknown model', () => {
      const model = service.getModel('unknown');
      expect(model).toBeUndefined();
    });
  });

  describe('Depolarizing Channel', () => {
    it('should apply depolarizing noise', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyDepolarizing(state, 0, 0.1);
      expect(noisy).toBeDefined();
      expect(noisy.size).toBeGreaterThan(0);
    });

    it('should return same state for zero probability', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyDepolarizing(state, 0, 0);
      expect(noisy.get(BigInt(0))?.real).toBe(1);
    });

    it('should handle multiple qubits', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy0 = service.applyDepolarizing(state, 0, 0.1);
      const noisy1 = service.applyDepolarizing(noisy0, 1, 0.1);
      expect(noisy1).toBeDefined();
    });
  });

  describe('Amplitude Damping', () => {
    it('should apply amplitude damping', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(1), new Complex(1, 0)); // |1⟩ state

      const noisy = service.applyAmplitudeDamping(state, 0, 0.1);
      expect(noisy).toBeDefined();
    });

    it('should return same state for zero gamma', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyAmplitudeDamping(state, 0, 0);
      expect(noisy.get(BigInt(0))?.real).toBe(1);
    });

    it('should decay |1⟩ state', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(1), new Complex(1, 0));

      const noisy = service.applyAmplitudeDamping(state, 0, 0.5);
      // |1⟩ should partially decay to |0⟩
      expect(noisy.has(BigInt(0))).toBe(true);
      expect(noisy.has(BigInt(1))).toBe(true);
    });
  });

  describe('Phase Damping', () => {
    it('should apply phase damping', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyPhaseDamping(state, 0, 0.1);
      expect(noisy).toBeDefined();
    });

    it('should return same state for zero lambda', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyPhaseDamping(state, 0, 0);
      expect(noisy.get(BigInt(0))?.real).toBe(1);
    });
  });

  describe('Bit Flip', () => {
    it('should apply bit flip noise', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyBitFlip(state, 0, 0.1);
      expect(noisy).toBeDefined();
    });

    it('should return same state for zero probability', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyBitFlip(state, 0, 0);
      expect(noisy.size).toBe(1);
      expect(noisy.has(BigInt(0))).toBe(true);
    });

    it('should flip bits with given probability', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyBitFlip(state, 0, 1.0); // Always flip
      expect(noisy.has(BigInt(1))).toBe(true);
    });
  });

  describe('Phase Flip', () => {
    it('should apply phase flip noise', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyPhaseFlip(state, 0, 0.1);
      expect(noisy).toBeDefined();
    });

    it('should return same state for zero probability', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const noisy = service.applyPhaseFlip(state, 0, 0);
      expect(noisy.get(BigInt(0))?.real).toBe(1);
    });
  });

  describe('Apply Noise Channel', () => {
    it('should apply depolarizing channel', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const channel = {
        type: 'depolarizing' as const,
        targetQubits: [0],
        params: { pDepolarizing: 0.1 },
      };

      const noisy = service.applyNoiseChannel(state, channel);
      expect(noisy).toBeDefined();
    });

    it('should apply amplitude damping channel', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const channel = {
        type: 'amplitude_damping' as const,
        targetQubits: [0],
        params: { gamma: 0.1 },
      };

      const noisy = service.applyNoiseChannel(state, channel);
      expect(noisy).toBeDefined();
    });

    it('should apply phase damping channel', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const channel = {
        type: 'phase_damping' as const,
        targetQubits: [0],
        params: { lambda: 0.1 },
      };

      const noisy = service.applyNoiseChannel(state, channel);
      expect(noisy).toBeDefined();
    });

    it('should apply bit flip channel', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const channel = {
        type: 'bit_flip' as const,
        targetQubits: [0],
        params: { pBitFlip: 0.1 },
      };

      const noisy = service.applyNoiseChannel(state, channel);
      expect(noisy).toBeDefined();
    });

    it('should apply phase flip channel', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const channel = {
        type: 'phase_flip' as const,
        targetQubits: [0],
        params: { pPhaseFlip: 0.1 },
      };

      const noisy = service.applyNoiseChannel(state, channel);
      expect(noisy).toBeDefined();
    });

    it('should handle unknown channel type gracefully', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const channel = {
        type: 'unknown' as any,
        targetQubits: [0],
        params: {},
      };

      const noisy = service.applyNoiseChannel(state, channel);
      expect(noisy).toBeDefined();
    });

    it('should apply noise to multiple qubits', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const channel = {
        type: 'depolarizing' as const,
        targetQubits: [0, 1, 2],
        params: { pDepolarizing: 0.1 },
      };

      const noisy = service.applyNoiseChannel(state, channel);
      expect(noisy).toBeDefined();
    });
  });

  describe('Simulate with Noise', () => {
    it('should simulate with noise disabled', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const result = service.simulateWithNoise(state, { enableNoise: false });
      expect(result.fidelity).toBe(1.0);
      expect(result.errorRates.total).toBe(0);
    });

    it('should simulate with custom channels', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const result = service.simulateWithNoise(state, {
        enableNoise: true,
        customChannels: [
          {
            type: 'depolarizing',
            targetQubits: [0],
            params: { pDepolarizing: 0.1 },
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.fidelity).toBeLessThan(1.0);
    });

    it('should track error rates by qubit', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const result = service.simulateWithNoise(state, {
        enableNoise: true,
        customChannels: [
          {
            type: 'depolarizing',
            targetQubits: [0, 1],
            params: { pDepolarizing: 0.1 },
          },
        ],
      });

      expect(result.errorRates.byQubit.size).toBeGreaterThan(0);
    });

    it('should include execution time', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const result = service.simulateWithNoise(state, { enableNoise: false });
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fidelity Calculation', () => {
    it('should calculate fidelity for identical states', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1, 0));

      const fidelity = service.calculateFidelity(state, state);
      expect(fidelity).toBe(1);
    });

    it('should calculate fidelity for orthogonal states', () => {
      const state1 = new Map<bigint, Complex>();
      state1.set(BigInt(0), new Complex(1, 0));

      const state2 = new Map<bigint, Complex>();
      state2.set(BigInt(1), new Complex(1, 0));

      const fidelity = service.calculateFidelity(state1, state2);
      expect(fidelity).toBe(0);
    });

    it('should calculate fidelity for superposition', () => {
      const invSqrt2 = 1 / Math.sqrt(2);
      const state1 = new Map<bigint, Complex>();
      state1.set(BigInt(0), new Complex(invSqrt2, 0));
      state1.set(BigInt(1), new Complex(invSqrt2, 0));

      const fidelity = service.calculateFidelity(state1, state1);
      expect(fidelity).toBeCloseTo(1, 5);
    });
  });

  describe('Device Characteristics', () => {
    it('should generate device characteristics', () => {
      const model = NOISE_MODELS.depolarizing;
      const characteristics = service.generateDeviceCharacteristics(model);

      expect(characteristics).toBeDefined();
      expect(characteristics.T1.length).toBeGreaterThan(0);
      expect(characteristics.T2.length).toBeGreaterThan(0);
    });

    it('should handle empty model', () => {
      const model = NOISE_MODELS.ideal;
      const characteristics = service.generateDeviceCharacteristics(model);

      expect(characteristics.nQubits).toBe(1);
    });
  });

  describe('Custom Noise Channel', () => {
    it('should create noise channel', () => {
      const channel = service.createNoiseChannel(
        'depolarizing',
        [0, 1],
        { pDepolarizing: 0.1 },
        'test-channel',
      );

      expect(channel).toBeDefined();
      expect(channel.type).toBe('depolarizing');
      expect(channel.targetQubits).toEqual([0, 1]);
      expect(channel.params.pDepolarizing).toBe(0.1);
      expect(channel.name).toBe('test-channel');
    });
  });

  describe('Validate Noise Parameters', () => {
    it('should validate depolarizing parameters', () => {
      expect(service.validateNoiseParams('depolarizing', { pDepolarizing: 0.5 })).toBe(true);
      expect(service.validateNoiseParams('depolarizing', { pDepolarizing: -0.1 })).toBe(false);
      expect(service.validateNoiseParams('depolarizing', { pDepolarizing: 1.5 })).toBe(false);
    });

    it('should validate amplitude damping parameters', () => {
      expect(service.validateNoiseParams('amplitude_damping', { gamma: 0.5 })).toBe(true);
      expect(service.validateNoiseParams('amplitude_damping', { gamma: -0.1 })).toBe(false);
    });

    it('should validate phase damping parameters', () => {
      expect(service.validateNoiseParams('phase_damping', { lambda: 0.5 })).toBe(true);
      expect(service.validateNoiseParams('phase_damping', { lambda: 1.5 })).toBe(false);
    });

    it('should validate bit flip parameters', () => {
      expect(service.validateNoiseParams('bit_flip', { pBitFlip: 0.5 })).toBe(true);
      expect(service.validateNoiseParams('bit_flip', { pBitFlip: -0.1 })).toBe(false);
    });

    it('should validate phase flip parameters', () => {
      expect(service.validateNoiseParams('phase_flip', { pPhaseFlip: 0.5 })).toBe(true);
      expect(service.validateNoiseParams('phase_flip', { pPhaseFlip: -0.1 })).toBe(false);
    });

    it('should return true for unknown types', () => {
      expect(service.validateNoiseParams('custom' as any, {})).toBe(true);
    });
  });

  describe('Estimate Gate Error', () => {
    it('should estimate single-qubit gate error', () => {
      const model = NOISE_MODELS.depolarizing;
      const error = service.estimateGateError('h', [0], model);
      expect(error).toBeGreaterThanOrEqual(0);
    });

    it('should estimate two-qubit gate error', () => {
      const model = NOISE_MODELS.depolarizing;
      const error = service.estimateGateError('cx', [0, 1], model);
      expect(error).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for unknown gate', () => {
      const model = NOISE_MODELS.ideal;
      const error = service.estimateGateError('unknown', [0], model);
      expect(error).toBe(0);
    });
  });
});
