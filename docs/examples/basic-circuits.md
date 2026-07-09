# Basic Quantum Circuits Examples

## 1. Bell State (Maximally Entangled)

The Bell state creates a maximally entangled pair of qubits.

```typescript
import { Circuit } from '../../src/modules/circuit-engine/circuit';
import { SimulationEnginesService } from '../../src/modules/simulation-engines/simulation-engines.service';

async function createBellState() {
  // Create a 2-qubit Bell state: |Φ+⟩ = (|00⟩ + |11⟩)/√2
  const circuit = Circuit.builder(2)
    .h(0)        // Put first qubit in superposition
    .cnot(0, 1)  // Entangle with second qubit
    .build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 1024
  });

  console.log('Statevector:', result.statevector);
  // Output: |00⟩: 0.707, |11⟩: 0.707 (approximately)

  console.log('Measurement samples:', result.samples);
  // Output: ~50% |00⟩, ~50% |11⟩
}
```

## 2. GHZ State (Multi-Qubit Entanglement)

The GHZ state is a multi-qubit entangled state.

```typescript
async function createGHZState(n: number = 3) {
  const builder = Circuit.builder(n);

  // Start with |0...0⟩
  // Apply Hadamard to first qubit
  builder.h(0);

  // Cascade CNOTs to entangle all qubits
  for (let i = 0; i < n - 1; i++) {
    builder.cnot(i, i + 1);
  }

  const circuit = builder.build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 1024
  });

  console.log(`GHZ(${n}) statevector:`, result.statevector);
  // Output: Equal superposition of |0...0⟩ and |1...1⟩
}
```

## 3. Quantum Teleportation

Teleport an arbitrary quantum state from Alice to Bob.

```typescript
async function quantumTeleportation() {
  // Create Bell pair between Alice (qubit 1) and Bob (qubit 2)
  // Qubit 0 holds the state to teleport
  const circuit = Circuit.builder(3)
    // Prepare Bell pair
    .h(1)
    .cnot(1, 2)
    // Bell measurement on qubits 0 and 1
    .cnot(0, 1)
    .h(0)
    .measure(0)
    .measure(1)
    // Bob applies corrections based on measurements
    // (classical communication - simulated)
    .build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 1024
  });

  console.log('Teleportation results:', result.samples);
}
```

## 4. Superposition Demo

Create various superposition states.

```typescript
async function superpositionDemo() {
  // |+⟩ state: equal superposition
  const plusState = Circuit.builder(1)
    .h(0)
    .build();

  // |−⟩ state: equal superposition with phase
  const minusState = Circuit.builder(1)
    .x(0)
    .h(0)
    .build();

  // |i+⟩ state: equal superposition with imaginary phase
  const iPlusState = Circuit.builder(1)
    .h(0)
    .s(0)
    .build();

  const engines = new SimulationEnginesService();

  console.log('|+⟩ state:', await engines.execute(plusState, { method: 'statevector' }));
  console.log('|−⟩ state:', await engines.execute(minusState, { method: 'statevector' }));
  console.log('|i+⟩ state:', await engines.execute(iPlusState, { method: 'statevector' }));
}
```

## 5. Controlled Operations

Demonstrate various controlled gates.

```typescript
async function controlledOperations() {
  // Controlled-Z (CZ) creates phase
  const czCircuit = Circuit.builder(2)
    .h(0)
    .h(1)
    .cz(0, 1)  // Controlled-Z
    .h(0)
    .h(1)
    .build();

  // Toffoli (CCNOT) - controlled-controlled-not
  const toffoliCircuit = Circuit.builder(3)
    .x(0)
    .x(1)
    .ccnot(0, 1, 2)  // Flip qubit 2 if qubits 0 and 1 are |1⟩
    .build();

  // SWAP operation
  const swapCircuit = Circuit.builder(2)
    .x(0)        // |01⟩
    .swap(0, 1)  // |10⟩
    .build();

  const engines = new SimulationEnginesService();

  console.log('CZ result:', await engines.execute(czCircuit, { method: 'statevector' }));
  console.log('Toffoli result:', await engines.execute(toffoliCircuit, { method: 'statevector' }));
  console.log('SWAP result:', await engines.execute(swapCircuit, { method: 'statevector' }));
}
```

