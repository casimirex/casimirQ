import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { IOService } from './io.service';
import { Circuit } from '../circuit-engine/circuit';

/**
 * DTO for import request
 */
class ImportDto {
  format!: string;
  data!: string;
}

/**
 * DTO for export request
 */
class ExportDto {
  circuit!: unknown;
  format!: string;
  includeComments?: boolean;
  includeMetadata?: boolean;
}

/**
 * DTO for conversion request
 */
class ConvertDto {
  data!: string;
  fromFormat!: string;
  toFormat!: string;
  includeComments?: boolean;
  includeMetadata?: boolean;
}

/**
 * DTO for validation request
 */
class ValidateDto {
  format!: string;
  data!: string;
}

/**
 * Controller for circuit I/O API.
 * Provides endpoints for importing, exporting, and converting circuits.
 */
@Controller('io')
export class IOController {
  constructor(private readonly ioService: IOService) {}

  /**
   * Get list of supported formats.
   */
  @Get('formats')
  @HttpCode(HttpStatus.OK)
  getSupportedFormats() {
    const formats = this.ioService.getSupportedFormats();
    return {
      count: formats.length,
      formats: formats.map((f) => ({
        name: f.name,
        version: f.version,
        extensions: f.extensions,
        description: f.description,
        readable: f.readable,
        writable: f.writable,
      })),
    };
  }

  /**
   * Import circuit from external format.
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importCircuit(@Body() dto: ImportDto) {
    const circuit = this.ioService.import(dto.format, dto.data);
    const metadata = circuit.getMetadata();

    return {
      imported: true,
      format: dto.format,
      circuit: {
        qubitCount: metadata.qubitCount,
        gateCount: metadata.gateCount,
        depth: metadata.depth,
      },
    };
  }

  /**
   * Export circuit to external format.
   */
  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportCircuit(@Body() dto: ExportDto) {
    // Create a minimal circuit for demonstration
    const circuit = Circuit.builder(2).h(0).cx(0, 1).build();

    const options = {
      includeComments: dto.includeComments ?? true,
      includeMetadata: dto.includeMetadata ?? true,
    };

    const data = this.ioService.export(circuit, dto.format, options);

    return {
      exported: true,
      format: dto.format,
      data,
    };
  }

  /**
   * Convert between formats.
   */
  @Post('convert')
  @HttpCode(HttpStatus.OK)
  async convertCircuit(@Body() dto: ConvertDto) {
    const options = {
      includeComments: dto.includeComments ?? true,
      includeMetadata: dto.includeMetadata ?? true,
    };

    const result = this.ioService.convert(
      dto.data,
      dto.fromFormat,
      dto.toFormat,
      options,
    );

    return {
      converted: true,
      fromFormat: dto.fromFormat,
      toFormat: dto.toFormat,
      data: result,
    };
  }

  /**
   * Validate circuit data.
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateCircuit(@Body() dto: ValidateDto) {
    const result = this.ioService.validate(dto.format, dto.data);

    return {
      valid: result.valid,
      format: dto.format,
      errors: result.errors,
    };
  }

  /**
   * Detect format from content.
   */
  @Post('detect')
  @HttpCode(HttpStatus.OK)
  detectFormat(@Body('content') content: string) {
    const format = this.ioService.detectFormat(content);

    return {
      detected: format !== null,
      format,
      confidence: format ? 'high' : 'none',
    };
  }

  /**
   * Get format adapter info.
   */
  @Get('formats/:name')
  getFormatInfo(@Param('name') name: string) {
    const adapter = this.ioService.getAdapter(name);

    return {
      name: adapter.name,
      version: adapter.version,
      extensions: adapter.extensions,
    };
  }
}
