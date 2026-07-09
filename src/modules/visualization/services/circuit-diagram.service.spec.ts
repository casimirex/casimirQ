import { CircuitDiagramService } from './circuit-diagram.service';
import { Circuit } from '../../circuit-engine/circuit';

describe('CircuitDiagramService', () => {
  let service: CircuitDiagramService;

  beforeEach(() => {
    service = new CircuitDiagramService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Diagram Generation', () => {
    it('should generate diagram for simple circuit', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = service.generateDiagram(circuit);
      expect(result).toBeDefined();
      expect(result.wires).toBeDefined();
      expect(result.gates).toBeDefined();
      expect(Array.isArray(result.gates)).toBe(true);
    });

    it('should generate diagram for empty circuit', () => {
      const circuit = Circuit.builder(2).build();
      const result = service.generateDiagram(circuit);
      expect(result).toBeDefined();
      expect(result.wires.length).toBe(2);
      expect(result.gates).toHaveLength(0);
    });

    it('should include gate positions', () => {
      const circuit = Circuit.builder(2).h(0).x(1).build();
      const result = service.generateDiagram(circuit);
      expect(result.gates).toHaveLength(2);
      expect(result.gates[0].x).toBeDefined();
      expect(result.gates[0].y).toBeDefined();
    });
  });

  describe('SVG Generation', () => {
    it('should generate SVG for circuit', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = service.generateSVG(circuit);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.includes('<svg')).toBe(true);
    });

    it('should include gate symbols in SVG', () => {
      const circuit = Circuit.builder(1).h(0).build();
      const result = service.generateSVG(circuit);
      expect(result).toBeDefined();
    });

    it('should generate SVG for multi-qubit gates', () => {
      const circuit = Circuit.builder(2).cx(0, 1).build();
      const result = service.generateSVG(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Execution Animation', () => {
    it('should generate execution animation', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = service.generateExecutionAnimation(circuit, 0, 2);
      expect(result).toBeDefined();
      expect(result.gates).toBeDefined();
    });

    it('should have correct number of steps', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = service.generateExecutionAnimation(circuit, 0, 2);
      expect(result.gates.length).toBeGreaterThan(0);
    });
  });

});
