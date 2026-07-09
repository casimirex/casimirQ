import { Test, TestingModule } from '@nestjs/testing';
import { VisualizationService } from './visualization.service';
import { BlochSphereService } from './services/bloch-sphere.service';
import { CircuitDiagramService } from './services/circuit-diagram.service';
import { ObservabilityService } from './services/observability.service';
import { Circuit } from '../circuit-engine/circuit';
import { Complex } from '../../common/utils/complex';

describe('VisualizationService', () => {
  let service: VisualizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisualizationService,
        BlochSphereService,
        CircuitDiagramService,
        ObservabilityService,
      ],
    }).compile();

    service = module.get<VisualizationService>(VisualizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('State Visualization', () => {
    it('should generate Bloch sphere data', () => {
      const alpha = new Complex(1 / Math.sqrt(2), 0);
      const beta = new Complex(1 / Math.sqrt(2), 0);

      const result = service.generateBlochSphere(alpha, beta, 1);
      expect(result).toBeDefined();
      expect(result.position).toBeDefined();
    });

    it('should generate amplitude visualization', () => {
      const state = new Map<bigint, Complex>();
      state.set(BigInt(0), new Complex(1 / Math.sqrt(2), 0));
      state.set(BigInt(1), new Complex(1 / Math.sqrt(2), 0));

      const result = service.generateAmplitudeVisualization(state, 1);
      expect(result).toBeDefined();
      expect(Array.isArray(result.magnitudes)).toBe(true);
    });

    it('should export circuit to SVG', () => {
      const circuit = Circuit.builder(2).h(0).build();
      const result = service.exportCircuitToSVG(circuit);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Circuit Visualization', () => {
    it('should generate circuit diagram', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = service.generateCircuitDiagram(circuit);
      expect(result).toBeDefined();
    });

    it('should export circuit to SVG', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = service.exportCircuitToSVG(circuit);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

  });

  describe('Animation', () => {
    it('should generate state transition frames', () => {
      const fromAlpha = new Complex(1, 0);
      const fromBeta = new Complex(0, 0);
      const toAlpha = new Complex(0, 0);
      const toBeta = new Complex(1, 0);

      const result = service.generateStateTransition(fromAlpha, fromBeta, toAlpha, toBeta, 30);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get collapse animations', () => {
      const result = service.getCollapseAnimations();
      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('Observer Effects', () => {
    it('should get measurement events', () => {
      const result = service.getMeasurementEvents();
      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });

    it('should generate entanglement graph', () => {
      const pairs = [{ q1: 0, q2: 1, type: 'bell' }];
      const result = service.generateEntanglementGraph(2, pairs);
      expect(result).toBeDefined();
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
    });
  });
});
