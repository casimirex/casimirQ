# Quantum Error Correction Examples

## 1. Steane Code [[7,1,3]]

The Steane code encodes 1 logical qubit into 7 physical qubits and corrects any single-qubit error.

```typescript
import { ErrorCorrectionService } from '../../src/modules/advanced-features/services/error-correction.service';
import { Circuit } from '../../src/modules/circuit-engine/circuit';

async function steaneCodeExample() {
  const qecService = new ErrorCorrectionService();

  // Create a simple circuit
  const dataQubit = Circuit.builder(1)
    .h(0)
    .build();

  // Encode with Steane code
  const encoded = await qecService.encodeSteane({
    circuit: dataQubit,
    logicalQubits: [0]
  });

  console.log('Steane code encoding:');
  console.log('- Physical qubits:', encoded.physicalQubits);
  console.log('- Logical qubits:', encoded.logicalQubits);
  console.log('- Ancilla qubits:', encoded.ancillaQubits);

  // Simulate an error on one physical qubit
  const withError = await qecService.applyError(encoded.encodedCircuit, {
    type: 'X',
    qubit: 3  // Error on physical qubit 3
  });

  // Measure syndrome
  const syndrome = await qecService.measureSyndrome({
    circuit: withError,
    stabilizers: [
      'XXXXXXX',  // X stabilizers
      'XXZZZZZ'   // Z stabilizers
    ]
  });

  console.log('Syndrome measurement:', syndrome);

  // Correct error based on syndrome
  const corrected = await qecService.correctError({
    circuit: withError,
    syndrome: syndrome.syndrome
  });

  console.log('Error corrected:', corrected.success);
}
```

## 2. Shor Code [[9,1,3]]

The Shor code protects against arbitrary single-qubit errors using 9 physical qubits.

```typescript
async function shorCodeExample() {
  const qecService = new ErrorCorrectionService();

  // Encode with Shor code
  const dataQubit = Circuit.builder(1)
    .x(0)  // Prepare |1⟩
    .build();

  const encoded = await qecService.encodeShor({
    circuit: dataQubit,
    logicalQubits: [0]
  });

  console.log('Shor code encoding:');
  console.log('- 9 physical qubits used');
  console.log('- Corrects 1 arbitrary error');
  console.log('- Distance: 3');

  // Apply phase error (Z error)
  const withPhaseError = await qecService.applyError(encoded.encodedCircuit, {
    type: 'Z',
    qubit: 5
  });

  // Shor code measures both X and Z syndromes
  const syndrome = await qecService.measureShorSyndrome({
    circuit: withPhaseError
  });

  console.log('Phase error syndrome:', syndrome);

  // Correct the error
  const corrected = await qecService.correctShorError({
    circuit: withPhaseError,
    syndrome: syndrome
  });

  // Verify correction
  console.log('Logical state preserved:', corrected.logicalState);
}
```

## 3. Syndrome Measurement

Measuring stabilizers without disturbing encoded information.

```typescript
async function syndromeMeasurementExample() {
  const qecService = new ErrorCorrectionService();

  // Create Steane-encoded state
  const logicalZero = await qecService.prepareSteaneLogicalZero();

  // Measure X stabilizers (detects Z errors)
  const xSyndrome = await qecService.measureStabilizer({
    circuit: logicalZero,
    stabilizer: 'XXXXXXX',
    type: 'X'
  });

  // Measure Z stabilizers (detects X errors)
  const zSyndrome = await qecService.measureStabilizer({
    circuit: logicalZero,
    stabilizer: 'ZZZZZZZ',
    type: 'Z'
  });

  console.log('X syndrome (Z error detection):', xSyndrome);
  console.log('Z syndrome (X error detection):', zSyndrome);

  // Full syndrome combines both
  const fullSyndrome = xSyndrome + zSyndrome;
  console.log('Full syndrome:', fullSyndrome);
}
```

## 4. Error Correction Procedure

Complete error correction workflow.

```typescript
async function errorCorrectionWorkflow() {
  const qecService = new ErrorCorrectionService();

  // Step 1: Prepare logical state
  const logicalState = await qecService.prepareSteaneLogicalPlus();

  // Step 2: Introduce random error
  const errorTypes = ['X', 'Y', 'Z'];
  const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
  const randomQubit = Math.floor(Math.random() * 7);

  console.log(`Injecting ${randomError} error on qubit ${randomQubit}`);

  const withError = await qecService.applyError(logicalState, {
    type: randomError,
    qubit: randomQubit
  });

  // Step 3: Measure syndrome
  const syndrome = await qecService.measureSyndrome({
    circuit: withError,
    stabilizers: ['XXXXXXX', 'ZZZZZZZ']
  });

  console.log('Measured syndrome:', syndrome.syndrome);

  // Step 4: Determine error location
  const errorLocation = await qecService.decodeSyndrome({
    code: 'steane',
    syndrome: syndrome.syndrome
  });

  console.log('Detected error:', errorLocation);

  // Step 5: Apply correction
  const corrected = await qecService.applyCorrection({
    circuit: withError,
    errorLocation: errorLocation,
    errorType: errorLocation.type
  });

  // Step 6: Verify
  const verification = await qecService.verifyCorrection({
    original: logicalState,
    corrected: corrected
  });

  console.log('Correction verified:', verification.success);
}
```

