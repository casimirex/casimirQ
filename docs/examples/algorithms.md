# Quantum Algorithms Examples

## 1. Grover's Search Algorithm

Grover's algorithm provides a quadratic speedup for searching unsorted databases.

```typescript
import { Circuit } from '../../src/modules/circuit-engine/circuit';
import { SimulationEnginesService } from '../../src/modules/simulation-engines/simulation-engines.service';

async function groversSearchExample() {
  // Search for marked item in 4-element database (2 qubits)
  const n = 2;  // Number of qubits
  const markedItem = '11';  // Item to search for

  // Create Grover's search circuit
  const circuit = Circuit.builder(n)
    // Initialize superposition
    .h(0)
    .h(1)
    // Oracle (marks the target)
    .ccz(0, 1, markedItem === '11' ? [0, 1] : [])
    // Diffusion operator
    .h(0)
    .h(1)
    .x(0)
    .x(1)
    .cz(0, 1)
    .x(0)
    .x(1)
    .h(0)
    .h(1)
    .measure(0)
    .measure(1)
    .build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 100
  });

  // Count results
  const counts: Record<string, number> = {};
  for (const sample of result.samples || []) {
    counts[sample] = (counts[sample] || 0) + 1;
  }

  console.log('Grover search results:', counts);
  console.log(`Target '${markedItem}' should have highest probability`);
}
```

## 2. Shor's Algorithm (Period Finding)

Shor's algorithm factors integers exponentially faster than classical algorithms.

```typescript
async function shorsAlgorithmExample() {
  // Factor N = 15 using Shor's algorithm
  // This is a simplified example

  const circuit = Circuit.builder(8)  // 4 top qubits + 4 bottom qubits
    // Initialize top register to superposition
    .h(0)
    .h(1)
    .h(2)
    .h(3)
    // Modular exponentiation (simplified)
    .cnot(0, 4)
    .cnot(1, 5)
    // Inverse QFT on top register
    .swap(0, 3)
    .swap(1, 2)
    .measure(0)
    .measure(1)
    .measure(2)
    .measure(3)
    .build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 100
  });

  console.log('Shor algorithm samples:', result.samples);
  // Classical post-processing would determine factors from period
}
```

## 3. Quantum Fourier Transform (QFT)

QFT is the quantum analogue of the discrete Fourier transform.

```typescript
async function quantumFourierTransformExample() {
  // QFT on 3 qubits
  const circuit = Circuit.builder(3)
    // State preparation (example: |101⟩)
    .x(0)
    .x(2)
    // QFT
    .h(0)
    .crz(0, 1, Math.PI / 2)
    .crz(0, 2, Math.PI / 4)
    .h(1)
    .crz(1, 2, Math.PI / 2)
    .h(2)
    // QFT puts qubits in reverse order, so swap
    .swap(0, 2)
    .measure(0)
    .measure(1)
    .measure(2)
    .build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 100
  });

  console.log('QFT results:', result.samples);
}
```

## 4. Variational Quantum Eigensolver (VQE)

VQE finds the ground state energy of a Hamiltonian.

```typescript
import { QuantumMLService } from '../../src/modules/advanced-features/services/quantum-ml.service';

async function vqeExample() {
  const mlService = new QuantumMLService();

  // Define a simple Hamiltonian (H = Z⊗Z + X⊗I + I⊗X)
  const hamiltonian = [
    [1, 0, 0, 0],
    [0, -1, 0, 0],
    [0, 0, -1, 0],
    [0, 0, 0, 1]
  ];

  // Run VQE
  const result = await mlService.runVQE({
    hamiltonian,
    ansatz: 'hardware_efficient',
    optimizer: 'COBYLA',
    maxIterations: 100
  });

  console.log('VQE result:', {
    groundStateEnergy: result.energy,
    optimalParameters: result.parameters,
    iterations: result.iterations
  });
}
```

## 5. Quantum Approximate Optimization Algorithm (QAOA)

QAOA solves combinatorial optimization problems.

```typescript
async function qaoaExample() {
  // Max-Cut on a simple graph
  // Nodes: 0, 1, 2
  // Edges: (0,1), (1,2), (0,2)

  const p = 1;  // Number of QAOA layers

  const circuit = Circuit.builder(3)
    // Initial superposition
    .h(0)
    .h(1)
    .h(2)
    // Cost Hamiltonian (Z⊗Z terms for edges)
    .rz(0, 0.5)  // γ * weight
    .rz(1, 0.5)
    .rz(2, 0.5)
    // Mixer Hamiltonian (X rotations)
    .rx(0, 0.3)  // β
    .rx(1, 0.3)
    .rx(2, 0.3)
    .measure(0)
    .measure(1)
    .measure(2)
    .build();

  const engines = new SimulationEnginesService();

  // Run multiple times to find best cut
  let bestCut = '';
  let bestValue = -Infinity;

  for (let i = 0; i < 100; i++) {
    const result = await engines.execute(circuit, {
      method: 'statevector',
      shots: 1
    });

    const cut = result.samples?.[0] || '000';
    const value = evaluateMaxCut(cut);

    if (value > bestValue) {
      bestValue = value;
      bestCut = cut;
    }
  }

  console.log('QAOA Max-Cut result:', bestCut, 'with value:', bestValue);
}

function evaluateMaxCut(assignment: string): number {
  // Evaluate cut value for triangle graph
  const bits = assignment.split('').map(b => parseInt(b));
  let value = 0;
  // Edges: (0,1), (1,2), (0,2)
  if (bits[0] !== bits[1]) value++;
  if (bits[1] !== bits[2]) value++;
  if (bits[0] !== bits[2]) value++;
  return value;
}
```

