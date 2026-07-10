import { Injectable } from '@nestjs/common';
import { Circuit, IGateOperation } from '../../circuit-engine/circuit';
import { ICircuitDiagram } from '../interfaces/visualization.interface';

/**
 * Circuit Diagram Visualization Service
 *
 * Generates SVG/Canvas representation of quantum circuits.
 * Creates publication-quality circuit diagrams.
 */
@Injectable()
export class CircuitDiagramService {
  /** Gate dimensions */
  private readonly gateWidth = 40;
  private readonly gateHeight = 40;
  private readonly wireSpacing = 60;
  private readonly margin = 40;
  private readonly gateSpacing = 60;

  /**
   * Generate circuit diagram visualization
   */
  generateDiagram(circuit: Circuit): ICircuitDiagram {
    const operations = circuit['operations'] as IGateOperation[];
    const numQubits = circuit.numQubits;

    // Calculate dimensions
    const width = this.margin * 2 + operations.length * this.gateSpacing + this.gateWidth;
    const height = this.margin * 2 + (numQubits - 1) * this.wireSpacing + this.gateHeight;

    // Generate wire positions
    const wires = Array.from({ length: numQubits }, (_, i) => ({
      index: i,
      y: this.margin + i * this.wireSpacing,
      label: `q${i}`,
    }));

    // Generate gate elements
    const gates: ICircuitDiagram['gates'] = [];
    const connections: ICircuitDiagram['connections'] = [];

    let x = this.margin + 20; // Initial x position

    operations.forEach((op, opIndex) => {
      const gateInfo = this.getGateInfo(op);

      if (op.targets.length === 1 && !op.controls?.length) {
        // Single-qubit gate
        const y = this.margin + op.targets[0] * this.wireSpacing;
        gates.push({
          id: `gate-${opIndex}`,
          type: op.gate.type,
          name: gateInfo.symbol,
          x: x,
          y: y,
          width: this.gateWidth,
          height: this.gateHeight,
          targets: op.targets,
        });
      } else if (op.controls?.length) {
        // Controlled gate
        const minTarget = Math.min(...op.targets, ...op.controls);
        const maxTarget = Math.max(...op.targets, ...op.controls);
        const gateY = this.margin + op.targets[0] * this.wireSpacing;
        const gateHeight = (maxTarget - minTarget) * this.wireSpacing + this.gateHeight;

        gates.push({
          id: `gate-${opIndex}`,
          type: op.gate.type,
          name: gateInfo.symbol,
          x: x,
          y: gateY,
          width: this.gateWidth,
          height: gateHeight,
          targets: op.targets,
          controls: op.controls,
        });

        // Add control dots
        op.controls.forEach((control) => {
          gates.push({
            id: `control-${opIndex}-${control}`,
            type: 'control',
            name: '●',
            x: x + this.gateWidth / 2 - 6,
            y: this.margin + control * this.wireSpacing - 6,
            width: 12,
            height: 12,
            targets: [control],
          });
        });
      } else if (op.targets.length === 2) {
        // Two-qubit gate (SWAP, etc.)
        const y1 = this.margin + op.targets[0] * this.wireSpacing;
        const y2 = this.margin + op.targets[1] * this.wireSpacing;

        gates.push({
          id: `gate-${opIndex}`,
          type: op.gate.type,
          name: gateInfo.symbol,
          x: x,
          y: Math.min(y1, y2),
          width: this.gateWidth,
          height: Math.abs(y2 - y1) + this.gateHeight,
          targets: op.targets,
        });
      }

      x += this.gateSpacing;
    });

    return {
      width,
      height,
      wires,
      gates,
      connections,
    };
  }

  /**
   * Get gate display information
   */
  private getGateInfo(operation: IGateOperation): {
    symbol: string;
    color: string;
    needsBox: boolean;
  } {
    const type = operation.gate.type.toLowerCase();

    const gateMap: Record<string, { symbol: string; color: string; needsBox: boolean }> = {
      h: { symbol: 'H', color: '#4CAF50', needsBox: true },
      x: { symbol: 'X', color: '#f44336', needsBox: true },
      y: { symbol: 'Y', color: '#FF9800', needsBox: true },
      z: { symbol: 'Z', color: '#2196F3', needsBox: true },
      s: { symbol: 'S', color: '#9C27B0', needsBox: true },
      sdg: { symbol: 'S†', color: '#9C27B0', needsBox: true },
      t: { symbol: 'T', color: '#00BCD4', needsBox: true },
      tdg: { symbol: 'T†', color: '#00BCD4', needsBox: true },
      rx: { symbol: 'Rx', color: '#795548', needsBox: true },
      ry: { symbol: 'Ry', color: '#795548', needsBox: true },
      rz: { symbol: 'Rz', color: '#795548', needsBox: true },
      cx: { symbol: '⊕', color: '#f44336', needsBox: false },
      cz: { symbol: 'Z', color: '#2196F3', needsBox: true },
      swap: { symbol: '×', color: '#607D8B', needsBox: false },
      ccx: { symbol: '⊕', color: '#f44336', needsBox: false },
      cswap: { symbol: '×', color: '#607D8B', needsBox: false },
      measure: { symbol: '📏', color: '#FFC107', needsBox: true },
      barrier: { symbol: '|', color: '#9E9E9E', needsBox: false },
      p: { symbol: 'P', color: '#673AB7', needsBox: true },
      cp: { symbol: 'P', color: '#673AB7', needsBox: true },
    };

    return gateMap[type] || { symbol: type.toUpperCase(), color: '#757575', needsBox: true };
  }

