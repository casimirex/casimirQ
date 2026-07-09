import { Test, TestingModule } from '@nestjs/testing';
import { IOService } from './io.service';

describe('IOService', () => {
  let service: IOService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IOService],
    }).compile();

    service = module.get<IOService>(IOService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = service.getSupportedFormats();
      expect(formats.length).toBeGreaterThan(0);
      expect(formats.some((f) => f.name === 'OpenQASM')).toBe(true);
      expect(formats.some((f) => f.name === 'Qiskit')).toBe(true);
      expect(formats.some((f) => f.name === 'Cirq')).toBe(true);
      expect(formats.some((f) => f.name === 'Quil')).toBe(true);
      expect(formats.some((f) => f.name === 'IonQ')).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate OpenQASM data', () => {
      const validQasm = `OPENQASM 2.0;
qreg q[2];
h q[0];
cx q[0], q[1];`;

      const result = service.validate('openqasm', validQasm);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid OpenQASM', () => {
      const invalidQasm = 'invalid content';
      const result = service.validate('openqasm', invalidQasm);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('detectFormat', () => {
    it('should detect format from extension', () => {
      expect(service.detectFormat('circuit.qasm')).toBe('openqasm');
      expect(service.detectFormat('circuit.json')).toBe('qiskit');
    });

    it('should detect format from content', () => {
      expect(service.detectFormat('OPENQASM 2.0;')).toBe('openqasm');
    });
  });

  describe('import and export roundtrip', () => {
    it('should roundtrip through OpenQASM', () => {
      // Simple QASM with basic gates
      const qasm = `OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
h q[0];
x q[1];`;

      const circuit = service.import('openqasm', qasm);
      expect(circuit).toBeDefined();
      expect(circuit.getMetadata().qubitCount).toBe(2);
    });
  });
});
