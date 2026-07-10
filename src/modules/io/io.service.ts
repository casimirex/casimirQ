import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OpenQASMAdapter } from './adapters/openqasm-adapter';
import { QiskitAdapter } from './adapters/qiskit-adapter';
import { CirqAdapter } from './adapters/cirq-adapter';
import { QuilAdapter } from './adapters/quil-adapter';
import { IonQAdapter } from './adapters/ionq-adapter';
import { Circuit } from '../circuit-engine/circuit';
import { IFormatAdapter, IOOptions, FormatInfo } from './interfaces/format-adapter.interface';

/**
 * Service for circuit I/O operations.
 * Handles import/export to various quantum computing formats.
 */
@Injectable()
export class IOService {
  private adapters: Map<string, IFormatAdapter> = new Map();

  constructor() {
    this.registerAdapters();
  }

  /**
   * Register all format adapters.
   */
  private registerAdapters(): void {
    this.registerAdapter(new OpenQASMAdapter());
    this.registerAdapter(new QiskitAdapter());
    this.registerAdapter(new CirqAdapter());
    this.registerAdapter(new QuilAdapter());
    this.registerAdapter(new IonQAdapter());
  }

  /**
   * Register a format adapter.
   */
  private registerAdapter(adapter: IFormatAdapter): void {
    this.adapters.set(adapter.name.toLowerCase(), adapter);
  }

  /**
   * Get list of supported formats.
   */
  getSupportedFormats(): FormatInfo[] {
    const formats: FormatInfo[] = [];

    for (const adapter of this.adapters.values()) {
      formats.push({
        name: adapter.name,
        version: adapter.version,
        extensions: adapter.extensions,
        readable: true,
        writable: true,
        description: this.getFormatDescription(adapter.name),
      });
    }

    return formats;
  }

  /**
   * Get format description.
   */
  private getFormatDescription(name: string): string {
    const descriptions: Record<string, string> = {
      openqasm: 'Open Quantum Assembly Language - IBM standard',
      qiskit: "IBM Qiskit's JSON circuit format",
      cirq: "Google Cirq's JSON circuit format",
      quil: 'Rigetti Quantum Instruction Language',
      ionq: 'IonQ native gate format for trapped-ion systems',
    };

    return descriptions[name.toLowerCase()] || 'Quantum circuit format';
  }

  /**
   * Import circuit from external format.
   *
   * @param format Format name
   * @param data Circuit data
   * @returns Parsed Circuit
   */
  import(format: string, data: string): Circuit {
    const adapter = this.adapters.get(format.toLowerCase());

    if (!adapter) {
      throw new NotFoundException(`Unknown format: ${format}`);
    }

    // Validate first
    const validation = adapter.validate(data);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid ${format} data: ${validation.errors.join(', ')}`);
    }

    return adapter.parse(data);
  }

  /**
   * Export circuit to external format.
   *
   * @param circuit Circuit to export
   * @param format Format name
   * @param options Export options
   * @returns Serialized circuit data
   */
  export(circuit: Circuit, format: string, options?: IOOptions): string {
    const adapter = this.adapters.get(format.toLowerCase());

    if (!adapter) {
      throw new NotFoundException(`Unknown format: ${format}`);
    }

    return adapter.serialize(circuit, options);
  }

  /**
   * Convert between formats.
   *
   * @param data Source data
   * @param fromFormat Source format
   * @param toFormat Target format
   * @param options Conversion options
   * @returns Converted data
   */
  convert(data: string, fromFormat: string, toFormat: string, options?: IOOptions): string {
    // Parse from source format
    const circuit = this.import(fromFormat, data);

    // Serialize to target format
    return this.export(circuit, toFormat, options);
  }

  /**
   * Validate circuit data without parsing.
   *
   * @param format Format name
   * @param data Data to validate
   * @returns Validation result
   */
  validate(format: string, data: string): { valid: boolean; errors: string[] } {
    const adapter = this.adapters.get(format.toLowerCase());

    if (!adapter) {
      return {
        valid: false,
        errors: [`Unknown format: ${format}`],
      };
    }

    return adapter.validate(data);
  }

  /**
   * Detect format from file extension or content.
   *
   * @param filename File name or content
   * @returns Detected format or null
   */
  detectFormat(input: string): string | null {
    // Check file extension
    const ext = input.split('.').pop()?.toLowerCase();

    for (const adapter of this.adapters.values()) {
      if (adapter.extensions.some((e) => e.toLowerCase() === `.${ext}`)) {
        return adapter.name.toLowerCase();
      }
    }

    // Try to detect from content
    if (input.includes('OPENQASM')) {
      return 'openqasm';
    }
    if (input.includes('cirq_type')) {
      return 'cirq';
    }
    if (input.includes('format') && input.includes('ionq')) {
      return 'ionq';
    }

    return null;
  }

  /**
   * Get adapter for format.
   */
  getAdapter(format: string): IFormatAdapter {
    const adapter = this.adapters.get(format.toLowerCase());
    if (!adapter) {
      throw new NotFoundException(`Unknown format: ${format}`);
    }
    return adapter;
  }
}
