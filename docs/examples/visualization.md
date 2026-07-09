# Visualization Examples

## 1. Bloch Sphere Visualization

Visualize single-qubit states on the Bloch sphere.

```typescript
import { BlochSphereService } from '../../src/modules/visualization/services/bloch-sphere.service';
import { Circuit } from '../../src/modules/circuit-engine/circuit';
import { SimulationEnginesService } from '../../src/modules/simulation-engines/simulation-engines.service';

async function blochSphereExample() {
  const blochService = new BlochSphereService();
  const engines = new SimulationEnginesService();

  // Create various states
  const states = [
    { name: '|0⟩', circuit: Circuit.builder(1).build() },
    { name: '|1⟩', circuit: Circuit.builder(1).x(0).build() },
    { name: '|+⟩', circuit: Circuit.builder(1).h(0).build() },
    { name: '|−⟩', circuit: Circuit.builder(1).x(0).h(0).build() },
    { name: '|i+⟩', circuit: Circuit.builder(1).h(0).s(0).build() }
  ];

  for (const state of states) {
    const result = await engines.execute(state.circuit, {
      method: 'statevector'
    });

    // Get Bloch sphere coordinates
    const blochData = blochService.calculateBlochCoordinates(
      result.statevector,
      0  // Qubit index
    );

    console.log(`${state.name}:`);
    console.log(`  θ = ${blochData.theta.toFixed(3)} rad`);
    console.log(`  φ = ${blochData.phi.toFixed(3)} rad`);
    console.log(`  (x, y, z) = (${blochData.x.toFixed(3)}, ${blochData.y.toFixed(3)}, ${blochData.z.toFixed(3)})`);
  }
}
```

## 2. Circuit Diagram Generation

Generate circuit diagrams in various formats.

```typescript
import { CircuitDiagramService } from '../../src/modules/visualization/services/circuit-diagram.service';

async function circuitDiagramExample() {
  const diagramService = new CircuitDiagramService();

  // Create a circuit
  const circuit = Circuit.builder(3)
    .h(0)
    .cnot(0, 1)
    .s(1)
    .cnot(1, 2)
    .h(2)
    .measure(0)
    .measure(1)
    .measure(2)
    .build();

  // Generate SVG diagram
  const svg = await diagramService.generateSVG(circuit, {
    width: 800,
    height: 200,
    showGates: true,
    showMeasurements: true,
    theme: 'light'
  });

  console.log('SVG circuit diagram generated');

  // Save to file
  await diagramService.saveToFile(svg, 'circuit.svg');

  // Generate ASCII diagram for console output
  const ascii = await diagramService.generateASCII(circuit);
  console.log('\nASCII Circuit Diagram:');
  console.log(ascii);
}
```

## 3. Probability Histogram

Visualize measurement probabilities as histograms.

```typescript
async function probabilityHistogramExample() {
  const engines = new SimulationEnginesService();

  // GHZ state
  const circuit = Circuit.builder(3)
    .h(0)
    .cnot(0, 1)
    .cnot(1, 2)
    .build();

  const result = await engines.execute(circuit, {
    method: 'statevector',
    shots: 1024
  });

  // Generate histogram data
  const histogram = {
    labels: Object.keys(result.probabilities || {}),
    values: Object.values(result.probabilities || {})
  };

  console.log('Measurement Probability Histogram:');
  console.log('================================');

  for (let i = 0; i < histogram.labels.length; i++) {
    const label = histogram.labels[i];
    const value = histogram.values[i];
    const bar = '█'.repeat(Math.round(value * 50));

    console.log(`|${label}⟩: ${bar} ${(value * 100).toFixed(1)}%`);
  }

  // Export histogram data
  const histogramData = {
    title: 'GHZ State Measurement Probabilities',
    xLabel: 'Computational Basis State',
    yLabel: 'Probability',
    data: histogram
  };

  console.log('\nHistogram data:', JSON.stringify(histogramData, null, 2));
}
```

## 4. State Evolution Animation

Track state evolution through circuit execution.

