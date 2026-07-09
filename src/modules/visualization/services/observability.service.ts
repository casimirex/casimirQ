import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import {
  IMeasurementEvent,
  IObserverEffectConfig,
  IVisualizationUpdate,
} from '../interfaces/visualization.interface';

/**
 * Observability Service
 *
 * Implements "The Universe Looks Back" - quantum observation effects
 * that respond when users measure qubits.
 *
 * Features:
 * - Visual: Superposition collapse animations
 * - Audio: Quantum decoherence sound effects
 * - Haptic: Vibration feedback on mobile
 * - Real-time: WebSocket broadcasting of measurement events
 */
@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  /** Measurement event stream */
  private measurementEvents = new Subject<IMeasurementEvent>();

  /** Collapse animation stream */
  private collapseAnimations = new Subject<{
    event: IMeasurementEvent;
    frames: number;
  }>();

  /** Visualization update stream */
  private visualizationUpdates = new Subject<IVisualizationUpdate>();

  /** Default observer effect configuration */
  private defaultConfig: IObserverEffectConfig = {
    visual: true,
    audio: true,
    haptic: false, // Off by default for desktop
    intensity: 0.7,
    shakeIntensity: 5,
    flashDuration: 200,
    soundFrequency: 880,
  };

  /**
   * Get measurement event stream
   */
  getMeasurementEvents(): Observable<IMeasurementEvent> {
    return this.measurementEvents.asObservable();
  }

  /**
   * Get collapse animation stream
   */
  getCollapseAnimations(): Observable<{
    event: IMeasurementEvent;
    frames: number;
  }> {
    return this.collapseAnimations.asObservable();
  }

  /**
   * Get visualization update stream
   */
  getVisualizationUpdates(): Observable<IVisualizationUpdate> {
    return this.visualizationUpdates.asObservable();
  }

  /**
   * Emit a measurement event
   * Triggers "universe looks back" effects
   */
  emitMeasurement(event: IMeasurementEvent, config?: Partial<IObserverEffectConfig>): void {
    const mergedConfig = { ...this.defaultConfig, ...config };

    this.logger.log(
      `Measurement on qubit ${event.qubit}: |${event.outcome}⟩ (probability: ${(event.probability * 100).toFixed(1)}%)`,
    );

    // Emit the event
    this.measurementEvents.next(event);

    // Trigger effects
    if (mergedConfig.visual) {
      this.triggerVisualEffect(event, mergedConfig);
    }

    if (mergedConfig.audio) {
      this.triggerAudioEffect(event, mergedConfig);
    }

    if (mergedConfig.haptic) {
      this.triggerHapticEffect(event, mergedConfig);
    }

    // Broadcast visualization update
    this.visualizationUpdates.next({
      type: 'measurement',
      circuitId: event.circuitId,
      timestamp: event.timestamp,
      payload: event,
    });
  }

  /**
   * Trigger visual "universe looks back" effect
   *
   * Sequence:
   * 1. Screen darkens (anticipation)
   * 2. Scan line sweeps
   * 3. Particles scatter
   * 4. State collapses
   * 5. Result appears with flash
   * 6. Entangled qubits react
   * 7. UI restores
   */
  private triggerVisualEffect(
    event: IMeasurementEvent,
    config: IObserverEffectConfig,
  ): void {
    const effectData = {
      type: 'collapse-visual',
      qubit: event.qubit,
      outcome: event.outcome,
      sequence: [
        { phase: 'anticipation', duration: 50, intensity: config.intensity * 0.3 },
        { phase: 'scan', duration: 50, intensity: config.intensity },
        { phase: 'scatter', duration: 50, intensity: config.intensity },
        { phase: 'collapse', duration: 50, intensity: config.intensity },
        { phase: 'reveal', duration: 100, intensity: config.intensity },
        { phase: 'restore', duration: 200, intensity: config.intensity * 0.5 },
      ],
      totalDuration: 500,
      shakeAmount: config.shakeIntensity,
      flashColor: event.outcome === 0 ? '#4CAF50' : '#f44336',
    };

    this.visualizationUpdates.next({
      type: 'animation',
      circuitId: event.circuitId,
      timestamp: Date.now(),
      payload: effectData,
    });

    // Trigger collapse animation for the measured qubit
    this.collapseAnimations.next({
      event,
      frames: 30, // 30 frames at 60fps = 500ms
    });

    // If entangled qubits exist, trigger simultaneous collapse effect
    if (event.entangledWith.length > 0) {
      setTimeout(() => {
        event.entangledWith.forEach((entangledQubit) => {
          this.visualizationUpdates.next({
            type: 'animation',
            circuitId: event.circuitId,
            timestamp: Date.now(),
            payload: {
              type: 'entangled-collapse',
              qubit: entangledQubit,
              triggeredBy: event.qubit,
              correlation: event.postState.entangledWith.includes(entangledQubit),
            },
          });
        });
      }, 150); // Slight delay for spooky action effect
    }
  }

  /**
   * Trigger audio "observer effect" sound
   *
   * Sound design:
   * - Measurement: Frequency sweep 440Hz → 880Hz
   * - Collapse: Decaying resonance based on probability
   * - Entanglement: Harmonic chord for correlated qubits
   */
  private triggerAudioEffect(
    event: IMeasurementEvent,
    config: IObserverEffectConfig,
  ): void {
    const baseFreq = config.soundFrequency;
    const outcomeFreq = event.outcome === 0 ? baseFreq : baseFreq * 1.5;

    const audioData = {
      type: 'quantum-sound',
      sequence: [
        // Anticipation
        {
          frequency: baseFreq * 0.5,
          duration: 50,
          volume: 0.1 * config.intensity,
          waveform: 'sine',
        },
        // Measurement sweep
        {
          frequency: [baseFreq * 0.8, outcomeFreq],
          duration: 100,
          volume: 0.3 * config.intensity,
          waveform: 'sawtooth',
        },
        // Collapse resonance
        {
          frequency: outcomeFreq,
          duration: 200,
          volume: 0.5 * config.intensity * event.probability,
          waveform: 'sine',
          decay: true,
        },
      ],
      // Entanglement chord if applicable
      entanglementChord:
        event.entangledWith.length > 0
          ? {
              frequencies: [baseFreq, baseFreq * 1.25, baseFreq * 1.5],
              duration: 300,
              volume: 0.2 * config.intensity,
            }
          : null,
    };

    this.visualizationUpdates.next({
      type: 'animation',
      circuitId: event.circuitId,
      timestamp: Date.now(),
      payload: audioData,
    });
  }

  /**
   * Trigger haptic feedback for mobile devices
   */
  private triggerHapticEffect(
    event: IMeasurementEvent,
    config: IObserverEffectConfig,
  ): void {
    const hapticData = {
      type: 'haptic',
      pattern: [
        { intensity: 0.3 * config.intensity, duration: 50 },
        { intensity: 0, duration: 30 },
        { intensity: 0.7 * config.intensity, duration: 100 },
        { intensity: 0, duration: 50 },
        { intensity: 0.5 * config.intensity, duration: 200 },
      ],
    };

    this.visualizationUpdates.next({
      type: 'animation',
      circuitId: event.circuitId,
      timestamp: Date.now(),
      payload: hapticData,
    });
  }

  /**
   * Generate measurement event from simulation
   */
  createMeasurementEvent(
    circuitId: string,
    qubit: number,
    outcome: 0 | 1,
    probability: number,
    preState: any,
    postState: any,
    entangledWith: number[] = [],
  ): IMeasurementEvent {
    return {
      circuitId,
      qubit,
      outcome,
      probability,
      timestamp: Date.now(),
      entangledWith,
      preState,
      postState,
    };
  }

  /**
   * Batch process multiple measurements
   */
  emitBatchMeasurements(
    events: IMeasurementEvent[],
    config?: Partial<IObserverEffectConfig>,
  ): void {
    events.forEach((event, index) => {
      setTimeout(() => {
        this.emitMeasurement(event, config);
      }, index * 100);
    });
  }

  /**
   * Get current effect configuration
   */
  getConfig(): IObserverEffectConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Update default effect configuration
   */
  setConfig(config: Partial<IObserverEffectConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    this.logger.log('Observer effect configuration updated');
  }

  /**
   * Preview effect without actual measurement
   * For settings calibration
   */
  previewEffect(config?: Partial<IObserverEffectConfig>): void {
    const previewConfig = { ...this.defaultConfig, ...config };

    const mockEvent: IMeasurementEvent = {
      circuitId: 'preview',
      qubit: 0,
      outcome: Math.random() > 0.5 ? 1 : 0,
      probability: 0.5,
      timestamp: Date.now(),
      entangledWith: [],
      preState: null as any,
      postState: null as any,
    };

    this.logger.log('Previewing observer effect');
    this.triggerVisualEffect(mockEvent, previewConfig);
    this.triggerAudioEffect(mockEvent, previewConfig);
  }
}
