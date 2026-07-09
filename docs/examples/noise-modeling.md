# Noise Modeling Examples

## 1. Depolarizing Channel

The depolarizing channel models general errors where a qubit becomes completely mixed.

```typescript
import { NoiseModelingService } from '../../src/modules/advanced-features/services/noise-modeling.service';
import { Circuit } from '../../src/modules/circuit-engine/circuit';
import { SimulationEnginesService } from '../../src/modules/simulation-engines/simulation-engines.service';

async function depolarizingChannelExample() {
  const noiseService = new NoiseModelingService();
  const engines = new SimulationEnginesService();

  // Create a Bell state
  const circuit = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .build();

  // Apply depolarizing noise
  const noisyCircuit = await noiseService.applyDepolarizingNoise({
    circuit,
    probability: 0.1,  // 10% depolarizing probability
    targets: [0, 1]  // Apply to both qubits
  });

  // Simulate and compare
  const idealResult = await engines.execute(circuit, {
    method: 'density_matrix',
    shots: 1024
  });

  const noisyResult = await engines.execute(noisyCircuit, {
    method: 'density_matrix',
    shots: 1024
  });

  // Calculate fidelity
  const fidelity = noiseService.calculateFidelity(
    idealResult.densityMatrix,
    noisyResult.densityMatrix
  );

  console.log('Ideal fidelity: 1.0');
  console.log('Noisy fidelity:', fidelity);
  // With p=0.1 depolarizing, fidelity decreases
}
```

## 2. Amplitude Damping (T₁ Relaxation)

Models energy relaxation where |1⟩ decays to |0⟩.

```typescript
async function amplitudeDampingExample() {
  const noiseService = new NoiseModelingService();

  // Prepare |1⟩ state
  const circuit = Circuit.builder(1)
    .x(0)  // |1⟩
    .build();

  // Apply amplitude damping with T₁ = 100μs
  // γ = 1 - exp(-t/T₁)
  const gamma = 0.1;  // 10% decay probability

  const noisyCircuit = await noiseService.applyAmplitudeDamping({
    circuit,
    gamma,
    targets: [0]
  });

  const engines = new SimulationEnginesService();
  const result = await engines.execute(noisyCircuit, {
    method: 'density_matrix',
    shots: 1000
  });

  // Probability of measuring |0⟩ should be ~γ
  const zeroProbability = result.probabilities?.['0'] || 0;
  console.log('P(|0⟩) after damping:', zeroProbability);
  console.log('Expected:', gamma);

  // T₁ coherence time estimation
  const t1 = 100e-6;  // 100 microseconds
  const t = 10e-6;    // Evolution time
  const expectedGamma = 1 - Math.exp(-t / t1);
  console.log('Expected γ from T₁:', expectedGamma);
}
```

## 3. Phase Damping (T₂ Dephasing)

Models loss of phase coherence without energy relaxation.

```typescript
async function phaseDampingExample() {
  const noiseService = new NoiseModelingService();

  // Prepare |+⟩ state
  const circuit = Circuit.builder(1)
    .h(0)  // |+⟩ = (|0⟩ + |1⟩)/√2
    .build();

  // Apply phase damping
  const gamma = 0.2;  // 20% dephasing

  const noisyCircuit = await noiseService.applyPhaseDamping({
    circuit,
    gamma,
    targets: [0]
  });

  const engines = new SimulationEnginesService();
  const result = await engines.execute(noisyCircuit, {
    method: 'density_matrix',
    shots: 1000
  });

  // Check off-diagonal elements (coherence)
  console.log('Density matrix:', result.densityMatrix);

  // T₂ coherence time
  const t2 = 50e-6;   // 50 microseconds
  const t = 10e-6;
  const expectedGamma = 1 - Math.exp(-t / t2);
  console.log('Expected γ from T₂:', expectedGamma);
}
```

## 4. Bit-Flip and Phase-Flip Channels

Specific error models for bit and phase errors.

