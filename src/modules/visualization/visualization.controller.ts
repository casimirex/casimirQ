import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { VisualizationService } from './visualization.service';
import { Circuit } from '../circuit-engine/circuit';
import { Complex } from '../../common/utils/complex';

/**
 * DTOs for visualization requests
 */
class BlochSphereDto {
  alpha!: { re: number; im: number };
  beta!: { re: number; im: number };
  radius?: number;
}

class CircuitDiagramDto {
  circuit!: unknown;
  format!: 'svg' | 'json';
}

class AmplitudeVisualizationDto {
  statevector!: Array<{ index: number; re: number; im: number }>;
  numQubits!: number;
}

class AnimationDto {
  fromAlpha!: { re: number; im: number };
  fromBeta!: { re: number; im: number };
  toAlpha!: { re: number; im: number };
  toBeta!: { re: number; im: number };
  frames?: number;
}

class EntanglementGraphDto {
  numQubits!: number;
  entanglementPairs!: Array<{ q1: number; q2: number; type: string }>;
}

/**
 * Visualization Controller
 *
 * REST API endpoints for quantum visualizations:
 * - Bloch sphere generation
 * - Circuit diagrams
 * - Amplitude visualizations
 * - State transitions and animations
 */
@Controller('visualization')
export class VisualizationController {
  constructor(private readonly visualizationService: VisualizationService) {}

  /**
   * Generate Bloch sphere visualization data
   */
  @Post('bloch-sphere')
  @HttpCode(HttpStatus.OK)
  generateBlochSphere(@Body() dto: BlochSphereDto) {
    const alpha = new Complex(dto.alpha.re, dto.alpha.im);
    const beta = new Complex(dto.beta.re, dto.beta.im);

    const blochData = this.visualizationService.generateBlochSphere(
      alpha,
      beta,
      dto.radius,
    );

    return {
      type: 'bloch-sphere',
      data: blochData,
      metadata: {
        theta: Math.acos(alpha.magnitude()),
        phi: beta.phase() - alpha.phase(),
        radius: blochData.radius,
      },
    };
  }

  /**
   * Generate circuit diagram
   */
  @Post('circuit-diagram')
  @HttpCode(HttpStatus.OK)
  generateCircuitDiagram(@Body() dto: CircuitDiagramDto) {
    const circuit = dto.circuit as Circuit;
    const diagram = this.visualizationService.generateCircuitDiagram(circuit);

    return {
      type: 'circuit-diagram',
      data: diagram,
    };
  }

  /**
   * Export circuit to SVG
   */
  @Post('circuit-svg')
  @HttpCode(HttpStatus.OK)
  exportCircuitSVG(@Body() dto: CircuitDiagramDto, @Res() res: Response) {
    const circuit = dto.circuit as Circuit;
    const svg = this.visualizationService.exportCircuitToSVG(circuit);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', 'attachment; filename="circuit.svg"');
    res.send(svg);
  }

  /**
   * Generate amplitude visualization
   */
  @Post('amplitudes')
  @HttpCode(HttpStatus.OK)
  generateAmplitudeVisualization(@Body() dto: AmplitudeVisualizationDto) {
    const statevector = new Map<bigint, Complex>();

    for (const entry of dto.statevector) {
      statevector.set(BigInt(entry.index), new Complex(entry.re, entry.im));
    }

    const viz = this.visualizationService.generateAmplitudeVisualization(
      statevector,
      dto.numQubits,
    );

    return {
      type: 'amplitude-visualization',
      data: viz,
    };
  }

  /**
   * Generate state transition animation frames
   */
  @Post('state-transition')
  @HttpCode(HttpStatus.OK)
  generateStateTransition(@Body() dto: AnimationDto) {
    const fromAlpha = new Complex(dto.fromAlpha.re, dto.fromAlpha.im);
    const fromBeta = new Complex(dto.fromBeta.re, dto.fromBeta.im);
    const toAlpha = new Complex(dto.toAlpha.re, dto.toAlpha.im);
    const toBeta = new Complex(dto.toBeta.re, dto.toBeta.im);

    const frames = this.visualizationService.generateStateTransition(
      fromAlpha,
      fromBeta,
      toAlpha,
      toBeta,
      dto.frames,
    );

    return {
      type: 'state-transition',
      data: {
        frames,
        frameCount: frames.length,
        duration: frames.length * 16.67, // ~60fps in ms
      },
    };
  }

  /**
   * Generate entanglement graph
   */
  @Post('entanglement-graph')
  @HttpCode(HttpStatus.OK)
  generateEntanglementGraph(@Body() dto: EntanglementGraphDto) {
    const graph = this.visualizationService.generateEntanglementGraph(
      dto.numQubits,
      dto.entanglementPairs,
    );

    return {
      type: 'entanglement-graph',
      data: graph,
    };
  }

  /**
   * Preview observer effect
   */
  @Post('preview-effect')
  @HttpCode(HttpStatus.OK)
  previewObserverEffect(@Body() config?: unknown) {
    this.visualizationService.previewObserverEffect(config);

    return {
      type: 'observer-effect-preview',
      status: 'triggered',
    };
  }

  /**
   * Get visualization info
   */
  @Get()
  getVisualizationInfo() {
    return {
      type: 'visualization-api',
      version: '1.0',
      endpoints: [
        {
          path: '/visualization/bloch-sphere',
          method: 'POST',
          description: 'Generate Bloch sphere visualization',
        },
        {
          path: '/visualization/circuit-diagram',
          method: 'POST',
          description: 'Generate circuit diagram',
        },
        {
          path: '/visualization/circuit-svg',
          method: 'POST',
          description: 'Export circuit as SVG',
        },
        {
          path: '/visualization/amplitudes',
          method: 'POST',
          description: 'Generate amplitude visualization',
        },
        {
          path: '/visualization/state-transition',
          method: 'POST',
          description: 'Generate state transition animation',
        },
        {
          path: '/visualization/entanglement-graph',
          method: 'POST',
          description: 'Generate entanglement graph',
        },
        {
          path: '/visualization/preview-effect',
          method: 'POST',
          description: 'Preview observer effect',
        },
      ],
    };
  }
}
