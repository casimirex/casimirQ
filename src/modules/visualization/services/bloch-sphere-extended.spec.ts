import { BlochSphereService } from './bloch-sphere.service';
import { IQubitState } from '../interfaces/visualization.interface';
import { Complex } from '../../../common/utils/complex';

describe('BlochSphereService Extended', () => {
  let service: BlochSphereService;

  beforeEach(() => {
    service = new BlochSphereService();
  });

  describe('Generate Bloch Data Edge Cases', () => {
    it('should handle |0> state', () => {
      const state: IQubitState = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };
      const result = service.generateBlochSphereData(state);
      expect(result).toBeDefined();
      expect(result.position.z).toBeCloseTo(1, 5);
    });

    it('should handle |1> state', () => {
      const state: IQubitState = {
        bloch: { theta: Math.PI, phi: 0 },
        alpha: { re: 0, im: 0 },
        beta: { re: 1, im: 0 },
        probabilities: { zero: 0, one: 1 },
        isSuperposition: false,
        entangledWith: [],
      };
      const result = service.generateBlochSphereData(state);
      expect(result).toBeDefined();
      expect(result.position.z).toBeCloseTo(-1, 5);
    });

    it('should handle |+> state', () => {
      const state: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const result = service.generateBlochSphereData(state);
      expect(result).toBeDefined();
      expect(result.position.x).toBeGreaterThan(0);
    });

    it('should handle |-> state', () => {
      const state: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: Math.PI },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: -1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const result = service.generateBlochSphereData(state);
      expect(result).toBeDefined();
      expect(result.position.x).toBeLessThan(0);
    });

    it('should handle |i+> state', () => {
      const state: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: Math.PI / 2 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 0, im: 1 / Math.sqrt(2) },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const result = service.generateBlochSphereData(state);
      expect(result).toBeDefined();
      expect(result.position.y).toBeGreaterThan(0);
    });

    it('should handle |i-> state', () => {
      const state: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: -Math.PI / 2 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 0, im: -1 / Math.sqrt(2) },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const result = service.generateBlochSphereData(state);
      expect(result).toBeDefined();
      expect(result.position.y).toBeLessThan(0);
    });

    it('should handle custom radius', () => {
      const state: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const result = service.generateBlochSphereData(state, 2.0);
      expect(result).toBeDefined();
      expect(result.radius).toBe(2);
    });
  });

  describe('Generate Animation Frames', () => {
    it('should generate animation from |0> to |1>', () => {
      const from: IQubitState = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };
      const to: IQubitState = {
        bloch: { theta: Math.PI, phi: 0 },
        alpha: { re: 0, im: 0 },
        beta: { re: 1, im: 0 },
        probabilities: { zero: 0, one: 1 },
        isSuperposition: false,
        entangledWith: [],
      };
      const frames = service.generateAnimationFrames(from, to, 10);
      expect(frames).toBeDefined();
      expect(frames.length).toBe(11); // Includes start and end frames
    });

    it('should generate animation from |+> to |->', () => {
      const from: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const to: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: Math.PI },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: -1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const frames = service.generateAnimationFrames(from, to, 20);
      expect(frames).toBeDefined();
      expect(frames.length).toBe(21);
    });

    it('should handle single frame animation', () => {
      const from: IQubitState = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };
      const to: IQubitState = {
        bloch: { theta: Math.PI, phi: 0 },
        alpha: { re: 0, im: 0 },
        beta: { re: 1, im: 0 },
        probabilities: { zero: 0, one: 1 },
        isSuperposition: false,
        entangledWith: [],
      };
      const frames = service.generateAnimationFrames(from, to, 1);
      expect(frames).toBeDefined();
      expect(frames.length).toBe(2);
    });
  });

  describe('Generate Multi-Qubit Bloch Data', () => {
    it('should generate for 2 qubits', () => {
      const states: IQubitState[] = [
        {
          bloch: { theta: 0, phi: 0 },
          alpha: { re: 1, im: 0 },
          beta: { re: 0, im: 0 },
          probabilities: { zero: 1, one: 0 },
          isSuperposition: false,
          entangledWith: [],
        },
        {
          bloch: { theta: Math.PI, phi: 0 },
          alpha: { re: 0, im: 0 },
          beta: { re: 1, im: 0 },
          probabilities: { zero: 0, one: 1 },
          isSuperposition: false,
          entangledWith: [],
        },
      ];
      const result = service.generateMultiQubitBlochData(states, 1.0);
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });

    it('should generate for 3 qubits', () => {
      const states: IQubitState[] = [
        {
          bloch: { theta: 0, phi: 0 },
          alpha: { re: 1, im: 0 },
          beta: { re: 0, im: 0 },
          probabilities: { zero: 1, one: 0 },
          isSuperposition: false,
          entangledWith: [],
        },
        {
          bloch: { theta: Math.PI, phi: 0 },
          alpha: { re: 0, im: 0 },
          beta: { re: 1, im: 0 },
          probabilities: { zero: 0, one: 1 },
          isSuperposition: false,
          entangledWith: [],
        },
        {
          bloch: { theta: Math.PI / 2, phi: 0 },
          alpha: { re: 1 / Math.sqrt(2), im: 0 },
          beta: { re: 1 / Math.sqrt(2), im: 0 },
          probabilities: { zero: 0.5, one: 0.5 },
          isSuperposition: true,
          entangledWith: [],
        },
      ];
      const result = service.generateMultiQubitBlochData(states, 1.0);
      expect(result).toBeDefined();
      expect(result.length).toBe(3);
    });

    it('should generate with custom radius', () => {
      const states: IQubitState[] = [
        {
          bloch: { theta: 0, phi: 0 },
          alpha: { re: 1, im: 0 },
          beta: { re: 0, im: 0 },
          probabilities: { zero: 1, one: 0 },
          isSuperposition: false,
          entangledWith: [],
        },
      ];
      const result = service.generateMultiQubitBlochData(states, 1.5);
      expect(result).toBeDefined();
      expect(result[0].radius).toBe(1.5);
    });
  });

  describe('Generate Collapse Animation', () => {
    it('should generate collapse to |0>', () => {
      const before: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const result = service.generateCollapseAnimation(before, 0, 15);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate collapse to |1>', () => {
      const before: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const result = service.generateCollapseAnimation(before, 1, 15);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle custom frame count', () => {
      const before: IQubitState = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };
      const result = service.generateCollapseAnimation(before, 0, 30);
      expect(result).toBeDefined();
      expect(result.length).toBe(31);
    });
  });

  describe('Amplitudes to Bloch', () => {
    it('should convert |0> amplitudes to Bloch angles', () => {
      const result = service.amplitudesToBloch(new Complex(1, 0), new Complex(0, 0));
      expect(result.theta).toBeCloseTo(0, 5);
    });

    it('should convert |1> amplitudes to Bloch angles', () => {
      const result = service.amplitudesToBloch(new Complex(0, 0), new Complex(1, 0));
      expect(result.theta).toBeCloseTo(Math.PI, 5);
    });

    it('should convert |+> amplitudes to Bloch angles', () => {
      const invSqrt2 = 1 / Math.sqrt(2);
      const result = service.amplitudesToBloch(
        new Complex(invSqrt2, 0),
        new Complex(invSqrt2, 0)
      );
      expect(result.theta).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should convert complex amplitudes to Bloch angles', () => {
      const result = service.amplitudesToBloch(
        new Complex(0.6, 0.2),
        new Complex(0.4, 0.6)
      );
      expect(result).toBeDefined();
      expect(result.theta).toBeGreaterThanOrEqual(0);
      expect(result.theta).toBeLessThanOrEqual(Math.PI);
    });

    it('should handle purely imaginary amplitudes', () => {
      const result = service.amplitudesToBloch(
        new Complex(0, 1),
        new Complex(0, 0)
      );
      expect(result).toBeDefined();
      expect(result.theta).toBeCloseTo(0, 5);
    });
  });

  describe('Bloch to Cartesian', () => {
    it('should convert north pole to (0, 0, 1)', () => {
      const result = service.blochToCartesian(0, 0, 1);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(0, 5);
      expect(result.z).toBeCloseTo(1, 5);
    });

    it('should convert south pole to (0, 0, -1)', () => {
      const result = service.blochToCartesian(Math.PI, 0, 1);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(0, 5);
      expect(result.z).toBeCloseTo(-1, 5);
    });

    it('should convert equator to z=0', () => {
      const result = service.blochToCartesian(Math.PI / 2, 0, 1);
      expect(result.z).toBeCloseTo(0, 5);
    });

    it('should scale with custom radius', () => {
      const result = service.blochToCartesian(Math.PI / 2, 0, 2);
      expect(result.x).toBeCloseTo(2, 5);
    });

    it('should handle phi=PI/2 (y-axis)', () => {
      const result = service.blochToCartesian(Math.PI / 2, Math.PI / 2, 1);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(1, 5);
    });

    it('should handle phi=PI (negative x-axis)', () => {
      const result = service.blochToCartesian(Math.PI / 2, Math.PI, 1);
      expect(result.x).toBeCloseTo(-1, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });
  });
});