```typescript
async function bitFlipPhaseFlipExample() {
  const noiseService = new NoiseModelingService();

  // Prepare superposition
  const circuit = Circuit.builder(1)
    .h(0)
    .build();

  // Bit-flip channel (like classical bit flip)
  const bitFlipCircuit = await noiseService.applyBitFlipNoise({
    circuit,
    probability: 0.1,
    targets: [0]
  });

  // Phase-flip channel (unique to quantum)
  const phaseFlipCircuit = await noiseService.applyPhaseFlipNoise({
    circuit,
    probability: 0.1,
    targets: [0]
  });

  const engines = new SimulationEnginesService();

  const bitFlipResult = await engines.execute(bitFlipCircuit, {
    method: 'density_matrix',
    shots: 1000
  });

  const phaseFlipResult = await engines.execute(phaseFlipCircuit, {
    method: 'density_matrix',
    shots: 1000
  });

  console.log('Bit-flip: Changes measurement probabilities');
  console.log('Phase-flip: Destroys superposition coherence');
}
```

## 5. Custom Kraus Operators

Define custom noise channels using Kraus operators.

```typescript
async function customKrausOperatorsExample() {
  const noiseService = new NoiseModelingService();

  // Define custom noise channel
  // Example: Generalized amplitude damping (finite temperature)
  const krausOperators = [
    // E₀ = √(1-p) |0⟩⟨0| + √(1-p-γ) |1⟩⟨1|
    {
      matrix: [[Math.sqrt(0.9), 0], [0, Math.sqrt(0.8)]],
      name: 'E0'
    },
    // E₁ = √γ |0⟩⟨1|
    {
      matrix: [[0, Math.sqrt(0.1)], [0, 0]],
      name: 'E1'
    }
  ];

  const circuit = Circuit.builder(1).x(0).build();

  const noisyCircuit = await noiseService.applyKrausOperators({
    circuit,
    operators: krausOperators,
    targets: [0]
  });

  console.log('Custom Kraus operators applied');
}
```

## 6. Gate-Level Noise

Apply noise after specific gates.

```typescript
async function gateLevelNoiseExample() {
  const noiseService = new NoiseModelingService();

  // Define gate-specific noise
  const gateNoise = {
    h: { depolarizing: 0.01 },      // 1% error on Hadamard
    cnot: { depolarizing: 0.02 },   // 2% error on CNOT
    measure: { bitFlip: 0.001 }     // 0.1% readout error
  };

  const circuit = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .measure(0)
    .measure(1)
    .build();

  const noisyCircuit = await noiseService.applyGateLevelNoise({
    circuit,
    gateNoise
  });

  console.log('Gate-level noise applied');
  console.log('H gate: 1% depolarizing');
  console.log('CNOT: 2% depolarizing');
  console.log('Measure: 0.1% bit-flip');
}
```

## 7. Noise Characterization

Characterize noise using process tomography.

```typescript
async function noiseCharacterizationExample() {
  const noiseService = new NoiseModelingService();

  // Prepare set of circuits for gate set tomography
  const testCircuits = [
    Circuit.builder(1).build(),           // Identity
    Circuit.builder(1).x(0).build(),      // X
    Circuit.builder(1).h(0).build(),      // H
    Circuit.builder(1).h(0).s(0).build()  // HS
  ];

  // Run process tomography
  const characterization = await noiseService.characterizeGateSet({
    circuits: testCircuits,
    method: 'gate_set_tomography'
  });

  console.log('Process matrix (χ matrix):', characterization.processMatrix);
  console.log('Average gate fidelity:', characterization.averageFidelity);
  console.log('Error budget:', characterization.errorBudget);

  // Extract coherence times
  const t1 = characterization.coherenceTimes.T1;
  const t2 = characterization.coherenceTimes.T2;

  console.log('T₁:', t1, 'seconds');
  console.log('T₂:', t2, 'seconds');
  console.log('T₂/T₁ ratio:', t2 / t1);
}
```

## 8. Noise-Aware Compilation

Optimize circuits considering noise.

