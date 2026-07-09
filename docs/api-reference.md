# API Reference

## Authentication

### POST /api/v1/auth/login

Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "demo@example.com",
  "password": "demo"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user": {
    "email": "demo@example.com"
  }
}
```

### POST /api/v1/auth/refresh

Refresh an existing token.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /api/v1/auth/validate

Validate a token.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "sub": "user-123",
    "email": "test@example.com"
  },
  "expiresAt": "2026-06-27T14:00:00.000Z"
}
```

---

## Circuits

### GET /api/v1/circuits

List all circuits.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response:**
```json
{
  "circuits": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### POST /api/v1/circuits

Create a new circuit.

**Request:**
```json
{
  "name": "Bell State",
  "numQubits": 2,
  "operations": [
    { "gate": "h", "targets": [0] },
    { "gate": "cnot", "targets": [0, 1] }
  ]
}
```

**Response:**
```json
{
  "id": "circuit-1234567890",
  "name": "Bell State",
  "numQubits": 2,
  "operationCount": 2,
  "createdAt": "2026-06-27T12:00:00.000Z"
}
```

### GET /api/v1/circuits/:id

Get circuit by ID.

**Response:**
```json
{
  "id": "circuit-123",
  "name": "Bell State",
  "numQubits": 2,
  "gates": [...],
  "createdAt": "2026-06-27T12:00:00.000Z"
}
```

### PUT /api/v1/circuits/:id

Update circuit.

**Request:**
```json
{
  "name": "Updated Name",
  "operations": [...]
}
```

### DELETE /api/v1/circuits/:id

Delete circuit.

### POST /api/v1/circuits/:id/simulate

Run simulation on circuit.

**Request:**
```json
{
  "method": "statevector",
  "shots": 1024,
  "options": {
    "trackProbabilities": true
  }
}
```

**Response:**
```json
{
  "jobId": "sim-1234567890",
  "circuitId": "circuit-123",
  "status": "queued",
  "engine": "statevector",
  "shots": 1024,
  "estimatedTime": 5000
}
```

---

## Jobs

### GET /api/v1/jobs

List all jobs.

**Query Parameters:**
- `status` (string): Filter by status (queued, running, completed, failed)
- `page` (number): Page number
- `limit` (number): Items per page

### GET /api/v1/jobs/:id

Get job details.

**Response:**
```json
{
  "id": "job-123",
  "status": "completed",
  "type": "simulation",
  "progress": 100,
  "createdAt": "2026-06-27T12:00:00.000Z",
  "completedAt": "2026-06-27T12:00:05.000Z"
}
```

### GET /api/v1/jobs/:id/status

Get job status.

**Response:**
```json
{
  "id": "job-123",
  "status": "running",
  "progress": 75
}
```

### GET /api/v1/jobs/:id/logs

Get job logs.

**Query Parameters:**
- `lines` (number): Number of log lines to return (default: 100)

### DELETE /api/v1/jobs/:id

Cancel a job.

### POST /api/v1/jobs/:id/retry

Retry a failed job.

---

## Simulations

### GET /api/v1/simulations

List simulations.

### GET /api/v1/simulations/:id

Get simulation details.

### POST /api/v1/simulations

Create and run a new simulation.

**Request:**
```json
{
  "circuitId": "circuit-123",
  "method": "statevector",
  "shots": 1024,
  "parameters": {
    "gamma": 0.1
  }
}
```

### GET /api/v1/simulations/:id/results

Get simulation results.

**Response:**
```json
{
  "id": "sim-123",
  "status": "completed",
  "results": {
    "statevector": [...],
    "probabilities": {
      "00": 0.5,
      "11": 0.5
    },
    "samples": ["00", "11", "00", "11"]
  },
  "metadata": {
    "executionTime": 1000,
    "memoryUsed": 1024
  }
}
```

### POST /api/v1/simulations/compare

Compare multiple simulations.

**Request:**
```json
{
  "simulationIds": ["sim-1", "sim-2", "sim-3"],
  "metric": "fidelity"
}
```

---

## Advanced Features

### Quantum Error Correction

#### GET /api/v1/advanced/error-correction/codes

List available QEC codes.

**Response:**
```json
{
  "codes": [
    { "id": "steane", "name": "Steane [[7,1,3]]", "distance": 3 },
    { "id": "shor", "name": "Shor [[9,1,3]]", "distance": 3 }
  ]
}
```

#### POST /api/v1/advanced/error-correction/:codeId/encode

Encode circuit with QEC.

**Request:**
```json
{
  "circuitId": "circuit-123",
  "qubits": [0, 1]
}
```

#### POST /api/v1/advanced/error-correction/syndrome

Measure syndrome.

### Noise Modeling

#### GET /api/v1/advanced/noise/channels

List noise channel types.

#### POST /api/v1/advanced/noise/apply

Apply noise to circuit.

**Request:**
```json
{
  "circuitId": "circuit-123",
  "channels": [
    {
      "type": "depolarizing",
      "params": { "probability": 0.01 },
      "targets": [0]
    }
  ]
}
```

### Quantum ML

#### GET /api/v1/advanced/ml/vqe/ansatz

List VQE ansatz types.

#### POST /api/v1/advanced/ml/vqe/run

Run VQE optimization.

**Request:**
```json
{
  "hamiltonian": [[1, 0], [0, -1]],
  "ansatz": "uccsd",
  "optimizer": "COBYLA",
  "maxIterations": 100
}
```

#### POST /api/v1/advanced/ml/classifier/train

Train quantum classifier.

#### POST /api/v1/advanced/ml/kernel/matrix

Get quantum kernel matrix.

### Batch Execution

#### POST /api/v1/advanced/batch/execute

Execute batch of circuits.

**Request:**
```json
{
  "circuitIds": ["circuit-1", "circuit-2", "circuit-3"],
  "shots": 1024,
  "priority": 1
}
```

#### GET /api/v1/advanced/batch/:batchId/results

Get batch results.

### Pipelines

#### POST /api/v1/advanced/pipeline/create

Create execution pipeline.

**Request:**
```json
{
  "name": "Compile and Run",
  "stages": [
    { "type": "compile", "config": {} },
    { "type": "execute", "config": { "shots": 1024 } }
  ]
}
```

#### POST /api/v1/advanced/pipeline/:pipelineId/run

Run pipeline.

---

## WebSocket Events

### Jobs Namespace (`/jobs`)

**Client → Server:**
- `auth:register` - Register user
- `subscribe:job` - Subscribe to job updates
- `unsubscribe:job` - Unsubscribe from job updates

**Server → Client:**
- `job:status` - Job status update
- `job:complete` - Job completion
- `job:error` - Job error

### Visualization Namespace (`/visualization`)

**Client → Server:**
- `subscribe:circuit` - Subscribe to circuit updates
- `unsubscribe:circuit` - Unsubscribe from circuit updates
- `stream:bloch` - Request Bloch sphere stream
- `request:progress` - Request simulation progress

**Server → Client:**
- `circuit:update` - Circuit state update
- `bloch:update` - Bloch sphere data
- `bloch:complete` - Bloch stream complete
- `job:progress` - Simulation progress

---

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Rate limit exceeded |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 500 | INTERNAL_ERROR | Server error |

## Rate Limiting

- 100 requests per minute per user
- Burst allowance: 10 requests
- Headers returned:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp
