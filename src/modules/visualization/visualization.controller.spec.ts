import { Test, TestingModule } from '@nestjs/testing';
import { VisualizationController } from './visualization.controller';
import { VisualizationService } from './visualization.service';
import { BlochSphereService } from './services/bloch-sphere.service';
import { CircuitDiagramService } from './services/circuit-diagram.service';
import { ObservabilityService } from './services/observability.service';

describe('VisualizationController', () => {
  let controller: VisualizationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisualizationController],
      providers: [
        VisualizationService,
        BlochSphereService,
        CircuitDiagramService,
        ObservabilityService,
      ],
    }).compile();

    controller = module.get<VisualizationController>(VisualizationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /visualization/bloch-sphere', () => {
    it('should generate Bloch sphere data', async () => {
      const dto = {
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
        radius: 1,
      };
      const result = await controller.generateBlochSphere(dto);
      expect(result).toBeDefined();
      expect(result.type).toBe('bloch-sphere');
      expect(result.data.position).toBeDefined();
    });
  });

  describe('POST /visualization/circuit-diagram', () => {
    it('should generate circuit diagram JSON', async () => {
      const dto = {
        circuit: {
          numQubits: 2,
          operations: [
            { gate: { type: 'h' }, targets: [0] },
            { gate: { type: 'cx' }, targets: [1], controls: [0] },
          ],
        },
        format: 'json' as const,
      };
      const result = await controller.generateCircuitDiagram(dto);
      expect(result).toBeDefined();
    });

    it('should generate SVG circuit diagram', async () => {
      const dto = {
        circuit: {
          numQubits: 2,
          operations: [{ gate: { type: 'h' }, targets: [0] }],
        },
        format: 'svg' as const,
      };
      const mockRes = { setHeader: jest.fn(), send: jest.fn() } as any;
      await controller.exportCircuitSVG(dto, mockRes);
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('POST /visualization/amplitudes', () => {
    it('should generate amplitude visualization', async () => {
      const dto = {
        statevector: [
          { index: 0, re: 1 / Math.sqrt(2), im: 0 },
          { index: 1, re: 1 / Math.sqrt(2), im: 0 },
        ],
        numQubits: 1,
      };
      const result = await controller.generateAmplitudeVisualization(dto);
      expect(result).toBeDefined();
      expect(Array.isArray(result.data.magnitudes)).toBe(true);
    });
  });

  describe('POST /visualization/state-transition', () => {
    it('should generate state transition animation', async () => {
      const dto = {
        fromAlpha: { re: 1, im: 0 },
        fromBeta: { re: 0, im: 0 },
        toAlpha: { re: 0, im: 0 },
        toBeta: { re: 1, im: 0 },
        frames: 30,
      };
      const result = await controller.generateStateTransition(dto);
      expect(result).toBeDefined();
      expect(result.type).toBe('state-transition');
      expect(result.data.frames).toBeDefined();
    });
  });

  describe('POST /visualization/entanglement-graph', () => {
    it('should generate entanglement graph', async () => {
      const dto = {
        numQubits: 2,
        entanglementPairs: [{ q1: 0, q2: 1, type: 'bell' }],
      };
      const result = await controller.generateEntanglementGraph(dto);
      expect(result).toBeDefined();
      expect(result.type).toBe('entanglement-graph');
      expect(result.data.nodes).toBeDefined();
      expect(result.data.edges).toBeDefined();
    });
  });

  describe('POST /visualization/preview-effect', () => {
    it('should preview measurement effect', async () => {
      const dto = {
        type: 'measurement' as const,
        qubitIndex: 0,
        outcome: 0,
      };
      const result = await controller.previewObserverEffect(dto);
      expect(result).toBeDefined();
    });

    it('should preview entanglement effect', async () => {
      const dto = {
        type: 'entanglement' as const,
        qubitIndices: [0, 1],
      };
      const result = await controller.previewObserverEffect(dto);
      expect(result).toBeDefined();
    });

    it('should preview collapse effect', async () => {
      const dto = {
        type: 'collapse' as const,
        qubitIndex: 0,
        outcome: 0,
        statevector: [
          { index: 0, re: 1 / Math.sqrt(2), im: 0 },
          { index: 1, re: 1 / Math.sqrt(2), im: 0 },
        ],
      };
      const result = await controller.previewObserverEffect(dto);
      expect(result).toBeDefined();
    });
  });

  describe('GET /visualization', () => {
    it('should return module status', async () => {
      const result = await controller.getVisualizationInfo();
      expect(result).toBeDefined();
      expect(result.type).toBe('visualization-api');
    });
  });
});