```typescript
async function noiseAwareCompilationExample() {
  const noiseService = new NoiseModelingService();

  // Circuit to optimize
  const circuit = Circuit.builder(3)
    .h(0)
    .cnot(0, 1)
    .cnot(1, 2)
    .cnot(0, 2)
    .h(0)
    .build();

  // Hardware noise model
  const noiseModel = {
    singleQubit: { depolarizing: 0.001 },
    twoQubit: { depolarizing: 0.01 },
    readout: { bitFlip: 0.02 },
    qubitSpecific: {
      0: { T1: 100e-6, T2: 50e-6 },
      1: { T1: 80e-6, T2: 40e-6 },
      2: { T1: 120e-6, T2: 60e-6 }
    }
  };

  // Optimize with noise awareness
  const optimized = await noiseService.optimizeForNoise({
    circuit,
    noiseModel,
    strategy: 'minimize_error'  // or 'maximize_fidelity'
  });

  console.log('Original depth:', circuit.operations.length);
  console.log('Optimized depth:', optimized.operations.length);
  console.log('Expected fidelity improvement:', optimized.improvement);
}
```

## 9. Error Mitigation

Techniques to reduce error impact.

```typescript
async function errorMitigationExample() {
  const noiseService = new NoiseModelingService();

  // Zero-noise extrapolation
  const circuit = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .rz(0, Math.PI / 4)
    .cnot(0, 1)
    .h(0)
    .build();

  // Run with different noise scaling factors
  const results = [];
  for (const scale of [1, 2, 3]) {
    const scaledNoise = await noiseService.scaleNoise({
      circuit,
      scaleFactor: scale
    });

    const engines = new SimulationEnginesService();
    const result = await engines.execute(scaledNoise, {
      method: 'density_matrix',
      shots: 1000
    });

    results.push({ scale, expectation: result.expectationValue });
  }

  // Extrapolate to zero noise
  const extrapolated = noiseService.extrapolateToZeroNoise(results);
  console.log('Zero-noise extrapolated result:', extrapolated);

  // Probabilistic error cancellation
  const mitigated = await noiseService.probabilisticErrorCancellation({
    circuit,
    noiseModel: { depolarizing: 0.01 }
  });

  console.log('Error-mitigated result:', mitigated);
}
```

## 10. API Usage: Noise Modeling

```bash
# Get available noise channels
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email": "demo@example.com", "password": "demo"}' \
  | jq -r '.access_token')

curl http://localhost:3000/api/v1/advanced/noise/channels \
  -H "Authorization: Bearer $TOKEN"

# Apply noise to circuit
curl -X POST http://localhost:3000/api/v1/advanced/noise/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "circuitId": "circuit-123",
    "channels": [
      {
        "type": "depolarizing",
        "params": { "probability": 0.01 },
        "targets": [0, 1]
      },
      {
        "type": "amplitudeDamping",
        "params": { "gamma": 0.05 },
        "targets": [0]
      }
    ]
  }'

# Characterize noise
curl -X POST http://localhost:3000/api/v1/advanced/noise/characterize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "circuitId": "noisy-circuit-456",
    "method": "gate"
  }'
```

## Noise Channel Summary

| Channel | Kraus Operators | Physical Meaning |
|---------|----------------|------------------|
| Depolarizing | {√(1-3p/4)I, √(p/4)X, √(p/4)Y, √(p/4)Z} | General error |
| Amplitude Damping | {\|0⟩⟨0\|+√(1-γ)\|1⟩⟨1\|, √γ\|0⟩⟨1\|} | T₁ relaxation |
| Phase Damping | {\|0⟩⟨0\|, √(1-γ)\|1⟩⟨1\|} | T₂ dephasing |
| Bit-Flip | {√(1-p)I, √pX} | Classical bit flip |
| Phase-Flip | {√(1-p)I, √pZ} | Phase reversal |

## Physical Parameters

| Parameter | Symbol | Typical Value | Description |
|-----------|--------|---------------|-------------|
| T₁ | ~100 μs | Energy relaxation time |
| T₂ | ~50 μs | Dephasing time |
| Gate time | ~10 ns | Single-qubit gate duration |
| CNOT time | ~100 ns | Two-qubit gate duration |
| Readout time | ~1 μs | Measurement duration |
| Gate fidelity | ~99.9% | Single-qubit gate accuracy |
| CNOT fidelity | ~99% | Two-qubit gate accuracy |
| Readout fidelity | ~98% | Measurement accuracy |
