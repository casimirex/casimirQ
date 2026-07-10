import { ObservabilityService } from './observability.service';
import { IMeasurementEvent, IObserverEffectConfig } from '../interfaces/visualization.interface';
import { first, take } from 'rxjs/operators';

describe('ObservabilityService', () => {
  let service: ObservabilityService;

  beforeEach(() => {
    service = new ObservabilityService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Measurement Events', () => {
    it('should emit measurement events', (done) => {
      service
        .getMeasurementEvents()
        .pipe(first())
        .subscribe((event) => {
          expect(event).toBeDefined();
          done();
        });

      const measurement: IMeasurementEvent = {
        circuitId: 'test-circuit',
        qubit: 0,
        outcome: 0,
        probability: 0.5,
        timestamp: Date.now(),
        entangledWith: [],
        preState: {
          bloch: { theta: 0, phi: 0 },
          alpha: { re: 1, im: 0 },
          beta: { re: 0, im: 0 },
          probabilities: { zero: 1, one: 0 },
          isSuperposition: false,
          entangledWith: [],
        },
        postState: {
          bloch: { theta: 0, phi: 0 },
          alpha: { re: 1, im: 0 },
          beta: { re: 0, im: 0 },
          probabilities: { zero: 1, one: 0 },
          isSuperposition: false,
          entangledWith: [],
        },
      };

      service.emitMeasurement(measurement);
    });

    it('should handle multiple measurement events', (done) => {
      const events: IMeasurementEvent[] = [];
      service
        .getMeasurementEvents()
        .pipe(take(2))
        .subscribe({
          next: (event) => events.push(event),
          complete: () => {
            expect(events.length).toBe(2);
            done();
          },
        });

      const createQubitState = (theta: number, alphaRe: number, betaRe: number): any => ({
        bloch: { theta, phi: 0 },
        alpha: { re: alphaRe, im: 0 },
        beta: { re: betaRe, im: 0 },
        probabilities: { zero: alphaRe * alphaRe, one: betaRe * betaRe },
        isSuperposition: alphaRe !== 0 && betaRe !== 0,
        entangledWith: [],
      });

      service.emitMeasurement({
        circuitId: 'test-circuit',
        qubit: 0,
        outcome: 0,
        probability: 0.5,
        timestamp: Date.now(),
        entangledWith: [],
        preState: createQubitState(0, 1, 0),
        postState: createQubitState(0, 1, 0),
      });

      service.emitMeasurement({
        circuitId: 'test-circuit',
        qubit: 1,
        outcome: 1,
        probability: 0.5,
        timestamp: Date.now(),
        entangledWith: [],
        preState: createQubitState(Math.PI, 0, 1),
        postState: createQubitState(Math.PI, 0, 1),
      });
    });
  });

  describe('Collapse Animations', () => {});

  describe('Configuration', () => {
    it('should return default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
    });

    it('should update config', () => {
      const newConfig: Partial<IObserverEffectConfig> = {
        visual: false,
        audio: true,
      };
      service.setConfig(newConfig);
      const config = service.getConfig();
      expect(config.visual).toBe(false);
      expect(config.audio).toBe(true);
    });
  });
});
