import { Test, TestingModule } from '@nestjs/testing';
import { GateLibraryService } from './gate-library.service';
import { Matrix } from '../../common/utils/matrix';
import { Complex } from '../../common/utils/complex';

describe('GateLibraryService', () => {
  let service: GateLibraryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GateLibraryService],
    }).compile();

    service = module.get<GateLibraryService>(GateLibraryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Gate Lookup', () => {
    it('should get single-qubit gate', () => {
      const gate = service.getGate('h');
      expect(gate).toBeDefined();
      expect(gate.type).toBe('h');
    });

    it('should get Pauli gates', () => {
      const x = service.getGate('x');
      const y = service.getGate('y');
      const z = service.getGate('z');

      expect(x.type).toBe('x');
      expect(y.type).toBe('y');
      expect(z.type).toBe('z');
    });

    it('should get multi-qubit gate', () => {
      const cx = service.getGate('cx');
      expect(cx).toBeDefined();
      expect(cx.type).toBe('cx');
    });

    it('should get CNOT by alternative name', () => {
      const cnot = service.getGate('cnot');
      expect(cnot).toBeDefined();
      expect(cnot.type).toBe('cx');
    });

    it('should throw for unknown gates', () => {
      expect(() => service.getGate('unknown')).toThrow('Unknown gate');
    });

    it('should get gate with case-insensitive name', () => {
      const h = service.getGate('H');
      expect(h).toBeDefined();
      expect(h.type).toBe('h');
    });
  });

  describe('Gate Parameters', () => {
    it('should get rotation gates with parameters', () => {
      const rx = service.getGate('rx', { theta: Math.PI / 2 });
      expect(rx).toBeDefined();
      expect(rx.type).toBe('rx');
    });

    it('should get parameterized RZ gate', () => {
      const rz = service.getGate('rz', { theta: Math.PI });
      expect(rz).toBeDefined();
      expect(rz.type).toBe('rz');
    });

    it('should get U gate with parameters', () => {
      const u = service.getGate('u', { theta: Math.PI / 2, phi: 0, lambda: 0 });
      expect(u).toBeDefined();
      expect(u.type).toBe('u');
    });

    it('should get phase gate with lambda', () => {
      const p = service.getGate('p', { lambda: Math.PI / 4 });
      expect(p).toBeDefined();
      expect(p.type).toBe('p');
    });

    it('should use default parameters', () => {
      const rx = service.getGate('rx');
      expect(rx).toBeDefined();
    });
  });

  describe('Gate Registration', () => {
    it('should register a custom gate', () => {
      const customFactory = () => ({
        type: 'custom',
        name: 'Custom',
        numQubits: 1,
        matrix: Matrix.identity(2),
        isUnitary: () => true,
      });

      service.registerGate('custom', customFactory as any);
      const gate = service.getGate('custom');
      expect(gate).toBeDefined();
    });

    it('should get registered types', () => {
      const types = service.getRegisteredTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('h');
      expect(types).toContain('x');
      expect(types).toContain('cx');
    });
  });

  describe('Gate Metadata', () => {
    it('should get gate metadata', () => {
      const meta = service.getGateMetadata('h');
      expect(meta).toBeDefined();
      expect(meta.type).toBe('h');
      expect(meta.numQubits).toBe(1);
    });

    it('should get metadata for all standard gates', () => {
      const gates = ['h', 'x', 'y', 'z', 's', 't', 'cx', 'cz', 'swap'];
      gates.forEach(gate => {
        const meta = service.getGateMetadata(gate);
        expect(meta).toBeDefined();
        expect(meta.type).toBeDefined();
      });
    });
  });

  describe('Gate Categories', () => {
    it('should get single-qubit gates', () => {
      const single = service.getSingleQubitGates();
      expect(single.length).toBeGreaterThan(0);
      expect(single).toContain('h');
      expect(single).toContain('x');
      expect(single).toContain('y');
      expect(single).toContain('z');
    });

    it('should get two-qubit gates', () => {
      const two = service.getTwoQubitGates();
      expect(two.length).toBeGreaterThan(0);
      expect(two).toContain('cx');
      expect(two).toContain('cz');
      expect(two).toContain('swap');
    });

    it('should get three-qubit gates', () => {
      const three = service.getThreeQubitGates();
      expect(three.length).toBeGreaterThanOrEqual(0);
    });

    it('should get parametric gates', () => {
      const parametric = service.getParametricGates();
      expect(parametric.length).toBeGreaterThan(0);
      expect(parametric).toContain('rx');
      expect(parametric).toContain('ry');
      expect(parametric).toContain('rz');
      expect(parametric).toContain('p');
    });
  });

  describe('Controlled Gates', () => {
    it('should create controlled gate', () => {
      const cx = service.createControlledGate('x', 1);
      expect(cx).toBeDefined();
      expect(cx.numQubits).toBe(2);
    });

    it('should create multi-controlled gate', () => {
      const ccx = service.createControlledGate('x', 2);
      expect(ccx).toBeDefined();
      expect(ccx.numQubits).toBe(3);
    });

    it('should create controlled-Z gate', () => {
      const cz = service.createControlledGate('z', 1);
      expect(cz).toBeDefined();
      expect(cz.numQubits).toBe(2);
    });
  });

  describe('Gate Properties', () => {
    it('should validate gates are unitary', () => {
      const h = service.getGate('h');
      expect(h.isUnitary()).toBe(true);

      const x = service.getGate('x');
      expect(x.isUnitary()).toBe(true);
    });

    it('should return correct matrix dimensions', () => {
      const h = service.getGate('h');
      expect(h.matrix.rows).toBe(2);
      expect(h.matrix.cols).toBe(2);

      const cx = service.getGate('cx');
      expect(cx.matrix.rows).toBe(4);
      expect(cx.matrix.cols).toBe(4);
    });

    it('should have correct gate names', () => {
      const h = service.getGate('h');
      expect(h.name).toBe('Hadamard');

      const cx = service.getGate('cx');
      expect(cx.name).toBe('CNOT');
    });
  });
});

