/**
 * BackendRegistry.
 *
 * Holds every registered backend and looks them up by id. New backends are
 * added by providing another adapter through the BACKENDS token — no change to
 * the registry, controller, or callers.
 */

import { Inject, Injectable } from '@nestjs/common';
import { BACKENDS, Backend } from './domain/backend';

@Injectable()
export class BackendRegistry {
  constructor(@Inject(BACKENDS) private readonly backends: Backend[]) {}

  /** All registered backends. */
  list(): Backend[] {
    return this.backends;
  }

  /** Look up a backend by id, or undefined. */
  get(id: string): Backend | undefined {
    return this.backends.find((b) => b.id === id);
  }
}
