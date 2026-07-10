import { GateRegistry } from './gate-registry';
import { HGate, XGate } from './standard-gates/single-qubit-gates';
import { CnotGate } from './standard-gates/multi-qubit-gates';

describe('GateRegistry', () => {
  let registry: GateRegistry;

  beforeEach(() => {
    registry = new GateRegistry();
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  describe('Gate Registration', () => {
    it('should register a gate', () => {
      const hGate = new HGate();
      registry.registerGate('h', hGate);
      const retrieved = registry.getGate('h');
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('h');
    });

    it('should register multiple gates', () => {
      registry.registerGate('h', new HGate());
      registry.registerGate('x', new XGate());
      registry.registerGate('cx', new CnotGate());

      expect(registry.getGate('h')).toBeDefined();
      expect(registry.getGate('x')).toBeDefined();
      expect(registry.getGate('cx')).toBeDefined();
    });

    it('should overwrite existing gate', () => {
      const hGate = new HGate();
      const xGate = new XGate();

      registry.registerGate('test', hGate);
      registry.registerGate('test', xGate);

      const retrieved = registry.getGate('test');
      expect(retrieved?.type).toBe('x');
    });
  });

  describe('Gate Retrieval', () => {
    beforeEach(() => {
      registry.registerGate('h', new HGate());
      registry.registerGate('x', new XGate());
    });

    it('should get gate by name', () => {
      const h = registry.getGate('h');
      expect(h).toBeDefined();
      expect(h?.type).toBe('h');
    });

    it('should get gate case-insensitively', () => {
      const h = registry.getGate('H');
      expect(h).toBeDefined();
      expect(h?.type).toBe('h');
    });

    it('should return undefined for unknown gate', () => {
      const unknown = registry.getGate('unknown');
      expect(unknown).toBeUndefined();
    });

    it('should get all gates', () => {
      const all = registry.getAllGates();
      expect(all.size).toBe(2);
      expect(all.has('h')).toBe(true);
      expect(all.has('x')).toBe(true);
    });

    it('should check if gate exists', () => {
      expect(registry.hasGate('h')).toBe(true);
      expect(registry.hasGate('x')).toBe(true);
      expect(registry.hasGate('z')).toBe(false);
    });

    it('should check gate exists case-insensitively', () => {
      expect(registry.hasGate('H')).toBe(true);
      expect(registry.hasGate('X')).toBe(true);
    });
  });

  describe('Gate Properties', () => {
    beforeEach(() => {
      registry.registerGate('h', new HGate());
      registry.registerGate('x', new XGate());
      registry.registerGate('cx', new CnotGate());
    });

    it('should retrieve gate with correct matrix', () => {
      const h = registry.getGate('h');
      expect(h?.matrix).toBeDefined();
      expect(h?.matrix.rows).toBe(2);
    });

    it('should retrieve gate with correct name', () => {
      const h = registry.getGate('h');
      expect(h?.name).toBe('Hadamard');
    });

    it('should retrieve gate with correct number of qubits', () => {
      const h = registry.getGate('h');
      const cx = registry.getGate('cx');

      expect(h?.numQubits).toBe(1);
      expect(cx?.numQubits).toBe(2);
    });

    it('should validate unitarity', () => {
      const h = registry.getGate('h');
      expect(h?.isUnitary()).toBe(true);
    });
  });

  describe('Empty Registry', () => {
    it('should return empty map when no gates registered', () => {
      const all = registry.getAllGates();
      expect(all.size).toBe(0);
    });

    it('should return undefined for any gate', () => {
      expect(registry.getGate('h')).toBeUndefined();
      expect(registry.getGate('x')).toBeUndefined();
    });

    it('should return false for hasGate', () => {
      expect(registry.hasGate('h')).toBe(false);
    });
  });

  describe('Gate Operations', () => {
    beforeEach(() => {
      registry.registerGate('h', new HGate());
      registry.registerGate('x', new XGate());
    });

    it('should allow retrieving and using gate matrix', () => {
      const h = registry.getGate('h');
      // Test that matrix can be used
      expect(h?.matrix.multiplyVector).toBeDefined();
    });

    it('should preserve gate identity', () => {
      const h1 = registry.getGate('h');
      const h2 = registry.getGate('h');
      expect(h1).toBe(h2);
    });
  });
});