## 5. Logical Operations

Performing gates on logical qubits.

```typescript
async function logicalOperationsExample() {
  const qecService = new ErrorCorrectionService();

  // Prepare two logical qubits
  const logical0 = await qecService.prepareSteaneLogicalZero();
  const logical1 = await qecService.prepareSteaneLogicalZero();

  // Logical Hadamard: Apply H to all physical qubits
  const logicalH = await qecService.applyLogicalGate({
    circuit: logical0,
    gate: 'H',
    logicalQubits: [0]
  });

  console.log('Logical Hadamard applied');

  // Logical CNOT: Transversal CNOT
  const logicalCNOT = await qecService.applyLogicalCNOT({
    control: logical0,
    target: logical1
  });

  console.log('Logical CNOT applied');

  // The key property: logical gates are fault-tolerant
  // because they don't spread errors
}
```

## 6. Fault-Tolerant Measurement

Measuring logical qubits without error propagation.

```typescript
async function faultTolerantMeasurementExample() {
  const qecService = new ErrorCorrectionService();

  // Prepare |+⟩ state
  const logicalPlus = await qecService.prepareSteaneLogicalPlus();

  // Fault-tolerant measurement
  // Method 1: Transversal measurement with error correction
  const result1 = await qecService.faultTolerantMeasure({
    circuit: logicalPlus,
    basis: 'X',
    repetitions: 3  // Repeat to verify
  });

  console.log('Fault-tolerant X measurement:', result1);

  // Method 2: Cat state assisted measurement
  const result2 = await qecService.catStateMeasurement({
    circuit: logicalPlus,
    basis: 'Z'
  });

  console.log('Cat state Z measurement:', result2);
}
```

## 7. API Usage: Error Correction

```bash
# Get available QEC codes
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email": "demo@example.com", "password": "demo"}' \
  | jq -r '.access_token')

curl http://localhost:3000/api/v1/advanced/error-correction/codes \
  -H "Authorization: Bearer $TOKEN"

# Encode circuit with Steane code
curl -X POST http://localhost:3000/api/v1/advanced/error-correction/steane/encode \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "circuitId": "circuit-123",
    "qubits": [0]
  }'

# Measure syndrome
curl -X POST http://localhost:3000/api/v1/advanced/error-correction/syndrome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "circuitId": "encoded-circuit-456"
  }'
```

## 8. Custom Stabilizer Codes

Define your own stabilizer code.

```typescript
async function customStabilizerCodeExample() {
  const qecService = new ErrorCorrectionService();

  // Define a [[5,1,3]] code (perfect code)
  const customCode = {
    n: 5,  // physical qubits
    k: 1,  // logical qubits
    d: 3,  // distance
    stabilizers: [
      'XZZXI',  // Generators of stabilizer group
      'IXZZX',
      'XIXZZ',
      'ZXIXZ'
    ],
    logicalX: 'XXXXX',
    logicalZ: 'ZZZZZ'
  };

  // Register the code
  await qecService.registerCode('[[5,1,3]]', customCode);

  // Use it
  const data = Circuit.builder(1).h(0).build();
  const encoded = await qecService.encodeWithCode({
    circuit: data,
    codeName: '[[5,1,3]]',
    logicalQubits: [0]
  });

  console.log('Custom [[5,1,3]] code encoded');
}
```

## Error Correction Properties

| Code | [[n,k,d]] | Corrects | Physical:Logical | Notes |
|------|-----------|----------|------------------|-------|
| Steane | [[7,1,3]] | 1 error | 7:1 | CSS code, transversal gates |
| Shor | [[9,1,3]] | 1 error | 9:1 | First QEC code |
| Surface | [[d²,1,d]] | ⌊(d-1)/2⌋ | d²:1 | Topological |
| [[5,1,3]] | [[5,1,3]] | 1 error | 5:1 | Perfect code |

## Threshold Theorem

With sufficiently low physical error rate (threshold ~1%), logical errors can be arbitrarily suppressed using concatenated codes or topological codes.

```typescript
async function thresholdExample() {
  const qecService = new ErrorCorrectionService();

  // Simulate concatenated Steane code
  const level1 = await qecService.encodeSteane({ ... });
  const level2 = await qecService.encodeSteane({
    circuit: level1.encodedCircuit,
    logicalQubits: Array.from({length: 7}, (_, i) => i)
  });

  console.log('Concatenated code: 49 physical qubits, 1 logical qubit');
  console.log('Error rate reduced from p to ~p²');
}
```