## 6. Measurement Effects

Show how measurement collapses the state.

```typescript
async function measurementDemo() {
  const circuit = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)  // Create Bell state
    .measure(0)  // Measure first qubit
    .build();

  const engines = new SimulationEnginesService();

  // Run multiple shots to see measurement outcomes
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 100
  });

  // Count outcomes
  const counts: Record<string, number> = {};
  for (const sample of result.samples || []) {
    counts[sample] = (counts[sample] || 0) + 1;
  }

  console.log('Measurement statistics:', counts);
  // Output: ~50% measured 0, ~50% measured 1
  // After measuring qubit 0, qubit 1 is instantly determined
}
```

## 7. Rotation Gates

Use rotation gates for arbitrary single-qubit operations.

```typescript
async function rotationDemo() {
  // Arbitrary rotation around Bloch sphere
  const rotationCircuit = Circuit.builder(1)
    .rx(0, Math.PI / 4)   // Rotate around X by π/4
    .ry(0, Math.PI / 3)  // Rotate around Y by π/3
    .rz(0, Math.PI / 6)  // Rotate around Z by π/6
    .build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(rotationCircuit, {
    method: 'statevector',
    shots: 1024
  });

  console.log('Rotation result:', result.statevector);
}
```

## 8. Reversing Circuits

Demonstrate circuit reversal for uncomputation.

```typescript
async function circuitReversal() {
  // Create a circuit
  const forward = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .s(0)
    .build();

  // Reverse it
  const reversed = forward.reverse();

  const engines = new SimulationEnginesService();

  // Forward then reverse should return to initial state
  console.log('Forward:', forward.operations.length, 'operations');
  console.log('Reversed:', reversed.operations.length, 'operations');
  console.log('Operations match:', reversed.operations[0].gate === forward.operations[forward.operations.length - 1].gate);
}
```

## 9. Composing Circuits

Combine multiple circuits.

```typescript
async function circuitComposition() {
  // Create Bell state preparation
  const bellPrep = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .build();

  // Create measurement circuit
  const measurement = Circuit.builder(2)
    .measure(0)
    .measure(1)
    .build();

  // Compose: preparation followed by measurement
  const fullCircuit = bellPrep.append(measurement);

  const engines = new SimulationEnginesService();
  const result = await engines.execute(fullCircuit, {
    method: 'statevector',
    shots: 100
  });

  console.log('Composed circuit samples:', result.samples);
}
```

## 10. API Example: Create Circuit via REST

Using the API to create and simulate a circuit.

```bash
# Step 1: Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "demo"}' \
  | jq -r '.access_token')

# Step 2: Create circuit
CIRCUIT_ID=$(curl -s -X POST http://localhost:3000/api/v1/circuits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Bell State via API",
    "numQubits": 2,
    "operations": [
      { "gate": "h", "targets": [0] },
      { "gate": "cnot", "targets": [0, 1] }
    ]
  }' | jq -r '.id')

echo "Created circuit: $CIRCUIT_ID"

# Step 3: Run simulation
JOB_ID=$(curl -s -X POST "http://localhost:3000/api/v1/circuits/$CIRCUIT_ID/simulate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "method": "statevector",
    "shots": 1024
  }' | jq -r '.jobId')

echo "Simulation job: $JOB_ID"

# Step 4: Check job status
curl -s "http://localhost:3000/api/v1/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Running the Examples

```bash
# Run individual examples
npx ts-node -e "$(cat docs/examples/bell-state.ts)"

# Or create a script and run it
npm run example:basic
```
