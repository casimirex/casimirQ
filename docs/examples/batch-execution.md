# Batch Execution and Pipeline Examples

## 1. Batch Circuit Execution

Execute multiple circuits simultaneously.

```typescript
import { MultiCircuitExecutionService } from '../../src/modules/advanced-features/services/multi-circuit-execution.service';
import { Circuit } from '../../src/modules/circuit-engine/circuit';

async function batchExecutionExample() {
  const executionService = new MultiCircuitExecutionService();

  // Create multiple circuits
  const circuits = [
    Circuit.builder(2).h(0).cnot(0, 1).build(),  // Bell state
    Circuit.builder(3).h(0).cnot(0, 1).cnot(1, 2).build(),  // GHZ state
    Circuit.builder(2).x(0).cnot(0, 1).build(),  // |11⟩ state
    Circuit.builder(2).h(0).s(0).cnot(0, 1).build(),  // Phase-entangled
  ];

  // Execute in batch
  const batchResult = await executionService.executeBatch({
    circuits,
    shots: 1024,
    engine: 'statevector',
    priority: 1,        // Higher priority = faster scheduling
    parallelism: 2        // Run 2 circuits in parallel
  });

  console.log('Batch execution complete:');
  console.log('- Total circuits:', batchResult.circuitCount);
  console.log('- Successful:', batchResult.successful);
  console.log('- Failed:', batchResult.failed);
  console.log('- Total time:', batchResult.totalTime, 'ms');
  console.log('- Average time per circuit:', batchResult.averageTime, 'ms');

  // Access individual results
  for (let i = 0; i < circuits.length; i++) {
    console.log(`\nCircuit ${i} results:`);
    console.log('- Probabilities:', batchResult.results[i].probabilities);
  }
}
```

## 2. Parameter Sweep

Run the same circuit with different parameters.

```typescript
async function parameterSweepExample() {
  const executionService = new MultiCircuitExecutionService();

  // Base circuit with parameterized rotation
  const baseCircuit = (theta: number) =>
    Circuit.builder(1)
      .rx(0, theta)
      .measure(0)
      .build();

  // Sweep rotation angle
  const angles = Array.from({ length: 20 }, (_, i) => i * Math.PI / 10);

  // Generate circuits for each angle
  const circuits = angles.map(theta => baseCircuit(theta));

  // Execute batch
  const batchResult = await executionService.executeBatch({
    circuits,
    shots: 1000,
    engine: 'statevector'
  });

  // Analyze results
  console.log('Parameter sweep results:');
  for (let i = 0; i < angles.length; i++) {
    const angle = angles[i];
    const result = batchResult.results[i];
    const zeroProb = result.probabilities?.['0'] || 0;

    console.log(`θ=${angle.toFixed(2)}: P(|0⟩)=${zeroProb.toFixed(4)}`);
  }
}
```

## 3. Distributed Execution

Distribute execution across multiple workers.

```typescript
async function distributedExecutionExample() {
  const executionService = new MultiCircuitExecutionService();

  // Create many circuits
  const numCircuits = 100;
  const circuits = [];

  for (let i = 0; i < numCircuits; i++) {
    circuits.push(
      Circuit.builder(3)
        .h(0)
        .cnot(0, 1)
        .cnot(1, 2)
        .rz(2, i * 0.1)  // Different phase for each
        .build()
    );
  }

  // Execute with distributed scheduler
  const result = await executionService.executeDistributed({
    circuits,
    shots: 1024,
    engine: 'statevector',
    scheduler: {
      type: 'distributed',
      maxWorkers: 4,           // Use 4 worker processes
      chunks: 10               // Split into 10 chunks
    },
    progressCallback: (progress) => {
      console.log(`Progress: ${progress.completed}/${progress.total} circuits`);
    }
  });

  console.log('Distributed execution complete:');
  console.log('- Time:', result.totalTime, 'ms');
  console.log('- Speedup:', result.speedup, 'vs sequential');
  console.log('- Efficiency:', result.efficiency);
}
```

## 4. Pipeline Execution

Chain multiple processing stages.

