# casimirQ Documentation

## Quantum Circuit Simulation Platform

Welcome to casimirQ - a comprehensive quantum circuit simulation platform built with NestJS.

## Table of Contents

1. [Getting Started](./getting-started.md)
2. [API Reference](./api-reference.md)
3. [Quantum Computing Concepts](./concepts.md)
4. [Examples](./examples/README.md)
5. [Architecture](./architecture.md)
6. [Deployment](./deployment.md)

## Features

- **Circuit Engine**: Build and manipulate quantum circuits
- **Simulation Engines**: Statevector, Clifford, and MPS backends
- **Visualization**: Bloch spheres, circuit diagrams, 3D state plots
- **Advanced Features**:
  - Quantum Error Correction (Steane, Shor codes)
  - Noise modeling (depolarizing, amplitude damping, etc.)
  - Quantum ML (VQE, quantum classifiers, kernel methods)
  - Multi-circuit execution and batch processing
- **API Layer**: RESTful API with JWT authentication and rate limiting
- **Real-time**: WebSocket gateways for live updates

## Quick Start

```typescript
import { Circuit } from './src/modules/circuit-engine/circuit';

// Create a Bell state circuit
const circuit = Circuit.builder(2)
  .h(0)
  .cnot(0, 1)
  .build();

// Run simulation
const result = await circuit.execute({ method: 'statevector' });
console.log(result.statevector);
```

## Project Structure

```
src/
├── modules/
│   ├── api/               # REST API & WebSocket layer
│   ├── circuit-engine/    # Core circuit operations
│   ├── gate-library/      # Quantum gates
│   ├── simulation-engines/  # Simulation backends
│   ├── algorithms/        # Quantum algorithms
│   ├── visualization/     # Visualization services
│   ├── advanced-features/ # QEC, noise, ML
│   ├── io/               # Import/export adapters
│   └── performance/       # Optimization & caching
├── tests/                 # Test suites
└── docs/                  # Documentation
```

## License

MIT
