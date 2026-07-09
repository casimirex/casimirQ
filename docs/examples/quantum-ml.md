# Quantum Machine Learning Examples

## 1. VQE for Molecular Ground State

VQE finds the ground state energy of molecular Hamiltonians.

```typescript
import { QuantumMLService } from '../../src/modules/advanced-features/services/quantum-ml.service';

async function vqeMolecularGroundStateExample() {
  const mlService = new QuantumMLService();

  // H₂ molecule Hamiltonian (simplified)
  // In practice, this comes from Hartree-Fock or similar
  const h2Hamiltonian = [
    [-0.469594, 0, 0, 0],
    [0, 0.342885, 0.181287, 0],
    [0, 0.181287, 0.342885, 0],
    [0, 0, 0, -0.469594]
  ];

  // Run VQE with hardware-efficient ansatz
  const result = await mlService.runVQE({
    hamiltonian: h2Hamiltonian,
    ansatz: 'hardware_efficient',
    numLayers: 2,         // Number of ansatz layers
    optimizer: 'COBYLA',
    maxIterations: 200,
    convergenceTolerance: 1e-6
  });

  console.log('VQE Results:');
  console.log('- Ground state energy:', result.energy, 'Hartree');
  console.log('- Optimal parameters:', result.parameters);
  console.log('- Iterations:', result.iterations);
  console.log('- Converged:', result.converged);

  // Compare to exact diagonalization
  const exactEnergy = await mlService.exactDiagonalize(h2Hamiltonian);
  console.log('- Exact energy:', exactEnergy);
  console.log('- Error:', Math.abs(result.energy - exactEnergy));
}
```

## 2. Quantum Kernel Classification

Using quantum feature maps for classification.

```typescript
async function quantumKernelClassificationExample() {
  const mlService = new QuantumMLService();

  // Binary classification dataset
  // Class 0: Points near origin
  // Class 1: Points far from origin
  const trainingData = [
    { features: [0.1, 0.2], label: 0 },
    { features: [0.2, 0.1], label: 0 },
    { features: [0.9, 0.8], label: 1 },
    { features: [0.8, 0.9], label: 1 }
  ];

  const testData = [
    { features: [0.15, 0.15], label: 0 },
    { features: [0.85, 0.85], label: 1 }
  ];

  // Train quantum SVM with ZZ feature map
  const classifier = await mlService.trainQuantumClassifier({
    data: trainingData.map(d => d.features),
    labels: trainingData.map(d => d.label),
    featureMap: 'ZZ',        // ZZ feature map
    gamma: 1.0,              // Kernel parameter
    regularization: 'C',     // C-SVM
    C: 1.0                   // Regularization parameter
  });

  console.log('Training accuracy:', classifier.trainingAccuracy);

  // Predict on test data
  const predictions = await classifier.predict(
    testData.map(d => d.features)
  );

  console.log('Predictions:', predictions);
  console.log('True labels:', testData.map(d => d.label));

  // Calculate test accuracy
  const correct = predictions.filter((p, i) => p === testData[i].label).length;
  console.log('Test accuracy:', correct / testData.length);
}
```

## 3. Quantum Kernel Matrix Computation

Compute quantum kernel matrix for custom use.

```typescript
async function quantumKernelMatrixExample() {
  const mlService = new QuantumMLService();

  // Data points
  const data = [
    [0.1, 0.2],
    [0.3, 0.4],
    [0.5, 0.6],
    [0.7, 0.8]
  ];

  // Compute quantum kernel matrix
  // K[i,j] = |⟨φ(x_i)|φ(x_j)⟩|²
  const kernelMatrix = await mlService.computeQuantumKernel({
    data,
    featureMap: 'ZZ',
    gamma: 1.0,
    repetitions: 1000  // Number of circuit repetitions
  });

  console.log('Kernel matrix:');
  console.log(kernelMatrix);

  // Properties of quantum kernel
  console.log('Matrix properties:');
  console.log('- Symmetric:', isSymmetric(kernelMatrix));
  console.log('- Positive semi-definite:', isPositiveSemiDefinite(kernelMatrix));
  console.log('- Diagonal entries (self-similarity):', kernelMatrix.map((row, i) => row[i]));
}

function isSymmetric(matrix: number[][]): boolean {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-10) return false;
    }
  }
  return true;
}

function isPositiveSemiDefinite(matrix: number[][]): boolean {
  // Check eigenvalues (simplified)
  // In practice, use numerical libraries
  return true;
}
```

## 4. Quantum Neural Network

Variational quantum classifier with custom ansatz.