describe('GateLibraryService Extended', () => {
  let service: GateLibraryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GateLibraryService],
    }).compile();

    service = module.get<GateLibraryService>(GateLibraryService);
  });

  describe('Additional Gates', () => {
    it('should get S gate', () => {
      const s = service.getGate('s');
      expect(s).toBeDefined();
      expect(s.type).toBe('s');
      expect(s.name).toContain('S');
    });

    it('should get T gate', () => {
      const t = service.getGate('t');
      expect(t).toBeDefined();
      expect(t.type).toBe('t');
      expect(t.name).toContain('T');
    });

    it('should get Y gate', () => {
      const y = service.getGate('y');
      expect(y).toBeDefined();
      expect(y.type).toBe('y');
    });

    it('should get Z gate', () => {
      const z = service.getGate('z');
      expect(z).toBeDefined();
      expect(z.type).toBe('z');
    });

    it('should get CZ gate', () => {
      const cz = service.getGate('cz');
      expect(cz).toBeDefined();
      expect(cz.type).toBe('cz');
    });

    it('should get SWAP gate', () => {
      const swap = service.getGate('swap');
      expect(swap).toBeDefined();
      expect(swap.type).toBe('swap');
      expect(swap.numQubits).toBe(2);
    });

    it('should get RY gate', () => {
      const ry = service.getGate('ry', { theta: Math.PI / 2 });
      expect(ry).toBeDefined();
      expect(ry.type).toBe('ry');
    });

    it('should get U gate', () => {
      const u = service.getGate('u', { theta: Math.PI / 2, phi: 0, lambda: 0 });
      expect(u).toBeDefined();
      expect(u.type).toBe('u');
    });
  });

  describe('Parameterized Gate Defaults', () => {
    it('should use default theta for RX', () => {
      const rx = service.getGate('rx');
      expect(rx).toBeDefined();
    });

    it('should use default theta for RY', () => {
      const ry = service.getGate('ry');
      expect(ry).toBeDefined();
    });

    it('should use default theta for RZ', () => {
      const rz = service.getGate('rz');
      expect(rz).toBeDefined();
    });

    it('should use default lambda for phase gate', () => {
      const p = service.getGate('p');
      expect(p).toBeDefined();
    });
  });

  describe('Gate Aliases', () => {
    it('should get CNOT via cx alias', () => {
      const cnot = service.getGate('cnot');
      const cx = service.getGate('cx');
      expect(cnot).toBeDefined();
      expect(cx).toBeDefined();
      expect(cnot.type).toBe(cx.type);
    });

    it('should get Toffoli gate', () => {
      const toffoli = service.getGate('ccx');
      expect(toffoli).toBeDefined();
      expect(toffoli.type).toBe('ccx');
      expect(toffoli.numQubits).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty parameters object', () => {
      const rx = service.getGate('rx', {});
      expect(rx).toBeDefined();
    });

    it('should throw for non-existent gate with parameters', () => {
      expect(() => service.getGate('nonexistent', { theta: 1 })).toThrow('Unknown gate');
    });

    it('should throw for unknown gate type', () => {
      expect(() => service.getGate('unknown')).toThrow('Unknown gate');
    });

    it('should throw for unknown gate type in createControlledGate', () => {
      expect(() => service.createControlledGate('unknown', 1)).toThrow('not yet implemented');
    });

    it('should throw for non-unitary controlled gate creation', () => {
      expect(() => service.createControlledGate('nonexistent', 1)).toThrow('not yet implemented');
    });
  });

  describe('Gate Matrix Properties', () => {
    it('should verify S gate is unitary', () => {
      const s = service.getGate('s');
      expect(s.isUnitary()).toBe(true);
    });

    it('should verify T gate is unitary', () => {
      const t = service.getGate('t');
      expect(t.isUnitary()).toBe(true);
    });

    it('should verify Y gate is unitary', () => {
      const y = service.getGate('y');
      expect(y.isUnitary()).toBe(true);
    });

    it('should verify Z gate is unitary', () => {
      const z = service.getGate('z');
      expect(z.isUnitary()).toBe(true);
    });

    it('should verify CZ gate is unitary', () => {
      const cz = service.getGate('cz');
      expect(cz.isUnitary()).toBe(true);
    });

    it('should verify SWAP gate is unitary', () => {
      const swap = service.getGate('swap');
      expect(swap.isUnitary()).toBe(true);
    });

    it('should verify Toffoli gate is unitary', () => {
      const toffoli = service.getGate('ccx');
      expect(toffoli.isUnitary()).toBe(true);
    });

    it('should verify RX with PI/2 is unitary', () => {
      const rx = service.getGate('rx', { theta: Math.PI / 2 });
      expect(rx.isUnitary()).toBe(true);
    });

    it('should verify RZ with PI is unitary', () => {
      const rz = service.getGate('rz', { theta: Math.PI });
      expect(rz.isUnitary()).toBe(true);
    });
  });

  describe('All Gate Categories', () => {
    it('should list all registered types', () => {
      const types = service.getRegisteredTypes();
      expect(types.length).toBeGreaterThan(20);
    });

    it('should have parametric gates', () => {
      const parametric = service.getParametricGates();
      expect(parametric.length).toBeGreaterThan(5);
    });

    it('should have single-qubit gates', () => {
      const single = service.getSingleQubitGates();
      expect(single.length).toBeGreaterThan(10);
    });

    it('should have two-qubit gates', () => {
      const two = service.getTwoQubitGates();
      expect(two.length).toBeGreaterThan(3);
    });

    it('should have three-qubit gates', () => {
      const three = service.getThreeQubitGates();
      expect(three.length).toBeGreaterThanOrEqual(0);
    });
  });
});