```typescript
async function pipelineExecutionExample() {
  const executionService = new MultiCircuitExecutionService();

  // Define a pipeline
  const pipeline = executionService.createPipeline({
    name: 'Compile-Execute-Analyze',
    stages: [
      {
        name: 'compile',
        type: 'circuit-compiler',
        config: {
          optimizationLevel: 2,
          gateSet: 'standard'
        }
      },
      {
        name: 'execute',
        type: 'simulator',
        config: {
          engine: 'statevector',
          shots: 1024
        }
      },
      {
        name: 'analyze',
        type: 'result-analyzer',
        config: {
          metrics: ['fidelity', 'entropy', 'correlations']
        }
      }
    ]
  });

  // Input circuit
  const input = {
    circuit: Circuit.builder(4)
      .h(0)
      .cnot(0, 1)
      .cnot(1, 2)
      .cnot(2, 3)
      .build()
  };

  // Run pipeline
  const result = await pipeline.execute(input);

  console.log('Pipeline execution:');
  console.log('- Stage 1 (compile):', result.stages.compile.duration, 'ms');
  console.log('- Stage 2 (execute):', result.stages.execute.duration, 'ms');
  console.log('- Stage 3 (analyze):', result.stages.analyze.duration, 'ms');
  console.log('- Total time:', result.totalTime, 'ms');
  console.log('- Metrics:', result.output.metrics);
}
```

## 5. Conditional Execution

Execute circuits based on previous results.

```typescript
async function conditionalExecutionExample() {
  const executionService = new MultiCircuitExecutionService();

  // Stage 1: Prepare and measure
  const stage1 = Circuit.builder(1)
    .h(0)
    .measure(0)
    .build();

  const result1 = await executionService.executeSingle({
    circuit: stage1,
    shots: 1  // Single shot for conditional
  });

  const measurement = result1.samples?.[0] || '0';

  // Stage 2: Conditional on measurement
  let stage2;
  if (measurement === '0') {
    stage2 = Circuit.builder(1).x(0).h(0).build();
    console.log('Branch A: Measurement was 0');
  } else {
    stage2 = Circuit.builder(1).h(0).s(0).build();
    console.log('Branch B: Measurement was 1');
  }

  const result2 = await executionService.executeSingle({
    circuit: stage2,
    shots: 100
  });

  console.log('Conditional execution complete');
  console.log('Final results:', result2.probabilities);
}
```

## 6. Priority Scheduling

Execute circuits with different priorities.

```typescript
async function prioritySchedulingExample() {
  const executionService = new MultiCircuitExecutionService();

  // Create tasks with different priorities
  const tasks = [
    {
      circuit: Circuit.builder(2).h(0).cnot(0, 1).build(),
      priority: 10,  // High priority
      name: 'urgent-task'
    },
    {
      circuit: Circuit.builder(3).h(0).cnot(0, 1).cnot(1, 2).build(),
      priority: 1,   // Low priority
      name: 'background-task'
    },
    {
      circuit: Circuit.builder(2).x(0).cnot(0, 1).build(),
      priority: 5,   // Medium priority
      name: 'normal-task'
    }
  ];

  // Submit all tasks
  const jobIds = [];
  for (const task of tasks) {
    const jobId = await executionService.submit({
      circuit: task.circuit,
      priority: task.priority,
      metadata: { name: task.name }
    });
    jobIds.push(jobId);
    console.log(`Submitted ${task.name} with priority ${task.priority}`);
  }

  // Wait for completion (high priority executes first)
  const results = await executionService.waitForAll(jobIds);

  console.log('Execution order:');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.metadata.name} (priority ${tasks[i].priority})`);
  });
}
```

## 7. Result Caching

Cache results to avoid recomputation.

```typescript
async function resultCachingExample() {
  const executionService = new MultiCircuitExecutionService();

  // Enable caching
  executionService.enableCache({
    ttl: 3600000,  // 1 hour TTL
    maxSize: 1000  // Max 1000 cached results
  });

  const circuit = Circuit.builder(2)
    .h(0)
    .cnot(0, 1)
    .build();

  // First execution - computes and caches
  console.time('first-execution');
  const result1 = await executionService.executeSingle({
    circuit,
    shots: 10000,
    cache: true
  });
  console.timeEnd('first-execution');

  // Second execution - retrieves from cache
  console.time('cached-execution');
  const result2 = await executionService.executeSingle({
    circuit,
    shots: 10000,
    cache: true
  });
  console.timeEnd('cached-execution');

  console.log('Cache hit:', result2.cached);
  console.log('Results identical:', JSON.stringify(result1.probabilities) === JSON.stringify(result2.probabilities));
}
```

## 8. Error Recovery

Handle failures gracefully.

```typescript
async function errorRecoveryExample() {
  const executionService = new MultiCircuitExecutionService();

  const circuits = [
    Circuit.builder(2).h(0).cnot(0, 1).build(),
    Circuit.builder(5).h(0).cnot(0, 1).cnot(1, 2).build(),  // Might fail on memory
    Circuit.builder(2).x(0).cnot(0, 1).build()
  ];

  const result = await executionService.executeBatch({
    circuits,
    shots: 1000,
    errorHandling: {
      strategy: 'retry',      // Retry failed circuits
      maxRetries: 3,          // Up to 3 retries
      fallback: 'skip'      // Skip if all retries fail
    },
    retryDelay: 1000          // Wait 1 second between retries
  });

  console.log('Execution with error recovery:');
  console.log('- Total:', result.total);
  console.log('- Successful:', result.successful);
  console.log('- Failed:', result.failed);
  console.log('- Retried:', result.retried);

  // Access results
  result.results.forEach((r, i) => {
    if (r.success) {
      console.log(`Circuit ${i}: Success`);
    } else {
      console.log(`Circuit ${i}: Failed - ${r.error}`);
    }
  });
}
```

## 9. API Usage: Batch Execution

```bash
# Submit batch execution
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email": "demo@example.com", "password": "demo"}' \
  | jq -r '.access_token')