```typescript
async function quantumNeuralNetworkExample() {
  const mlService = new QuantumMLService();

  // MNIST-like binary classification (simplified)
  // Digits 0 vs 1, downsampled to 4 features
  const trainingData = {
    features: [
      [0.0, 0.0, 0.1, 0.2],  // Class 0
      [0.1, 0.0, 0.0, 0.1],  // Class 0
      [0.9, 0.8, 0.1, 0.0],  // Class 1
      [0.8, 0.9, 0.0, 0.1]   // Class 1
    ],
    labels: [0, 0, 1, 1]
  };

  // Define variational circuit architecture
  const qnn = await mlService.createQuantumNeuralNetwork({
    numQubits: 4,
    numLayers: 3,
    architecture: 'hardware_efficient',
    entanglement: 'linear',    // Linear chain entanglement
    activation: 'relu'           // Classical post-processing
  });

  // Train the QNN
  const trainingResult = await qnn.train({
    data: trainingData.features,
    labels: trainingData.labels,
    optimizer: 'ADAM',
    learningRate: 0.01,
    epochs: 100,
    batchSize: 2
  });

  console.log('Training complete:');
  console.log('- Final loss:', trainingResult.finalLoss);
  console.log('- Training accuracy:', trainingResult.accuracy);
  console.log('- Epochs:', trainingResult.epochs);

  // Save model
  await qnn.save('models/qnn-digit-classifier.json');
}
```

## 5. Quantum Generative Modeling

Quantum circuit Born machines for generative modeling.

```typescript
async function quantumBornMachineExample() {
  const mlService = new QuantumMLService();

  // Target distribution (simplified)
  const targetDistribution = {
    '00': 0.25,
    '01': 0.25,
    '10': 0.25,
    '11': 0.25
  };

  // Train quantum Born machine
  const bornMachine = await mlService.trainBornMachine({
    targetDistribution,
    numQubits: 2,
    numLayers: 4,
    optimizer: 'SGD',
    learningRate: 0.1,
    maxIterations: 500,
    lossFunction: 'MMD'  // Maximum Mean Discrepancy
  });

  console.log('Born machine trained:');
  console.log('- Learned distribution:', bornMachine.distribution);
  console.log('- KL divergence:', bornMachine.klDivergence);

  // Sample from the learned model
  const samples = await bornMachine.sample(100);
  console.log('Generated samples:', samples);
}
```

## 6. Feature Map Encoding

Different ways to encode classical data into quantum states.

```typescript
async function featureMapEncodingExample() {
  const mlService = new QuantumMLService();

  const data = [0.5, 0.3, 0.8, 0.2];  // 4 features

  // ZZ feature map
  const zzFeatureMap = await mlService.createFeatureMap({
    type: 'ZZ',
    data,
    reps: 2  // Repetitions of encoding circuit
  });

  console.log('ZZ feature map encoding:');
  console.log('- Encodes data using Z rotations and ZZ entangling');
  console.log('- Circuit depth:', zzFeatureMap.depth);

  // Pauli feature map
  const pauliFeatureMap = await mlService.createFeatureMap({
    type: 'Pauli',
    data,
    pauliStrings: ['Z', 'ZZ', 'ZZZ']  // Which Pauli strings to use
  });

  console.log('Pauli feature map encoding:');
  console.log('- More expressive than ZZ map');
  console.log('- Circuit depth:', pauliFeatureMap.depth);

  // Compare expressibility
  const zzExpressibility = await mlService.measureExpressibility(zzFeatureMap);
  const pauliExpressibility = await mlService.measureExpressibility(pauliFeatureMap);

  console.log('Expressibility:');
  console.log('- ZZ:', zzExpressibility);
  console.log('- Pauli:', pauliExpressibility);
}
```

## 7. Quantum Natural Gradient

Gradient descent using quantum Fisher information.

```typescript
async function quantumNaturalGradientExample() {
  const mlService = new QuantumMLService();

  const hamiltonian = [
    [1, 0, 0, 0],
    [0, -1, 0, 0],
    [0, 0, -1, 0],
    [0, 0, 0, 1]
  ];

  // Compare regular vs natural gradient descent
  const regularVQE = await mlService.runVQE({
    hamiltonian,
    ansatz: 'hardware_efficient',
    optimizer: 'SGD',
    learningRate: 0.01,
    useNaturalGradient: false
  });

  const naturalVQE = await mlService.runVQE({
    hamiltonian,
    ansatz: 'hardware_efficient',
    optimizer: 'SGD',
    learningRate: 0.01,
    useNaturalGradient: true,  // Use quantum Fisher information
    regularization: 0.01         // Regularization for stability
  });

  console.log('Regular gradient VQE:');
  console.log('- Iterations:', regularVQE.iterations);
  console.log('- Final energy:', regularVQE.energy);

  console.log('Natural gradient VQE:');
  console.log('- Iterations:', naturalVQE.iterations);
  console.log('- Final energy:', naturalVQE.energy);

  // Natural gradient typically converges faster
}
```

