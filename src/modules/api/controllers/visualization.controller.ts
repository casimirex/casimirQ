/**
 * Visualization API Controller
 *
 * REST endpoints for quantum visualization, backed by real stored data:
 * circuit diagrams from saved circuits, and Bloch spheres / histograms /
 * 3D state from persisted simulation results.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { SimulationRunnerService } from '../services/simulation-runner.service';
import { CircuitsRepository } from '../repositories/circuits.repository';
import { SimulationsRepository } from '../repositories/simulations.repository';
import { CircuitDiagramService } from '../../visualization/services/circuit-diagram.service';

type Amplitude = { state: string; re: number; im: number; probability: number };

@Controller('api/v1/visualizations')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class VisualizationController {
  constructor(
    private readonly circuits: CircuitsRepository,
    private readonly simulations: SimulationsRepository,
    private readonly simulationRunner: SimulationRunnerService,
    private readonly circuitDiagram: CircuitDiagramService,
  ) {}

  /**
   * Bloch-sphere data for one qubit of a simulation's final state.
   *
   * Computes the qubit's reduced density matrix, so entangled qubits correctly
   * appear as a shorter (mixed) Bloch vector inside the sphere.
   */
  @Get('bloch-sphere/:qubitId')
  async getBlochSphereData(
    @Param('qubitId') qubitId: string,
    @Query('simulationId') simulationId: string,
    @Request() req: any,
  ) {
    if (!simulationId) {
      throw new BadRequestException('simulationId query parameter is required');
    }
    const sim = await this.simulations.findById(this.userId(req), simulationId);
    if (!sim) {
      throw new NotFoundException(`Simulation ${simulationId} not found`);
    }

    const qubit = Number(qubitId);
    if (!Number.isInteger(qubit) || qubit < 0 || qubit >= sim.numQubits) {
      throw new BadRequestException(`qubit ${qubitId} outside range 0..${sim.numQubits - 1}`);
    }

    const { x, y, z } = reducedBloch(sim.results.statevector, qubit);
    const radius = Math.sqrt(x * x + y * y + z * z);
    return {
      qubitId: qubit,
      simulationId,
      coordinates: { x, y, z },
      state: {
        theta: radius > 1e-12 ? Math.acos(Math.min(1, Math.max(-1, z / radius))) : 0,
        phi: Math.atan2(y, x),
        radius, // < 1 for entangled / mixed qubits
      },
      purity: radius, // |Bloch vector|; 1 = pure, 0 = maximally mixed
    };
  }

  /**
   * Circuit diagram (SVG or structured JSON) for a stored circuit.
   */
  @Get('circuit/:circuitId/diagram')
  async getCircuitDiagram(
    @Param('circuitId') circuitId: string,
    @Query('format') format = 'svg',
    @Res() res: Response,
    @Request() req: any,
  ) {
    const stored = await this.circuits.findById(this.userId(req), circuitId);
    if (!stored) {
      throw new NotFoundException(`Circuit ${circuitId} not found`);
    }
    const circuit = this.simulationRunner.buildCircuit({
      numQubits: stored.numQubits,
      operations: stored.operations,
    });

    if (format === 'json') {
      res.json(this.circuitDiagram.generateDiagram(circuit));
      return;
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(this.circuitDiagram.generateSVG(circuit));
  }

  /**
   * Measurement histogram for a simulation (per basis state).
   */
  @Get('histogram/:simulationId')
  async getHistogram(@Param('simulationId') simulationId: string, @Request() req: any) {
    const sim = await this.simulations.findById(this.userId(req), simulationId);
    if (!sim) {
      throw new NotFoundException(`Simulation ${simulationId} not found`);
    }
    const counts = sim.results.counts;
    const hasCounts = Object.keys(counts).length > 0;
    const source = hasCounts ? counts : sim.results.probabilities;
    const labels = Object.keys(source).sort();
    return {
      simulationId,
      type: hasCounts ? 'counts' : 'probabilities',
      labels: labels.map((l) => `|${l}⟩`),
      data: labels.map((l) => source[l]),
      total: hasCounts ? sim.shots : 1,
    };
  }

  /**
   * 3D state data (amplitude magnitude + phase per basis state).
   */
  @Get('state-3d/:simulationId')
  async get3DState(
    @Param('simulationId') simulationId: string,
    @Query('mode') mode: 'amplitude' | 'phase' = 'amplitude',
    @Request() req: any,
  ) {
    const sim = await this.simulations.findById(this.userId(req), simulationId);
    if (!sim) {
      throw new NotFoundException(`Simulation ${simulationId} not found`);
    }
    const states = sim.results.statevector.map((a: Amplitude) => ({
      state: a.state,
      amplitude: Math.hypot(a.re, a.im),
      phase: Math.atan2(a.im, a.re),
      probability: a.probability,
    }));
    return { simulationId, mode, numQubits: sim.numQubits, states };
  }

  /**
   * Export a visualization payload as a downloadable file.
   */
  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportVisualization(
    @Body() body: { type?: string; data?: unknown; format?: 'svg' | 'json' },
    @Res() res: Response,
  ) {
    const format = body.format === 'svg' ? 'svg' : 'json';
    res.setHeader('Content-Disposition', `attachment; filename="export.${format}"`);
    if (format === 'svg' && typeof body.data === 'string') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(body.data);
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.json({
      type: body.type ?? 'visualization',
      exportedAt: new Date().toISOString(),
      data: body.data ?? null,
    });
  }

  private userId(req: any): string {
    return req?.user?.userId ?? 'anonymous';
  }
}

/**
 * Bloch vector (⟨X⟩, ⟨Y⟩, ⟨Z⟩) of one qubit from a full statevector, via its
 * reduced density matrix.
 */
function reducedBloch(
  statevector: Amplitude[],
  qubit: number,
): { x: number; y: number; z: number } {
  const amp = new Map<number, { re: number; im: number }>();
  for (const a of statevector) {
    amp.set(parseInt(a.state, 2), { re: a.re, im: a.im });
  }

  let r00 = 0;
  let r11 = 0;
  let r01re = 0;
  let r01im = 0;
  const bitMask = 1 << qubit;

  for (const [idx, c] of amp) {
    const p = c.re * c.re + c.im * c.im;
    if ((idx & bitMask) === 0) {
      r00 += p;
      const partner = amp.get(idx | bitMask);
      if (partner) {
        // rho01 += c * conj(partner)
        r01re += c.re * partner.re + c.im * partner.im;
        r01im += c.im * partner.re - c.re * partner.im;
      }
    } else {
      r11 += p;
    }
  }

  return { x: 2 * r01re, y: -2 * r01im, z: r00 - r11 };
}
