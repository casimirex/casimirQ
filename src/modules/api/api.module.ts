/**
 * API Module
 *
 * Provides REST API endpoints for circuit simulation platform
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// Controllers
import { CircuitsController } from './controllers/circuits.controller';
import { JobsController } from './controllers/jobs.controller';
import { SimulationController } from './controllers/simulation.controller';
import { VisualizationController } from './controllers/visualization.controller';
import { AdvancedFeaturesController } from './controllers/advanced-features.controller';
import { AuthController } from './controllers/auth.controller';

// Services
import { AuthService } from './services/auth.service';
import { SimulationRunnerService } from './services/simulation-runner.service';

// Repositories
import { CircuitsRepository } from './repositories/circuits.repository';
import { InMemoryCircuitsRepository } from './repositories/in-memory-circuits.repository';
import { PostgresCircuitsRepository } from './repositories/postgres-circuits.repository';
import { SimulationsRepository } from './repositories/simulations.repository';
import { InMemorySimulationsRepository } from './repositories/in-memory-simulations.repository';
import { PostgresSimulationsRepository } from './repositories/postgres-simulations.repository';
import { UsersRepository } from './repositories/users.repository';
import { InMemoryUsersRepository } from './repositories/in-memory-users.repository';
import { PostgresUsersRepository } from './repositories/postgres-users.repository';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

// Visualization services (dependency-free) used by the API layer
import { CircuitDiagramService } from '../visualization/services/circuit-diagram.service';

// Advanced-features services (dependency-free) used by the API layer
import {
  ErrorCorrectionService,
  NoiseModelingService,
  QuantumMLService,
} from '../advanced-features/services';

// Import SimulationEnginesModule for dependency injection
import { SimulationEnginesModule } from '../simulation-engines/simulation-engines.module';
import { SimulationEnginesService } from '../simulation-engines/simulation-engines.service';

// Gateways
import { VisualizationGateway } from './gateways/visualization.gateway';
import { JobsGateway } from './gateways/jobs.gateway';

@Module({
  imports: [
    SimulationEnginesModule,
    // JWT signing/verification. Set JWT_SECRET in production; the fallback is
    // for local development only.
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [
    AuthController,
    CircuitsController,
    JobsController,
    SimulationController,
    VisualizationController,
    AdvancedFeaturesController,
  ],
  providers: [
    AuthService,
    SimulationRunnerService,
    // Persistence backend: Postgres when DATABASE_URL is configured, otherwise
    // an in-memory store for local development and tests.
    {
      provide: CircuitsRepository,
      useClass: process.env.DATABASE_URL ? PostgresCircuitsRepository : InMemoryCircuitsRepository,
    },
    {
      provide: SimulationsRepository,
      useClass: process.env.DATABASE_URL
        ? PostgresSimulationsRepository
        : InMemorySimulationsRepository,
    },
    {
      provide: UsersRepository,
      useClass: process.env.DATABASE_URL ? PostgresUsersRepository : InMemoryUsersRepository,
    },
    JwtAuthGuard,
    RateLimitGuard,
    VisualizationGateway,
    JobsGateway,
    SimulationEnginesService,
    CircuitDiagramService,
    ErrorCorrectionService,
    NoiseModelingService,
    QuantumMLService,
  ],
  exports: [AuthService, JwtAuthGuard, RateLimitGuard, VisualizationGateway, JobsGateway],
})
export class ApiModule {}
