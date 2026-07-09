# Getting Started with casimirQ

## Installation

### Prerequisites

- Node.js 18+ or 20+
- npm 9+ or yarn 1.22+

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/casimirQ.git
cd casimirQ

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run start:dev
```

## Basic Usage

### Creating a Circuit

```typescript
import { Circuit } from './src/modules/circuit-engine/circuit';

// Create a 3-qubit circuit
const circuit = Circuit.builder(3)
  .h(0)           // Hadamard on qubit 0
  .cnot(0, 1)     // CNOT with control 0, target 1
  .cnot(1, 2)     // CNOT with control 1, target 2
  .measure(0)     // Measure qubit 0
  .build();
```

### Running Simulations

```typescript
import { SimulationEnginesService } from './src/modules/simulation-engines/simulation-engines.service';

const enginesService = new SimulationEnginesService();

// Statevector simulation
const result = await enginesService.execute(circuit, {
  method: 'statevector',
  shots: 1024
});

// Access results
console.log('Statevector:', result.statevector);
console.log('Probabilities:', result.probabilities);
console.log('Samples:', result.samples);
```

### Using Different Engines

```typescript
// Clifford simulation (faster for Clifford circuits)
const cliffordResult = await enginesService.execute(circuit, {
  method: 'clifford'
});

// MPS simulation (for large qubit counts)
const mpsResult = await enginesService.execute(circuit, {
  method: 'mps',
  maxBondDimension: 128
});
```

## Authentication

### Obtaining a JWT Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### Using the Token

```bash
curl http://localhost:3000/api/v1/circuits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Examples

### Create a Circuit via API

```bash
curl -X POST http://localhost:3000/api/v1/circuits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Bell State",
    "numQubits": 2,
    "operations": [
      { "gate": "h", "targets": [0] },
      { "gate": "cnot", "targets": [0, 1] }
    ]
  }'
```

### Run Simulation

```bash
curl -X POST http://localhost:3000/api/v1/circuits/:id/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "method": "statevector",
    "shots": 1024
  }'
```

## WebSocket Real-time Updates

Connect to WebSocket for real-time job status:

```javascript
const socket = io('http://localhost:3000/jobs');

// Authenticate
socket.emit('auth:register', { userId: 'your-user-id' });

// Subscribe to job updates
socket.emit('subscribe:job', { jobId: 'job-123' });

// Listen for updates
socket.on('job:status', (data) => {
  console.log('Progress:', data.progress);
  console.log('Status:', data.status);
});

socket.on('job:complete', (data) => {
  console.log('Result:', data.result);
});
```

## Next Steps

- Learn about [Quantum Algorithms](./examples/algorithms.md)
- Explore [Error Correction](./examples/error-correction.md)
- Try [Quantum ML](./examples/quantum-ml.md)
- Read the [API Reference](./api-reference.md)