```typescript
async function stateEvolutionExample() {
  const engines = new SimulationEnginesService();
  const blochService = new BlochSphereService();

  // Circuit with multiple operations
  const operations = [
    { name: 'Initial', gates: [] },
    { name: 'After H', gates: ['h(0)'] },
    { name: 'After S', gates: ['h(0)', 's(0)'] },
    { name: 'After T', gates: ['h(0)', 's(0)', 't(0)'] }
  ];

  console.log('State Evolution:');
  console.log('================');

  for (const step of operations) {
    let builder = Circuit.builder(1);

    // Apply gates for this step
    for (const gate of step.gates) {
      if (gate === 'h(0)') builder = builder.h(0);
      if (gate === 's(0)') builder = builder.s(0);
      if (gate === 't(0)') builder = builder.t(0);
    }

    const circuit = builder.build();
    const result = await engines.execute(circuit, {
      method: 'statevector'
    });

    const bloch = blochService.calculateBlochCoordinates(
      result.statevector, 0
    );

    console.log(`${step.name}:`);
    console.log(`  State: ${formatStatevector(result.statevector)}`);
    console.log(`  Bloch: (θ=${bloch.theta.toFixed(2)}, φ=${bloch.phi.toFixed(2)})`);
  }
}

function formatStatevector(statevector: any[]): string {
  // Format for display
  return statevector.map((amp, i) => {
    const prob = Math.abs(amp) ** 2;
    if (prob < 0.01) return '';
    return `${amp.toFixed(2)}|${i}⟩`;
  }).filter(x => x).join(' + ');
}
```

## 5. 3D State Visualization

Generate data for 3D state visualization.

```typescript
async function stateVisualization3DExample() {
  const engines = new SimulationEnginesService();

  // Create superposition state
  const circuit = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .build();

  const result = await engines.execute(circuit, {
    method: 'statevector'
  });

  // Generate 3D visualization data
  const visualization3D = {
    // Amplitude visualization
    amplitudes: result.statevector.map((amp, i) => ({
      state: `|${i.toString(2).padStart(2, '0')}⟩`,
      amplitude: Math.abs(amp),
      phase: Math.atan2(amp.imaginary || 0, amp.real || 0),
      x: Math.abs(amp) * Math.cos(Math.atan2(amp.imaginary || 0, amp.real || 0)),
      y: Math.abs(amp) * Math.sin(Math.atan2(amp.imaginary || 0, amp.real || 0)),
      z: Math.abs(amp) ** 2  // Probability
    })),

    // Probability bars
    probabilities: Object.entries(result.probabilities || {}).map(([state, prob]) => ({
      state,
      probability: prob,
      height: prob * 100
    })),

    // Bloch vectors for each qubit
    blochVectors: [
      { x: 0, y: 0, z: 0 },  // Qubit 0 (entangled)
      { x: 0, y: 0, z: 0 }   // Qubit 1 (entangled)
    ]
  };

  console.log('3D Visualization Data:');
  console.log(JSON.stringify(visualization3D, null, 2));
}
```

## 6. Real-time Visualization with WebSocket

Stream visualization data in real-time.

```typescript
async function realtimeVisualizationExample() {
  // Connect to WebSocket
  const socket = io('http://localhost:3000/visualization');

  // Subscribe to circuit updates
  const circuitId = 'circuit-123';
  socket.emit('subscribe:circuit', { circuitId });

  // Listen for updates
  socket.on('circuit:update', (data) => {
    console.log('Circuit update:', data);

    // Update Bloch sphere
    updateBlochSphere(data.qubitStates);

    // Update probabilities
    updateProbabilities(data.probabilities);
  });

  // Request Bloch sphere stream for qubit 0
  socket.emit('stream:bloch', { qubitId: 0 });

  socket.on('bloch:update', (data) => {
    console.log(`Qubit ${data.qubitId} Bloch:`, {
      theta: data.theta,
      phi: data.phi
    });
  });

  socket.on('bloch:complete', () => {
    console.log('Bloch sphere stream complete');
  });

  // Simulation progress
  socket.emit('request:progress', { jobId: 'job-456' });

  socket.on('job:progress', (data) => {
    console.log(`Job ${data.jobId}: ${data.progress}% ${data.status}`);
  });
}

function updateBlochSphere(states: any[]) {
  // Update visualization
  console.log('Updating Bloch spheres for', states.length, 'qubits');
}

function updateProbabilities(probabilities: Record<string, number>) {
  // Update histogram
  console.log('Updating probability histogram');
}
```

## 7. Export Visualizations

Export visualization in various formats.

```typescript
async function exportVisualizationExample() {
  const circuit = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .build();

  // Export formats
  const formats = ['svg', 'png', 'pdf', 'json'];

  for (const format of formats) {
    console.log(`Exporting as ${format.toUpperCase()}...`);

    const response = await fetch('http://localhost:3000/api/v1/visualizations/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: JSON.stringify({
        type: 'circuit-diagram',
        data: circuit.toJSON(),
        format
      })
    });

    const blob = await response.blob();
    // Save blob to file
  }
}
```

