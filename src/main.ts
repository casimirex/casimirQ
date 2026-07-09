/**
 * casimirQ - Quantum Circuit Simulation Platform
 *
 * Phase 1: Foundation & Core Engine
 * Phase 7: API & Integration Layer - HTTP Server
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Export core utilities
export { Complex, COMPLEX_CONSTANTS } from './common/utils/complex';
export { Matrix, matrixPower, controlledGate } from './common/utils/matrix';

// Export gates
export {
  XGate, YGate, ZGate, HGate, SGate, TGate,
  RxGate, RyGate, RzGate, PhaseGate, UGate,
} from './modules/gate-library/standard-gates/single-qubit-gates';
export {
  CnotGate, CzGate, SwapGate, ToffoliGate,
} from './modules/gate-library/standard-gates/multi-qubit-gates';

// Export circuit
export {
  Circuit,
  createBellStateCircuit,
  createGHZStateCircuit,
  createQFTCircuit,
} from './modules/circuit-engine/circuit';

// Export simulation
export { StatevectorEngine } from './modules/simulation-engines/engines/statevector-engine/statevector-engine';
export type {
  ISimulationResult,
  ISimulationOptions,
} from './modules/simulation-engines/interfaces/simulation-engine.interface';

/**
 * Bootstrap the HTTP server
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Note: Controllers define their own paths with /api/v1 prefix
  // No global prefix needed

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('🌌 casimirQ - Quantum Circuit Simulation Platform');
  console.log('   Complex numbers ✓');
  console.log('   Matrix operations ✓');
  console.log('   Quantum gates ✓');
  console.log('   Circuit builder ✓');
  console.log('   Statevector engine ✓');
  console.log('   REST API ✓');
  console.log('   WebSocket Gateway ✓');
  console.log(`\n🚀 Server running on http://localhost:${port}/api/v1`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/v1/docs`);
}

// Start server if this file is run directly
if (require.main === module) {
  bootstrap();
}

export { bootstrap };
