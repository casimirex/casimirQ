import { ErrorCorrectionService, STEANE_CODE, SHOR_CODE } from './error-correction.service';

describe('ErrorCorrectionService', () => {
  let service: ErrorCorrectionService;

  beforeEach(() => {
    service = new ErrorCorrectionService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Available Codes', () => {
    it('should return available codes', () => {
      const codes = service.getAvailableCodes();
      expect(codes).toContain('steane');
      expect(codes).toContain('shor');
    });

    it('should get Steane code', () => {
      const code = service.getCode('steane');
      expect(code).toBeDefined();
      expect(code?.name).toBe('Steane');
      expect(code?.nPhysical).toBe(7);
      expect(code?.nLogical).toBe(1);
      expect(code?.distance).toBe(3);
    });

    it('should get Shor code', () => {
      const code = service.getCode('shor');
      expect(code).toBeDefined();
      expect(code?.name).toBe('Shor');
      expect(code?.nPhysical).toBe(9);
      expect(code?.nLogical).toBe(1);
      expect(code?.distance).toBe(3);
    });

    it('should return undefined for unknown code', () => {
      const code = service.getCode('unknown');
      expect(code).toBeUndefined();
    });

    it('should get code case-insensitively', () => {
      const code = service.getCode('STEANE');
      expect(code).toBeDefined();
    });
  });

  describe('Code Properties', () => {
    it('should get Steane code properties', () => {
      const props = service.getCodeProperties('steane');
      expect(props).toBeDefined();
      expect(props?.nPhysical).toBe(7);
      expect(props?.nLogical).toBe(1);
      expect(props?.distance).toBe(3);
      expect(props?.nStabilizers).toBe(6);
    });

    it('should get Shor code properties', () => {
      const props = service.getCodeProperties('shor');
      expect(props).toBeDefined();
      expect(props?.nPhysical).toBe(9);
      expect(props?.distance).toBe(3);
    });

    it('should return null for unknown code properties', () => {
      const props = service.getCodeProperties('unknown');
      expect(props).toBeNull();
    });
  });

  describe('Encoding', () => {
    it('should encode logical state with Steane code', () => {
      const code = STEANE_CODE;
      const logicalState = [0];
      const encoded = service.encode(logicalState, code);
      expect(encoded).toBeDefined();
      expect(encoded.logicalState).toEqual([0]);
      expect(encoded.physicalState).toBeDefined();
    });

    it('should encode |1⟩ state with Steane code', () => {
      const code = STEANE_CODE;
      const logicalState = [1];
      const encoded = service.encode(logicalState, code);
      expect(encoded).toBeDefined();
      expect(encoded.logicalState).toEqual([1]);
    });

    it('should encode with Shor code', () => {
      const code = SHOR_CODE;
      const logicalState = [0];
      const encoded = service.encode(logicalState, code);
      expect(encoded).toBeDefined();
      expect(encoded.physicalState?.size).toBe(9);
    });

    it('should throw for invalid logical state size', () => {
      const code = STEANE_CODE;
      expect(() => service.encode([0, 1], code)).toThrow('Invalid logical state');
    });

    it('should initialize physical state with zeros', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      for (let i = 0; i < code.nPhysical; i++) {
        expect(encoded.physicalState?.get(`q${i}`)).toBe(0);
      }
    });
  });

  describe('Syndrome Measurement', () => {
    it('should measure syndrome for Steane code', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      const syndrome = service.measureSyndrome(encoded, code);
      expect(syndrome).toBeDefined();
      expect(syndrome.syndrome).toBeDefined();
      expect(syndrome.syndrome.length).toBe(code.stabilizers.length);
    });

    it('should return syndrome array', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      const syndrome = service.measureSyndrome(encoded, code);
      expect(Array.isArray(syndrome.syndrome)).toBe(true);
    });

    it('should handle syndrome with no errors', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      const syndrome = service.measureSyndrome(encoded, code);
      // Trivial syndrome means no error detected
      expect(syndrome.errorPattern).toBeUndefined();
    });
  });

  describe('Correction Application', () => {
    it('should apply correction to encoded state', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      const correction = [{ qubit: 0, operation: 'X' as const }];
      const corrected = service.applyCorrection(encoded, correction);
      expect(corrected).toBeDefined();
      expect(corrected.logicalState).toEqual([0]);
    });

    it('should apply X correction', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      const correction = [{ qubit: 0, operation: 'X' as const }];
      const corrected = service.applyCorrection(encoded, correction);
      expect(corrected.physicalState?.get('q0')).toBe(1);
    });

    it('should apply multiple corrections', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      const correction = [
        { qubit: 0, operation: 'X' as const },
        { qubit: 1, operation: 'X' as const },
      ];
      const corrected = service.applyCorrection(encoded, correction);
      expect(corrected.physicalState?.get('q0')).toBe(1);
      expect(corrected.physicalState?.get('q1')).toBe(1);
    });

    it('should apply Z correction (no bit flip)', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      const correction = [{ qubit: 0, operation: 'Z' as const }];
      const corrected = service.applyCorrection(encoded, correction);
      expect(corrected).toBeDefined();
    });

    it('should apply Y correction (both X and Z)', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      const correction = [{ qubit: 0, operation: 'Y' as const }];
      const corrected = service.applyCorrection(encoded, correction);
      expect(corrected.physicalState?.get('q0')).toBe(1);
    });

    it('should handle identity correction', () => {
      const code = STEANE_CODE;
      const encoded = service.encode([0], code);
      const correction = [{ qubit: 0, operation: 'I' as const }];
      const corrected = service.applyCorrection(encoded, correction);
      expect(corrected.physicalState?.get('q0')).toBe(0);
    });
  });

  describe('Full QEC Simulation', () => {
    it('should simulate QEC with Steane code', () => {
      const result = service.simulateQEC([0], 'steane');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.encodedState).toBeDefined();
      expect(result.syndromeMeasurements).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should simulate QEC with Shor code', () => {
      const result = service.simulateQEC([1], 'shor');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should throw for unknown code', () => {
      expect(() => service.simulateQEC([0], 'unknown')).toThrow('Unknown QEC code');
    });

    it('should support multiple correction rounds', () => {
      const options = { maxRounds: 3 };
      const result = service.simulateQEC([0], 'steane', options);
      expect(result.syndromeMeasurements.length).toBeLessThanOrEqual(3);
    });

    it('should disable syndrome measurement', () => {
      const options = { measureSyndrome: false };
      const result = service.simulateQEC([0], 'steane', options);
      expect(result.syndromeMeasurements.length).toBe(0);
    });

    it('should disable auto-correction', () => {
      const options = { autoCorrect: false };
      const result = service.simulateQEC([0], 'steane', options);
      // Corrections may still be computed but not applied
      expect(result).toBeDefined();
    });

    it('should track corrections applied', () => {
      const result = service.simulateQEC([0], 'steane');
      expect(Array.isArray(result.correctionsApplied)).toBe(true);
    });
  });

  describe('Logical Error Rate', () => {
    it('should calculate logical error rate for Steane code', () => {
      const code = STEANE_CODE;
      const logicalError = service.calculateLogicalErrorRate(0.001, code);
      expect(logicalError).toBeGreaterThanOrEqual(0);
      expect(logicalError).toBeLessThanOrEqual(1);
    });

    it('should calculate logical error rate for Shor code', () => {
      const code = SHOR_CODE;
      const logicalError = service.calculateLogicalErrorRate(0.01, code);
      expect(logicalError).toBeGreaterThanOrEqual(0);
      expect(logicalError).toBeLessThanOrEqual(1);
    });

    it('should return 0 for zero physical error', () => {
      const code = STEANE_CODE;
      const logicalError = service.calculateLogicalErrorRate(0, code);
      expect(logicalError).toBe(0);
    });

    it('should return higher error for higher physical error', () => {
      const code = STEANE_CODE;
      const lowError = service.calculateLogicalErrorRate(0.001, code);
      const highError = service.calculateLogicalErrorRate(0.1, code);
      expect(highError).toBeGreaterThan(lowError);
    });

    it('should cap error rate at 1.0', () => {
      const code = STEANE_CODE;
      const logicalError = service.calculateLogicalErrorRate(1.0, code);
      expect(logicalError).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Code Constants', () => {
    it('should export STEANE_CODE with correct properties', () => {
      expect(STEANE_CODE.name).toBe('Steane');
      expect(STEANE_CODE.nPhysical).toBe(7);
      expect(STEANE_CODE.stabilizers.length).toBe(6);
      expect(STEANE_CODE.logicalX.length).toBe(1);
      expect(STEANE_CODE.logicalZ.length).toBe(1);
    });

    it('should export SHOR_CODE with correct properties', () => {
      expect(SHOR_CODE.name).toBe('Shor');
      expect(SHOR_CODE.nPhysical).toBe(9);
      expect(SHOR_CODE.stabilizers.length).toBe(12);
      expect(SHOR_CODE.logicalX.length).toBe(1);
      expect(SHOR_CODE.logicalZ.length).toBe(1);
    });

    it('should have X and Z stabilizers in Steane code', () => {
      const xStabilizers = STEANE_CODE.stabilizers.filter((s) =>
        s.operators.some((op) => op === 'X'),
      );
      const zStabilizers = STEANE_CODE.stabilizers.filter((s) =>
        s.operators.some((op) => op === 'Z'),
      );
      expect(xStabilizers.length).toBe(3);
      expect(zStabilizers.length).toBe(3);
    });
  });
});