## 6. Quantum Phase Estimation

Estimates the eigenvalue of a unitary operator.

```typescript
async function quantumPhaseEstimationExample() {
  // Phase estimation with 3 counting qubits
  const circuit = Circuit.builder(4)  // 3 counting + 1 eigenstate
    // Initialize eigenstate |1⟩ on qubit 3
    .x(3)
    // Initialize counting register to superposition
    .h(0)
    .h(1)
    .h(2)
    // Controlled-U operations (powers of 2)
    .cu(0, 3, Math.PI / 4)       // U^(2^0)
    .cu(1, 3, Math.PI / 2)       // U^(2^1)
    .cu(2, 3, Math.PI)           // U^(2^2)
    // Inverse QFT on counting register
    .swap(0, 2)
    .h(0)
    .crz(0, 1, -Math.PI / 2)
    .h(1)
    .crz(1, 2, -Math.PI / 2)
    .crz(0, 2, -Math.PI / 4)
    .h(2)
    .measure(0)
    .measure(1)
    .measure(2)
    .build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 100
  });

  console.log('Phase estimation results:', result.samples);
  // The measured value corresponds to phase φ where U|ψ⟩ = e^(2πiφ)|ψ⟩
}
```

## 7. Deutsch-Jozsa Algorithm

Determines if a function is constant or balanced.

```typescript
async function deutschJozsaExample() {
  // Test if function f: {0,1}^2 → {0,1} is constant or balanced

  const circuit = Circuit.builder(3)
    // Initialize last qubit to |1⟩
    .x(2)
    // Apply Hadamard to all qubits
    .h(0)
    .h(1)
    .h(2)
    // Oracle (example: balanced function)
    // f(x) = x0 XOR x1
    .cnot(0, 2)
    .cnot(1, 2)
    // Apply Hadamard to input qubits
    .h(0)
    .h(1)
    .measure(0)
    .measure(1)
    .build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 100
  });

  console.log('Deutsch-Jozsa results:', result.samples);
  // If result is |00⟩, function is constant
  // If result is anything else, function is balanced
}
```

## 8. Bernstein-Vazirani Algorithm

Finds a hidden bit string in one query.

```typescript
async function bernsteinVaziraniExample() {
  // Find secret string s = "101"
  const secretString = '101';
  const n = secretString.length;

  const builder = Circuit.builder(n + 1);

  // Initialize
  builder.x(n);

  // Apply Hadamard to all qubits
  for (let i = 0; i <= n; i++) {
    builder.h(i);
  }

  // Oracle: applies CNOT for each '1' in secret string
  for (let i = 0; i < n; i++) {
    if (secretString[i] === '1') {
      builder.cnot(i, n);
    }
  }

  // Apply Hadamard to input qubits
  for (let i = 0; i < n; i++) {
    builder.h(i);
  }

  // Measure input qubits
  for (let i = 0; i < n; i++) {
    builder.measure(i);
  }

  const circuit = builder.build();

  const engines = new SimulationEnginesService();
  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 1
  });

  console.log('Bernstein-Vazirani result:', result.samples);
  // Should measure exactly the secret string
}
```

## 9. Simon's Algorithm

Finds the period of a function with promise.

```typescript
async function simonsAlgorithmExample() {
  // Find period s of function f where f(x) = f(y) iff x ⊕ y = s
  const n = 3;
  const period = '110';  // Secret period to find

  const circuit = Circuit.builder(2 * n)
    // Initialize first register to superposition
    .h(0)
    .h(1)
    .h(2)
    // Oracle (simulated - would compute f(x))
    // For demonstration, we apply CNOTs based on period
    .cnot(0, 3)
    .cnot(1, 4)
    .cnot(2, 5)
    // Measure second register (collapses to f(x))
    .measure(3)
    .measure(4)
    .measure(5)
    // Apply Hadamard to first register
    .h(0)
    .h(1)
    .h(2)
    .measure(0)
    .measure(1)
    .measure(2)
    .build();

  const engines = new SimulationEnginesService();

  // Run multiple times to gather linear equations
  const results: string[] = [];
  for (let i = 0; i < 10; i++) {
    const result = await engines.execute(circuit, {
      method: 'statevector',
      shots: 1
    });
    results.push(result.samples?.[0]?.substring(0, 3) || '000');
  }

  console.log('Simon algorithm measurements:', results);
  // Each result y satisfies y · s = 0 (mod 2)
  // Classical post-processing finds s
}
```

## 10. API Usage: Run Algorithm

```bash
# Run VQE via API
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "demo"}' \
  | jq -r '.access_token')

curl -X POST http://localhost:3000/api/v1/advanced/ml/vqe/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "hamiltonian": [[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]],
    "ansatz": "hardware_efficient",
    "optimizer": "COBYLA",
    "maxIterations": 100
  }'
```

## Performance Comparison

| Algorithm | Classical | Quantum | Speedup |
|-----------|-----------|---------|---------|
| Grover's Search | O(N) | O(√N) | Quadratic |
| Shor's Algorithm | O(exp(log³N)) | O(log³N) | Exponential |
| Simon's Algorithm | O(2^(n/2)) | O(n) | Exponential |
| Deutsch-Jozsa | O(2^(n-1) + 1) | O(1) | Exponential |