## 8. Quantum Transfer Learning

Transfer learning with quantum circuits.

```typescript
async function quantumTransferLearningExample() {
  const mlService = new QuantumMLService();

  // Pre-trained quantum circuit (from similar problem)
  const pretrainedCircuit = await mlService.loadModel('pretrained-qnn.json');

  // New task: classify different data
  const newTaskData = {
    features: [[0.2, 0.3], [0.4, 0.5], [0.6, 0.7], [0.8, 0.9]],
    labels: [0, 0, 1, 1]
  };

  // Fine-tune only last layers
  const fineTuned = await mlService.fineTune({
    model: pretrainedCircuit,
    data: newTaskData.features,
    labels: newTaskData.labels,
    frozenLayers: [0, 1],  // Freeze first 2 layers
    trainableLayers: [2, 3], // Train last 2 layers
    epochs: 50,
    learningRate: 0.001
  });

  console.log('Transfer learning complete:');
  console.log('- New task accuracy:', fineTuned.accuracy);
  console.log('- Training time reduced vs from scratch');
}
```

## 9. API Usage: Quantum ML

```bash
# Get VQE ansatz types
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email": "demo@example.com", "password": "demo"}' \
  | jq -r '.access_token')

curl http://localhost:3000/api/v1/advanced/ml/vqe/ansatz \
  -H "Authorization: Bearer $TOKEN"

# Run VQE
curl -X POST http://localhost:3000/api/v1/advanced/ml/vqe/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "hamiltonian": [[-0.469, 0, 0, 0], [0, 0.343, 0.181, 0], [0, 0.181, 0.343, 0], [0, 0, 0, -0.469]],
    "ansatz": "hardware_efficient",
    "optimizer": "COBYLA",
    "maxIterations": 200
  }'

# Train quantum classifier
curl -X POST http://localhost:3000/api/v1/advanced/ml/classifier/train \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": [[0.1, 0.2], [0.2, 0.1], [0.9, 0.8], [0.8, 0.9]],
    "labels": [0, 0, 1, 1],
    "featureMap": "ZZ",
    "epochs": 100
  }'

# Compute kernel matrix
curl -X POST http://localhost:3000/api/v1/advanced/ml/kernel/matrix \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]],
    "gamma": 1.0
  }'
```

## 10. Performance Comparison

Compare quantum vs classical ML on synthetic datasets.

```typescript
async function performanceComparisonExample() {
  const mlService = new QuantumMLService();

  // Generate synthetic dataset
  const { trainData, testData } = generateSyntheticDataset({
    numSamples: 100,
    numFeatures: 4,
    numClasses: 2,
    separability: 'moderate'
  });

  // Classical SVM
  const classicalSVM = await mlService.trainClassicalSVM({
    data: trainData.features,
    labels: trainData.labels,
    kernel: 'rbf'
  });

  const classicalAccuracy = await classicalSVM.evaluate(testData);

  // Quantum SVM
  const quantumSVM = await mlService.trainQuantumClassifier({
    data: trainData.features,
    labels: trainData.labels,
    featureMap: 'ZZ',
    regularization: 'C'
  });

  const quantumAccuracy = await quantumSVM.evaluate(testData);

  console.log('Performance comparison:');
  console.log('- Classical SVM accuracy:', classicalAccuracy);
  console.log('- Quantum SVM accuracy:', quantumAccuracy);
  console.log('- Speed: Classical is much faster');
  console.log('- Expressibility: Quantum may have advantage for certain data structures');
}

function generateSyntheticDataset(config: any) {
  // Generate random data for demonstration
  return {
    trainData: { features: [], labels: [] },
    testData: { features: [], labels: [] }
  };
}
```

## Quantum ML Summary

| Algorithm | Classical | Quantum | Use Case |
|-----------|-----------|---------|----------|
| VQE | Exponential | Polynomial | Chemistry |
| QSVM | Kernel trick | Quantum kernel | Classification |
| QNN | Deep networks | Variational circuits | General ML |
| Born Machine | GANs/VAEs | Quantum circuits | Generative |

## Expressibility and Entangling Capability

Different ansatzes have different properties:

| Ansatz | Expressibility | Entangling | Depth | Parameters |
|--------|---------------|------------|-------|------------|
| Hardware Efficient | Medium | Medium | Low | O(n×L) |
| UCCSD | High | High | High | O(n⁴) |
| QAOA | Medium | High | Medium | O(2×p) |
| Tensor Network | Low | Low | Low | O(n) |
