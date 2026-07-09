import { Test, TestingModule } from '@nestjs/testing';
import { BlochSphereService } from './bloch-sphere.service';
import { Complex } from '../../../common/utils/complex';

describe('BlochSphereService', () => {
  let service: BlochSphereService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlochSphereService],
    }).compile();

    service = module.get<BlochSphereService>(BlochSphereService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('amplitudesToBloch', () => {
    it('should convert |0⟩ to Bloch coordinates', () => {
      const alpha = new Complex(1, 0);
      const beta = new Complex(0, 0);

      const bloch = service.amplitudesToBloch(alpha, beta);

      expect(bloch.theta).toBeCloseTo(0);
      expect(bloch.phi).toBeCloseTo(0);
    });

    it('should convert |1⟩ to Bloch coordinates', () => {
      const alpha = new Complex(0, 0);
      const beta = new Complex(1, 0);

      const bloch = service.amplitudesToBloch(alpha, beta);

      expect(bloch.theta).toBeCloseTo(Math.PI);
      expect(bloch.phi).toBeCloseTo(0);
    });

    it('should convert |+⟩ to Bloch coordinates', () => {
      const alpha = new Complex(1 / Math.sqrt(2), 0);
      const beta = new Complex(1 / Math.sqrt(2), 0);

      const bloch = service.amplitudesToBloch(alpha, beta);

      expect(bloch.theta).toBeCloseTo(Math.PI / 2);
      expect(bloch.phi).toBeCloseTo(0);
    });

    it('should convert |−⟩ to Bloch coordinates', () => {
      const alpha = new Complex(1 / Math.sqrt(2), 0);
      const beta = new Complex(-1 / Math.sqrt(2), 0);

      const bloch = service.amplitudesToBloch(alpha, beta);

      expect(bloch.theta).toBeCloseTo(Math.PI / 2);
      expect(bloch.phi).toBeCloseTo(Math.PI);
    });

    it('should convert |i+⟩ to Bloch coordinates', () => {
      const alpha = new Complex(1 / Math.sqrt(2), 0);
      const beta = new Complex(0, 1 / Math.sqrt(2));

      const bloch = service.amplitudesToBloch(alpha, beta);

      expect(bloch.theta).toBeCloseTo(Math.PI / 2);
      expect(bloch.phi).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('blochToCartesian', () => {
    it('should convert |0⟩ (theta=0) to North Pole', () => {
      const coords = service.blochToCartesian(0, 0, 1);

      expect(coords.x).toBeCloseTo(0);
      expect(coords.y).toBeCloseTo(0);
      expect(coords.z).toBeCloseTo(1);
    });

    it('should convert |1⟩ (theta=π) to South Pole', () => {
      const coords = service.blochToCartesian(Math.PI, 0, 1);

      expect(coords.x).toBeCloseTo(0);
      expect(coords.y).toBeCloseTo(0);
      expect(coords.z).toBeCloseTo(-1);
    });

    it('should convert |+⟩ to equator (x=1)', () => {
      const coords = service.blochToCartesian(Math.PI / 2, 0, 1);

      expect(coords.x).toBeCloseTo(1);
      expect(coords.y).toBeCloseTo(0);
      expect(coords.z).toBeCloseTo(0);
    });

    it('should convert |i+⟩ to equator (y=1)', () => {
      const coords = service.blochToCartesian(Math.PI / 2, Math.PI / 2, 1);

      expect(coords.x).toBeCloseTo(0);
      expect(coords.y).toBeCloseTo(1);
      expect(coords.z).toBeCloseTo(0);
    });
  });

  describe('generateBlochSphereData', () => {
    it('should generate sphere data for |0⟩', () => {
      const state = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };

      const data = service.generateBlochSphereData(state, 1);

      expect(data.radius).toBe(1);
      expect(data.position.x).toBeCloseTo(0);
      expect(data.position.y).toBeCloseTo(0);
      expect(data.position.z).toBeCloseTo(1);
      expect(data.arrow.end.z).toBeCloseTo(1);
    });

    it('should generate axes', () => {
      const state = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };

      const data = service.generateBlochSphereData(state);

      expect(data.axes.x).toBeDefined();
      expect(data.axes.y).toBeDefined();
      expect(data.axes.z).toBeDefined();
      expect(data.axes.x.color).toBe('#ff4444');
      expect(data.axes.y.color).toBe('#44ff44');
      expect(data.axes.z.color).toBe('#4444ff');
    });

    it('should generate circles', () => {
      const state = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };

      const data = service.generateBlochSphereData(state);

      expect(data.circles.equator).toBeInstanceOf(Array);
      expect(data.circles.meridian).toBeInstanceOf(Array);
      expect(data.circles.equator.length).toBeGreaterThan(0);
    });
  });

  describe('interpolateState', () => {
    it('should interpolate between |0⟩ and |1⟩', () => {
      const from = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };

      const to = {
        bloch: { theta: Math.PI, phi: 0 },
        alpha: { re: 0, im: 0 },
        beta: { re: 1, im: 0 },
        probabilities: { zero: 0, one: 1 },
        isSuperposition: false,
        entangledWith: [],
      };

      const middle = service.interpolateState(from, to, 0.5);

      expect(middle.bloch.theta).toBeCloseTo(Math.PI / 2);
      expect(middle.isSuperposition).toBe(true);
    });

    it('should handle progress=0 (return from state)', () => {
      const from = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };

      const to = {
        bloch: { theta: Math.PI, phi: 0 },
        alpha: { re: 0, im: 0 },
        beta: { re: 1, im: 0 },
        probabilities: { zero: 0, one: 1 },
        isSuperposition: false,
        entangledWith: [],
      };

      const result = service.interpolateState(from, to, 0);

      expect(result.bloch.theta).toBeCloseTo(0);
    });

    it('should handle progress=1 (return to state)', () => {
      const from = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };

      const to = {
        bloch: { theta: Math.PI, phi: 0 },
        alpha: { re: 0, im: 0 },
        beta: { re: 1, im: 0 },
        probabilities: { zero: 0, one: 1 },
        isSuperposition: false,
        entangledWith: [],
      };

      const result = service.interpolateState(from, to, 1);

      expect(result.bloch.theta).toBeCloseTo(Math.PI);
    });
  });

  describe('generateAnimationFrames', () => {
    it('should generate correct number of frames', () => {
      const from = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };

      const to = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };

      const frames = service.generateAnimationFrames(from, to, 10);

      expect(frames.length).toBe(11); // 0 to 10 inclusive
      expect(frames[0].bloch.theta).toBeCloseTo(0);
      expect(frames[10].bloch.theta).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('generateCollapseAnimation', () => {
    it('should animate collapse to |0⟩', () => {
      const from = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };

      const frames = service.generateCollapseAnimation(from, 0, 20);

      expect(frames.length).toBe(21);
      expect(frames[0].bloch.theta).toBeCloseTo(Math.PI / 2);
      expect(frames[20].bloch.theta).toBeCloseTo(0);
      expect(frames[20].isSuperposition).toBe(false);
    });

    it('should animate collapse to |1⟩', () => {
      const from = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };

      const frames = service.generateCollapseAnimation(from, 1, 20);

      expect(frames.length).toBe(21);
      expect(frames[20].bloch.theta).toBeCloseTo(Math.PI);
    });
  });

  describe('calculateProbabilities', () => {
    it('should calculate probabilities for |0⟩', () => {
      const state = {
        bloch: { theta: 0, phi: 0 },
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
        probabilities: { zero: 1, one: 0 },
        isSuperposition: false,
        entangledWith: [],
      };

      const probs = service.calculateProbabilities(state);

      expect(probs.zero).toBeCloseTo(1);
      expect(probs.one).toBeCloseTo(0);
    });

    it('should calculate probabilities for |+⟩', () => {
      const state = {
        bloch: { theta: Math.PI / 2, phi: 0 },
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        probabilities: { zero: 0.5, one: 0.5 },
        isSuperposition: true,
        entangledWith: [],
      };

      const probs = service.calculateProbabilities(state);

      expect(probs.zero).toBeCloseTo(0.5);
      expect(probs.one).toBeCloseTo(0.5);
    });
  });

  describe('generateMultiQubitBlochData', () => {
    it('should generate data for multiple qubits', () => {
      const states = [
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

      const data = service.generateMultiQubitBlochData(states);

      expect(data.length).toBe(2);
      expect(data[0].position.z).toBeCloseTo(1);
      expect(data[1].position.z).toBeCloseTo(-1);
    });
  });
});
