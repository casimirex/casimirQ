import { Test, TestingModule } from '@nestjs/testing';
import { IOController } from './io.controller';
import { IOService } from './io.service';

describe('IOController', () => {
  let controller: IOController;
  let service: IOService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IOController],
      providers: [IOService],
    }).compile();

    controller = module.get<IOController>(IOController);
    service = module.get<IOService>(IOService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /io/formats', () => {
    it('should return supported formats', () => {
      const result = controller.getSupportedFormats();
      expect(result.count).toBeGreaterThan(0);
      expect(result.formats).toBeInstanceOf(Array);
      expect(result.formats[0]).toHaveProperty('name');
      expect(result.formats[0]).toHaveProperty('version');
      expect(result.formats[0]).toHaveProperty('extensions');
    });
  });

  describe('POST /io/import', () => {
    it('should import OpenQASM circuit', async () => {
      const dto = {
        format: 'openqasm',
        data: `OPENQASM 2.0;
qreg q[2];
h q[0];
x q[1];`,
      };
      const result = await controller.importCircuit(dto);
      expect(result.imported).toBe(true);
      expect(result.format).toBe('openqasm');
      expect(result.circuit.qubitCount).toBe(2);
    });

    it('should import Qiskit JSON', async () => {
      const dto = {
        format: 'qiskit',
        data: JSON.stringify({
          num_qubits: 2,
          instructions: [{ name: 'h', qubits: [0] }],
        }),
      };
      const result = await controller.importCircuit(dto);
      expect(result.imported).toBe(true);
      expect(result.format).toBe('qiskit');
    });

    it('should import Cirq JSON', async () => {
      const dto = {
        format: 'cirq',
        data: JSON.stringify({
          cirq_type: 'Circuit',
          qubits: [{ cirq_type: 'GridQubit', row: 0, col: 0 }],
          moments: [],
        }),
      };
      const result = await controller.importCircuit(dto);
      expect(result.imported).toBe(true);
      expect(result.format).toBe('cirq');
    });

    it('should throw for invalid format', async () => {
      const dto = {
        format: 'unknown',
        data: 'invalid',
      };
      await expect(controller.importCircuit(dto)).rejects.toThrow();
    });
  });

  describe('POST /io/export', () => {
    it('should export to OpenQASM', async () => {
      const dto = {
        circuit: {},
        format: 'openqasm',
        includeComments: true,
        includeMetadata: true,
      };
      const result = await controller.exportCircuit(dto);
      expect(result.exported).toBe(true);
      expect(result.format).toBe('openqasm');
      expect(result.data).toContain('OPENQASM');
    });

    it('should export to Qiskit', async () => {
      const dto = {
        circuit: {},
        format: 'qiskit',
        includeComments: false,
      };
      const result = await controller.exportCircuit(dto);
      expect(result.exported).toBe(true);
      expect(result.format).toBe('qiskit');
    });

    it('should throw for unknown format', async () => {
      const dto = {
        circuit: {},
        format: 'unknown',
      };
      await expect(controller.exportCircuit(dto)).rejects.toThrow();
    });
  });

  describe('POST /io/convert', () => {
    it('should convert between formats', async () => {
      const dto = {
        data: `OPENQASM 2.0;
qreg q[2];
h q[0];`,
        fromFormat: 'openqasm',
        toFormat: 'qiskit',
        includeComments: true,
      };
      const result = await controller.convertCircuit(dto);
      expect(result.converted).toBe(true);
      expect(result.fromFormat).toBe('openqasm');
      expect(result.toFormat).toBe('qiskit');
      expect(result.data).toBeDefined();
    });

    it('should convert without comments', async () => {
      const dto = {
        data: `OPENQASM 2.0;
qreg q[2];`,
        fromFormat: 'openqasm',
        toFormat: 'cirq',
        includeComments: false,
      };
      const result = await controller.convertCircuit(dto);
      expect(result.converted).toBe(true);
    });
  });

  describe('POST /io/validate', () => {
    it('should validate valid OpenQASM', async () => {
      const dto = {
        format: 'openqasm',
        data: `OPENQASM 2.0;
qreg q[2];
h q[0];`,
      };
      const result = await controller.validateCircuit(dto);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('openqasm');
    });

    it('should invalidate bad data', async () => {
      const dto = {
        format: 'openqasm',
        data: 'invalid content',
      };
      const result = await controller.validateCircuit(dto);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle unknown format', async () => {
      const dto = {
        format: 'unknown',
        data: 'content',
      };
      const result = await controller.validateCircuit(dto);
      expect(result.valid).toBe(false);
    });
  });

  describe('POST /io/detect', () => {
    it('should detect OpenQASM from content', () => {
      const result = controller.detectFormat('OPENQASM 2.0; qreg q[2];');
      expect(result.detected).toBe(true);
      expect(result.format).toBe('openqasm');
      expect(result.confidence).toBe('high');
    });

    it('should detect from file extension', () => {
      const result = controller.detectFormat('circuit.qasm');
      expect(result.detected).toBe(true);
      expect(result.format).toBe('openqasm');
    });

    it('should return none for unknown', () => {
      const result = controller.detectFormat('random text');
      expect(result.detected).toBe(false);
      expect(result.confidence).toBe('none');
    });
  });

  describe('GET /io/formats/:name', () => {
    it('should return format info', () => {
      const result = controller.getFormatInfo('openqasm');
      expect(result.name).toBe('OpenQASM');
      expect(result.version).toBeDefined();
      expect(result.extensions).toBeInstanceOf(Array);
    });

    it('should throw for unknown format', () => {
      expect(() => controller.getFormatInfo('unknown')).toThrow();
    });
  });
});
