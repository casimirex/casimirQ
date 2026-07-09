import { Circuit } from '../../circuit-engine/circuit';

/**
 * Interface for circuit format adapters.
 * Each adapter handles conversion between casimirQ's Circuit
 * and a specific external format.
 */
export interface IFormatAdapter {
  /**
   * Format name
   */
  readonly name: string;

  /**
   * Format version supported
   */
  readonly version: string;

  /**
   * File extensions associated with this format
   */
  readonly extensions: string[];

  /**
   * Parse external format to Circuit
   * @param data The serialized circuit data
   * @returns Parsed Circuit
   */
  parse(data: string): Circuit;

  /**
   * Serialize Circuit to external format
   * @param circuit The circuit to serialize
   * @param options Export options
   * @returns Serialized data
   */
  serialize(circuit: Circuit, options?: IOOptions): string;

  /**
   * Validate external format data
   * @param data The data to validate
   * @returns Validation result
   */
  validate(data: string): { valid: boolean; errors: string[] };
}

/**
 * Import/Export options
 */
export interface IOOptions {
  /**
   * Include comments in output
   */
  includeComments?: boolean;

  /**
   * Include metadata in output
   */
  includeMetadata?: boolean;

  /**
   * Format-specific options
   */
  [key: string]: unknown;
}

/**
 * Conversion result
 */
export interface ConversionResult {
  /**
   * Whether conversion was successful
   */
  success: boolean;

  /**
   * Converted data
   */
  data?: string;

  /**
   * Error messages if failed
   */
  errors?: string[];

  /**
   * Warnings
   */
  warnings?: string[];
}

/**
 * Supported format info
 */
export interface FormatInfo {
  name: string;
  version: string;
  extensions: string[];
  readable: boolean;
  writable: boolean;
  description: string;
}