curl -X POST http://localhost:3000/api/v1/advanced/batch/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "circuitIds": ["circuit-1", "circuit-2", "circuit-3"],
    "shots": 1024,
    "priority": 1
  }'

# Get batch results
BATCH_ID="batch-1234567890"
curl http://localhost:3000/api/v1/advanced/batch/$BATCH_ID/results \
  -H "Authorization: Bearer $TOKEN"

# Create pipeline
curl -X POST http://localhost:3000/api/v1/advanced/pipeline/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Compile and Execute",
    "stages": [
      { "type": "compile", "config": { "optimizationLevel": 2 } },
      { "type": "execute", "config": { "shots": 1024 } }
    ]
  }'

# Run pipeline
PIPELINE_ID="pipeline-1234567890"
curl -X POST http://localhost:3000/api/v1/advanced/pipeline/$PIPELINE_ID/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "input": { "circuitId": "circuit-123" }
  }'
```

## 10. Performance Benchmarking

Benchmark batch execution performance.

```typescript
async function performanceBenchmarkExample() {
  const executionService = new MultiCircuitExecutionService();

  // Benchmark configurations
  const configs = [
    { circuits: 10, parallelism: 1 },   // Sequential
    { circuits: 10, parallelism: 2 },   // 2 parallel
    { circuits: 10, parallelism: 4 },   // 4 parallel
    { circuits: 10, parallelism: 10 }  // All parallel
  ];

  console.log('Performance Benchmark:');
  console.log('======================');

  for (const config of configs) {
    // Generate circuits
    const circuits = Array.from({ length: config.circuits }, () =>
      Circuit.builder(3).h(0).cnot(0, 1).cnot(1, 2).build()
    );

    // Time execution
    const startTime = Date.now();
    const result = await executionService.executeBatch({
      circuits,
      shots: 100,
      parallelism: config.parallelism
    });
    const endTime = Date.now();

    const totalTime = endTime - startTime;
    const throughput = config.circuits / (totalTime / 1000);

    console.log(`Parallelism ${config.parallelism}:`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Throughput: ${throughput.toFixed(2)} circuits/sec`);
    console.log(`  Avg per circuit: ${(totalTime / config.circuits).toFixed(2)}ms`);
    console.log('');
  }
}
```

## Execution Strategies

| Strategy | Best For | Trade-offs |
|----------|----------|------------|
| Sequential | Debug, small batches | Simple, slow |
| Parallel | Medium batches | Faster, memory limit |
| Distributed | Large batches | Scalable, overhead |
| Pipeline | Multi-stage workflows | Modular, complex |

## Scheduling Priorities

| Priority | Use Case | Response Time |
|----------|----------|---------------|
| 10+ | Interactive, demos | Immediate |
| 5-9 | Normal jobs | Seconds |
| 2-4 | Background tasks | Minutes |
| 1 | Batch processing | Hours |