## 8. Measurement Effects Visualization

Visualize the effect of measurement on quantum states.

```typescript
import { ObservabilityService } from '../../src/modules/visualization/services/observability.service';

async function measurementEffectsExample() {
  const observabilityService = new ObservabilityService();
  const engines = new SimulationEnginesService();

  // Bell state
  const circuit = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .build();

  // Pre-measurement state
  const beforeMeasurement = await engines.execute(circuit, {
    method: 'statevector'
  });

  console.log('Before measurement:');
  console.log('- State:', beforeMeasurement.statevector);
  console.log('- Entangled:', isEntangled(beforeMeasurement.statevector));

  // Simulate measurement
  const measurementResult = await observabilityService.simulateMeasurement({
    state: beforeMeasurement.statevector,
    qubit: 0
  });

  console.log('\nMeasurement result:', measurementResult.outcome);
  console.log('- Probability:', measurementResult.probability);

  // Post-measurement state
  console.log('\nAfter measurement:');
  console.log('- Collapsed state:', measurementResult.collapsedState);
  console.log('- Remaining qubit determined:', measurementResult.deterministic);

  // Visualize collapse
  const visualization = await observabilityService.visualizeCollapse({
    before: beforeMeasurement.statevector,
    after: measurementResult.collapsedState,
    measuredQubit: 0,
    outcome: measurementResult.outcome
  });

  console.log('Collapse visualization:', visualization);
}

function isEntangled(statevector: any[]): boolean {
  // Check if state is entangled
  // (simplified check)
  return true;
}
```

## 9. API Usage: Visualization

```bash
# Get Bloch sphere data
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email": "demo@example.com", "password": "demo"}' \
  | jq -r '.access_token')

curl "http://localhost:3000/api/v1/visualizations/bloch-sphere/0?circuitId=circuit-123" \
  -H "Authorization: Bearer $TOKEN"

# Get circuit diagram
curl "http://localhost:3000/api/v1/visualizations/circuit/circuit-123/diagram?format=svg" \
  -H "Authorization: Bearer $TOKEN" \
  --output circuit.svg

# Get probability histogram
curl "http://localhost:3000/api/v1/visualizations/histogram/sim-123?bins=50" \
  -H "Authorization: Bearer $TOKEN"

# Export visualization
curl -X POST http://localhost:3000/api/v1/visualizations/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "bloch-sphere",
    "data": { "theta": 1.57, "phi": 0 },
    "format": "png"
  }' \
  --output bloch.png
```

## 10. Interactive Dashboard Data

Generate data for interactive dashboards.

```typescript
async function dashboardDataExample() {
  const engines = new SimulationEnginesService();

  // Simulation metrics
  const circuits = [
    Circuit.builder(2).h(0).cnot(0, 1).build(),
    Circuit.builder(3).h(0).cnot(0, 1).cnot(1, 2).build(),
    Circuit.builder(4).h(0).cnot(0, 1).cnot(1, 2).cnot(2, 3).build()
  ];

  const dashboardData = {
    simulations: [],
    aggregate: {
      totalCircuits: circuits.length,
      totalQubits: circuits.reduce((sum, c) => sum + c.numQubits, 0),
      avgDepth: circuits.reduce((sum, c) => sum + c.operations.length, 0) / circuits.length
    }
  };

  for (const circuit of circuits) {
    const startTime = Date.now();
    const result = await engines.execute(circuit, {
      method: 'statevector',
      shots: 100
    });
    const endTime = Date.now();

    dashboardData.simulations.push({
      numQubits: circuit.numQubits,
      numOperations: circuit.operations.length,
      executionTime: endTime - startTime,
      topMeasurement: findTopMeasurement(result.probabilities || {}),
      entropy: calculateEntropy(result.probabilities || {})
    });
  }

  console.log('Dashboard Data:');
  console.log(JSON.stringify(dashboardData, null, 2));
}

function findTopMeasurement(probs: Record<string, number>): string {
  return Object.entries(probs)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
}

function calculateEntropy(probs: Record<string, number>): number {
  return Object.values(probs)
    .filter(p => p > 0)
    .reduce((sum, p) => sum - p * Math.log2(p), 0);
}
```

## Visualization Types Summary

| Type | Best For | Format |
|------|----------|--------|
| Bloch Sphere | Single qubit states | 3D, Interactive |
| Circuit Diagram | Gate sequences | SVG, ASCII |
| Histogram | Probabilities | Bar chart |
| State Evolution | Time evolution | Animation |
| 3D State | Multi-qubit states | 3D plot |
