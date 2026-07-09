# casimirQ Examples

This directory contains practical examples demonstrating how to use casimirQ.

## Quick Links

- [Basic Circuits](./basic-circuits.md)
- [Quantum Algorithms](./algorithms.md)
- [Error Correction](./error-correction.md)
- [Noise Modeling](./noise-modeling.md)
- [Quantum ML](./quantum-ml.md)
- [Batch Execution](./batch-execution.md)
- [Visualization](./visualization.md)

## Running Examples

Most examples are TypeScript code that can be run directly:

```bash
# Compile and run
npx ts-node examples/basic-circuits.ts

# Or using the API
curl -X POST http://localhost:3000/api/v1/circuits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @examples/bell-state.json
```

## Example Categories

### 1. Basic Quantum Circuits
Simple circuits demonstrating fundamental concepts:
- Bell states
- GHZ states
- Quantum teleportation
- Superposition and entanglement

### 2. Quantum Algorithms
Implemented algorithms:
- Grover's search
- Shor's algorithm
- Quantum Fourier Transform
- Variational Quantum Eigensolver (VQE)
- QAOA

### 3. Error Correction
Quantum error correction examples:
- Steane code encoding
- Syndrome measurement
- Error correction procedures

### 4. Noise Modeling
Realistic quantum simulations with noise:
- Depolarizing channels
- Amplitude damping
- Phase damping
- Custom noise models

### 5. Quantum Machine Learning
ML applications:
- VQE for molecular ground states
- Quantum kernel classification
- Quantum neural networks
- Feature maps

### 6. Advanced Features
- Batch circuit execution
- Pipeline processing
- Distributed task scheduling

### 7. Visualization
- Bloch sphere animations
- Circuit diagrams
- Probability histograms
- Real-time monitoring

## Code Templates

### Basic Circuit Template
```typescript
import { Circuit } from '../src/modules/circuit-engine/circuit';
import { SimulationEnginesService } from '../src/modules/simulation-engines/simulation-engines.service';

async function main() {
  // Create circuit
  const circuit = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .build();

  // Simulate
  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 1024
  });

  console.log('Results:', result);
}

main().catch(console.error);
```

### API Client Template
```typescript
// Using fetch
const response = await fetch('http://localhost:3000/api/v1/circuits', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'My Circuit',
    numQubits: 2,
    operations: [
      { gate: 'h', targets: [0] },
      { gate: 'cnot', targets: [0, 1] }
    ]
  })
});

const circuit = await response.json();
```

## Contributing

To add a new example:

1. Create a new `.md` file in this directory
2. Include complete, runnable code
3. Add explanation comments
4. Update this README with a link
5. Add corresponding tests if applicable
