import { Injectable } from '@nestjs/common';
import { IQubitState, IBlochSphereData } from '../interfaces/visualization.interface';
import { Complex } from '../../../common/utils/complex';

/**
 * Bloch Sphere Visualization Service
 *
 * Generates 3D visualization data for qubit states on the Bloch sphere.
 * The Bloch sphere represents the state space of a single qubit.
 *
 * State |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
 * Maps to point (sinθ cosφ, sinθ sinφ, cosθ) on the unit sphere.
 */
@Injectable()
export class BlochSphereService {
  /** Default sphere radius */
  private readonly defaultRadius = 1;

  /**
   * Convert complex amplitudes to Bloch sphere coordinates
   */
  amplitudesToBloch(alpha: Complex, beta: Complex): { theta: number; phi: number } {
    // Calculate Bloch angles from amplitudes
    // |ψ⟩ = α|0⟩ + β|1⟩ where |α|² + |β|² = 1

    const alphaMag = alpha.magnitude();

    // theta = 2 * arccos(|α|)
    const theta = 2 * Math.acos(Math.min(1, Math.max(0, alphaMag)));

    // phi = arg(β) - arg(α)
    const phi = beta.phase() - alpha.phase();

    return { theta, phi };
  }

  /**
   * Convert Bloch angles to Cartesian coordinates
   */
  blochToCartesian(
    theta: number,
    phi: number,
    radius: number = this.defaultRadius,
  ): { x: number; y: number; z: number } {
    return {
      x: radius * Math.sin(theta) * Math.cos(phi),
      y: radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(theta),
    };
  }

  /**
   * Generate Bloch sphere visualization data
   */
  generateBlochSphereData(
    state: IQubitState,
    radius: number = this.defaultRadius,
  ): IBlochSphereData {
    const { theta, phi } = state.bloch;
    const position = this.blochToCartesian(theta, phi, radius);

    // Generate state vector arrow (from center to surface)
    const arrow = {
      start: { x: 0, y: 0, z: 0 },
      end: position,
    };

    // Generate axes
    const axes = {
      x: {
        start: [-radius, 0, 0],
        end: [radius, 0, 0],
        color: '#ff4444', // Red for X
      },
      y: {
        start: [0, -radius, 0],
        end: [0, radius, 0],
        color: '#44ff44', // Green for Y
      },
      z: {
        start: [0, 0, -radius],
        end: [0, 0, radius],
        color: '#4444ff', // Blue for Z
      },
    };

    // Generate circles
    const circles = {
      equator: this.generateCircle(0, radius, 32),
      meridian: this.generateCircle(Math.PI / 2, radius, 32, phi),
    };

    return {
      radius,
      position,
      arrow,
      axes,
      circles,
    };
  }

  /**
   * Generate a circle on the Bloch sphere
   */
  private generateCircle(
    theta: number,
    radius: number,
    segments: number,
    rotation: number = 0,
  ): number[][] {
    const points: number[][] = [];

    for (let i = 0; i <= segments; i++) {
      const phi = (i / segments) * 2 * Math.PI + rotation;

      if (Math.abs(theta) < 0.001) {
        // Equator
        points.push([radius * Math.cos(phi), radius * Math.sin(phi), 0]);
      } else {
        // Tilted circle
        points.push([
          radius * Math.sin(theta) * Math.cos(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(theta),
        ]);
      }
    }

    return points;
  }

  /**
   * Calculate intermediate state for animation
   */
  interpolateState(from: IQubitState, to: IQubitState, progress: number): IQubitState {
    // Interpolate Bloch angles
    const theta = from.bloch.theta + (to.bloch.theta - from.bloch.theta) * progress;
    const phi = from.bloch.phi + (to.bloch.phi - from.bloch.phi) * progress;

    // Convert back to amplitudes
    const alpha = new Complex(Math.cos(theta / 2), 0);
    const beta = new Complex(
      Math.sin(theta / 2) * Math.cos(phi),
      Math.sin(theta / 2) * Math.sin(phi),
    );

    return {
      bloch: { theta, phi },
      alpha: { re: alpha.real, im: alpha.imag },
      beta: { re: beta.real, im: beta.imag },
      probabilities: {
        zero: Math.pow(Math.cos(theta / 2), 2),
        one: Math.pow(Math.sin(theta / 2), 2),
      },
      isSuperposition: theta > 0.01 && theta < Math.PI - 0.01,
      entangledWith: progress > 0.5 ? to.entangledWith : from.entangledWith,
    };
  }

  /**
   * Generate animation frames for state transition
   */
  generateAnimationFrames(from: IQubitState, to: IQubitState, frames: number): IQubitState[] {
    const states: IQubitState[] = [];

    for (let i = 0; i <= frames; i++) {
      const progress = i / frames;
      // Apply easing (ease-in-out)
      const easedProgress =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      states.push(this.interpolateState(from, to, easedProgress));
    }

    return states;
  }

  /**
   * Generate measurement collapse animation
   * Animates from superposition to |0⟩ or |1⟩
   */
  generateCollapseAnimation(from: IQubitState, outcome: 0 | 1, frames: number = 30): IQubitState[] {
    const targetTheta = outcome === 0 ? 0 : Math.PI;
    const targetState: IQubitState = {
      bloch: { theta: targetTheta, phi: 0 },
      alpha: {
        re: outcome === 0 ? 1 : 0,
        im: 0,
      },
      beta: {
        re: outcome === 0 ? 0 : 1,
        im: 0,
      },
      probabilities: {
        zero: outcome === 0 ? 1 : 0,
        one: outcome === 0 ? 0 : 1,
      },
      isSuperposition: false,
      entangledWith: from.entangledWith,
    };

    return this.generateAnimationFrames(from, targetState, frames);
  }

  /**
   * Calculate probability of measuring |0⟩ or |1⟩
   */
  calculateProbabilities(state: IQubitState): {
    zero: number;
    one: number;
  } {
    const { theta } = state.bloch;
    return {
      zero: Math.pow(Math.cos(theta / 2), 2),
      one: Math.pow(Math.sin(theta / 2), 2),
    };
  }

  /**
   * Generate multi-qubit Bloch sphere data
   */
  generateMultiQubitBlochData(
    states: IQubitState[],
    radius: number = this.defaultRadius,
  ): IBlochSphereData[] {
    return states.map((state) => this.generateBlochSphereData(state, radius));
  }
}
