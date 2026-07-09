# casimirQ Architecture

## Overview

casimirQ is built on a modular NestJS architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │  REST    │ │ WebSocket│ │  Guards  │ │   Auth   │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Circuit   │ │ Simulation  │ │  Advanced   │           │
│  │   Engine    │ │  Engines    │ │  Features   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Algorithms│ │Visualization│ │     IO      │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Core Services                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │   Gate   │ │ Circuit  │ │  State   │ │  Matrix  │     │
│  │ Library  │ │ Builder  │ │Management│ │Operations│     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

### 1. Circuit Engine (`circuit-engine`)

**Responsibility**: Core circuit construction and manipulation

**Key Classes:**
- `Circuit`: Immutable circuit representation
- `CircuitBuilder`: Fluent API for circuit construction
- `Operation`: Gate application record

**Features:**
- Immutable circuit operations (functional style)
- Operation history tracking
- Circuit composition and reversal

### 2. Gate Library (`gate-library`)

**Responsibility**: Quantum gate definitions and operations

**Key Classes:**
- `GateRegistry`: Global gate registration
- `GateLibraryService`: Gate metadata and matrices
- `SingleQubitGates`: H, X, Y, Z, S, T, rotations
- `MultiQubitGates`: CNOT, CZ, SWAP, Toffoli

**Features:**
- Extensible gate system
- Standard gate matrices
- Parameterized rotations

### 3. Simulation Engines (`simulation-engines`)

**Responsibility**: Multiple simulation backends

**Key Classes:**
- `SimulationEnginesService`: Engine selection and routing
- `StatevectorEngine`: Full statevector simulation
- `CliffordEngine`: Stabilizer simulation
- `MPSEngine`: Tensor network simulation

**Features:**
- Automatic engine selection
- Measurement support
- Shot-based sampling

### 4. Visualization (`visualization`)

**Responsibility**: Circuit and result visualization

**Key Classes:**
- `BlochSphereService`: Bloch sphere rendering
- `CircuitDiagramService`: Circuit diagram generation
- `ObservabilityService`: Measurement effects
- `VisualizationGateway`: Real-time streaming

**Features:**
- Interactive Bloch spheres
- SVG circuit diagrams
- 3D state visualizations

### 5. Advanced Features (`advanced-features`)

**Responsibility**: QEC, noise, ML, batch execution

**Key Classes:**
- `ErrorCorrectionService`: QEC encoding/decoding
- `NoiseModelingService`: Noise channel application
- `QuantumMLService`: VQE, classifiers, kernels
- `MultiCircuitExecutionService`: Batch and pipeline execution

**Features:**
- Steane and Shor codes
- Depolarizing, amplitude damping noise
- Variational quantum algorithms
- Distributed task scheduling

### 6. Algorithms (`algorithms`)

**Responsibility**: Pre-built quantum algorithms

**Key Classes:**
- `GroversSearch`: Quantum search algorithm
- `ShorsAlgorithm`: Integer factorization
- `QuantumFourierTransform`: QFT implementation
- `QuantumTeleportation`: Teleportation protocol
- `VQEAlgorithm`: Variational eigensolver
- `QAOA`: Quantum approximate optimization

### 7. IO (`io`)

**Responsibility**: Circuit import/export

**Key Classes:**
- `OpenQASMAdapter`: OpenQASM format
- `QiskitAdapter`: IBM Qiskit format
- `CirqAdapter`: Google Cirq format
- `QuilAdapter`: Rigetti Quil format
- `IonQAdapter`: IonQ native format

### 8. Performance (`performance`)

**Responsibility**: Optimization and caching

**Key Classes:**
- `CacheService`: Result caching
- `CircuitOptimizerService`: Gate optimization
- `ProfilingService`: Performance monitoring

### 9. API (`api`)

**Responsibility**: REST and WebSocket interfaces

**Key Classes:**
- `CircuitsController`: Circuit CRUD
- `SimulationController`: Simulation endpoints
- `AdvancedFeaturesController`: QEC, noise, ML
- `JwtAuthGuard`: Authentication
- `RateLimitGuard`: Rate limiting
- `VisualizationGateway`: Real-time updates
- `JobsGateway`: Job status streaming

## Design Patterns

### 1. Strategy Pattern
Simulation engines implement a common interface:
```typescript
interface SimulationEngine {
  execute(circuit: Circuit, options: Options): Promise<Result>;
  supports(circuit: Circuit): boolean;
}
```

### 2. Builder Pattern
Circuit construction uses fluent builder:
```typescript
Circuit.builder(2)
  .h(0)
  .cnot(0, 1)
  .build()
```

### 3. Factory Pattern
Gate creation through registry:
```typescript
const gate = GateRegistry.getGate('h');
```

### 4. Observer Pattern
WebSocket gateways for real-time updates:
```typescript
socket.on('circuit:update', handler);
```

### 5. Decorator Pattern
NestJS decorators for metadata:
```typescript
@Controller('api/v1/circuits')
@UseGuards(JwtAuthGuard)
```

## Data Flow

### Circuit Creation Flow
```
Client → CircuitsController → CircuitEngine → Circuit
                                    ↓
                              GateLibrary (validate gates)
```

### Simulation Flow
```
Client → SimulationController → SimulationEnginesService
                                       ↓
                              ┌────────┴────────┐
                              ↓                 ↓
                        StatevectorEngine   CliffordEngine
                              ↓                 ↓
                         Result (statevector)  Result (samples)
```

### Advanced Feature Flow
```
Client → AdvancedFeaturesController → Service
                                           ↓
                                    ErrorCorrectionService
                                    NoiseModelingService
                                    QuantumMLService
```

## Security

### Authentication Flow
1. Client POST `/api/v1/auth/login` with credentials
2. Server validates and returns JWT
3. Client includes JWT in Authorization header
4. `JwtAuthGuard` validates token on each request

### Rate Limiting
- In-memory store (Redis recommended for production)
- 100 requests/minute per user per endpoint
- Configurable limits per endpoint

## Scalability

### Horizontal Scaling
- Stateless API layer (multiple instances)
- Shared cache (Redis)
- Job queue for simulations (Redis/Bull)

### Performance Optimizations
- Circuit result caching
- Gate cancellation optimization
- Automatic engine selection
- Lazy loading of modules

## Error Handling

### Exception Hierarchy
```
HttpException
├── BadRequestException (400)
├── UnauthorizedException (401)
├── ForbiddenException (403)
├── NotFoundException (404)
└── InternalServerErrorException (500)
```

### Circuit Errors
- Invalid gate applications
- Qubit index out of range
- Incompatible operations

### Simulation Errors
- Engine not supported
- Memory exhaustion
- Timeout

## Testing Strategy

### Unit Tests
- Individual service tests
- Mocked dependencies
- Fast feedback loop

### Integration Tests
- Full module integration
- Database interactions
- External service mocks

### End-to-End Tests
- Full API workflows
- WebSocket connections
- Performance benchmarks

## Technology Stack

- **Framework**: NestJS (TypeScript)
- **Testing**: Jest
- **Documentation**: Markdown
- **Real-time**: Socket.io
- **Validation**: class-validator
- **API**: REST + WebSocket

## Future Extensions

1. **Hardware Integration**: QPU backends via cloud providers
2. **Distributed Simulation**: MPI-based parallel simulation
3. **Quantum Cloud**: Multi-tenant SaaS platform
4. **ML Integration**: PyTorch/TensorFlow quantum layers
5. **Advanced Visualization**: WebGL-based 3D state visualization
