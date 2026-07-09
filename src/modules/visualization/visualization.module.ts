import { Module } from '@nestjs/common';
import { VisualizationService } from './visualization.service';
import { VisualizationController } from './visualization.controller';
import { QuantumVisualizationGateway } from './gateways/visualization.gateway';
import { ObservabilityService } from './services/observability.service';
import { BlochSphereService } from './services/bloch-sphere.service';
import { CircuitDiagramService } from './services/circuit-diagram.service';

@Module({
  providers: [
    VisualizationService,
    ObservabilityService,
    BlochSphereService,
    CircuitDiagramService,
    QuantumVisualizationGateway,
  ],
  controllers: [VisualizationController],
  exports: [VisualizationService, ObservabilityService],
})
export class VisualizationModule {}
