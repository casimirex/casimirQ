/**
 * OpenAPI / Swagger document.
 *
 * The document is the machine-checkable contract for the casimirQ REST API. It
 * is served interactively at `/api/v1/docs` (JSON at `/api/v1/docs-json`) and
 * written to `openapi.json` by `npm run openapi:generate` — the source of truth
 * that SDK integration tests validate against and future clients generate from.
 */

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** Build the OpenAPI document from the running application's routes. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('casimirQ API')
    .setDescription(
      'REST API for the casimirQ quantum circuit simulation platform: ' +
        'authentication, circuits, simulation, asynchronous jobs, algorithms, ' +
        'visualizations, and advanced features (error correction, noise, quantum ML).',
    )
    .setVersion('1.0.0')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:8080/api/v1', 'Docker (nginx single-origin)')
    .addServer('http://localhost:3000/api/v1', 'Local backend')
    // Every non-auth route expects `Authorization: Bearer <token>`.
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .addTag('Auth', 'Login, signup, token refresh, and identity')
    .addTag('Circuits', 'Create, read, update, delete circuits and simulate them')
    .addTag('Simulations', 'Synchronous simulation runs and history')
    .addTag('Jobs', 'Asynchronous job engine: submit, poll, cancel')
    .addTag('Algorithms', 'Pre-built quantum algorithms (QFT, Grover, Shor, VQE, QAOA, ...)')
    .addTag('Visualizations', 'Bloch sphere, circuit diagrams, histograms')
    .addTag('Advanced', 'Error correction, noise modeling, quantum machine learning')
    .addTag('IO', 'Import / export circuits (QASM and other formats)')
    .build();

  return SwaggerModule.createDocument(app, config);
}

/** Mount the interactive Swagger UI and JSON endpoint on the application. */
export function setupOpenApi(app: INestApplication): void {
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('api/v1/docs', app, document, {
    jsonDocumentUrl: 'api/v1/docs-json',
    swaggerOptions: { persistAuthorization: true },
  });
}
