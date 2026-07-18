/**
 * Emit the OpenAPI document to `openapi.json` at the repo root.
 *
 * Builds the Nest application graph (without listening) so every route and DTO
 * schema is discovered, then writes the spec. Run via `npm run openapi:generate`.
 */

import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../app.module';
import { buildOpenApiDocument } from '../openapi';

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = buildOpenApiDocument(app);
  await app.close();

  const outPath = join(process.cwd(), 'openapi.json');
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`);

  const paths = Object.keys(document.paths).length;

  console.log(`Wrote ${outPath} — ${paths} paths, API version ${document.info.version}`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