  /**
   * Generate SVG representation of circuit
   */
  generateSVG(circuit: Circuit): string {
    const diagram = this.generateDiagram(circuit);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${diagram.width}" height="${diagram.height}">\n`;

    // Background
    svg += `  <rect width="100%" height="100%" fill="white"/>\n`;

    // Draw wires
    diagram.wires.forEach((wire) => {
      svg += `  <line x1="${this.margin}" y1="${wire.y}" x2="${diagram.width - this.margin}" y2="${wire.y}" stroke="#333" stroke-width="2"/>\n`;
      svg += `  <text x="10" y="${wire.y + 5}" font-size="14" fill="#333">${wire.label}</text>\n`;
    });

    // Draw gates
    diagram.gates.forEach((gate) => {
      const gateInfo = this.getGateInfoFromType(gate.type);

      if (gate.type === 'control') {
        // Control dot
        svg += `  <circle cx="${gate.x + 6}" cy="${gate.y + 6}" r="6" fill="#333"/>\n`;
      } else if (gate.type === 'cx' || gate.type === 'ccx') {
        // CNOT - draw target and connections
        svg += `  <circle cx="${gate.x + this.gateWidth / 2}" cy="${gate.y + gate.height / 2}" r="12" fill="none" stroke="${gateInfo.color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${gate.x + this.gateWidth / 2 - 8}" y1="${gate.y + gate.height / 2}" x2="${gate.x + this.gateWidth / 2 + 8}" y2="${gate.y + gate.height / 2}" stroke="${gateInfo.color}" stroke-width="2"/>\n`;
        svg += `  <line x1="${gate.x + this.gateWidth / 2}" y1="${gate.y + gate.height / 2 - 8}" x2="${gate.x + this.gateWidth / 2}" y2="${gate.y + gate.height / 2 + 8}" stroke="${gateInfo.color}" stroke-width="2"/>\n`;
      } else if (gate.type === 'swap') {
        // SWAP - draw X marks
        gate.targets.forEach((target) => {
          const targetY = this.margin + target * this.wireSpacing;
          svg += `  <text x="${gate.x + this.gateWidth / 2 - 6}" y="${targetY + 6}" font-size="20" fill="#333">×</text>\n`;
        });
      } else {
        // Regular gate box
        svg += `  <rect x="${gate.x}" y="${gate.y}" width="${gate.width}" height="${gate.height}" fill="${gateInfo.color}" stroke="#333" stroke-width="1" rx="4"/>\n`;
        svg += `  <text x="${gate.x + gate.width / 2}" y="${gate.y + gate.height / 2 + 6}" text-anchor="middle" font-size="16" font-weight="bold" fill="white">${gate.name}</text>\n`;
      }
    });

    svg += `</svg>`;
    return svg;
  }

  /**
   * Helper to get gate info from type
   */
  private getGateInfoFromType(type: string): { color: string } {
    const colors: Record<string, string> = {
      h: '#4CAF50',
      x: '#f44336',
      y: '#FF9800',
      z: '#2196F3',
      cx: '#f44336',
      swap: '#607D8B',
      control: '#333',
    };
    return { color: colors[type] || '#757575' };
  }

  /**
   * Generate animation frames for circuit execution
   */
  generateExecutionAnimation(
    circuit: Circuit,
    currentStep: number,
    _totalSteps: number,
  ): ICircuitDiagram {
    const diagram = this.generateDiagram(circuit);

    // Highlight current gate
    if (currentStep < diagram.gates.length) {
      // Add highlight effect (this would be handled by the frontend)
    }

    return diagram;
  }

  /**
   * Export circuit to JSON for external rendering
   */
  exportToJSON(circuit: Circuit): object {
    const diagram = this.generateDiagram(circuit);
    return {
      version: '1.0',
      qubits: circuit.numQubits,
      dimensions: {
        width: diagram.width,
        height: diagram.height,
      },
      wires: diagram.wires,
      gates: diagram.gates.map((g) => ({
        type: g.type,
        name: g.name,
        position: { x: g.x, y: g.y },
        targets: g.targets,
        controls: g.controls,
      })),
    };
  }
}
