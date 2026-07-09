# 🚀 casimirQ — Phase 1: Foundation & Core Engine

> **Phase 1 Work Agreement, Implementation Plan & Verification Protocol**

---

## 📋 PHASE 1 CONTRACT

### Scope
Establish the quantum mathematics foundation and basic circuit operations to support 20+ qubit simulations.

### Timeline
**4 Weeks** (Weeks 1-4)

### Deliverables
| Week | Deliverable | Owner | Verification Method |
|------|-------------|-------|---------------------|
| W1 | Project Setup, Math Utils | Backend Lead | Unit Tests ≥100% |
| W2 | Gate Library | Quantum Engineer | Matrix Validation |
| W3 | Circuit Engine | Backend Lead | QASM Parser Tests |
| W4 | Statevector Engine | Quantum Engineer | 20-qubit Benchmark |

### Success Criteria (Pass/Fail)
- [ ] Can create and simulate circuits up to 20 qubits
- [ ] All standard gates implemented with matrix representations
- [ ] Basic QASM 2.0 support
- [ ] Measurement produces valid probability distributions
- [ ] All unit tests pass with ≥100% coverage on core math
- [ ] Code review approved by at least 2 reviewers
- [ ] Documentation complete

---

## 🤝 WORK AGREEMENT

### 1. Roles & Responsibilities

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PHASE 1 TEAM                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Project Lead    │  │ Quantum Engineer │  │ Backend Engineer │ │
│  │                  │  │                  │  │                  │ │
│  │ • Milestone     │  │ • Gate math      │  │ • NestJS arch    │ │
│  │   approval       │  │ • Algorithms     │  │ • API design     │ │
│  │ • Blockers       │  │ • Validation     │  │ • Database       │ │
│  │ • Final sign-off │  │ • Physics review │  │ • Testing        │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐                       │
│  │ QA Engineer      │  │ DevOps Engineer  │                       │ │
│  │                  │  │                  │                       │ │
│  │ • Test plans     │  │ • CI/CD setup    │                       │ │
│  │ • Coverage gates │  │ • Monitoring     │                       │ │
│  │ • Audit logs     │  │ • Docker config  │                       │ │
│  └──────────────────┘  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Communication Protocol

| Event | Channel | Response Time | Escalation |
|-------|---------|---------------|------------|
| Daily Standup | Slack #phase1-standup | Async by 10 AM | Auto-escalate if missed |
| Blockers | Slack @project-lead | 2 hours | Emergency call if >4h |
| Code Review | GitHub PR | 24 hours | Force merge with 2 approvals |
| Verification | PR comment | Sync with PR | Block merge if failed |
| Audit Finding | Email + JIRA | 4 hours | Weekly audit meeting |

### 3. Definition of Done (Per Task)

**Required Checklist for EVERY task:**

```markdown
## Task Completion Checklist

### Implementation
- [ ] Code written following NestJS style guide
- [ ] No TypeScript compiler errors
- [ ] No ESLint warnings

### Testing
- [ ] Unit tests written (≥100% for math utils, ≥80% for services)
- [ ] Integration tests for API endpoints
- [ ] All tests passing (`npm run test`)
- [ ] No test coverage regressions

### Documentation
- [ ] JSDoc comments for public APIs
- [ ] README updated (if new module)
- [ ] Architecture Decision Record (if architectural change)

### Review
- [ ] Self-review completed (author)
- [ ] Peer review approved (1 reviewer min)
- [ ] Quantum Engineer review (if physics-related)

### Verification
- [ ] Verification steps executed and passed
- [ ] Screenshots/logs attached to PR
- [ ] Benchmark results recorded

### Audit
- [ ] Security scan passed (Snyk/Semgrep)
- [ ] No secrets in code (GitLeaks scan)
- [ ] Performance audit passed (no regressions)
```

---

## 🔍 VERIFICATION PROTOCOL

### Weekly Verification Gates

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VERIFICATION WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WEEK 1: MATH UTILITIES                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Implement│───→│ Unit Test│───→│  Verify  │───→│   Audit  │     │
│  │  Complex │    │  Matrix  │    │  Results │    │  Report  │     │
│  │   Math   │    │  Ops     │    │  vs Ref  │    │          │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│       │                               │                  │          │
│       └───────────────────────────────┴──────────────────┘          │
│                    Gate: ALL PASS → Proceed to W2                   │
│                    Gate: ANY FAIL → Fix → Re-verify                 │
│                                                                      │
│  WEEK 2: GATE LIBRARY                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Implement│───→│ Validate │───→│ Property │───→│   Audit  │     │
│  │  Gates   │    │  Matrices│    │  Tests   │    │  Report  │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│       │              │                │                  │          │
│       └──────────────┴────────────────┴──────────────────┘          │
│                    Gate: ALL PASS → Proceed to W3                   │
│                                                                      │
│  WEEK 3: CIRCUIT ENGINE                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Implement│───→│ QASM     │───→│ Circuit  │───→│   Audit  │     │
│  │ Circuit  │    │  Parser  │    │  Tests   │    │  Report  │     │
│  │  Builder │    │          │    │          │    │          │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                      │
│  WEEK 4: STATEVECTOR ENGINE                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Implement│───→│ 20-Qubit │───→│ Compare  │───→│   Audit  │     │
│  │ Simulator│    │ Benchmark│    │ vs ket   │    │  Report  │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Verification Checkpoints

#### Checkpoint A: Math Utilities (End of Week 1)
**Verifier:** QA Engineer + Quantum Engineer

**Test Suite:**
```typescript
// Required tests - ALL must pass
✓ Complex number addition
✓ Complex number multiplication
✓ Complex conjugate
✓ Complex magnitude
✓ Complex exponentiation
✓ Matrix multiplication (2x2, 4x4, 8x8)
✓ Tensor product (Kronecker product)
✓ Matrix adjoint (conjugate transpose)
✓ Identity matrix generation
✓ Sparse matrix operations
✓ BigInt index calculations (for >32 qubits)
✓ Numerical stability (floating point precision)
```

**Verification Method:**
```bash
# Run verification script
npm run verify:math

# Expected output:
# ✓ 156/156 tests passed
# ✓ Coverage: 100% statements, 100% branches
# ✓ Performance: All ops <1ms for 2^20 amplitudes
```

**Sign-off:**
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Quantum Engineer | _________ | _________ | _____ |
| QA Engineer | _________ | _________ | _____ |

---

#### Checkpoint B: Gate Library (End of Week 2)
**Verifier:** Quantum Engineer + Backend Lead

**Test Suite:**
```typescript
// Gate matrix validation - compare against reference matrices
✓ Pauli-X matches [[0,1],[1,0]]
✓ Pauli-Y matches [[0,-i],[i,0]]
✓ Pauli-Z matches [[1,0],[0,-1]]
✓ Hadamard matches 1/√2[[1,1],[1,-1]]
✓ S gate matches [[1,0],[0,i]]
✓ T gate matches [[1,0],[0,e^(iπ/4)]]
✓ Rx(θ) rotation matrix
✓ Ry(θ) rotation matrix
✓ Rz(θ) rotation matrix
✓ CNOT 4x4 matrix
✓ SWAP 4x4 matrix
✓ Toffoli 8x8 matrix
✓ Controlled-U gates
✓ Custom gate definition support
```

**Property Tests (QuickCheck-style):**
```typescript
✓ Gate * Gate† = Identity (unitarity)
✓ Gate applications are reversible
✓ Hermitian gates are self-inverse
✓ Rotation angles compose correctly
```

**Verification Method:**
```bash
npm run verify:gates

# Expected output:
# ✓ 84 gate matrices validated
# ✓ 1000 property test iterations passed
# ✓ Coverage: 100% on gate implementations
```

**Sign-off:**
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Quantum Engineer | _________ | _________ | _____ |
| Backend Lead | _________ | _________ | _____ |

---

#### Checkpoint C: Circuit Engine (End of Week 3)
**Verifier:** Backend Lead + QA Engineer

**Test Suite:**
```typescript
✓ Circuit creation with n qubits
✓ Gate application (single qubit)
✓ Gate application (multi-qubit)
✓ Circuit composition (circuit1 + circuit2)
✓ Circuit repetition (circuit * n)
✓ QASM 2.0 parsing
✓ QASM gate definitions
✓ Circuit optimization (gate fusion)
✓ Circuit depth calculation
✓ Qubit connectivity validation
✓ Invalid circuit detection
✓ Circuit serialization/deserialization
```

**QASM Compliance Tests:**
```qasm
// Must correctly parse:
OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
cx q[0],q[1];
measure q -> c;
```

**Verification Method:**
```bash
npm run verify:circuits

# Expected output:
# ✓ 42 circuit operations tested
# ✓ 15 QASM files parsed correctly
# ✓ Coverage: 85% on circuit engine
```

**Sign-off:**
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Backend Lead | _________ | _________ | _____ |
| QA Engineer | _________ | _________ | _____ |

---

#### Checkpoint D: Statevector Engine (End of Week 4)
**Verifier:** Quantum Engineer (Lead) + All Team

**Test Suite:**
```typescript
✓ Bell state generation (|Φ+⟩)
✓ GHZ state generation
✓ W state generation
✓ Measurement probability calculation
✓ Measurement outcome sampling
✓ Post-measurement state update
✓ 20-qubit random circuit simulation
✓ Sparse state representation efficiency
✓ Parallel amplitude computation
```

**Benchmark Tests:**
```typescript
// Performance requirements
✓ 10-qubit simulation: <100ms
✓ 15-qubit simulation: <500ms
✓ 20-qubit simulation: <2s
✓ Memory usage <512MB for 20 qubits
```

**Correctness Validation:**
```typescript
// Compare against reference implementation (ket)
✓ Bell state amplitudes match reference
✓ Measurement probabilities within 1e-10 tolerance
✓ Random circuit outputs statistically match
```

**Verification Method:**
```bash
npm run verify:statevector

# Expected output:
# ✓ All correctness tests passed
# ✓ Benchmark: 20-qubit sim in 1.2s (<2s target)
# ✓ Memory: 380MB used (<512MB target)
# ✓ Reference comparison: PASS (diff <1e-10)
```

**Sign-off (Required for Phase 1 Completion):**
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Lead | _________ | _________ | _____ |
| Quantum Engineer | _________ | _________ | _____ |
| Backend Lead | _________ | _________ | _____ |
| QA Engineer | _________ | _________ | _____ |

---

## 🔒 AUDIT PROTOCOL

### Weekly Audit Schedule

| Audit Type | Frequency | Auditor | Scope |
|------------|-----------|---------|-------|
| Security | Weekly | DevOps + External | Secrets, vulnerabilities |
| Performance | Weekly | QA + Backend | Benchmarks, regressions |
| Code Quality | Weekly | Backend Lead | Style, patterns, debt |
| Physics Accuracy | Weekly | Quantum Engineer | Math correctness |

### Security Audit Checklist

```markdown
## Security Audit Template

### Repository
- [ ] No hardcoded secrets (API keys, passwords)
- [ ] No .env files committed
- [ ] No private keys in repo
- [ ] Dependencies scanned (npm audit)

### Code
- [ ] No eval() or Function() constructors
- [ ] No SQL injection vectors
- [ ] Input validation on all APIs
- [ ] Rate limiting configured

### Configuration
- [ ] CORS properly configured
- [ ] Security headers present
- [ ] HTTPS enforced in production
- [ ] JWT secrets rotated

### Findings
| Severity | Finding | Status | Owner |
|----------|---------|--------|-------|
| Critical | _______ | Open/Fixed | _____ |
| High | _______ | Open/Fixed | _____ |
| Medium | _______ | Open/Fixed | _____ |
| Low | _______ | Open/Fixed | _____ |

### Auditor Sign-off: _______________ Date: _______
```

### Performance Audit Checklist

```markdown
## Performance Audit Template

### Benchmarks
- [ ] 10-qubit simulation: ___ms (target: <100ms)
- [ ] 15-qubit simulation: ___ms (target: <500ms)
- [ ] 20-qubit simulation: ___ms (target: <2s)
- [ ] API response time: ___ms (target: <50ms)

### Memory
- [ ] Memory usage for 20 qubits: ___MB (target: <512MB)
- [ ] No memory leaks detected
- [ ] Garbage collection healthy

### Profiling
- [ ] CPU hotspots identified
- [ ] Slow queries logged
- [ ] Async operations non-blocking

### Regressions
| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Sim 20q | ___ms | ___ms | ±_ % |
| Memory | ___MB | ___MB | ±_ % |

### Auditor Sign-off: _______________ Date: _______
```

### Physics Accuracy Audit

```markdown
## Physics Accuracy Audit Template

### Gate Matrices
- [ ] All gates unitary (U†U = I)
- [ ] Rotation angles correct
- [ ] Controlled gates properly defined
- [ ] Global phases preserved

### State Evolution
- [ ] Normalization preserved
- [ ] Measurement probabilities sum to 1
- [ ] Entanglement entropy correct
- [ ] Time evolution unitary

### Reference Comparison
| Test Case | casimirQ | Reference | Diff | Pass? |
|-----------|----------|-----------|------|-------|
| Bell state | _______ | _______ | ___ | Y/N |
| GHZ state | _______ | _______ | ___ | Y/N |
| QFT(4) | _______ | _______ | ___ | Y/N |
| Random(20) | _______ | _______ | ___ | Y/N |

### Statistical Tests
- [ ] Measurement distribution matches expected
- [ ] Variance within tolerance
- [ ] No systematic bias detected

### Auditor Sign-off: _______________ Date: _______
```

---

## 📊 PHASE 1 IMPLEMENTATION PLAN

### Week 1: Project Setup & Math Utils

#### Day 1-2: Project Initialization
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Initialize NestJS Project                                      │
├────────────────────────────────────────────────────────────────────┤
│ Owner: DevOps Engineer + Backend Lead                               │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ NestJS project scaffolded (nest new casimirq)                   │
│ ✓ TypeScript configured                                             │
│ ✓ ESLint + Prettier configured                                      │
│ ✓ Directory structure created                                         │
│ ✓ Git repository initialized                                          │
│ ✓ Initial README with setup instructions                            │
│                                                                     │
│ Verification:                                                         │
│ ☐ npm run build succeeds                                            │
│ ☐ npm run lint passes                                               │
│ ☐ npm run test passes (default tests)                               │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Security: No default credentials                                  │
│ ☐ Config: Environment variables externalized                        │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 3-5: Complex Number Mathematics
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Complex Number Module                                          │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead + Quantum Engineer                              │
│ Duration: 3 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Complex class with real/imag properties                           │
│ ✓ Addition, subtraction, multiplication, division                   │
│ ✓ Conjugate, magnitude, argument                                    │
│ ✓ Exponential, logarithm                                            │
│ ✓ Power (complex^complex)                                           │
│ ✓ Comparison operations (equals, approximately)                     │
│                                                                     │
│ File: src/common/utils/complex.ts                                   │
│                                                                     │
│ Verification:                                                         │
│ ☐ Unit tests: 100% coverage                                         │
│ ☐ Property tests: 1000 iterations                                   │
│ ☐ Reference comparison: vs math.js                                  │
│ ☐ Edge cases: NaN, Infinity, zero handling                          │
│                                                                     │
│ Test Examples:                                                      │
│   Complex.from(1, 2).add(Complex.from(3, 4)) = (4, 6)               │
│   Complex.from(0, 1).multiply(Complex.from(0, 1)) = (-1, 0)       │
│   i * i = -1 (where i is imaginary unit)                            │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Precision: Floating point accuracy < 1e-15                      │
│ ☐ Performance: Operations < 1μs                                     │
│ ☐ Memory: No allocation leaks                                         │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 6-7: Matrix Operations
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Matrix Module                                                  │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                 │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Matrix class with Complex elements                                │
│ ✓ Matrix addition, subtraction                                       │
│ ✓ Matrix multiplication (naive and optimized)                     │
│ ✓ Identity matrix generator                                         │
│ ✓ Zero matrix generator                                             │
│ ✓ Adjoint (conjugate transpose)                                     │
│ ✓ Tensor product (Kronecker product)                                │
│ ✓ Matrix trace                                                      │
│ ✓ Matrix power                                                      │
│                                                                     │
│ File: src/common/utils/matrix.ts                                    │
│                                                                     │
│ Verification:                                                         │
│ ☐ Unit tests: 100% coverage                                         │
│ ☐ Performance: 8x8 mult < 1ms                                       │
│ ☐ Correctness: vs reference library                                 │
│ ☐ Property: (A⊗B)(C⊗D) = (AC)⊗(BD)                                │
│                                                                     │
│ Critical for Quantum:                                                 │
│ ☐ Tensor product handles 2^n x 2^n for n up to 20                   │
│ ☐ Uses BigInt for indexing > 2^32                                   │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Memory: No stack overflow on large tensors                        │
│ ☐ Numerical: No precision loss in tensor products                   │
└────────────────────────────────────────────────────────────────────┘
```

---

### Week 2: Gate Library

#### Day 8-9: Single-Qubit Gates
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Standard Single-Qubit Gates                                    │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Quantum Engineer (Lead)                                      │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Pauli-X (NOT) gate                                                │
│ ✓ Pauli-Y gate                                                      │
│ ✓ Pauli-Z gate                                                      │
│ ✓ Hadamard gate                                                     │
│ ✓ Phase gate (S)                                                    │
│ ✓ π/8 gate (T)                                                      │
│ ✓ Rx, Ry, Rz rotation gates                                         │
│ ✓ General phase gate P(θ)                                           │
│ ✓ General rotation gate U(θ, φ, λ)                                  │
│                                                                     │
│ File: src/modules/gate-library/standard-gates/                    │
│                                                                     │
│ Matrix Definitions (must match exactly):                            │
│   X = [[0, 1], [1, 0]]                                              │
│   Y = [[0, -i], [i, 0]]                                             │
│   Z = [[1, 0], [0, -1]]                                             │
│   H = 1/√2 [[1, 1], [1, -1]]                                        │
│   S = [[1, 0], [0, i]]                                              │
│   T = [[1, 0], [0, e^(iπ/4)]]                                       │
│                                                                     │
│ Verification:                                                         │
│ ☐ Matrix values match reference within 1e-15                      │
│ ☐ Unitary check: U†U = I for all gates                              │
│ ☐ Eigenvalues correct                                               │
│ ☐ Clifford gates generate correct subgroup                          │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Physics: All gates unitary                                         │
│ ☐ Math: Rotation angles correct                                      │
│ ☐ API: Gate factory pattern extensible                               │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 10-11: Multi-Qubit Gates
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Entanglement Gates                                             │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Quantum Engineer                                               │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ CNOT (Controlled-X)                                               │
│ ✓ CZ (Controlled-Z)                                                 │
│ ✓ SWAP                                                               │
│ ✓ CCNOT / Toffoli (Controlled-Controlled-X)                         │
│ ✓ Controlled-U (arbitrary)                                            │
│ ✓ Fredkin (Controlled-SWAP)                                           │
│ ✓ General controlled gate factory                                     │
│                                                                     │
│ File: src/modules/gate-library/standard-gates/entanglement-gates.ts│
│                                                                     │
│ Verification:                                                         │
│ ☐ CNOT generates Bell states correctly                                │
│ ☐ Toffoli is self-inverse                                             │
│ ☐ SWAP is self-inverse                                                │
│ ☐ Controlled gates reduce to single-qubit when control is |1⟩       │
│ ☐ Circuit identities: CNOT₁₂ ∘ CNOT₂₁ ∘ CNOT₁₂ = SWAP₁₂             │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Physics: Entanglement created correctly                            │
│ ☐ Math: Matrix dimensions correct                                    │
│ ☐ Performance: Sparse representation where possible                  │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 12-14: Gate Library Service
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Gate Library Service                                           │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 3 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ GateLibraryModule                                                   │
│ ✓ GateRegistry service                                                │
│ ✓ Gate lookup by name                                                 │
│ ✓ Gate validation (check unitarity)                                   │
│ ✓ Custom gate registration                                            │
│ ✓ Parametric gate factory                                             │
│ ✓ Gate decomposition utilities                                          │
│ ✓ Gate optimization (fusion rules)                                    │
│                                                                     │
│ File: src/modules/gate-library/gate-library.service.ts            │
│                                                                     │
│ API Example:                                                        │
│   const h = gateLibrary.getGate('H');                                 │
│   const rx = gateLibrary.createRotationGate('Rx', Math.PI / 4);      │
│   const custom = gateLibrary.registerGate('custom', matrix);        │
│                                                                     │
│ Verification:                                                         │
│ ☐ All standard gates accessible by name                             │
│ ☐ Custom gates can be registered and retrieved                        │
│ ☐ Parametric gates generate correct matrices                          │
│ ☐ Invalid gates rejected with clear error                             │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ API: REST endpoints documented                                      │
│ ☐ Security: No code injection via custom gates                        │
│ ☐ Performance: Gate lookup O(1)                                       │
└────────────────────────────────────────────────────────────────────┘
```

---

### Week 3: Circuit Engine

#### Day 15-17: Circuit Builder
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Circuit Builder                                                │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 3 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Circuit class (immutable)                                           │
│ ✓ Qubit registration                                                  │
│ ✓ Gate application methods                                          │
│ ✓ Circuit composition (circuit1.then(circuit2))                     │
│ ✓ Circuit repetition (circuit.repeat(n))                            │
│ ✓ Circuit inversion (circuit.inverse())                             │
│ ✓ Circuit depth calculation                                           │
│ ✓ Gate count by type                                                  │
│ ✓ Circuit equality comparison                                         │
│                                                                     │
│ File: src/modules/circuit-engine/circuit.ts                         │
│                                                                     │
│ API Example:                                                        │
│   const circuit = Circuit.create(2)                                   │
│     .h(0)                                                             │
│     .cx(0, 1)                                                         │
│     .measure([0, 1]);                                                │
│                                                                     │
│   const doubled = circuit.then(circuit);                            │
│   const inverse = circuit.inverse();                                  │
│                                                                     │
│ Verification:                                                         │
│ ☐ Bell circuit creates correct state                                  │
│ ☐ GHZ circuit creates correct state                                   │
│ ☐ Circuit composition order correct                                   │
│ ☐ Inverse returns circuit to identity                                 │
│ ☐ Depth calculated correctly                                            │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Immutability: All operations return new instances                   │
│ ☐ Memory: Efficient representation (gate list, not matrix)            │
│ ☐ Validation: Invalid operations throw descriptive errors               │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 18-19: QASM Parser
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: OpenQASM 2.0 Parser                                            │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ QASM lexer/tokenizer                                                │
│ ✓ QASM parser (ANTLR or hand-written)                                 │
│ ✓ OpenQASM 2.0 support                                                │
│ ✓ qelib1.inc gates support                                            │
│ ✓ Custom gate definitions                                             │
│ ✓ Classical register declarations                                       │
│ ✓ Measurement support                                                   │
│ ✓ Barrier and reset support                                             │
│ ✓ Parse error messages                                                  │
│                                                                     │
│ File: src/modules/circuit-engine/qasm/                                │
│                                                                     │
│ Supported Syntax:                                                   │
│   OPENQASM 2.0;                                                       │
│   include "qelib1.inc";                                             │
│   qreg q[2];                                                          │
│   creg c[2];                                                          │
│   h q[0];                                                             │
│   cx q[0],q[1];                                                       │
│   measure q -> c;                                                     │
│                                                                     │
│ Verification:                                                         │
│ ☐ Valid QASM files parse successfully                                 │
│ ☐ Invalid QASM produces clear errors                                  │
│ ☐ Parsed circuit matches expected structure                           │
│ ☐ Roundtrip: Circuit → QASM → Circuit is equivalent                 │
│                                                                     │
│ Test Files:                                                           │
│ ☐ Bell state circuit                                                  │
│ ☐ GHZ state circuit                                                     │
│ ☐ QFT circuit                                                           │
│ ☐ Complex parameterized circuit                                       │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Security: No code execution from QASM                                 │
│ ☐ Performance: Large circuits parse in <1s                              │
│ ☐ Correctness: All QASM 2.0 constructs supported                      │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 20-21: Circuit Controller & API
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Circuit REST API                                               │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ CircuitController                                                     │
│ ✓ POST /circuits (create circuit)                                     │
│ ✓ GET /circuits/:id (get circuit)                                       │
│ ✓ POST /circuits/:id/simulate (run simulation)                        │
│ ✓ POST /circuits/parse-qasm (import QASM)                             │
│ ✓ GET /circuits/:id/export-qasm (export QASM)                         │
│ ✓ Circuit validation pipe                                             │
│ ✓ Circuit response DTOs                                                 │
│ ✓ Swagger documentation                                                 │
│                                                                     │
│ File: src/modules/circuit-engine/circuit-engine.controller.ts       │
│                                                                     │
│ API Example:                                                        │
│   POST /api/v1/circuits                                               │
│   {                                                                   │
│     "numQubits": 2,                                                   │
│     "gates": [                                                        │
│       { "type": "H", "targets": [0] },                                │
│       { "type": "CX", "controls": [0], "targets": [1] }               │
│       { "type": "MEASURE", "targets": [0, 1] }                        │
│     ]                                                                 │
│   }                                                                   │
│                                                                     │
│ Verification:                                                         │
│ ☐ All endpoints return 200 for valid requests                         │
│ ☐ Invalid requests return 400 with clear errors                       │
│ ☐ Circuit serialization/deserialization correct                       │
│ ☐ Integration tests pass                                                  │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Security: Input validation on all endpoints                       │
│ ☐ Performance: Response <100ms for circuits <100 gates                 │
│ ☐ Documentation: OpenAPI spec complete                                │
└────────────────────────────────────────────────────────────────────┘
```

---

### Week 4: Statevector Engine

#### Day 22-24: Statevector Simulator
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Dense Statevector Simulation                                   │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Quantum Engineer (Lead) + Backend Lead                       │
│ Duration: 3 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Statevector class                                                   │
│ ✓ Sparse representation (Map<bigint, Complex>)                        │
│ ✓ Statevector initialization (|0...0⟩)                              │
│ ✓ Gate application (single-qubit)                                     │
│ ✓ Gate application (multi-qubit)                                      │
│ ✓ Measurement (probability calculation)                               │
│ ✓ Measurement (outcome sampling)                                      │
│ ✓ Measurement (state collapse)                                        │
│ ✓ Parallel amplitude computation                                      │
│ ✓ Memory-efficient tensor contractions                                │
│                                                                     │
│ File: src/modules/simulation-engines/engines/statevector-engine/    │
│                                                                     │
│ Critical Implementation:                                            │
│ ☐ Use BigInt for state indices > 2^32                                 │
│ ☐ Sparse representation: Only store non-zero amplitudes               │
│ ☐ Lazy evaluation: Don't compute full vector until needed           │
│ ☐ Gate fusion: Combine adjacent gates before application              │
│                                                                     │
│ Verification:                                                         │
│ ☐ Bell state: |Φ+⟩ = (|00⟩ + |11⟩)/√2                                 │
│ ☐ GHZ state: (|0...0⟩ + |1...1⟩)/√2                                   │
│ ☐ Measurement probabilities sum to 1                                    │
│ ☐ Post-measurement state normalized                                   │
│ ☐ Random measurement follows probability distribution                 │
│                                                                     │
│ Benchmark:                                                            │
│ ☐ 10 qubits: <100ms                                                    │
│ ☐ 15 qubits: <500ms                                                    │
│ ☐ 20 qubits: <2000ms                                                   │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Physics: State evolution unitary                                       │
│ ☐ Math: Probabilities correct (within floating point)                 │
│ ☐ Performance: Memory usage <512MB for 20 qubits                      │
│ ☐ Correctness: Results match reference (ket library)                  │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 25-26: Simulation Engine Service
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Simulation Engine Interface                                    │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ ISimulationEngine interface                                         │
│ ✓ BaseEngine abstract class                                           │
│ ✓ SimulationEnginesModule                                             │
│ ✓ Engine registry                                                       │
│ ✓ Engine selection logic                                              │
│ ✓ Simulation result DTOs                                                │
│ ✓ Simulation job tracking                                               │
│                                                                     │
│ File: src/modules/simulation-engines/                               │
│                                                                     │
│ Interface:                                                          │
│   interface ISimulationEngine {                                       │
│     name: string;                                                     │
│     supports(circuit: Circuit): boolean;                              │
│     simulate(circuit: Circuit, options?: SimOptions): SimulationResult;│
│     estimateResources(circuit: Circuit): ResourceEstimate;            │
│   }                                                                   │
│                                                                     │
│ Verification:                                                         │
│ ☐ Statevector engine implements interface                             │
│ ☐ Engine selection picks appropriate backend                          │
│ ☐ Simulation results contain amplitudes and probabilities             │
│ ☐ Error handling for unsupported circuits                             │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Design: Interface extensible for future engines                     │
│ ☐ Testing: Mock engine for unit tests                                 │
│ ☐ Documentation: Usage examples provided                              │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 27-28: Integration & Final Testing
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Phase 1 Integration                                              │
├────────────────────────────────────────────────────────────────────┤
│ Owner: All Team Members                                             │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Full integration test suite                                         │
│ ✓ Performance benchmarks                                              │
│ ✓ Reference comparison (vs ket library)                             │
│ ✓ Documentation complete                                              │
│ ✓ Deployment to staging                                               │
│                                                                     │
│ Integration Tests:                                                    │
│ ☐ End-to-end: QASM → Circuit → Simulation → Results               │
│ ☐ Bell state creation and measurement                                 │
│ ☐ GHZ state creation and measurement                                  │
│ ☐ 20-qubit random circuit simulation                                  │
│ ☐ Concurrent simulation requests                                      │
│                                                                     │
│ Performance Validation:                                               │
│ ☐ 10-qubit simulation: ___ ms (target <100ms)                        │
│ ☐ 15-qubit simulation: ___ ms (target <500ms)                        │
│ ☐ 20-qubit simulation: ___ ms (target <2000ms)                        │
│ ☐ Memory usage: ___ MB (target <512MB)                                │
│                                                                     │
│ Reference Comparison:                                               │
│ ☐ Install original ket library                                        │
│ ☐ Run identical circuits on both                                      │
│ ☐ Compare amplitudes (should match within 1e-10)                    │
│ ☐ Document any discrepancies                                          │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Security: Full security scan pass                                     │
│ ☐ Performance: All benchmarks meet targets                            │
│ ☐ Coverage: Test coverage ≥80% (100% for math)                        │
│ ☐ Docs: API documentation complete                                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## ✅ PHASE 1 COMPLETION SIGN-OFF

### Final Verification Summary

| Checkpoint | Status | Date | Sign-off |
|------------|--------|------|----------|
| W1: Math Utilities | ☐ Pass ☐ Fail | _____ | _________ |
| W2: Gate Library | ☐ Pass ☐ Fail | _____ | _________ |
| W3: Circuit Engine | ☐ Pass ☐ Fail | _____ | _________ |
| W4: Statevector Engine | ☐ Pass ☐ Fail | _____ | _________ |

### Audit Summary

| Audit Type | Status | Findings |
|------------|--------|----------|
| Security | ☐ Pass ☐ Fail | _______ |
| Performance | ☐ Pass ☐ Fail | _______ |
| Code Quality | ☐ Pass ☐ Fail | _______ |
| Physics Accuracy | ☐ Pass ☐ Fail | _______ |

### Success Criteria Verification

- [ ] Can create and simulate circuits up to 20 qubits
  - Verified by: _______________ Date: _______
  
- [ ] All standard gates implemented with matrix representations
  - Verified by: _______________ Date: _______
  
- [ ] Basic QASM 2.0 support
  - Verified by: _______________ Date: _______
  
- [ ] Measurement produces valid probability distributions
  - Verified by: _______________ Date: _______
  
- [ ] All unit tests pass with ≥100% coverage on core math
  - Verified by: _______________ Date: _______
  
- [ ] Code review approved by at least 2 reviewers
  - Verified by: _______________ Date: _______
  
- [ ] Documentation complete
  - Verified by: _______________ Date: _______

### Final Signatures (All Required)

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Lead | | | |
| Quantum Engineer | | | |
| Backend Lead | | | |
| QA Engineer | | | |
| DevOps Engineer | | | |

---

## 🚪 PHASE 1 EXIT CRITERIA

**All items must be checked to proceed to Phase 2:**

```
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 1 EXIT GATE                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  REQUIREMENTS                                                       │
│  ☐ All 4 weekly checkpoints passed                                  │
│  ☐ All 4 audits passed with no critical findings                    │
│  ☐ All 7 success criteria verified                                  │
│  ☐ All 5 team members signed off                                    │
│  ☐ Staging deployment successful                                    │
│  ☐ Documentation complete                                             │
│                                                                     │
│  STATUS: ☐ APPROVED FOR PHASE 2   ☐ BLOCKED (see issues below)      │
│                                                                     │
│  Blocker Issues (if any):                                             │
│  _______________________________________________________________    │
│  _______________________________________________________________    │
│                                                                     │
│  Approved by: _______________________ Date: _______________          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 📚 APPENDIX A: Phase 1 File Structure

```
src/
├── main.ts
├── app.module.ts
│
├── common/
│   └── utils/
│       ├── complex.ts              [W1] Complex number math
│       ├── complex.spec.ts         [W1] 100% coverage tests
│       ├── matrix.ts               [W1] Matrix operations
│       ├── matrix.spec.ts          [W1] 100% coverage tests
│       └── tensor.ts               [W1] Tensor products
│
├── modules/
│   ├── gate-library/
│   │   ├── gate-library.module.ts
│   │   ├── gate-library.service.ts
│   │   ├── interfaces/
│   │   │   └── gate.interface.ts
│   │   └── standard-gates/
│   │       ├── pauli-gates.ts      [W2] X, Y, Z gates
│       │       ├── hadamard-gate.ts  [W2] H gate
│       │       ├── phase-gates.ts    [W2] S, T gates
│       │       ├── rotation-gates.ts [W2] Rx, Ry, Rz
│       │       └── entanglement-gates.ts [W2] CNOT, SWAP, Toffoli
│   │
│   ├── circuit-engine/
│   │   ├── circuit-engine.module.ts
│   │   ├── circuit-engine.service.ts
│   │   ├── circuit-engine.controller.ts
│   │   ├── dto/
│   │   │   ├── create-circuit.dto.ts
│   │   │   └── circuit-response.dto.ts
│   │   ├── circuit.ts            [W3] Circuit builder
│   │   ├── circuit.spec.ts
│   │   └── qasm/
│   │       ├── parser.ts           [W3] QASM 2.0 parser
│   │       └── parser.spec.ts
│   │
│   └── simulation-engines/
│       ├── simulation-engines.module.ts
│       ├── simulation-engines.service.ts
│       ├── interfaces/
│       │   └── simulation-engine.interface.ts
│       └── engines/
│           └── statevector-engine/
│               ├── statevector-engine.ts    [W4] Dense simulator
│               ├── statevector-engine.spec.ts
│               └── statevector.ts
│
└── tests/
    ├── unit/
    ├── integration/
    └── benchmarks/
        └── statevector.benchmark.ts  [W4] Performance tests
```

---

## 📚 APPENDIX B: Reference Values for Testing

### Bell States
```
|Φ+⟩ = (|00⟩ + |11⟩)/√2  →  amplitudes: {0: 1/√2, 3: 1/√2}
|Φ−⟩ = (|00⟩ − |11⟩)/√2  →  amplitudes: {0: 1/√2, 3: -1/√2}
|Ψ+⟩ = (|01⟩ + |10⟩)/√2  →  amplitudes: {1: 1/√2, 2: 1/√2}
|Ψ−⟩ = (|01⟩ − |10⟩)/√2  →  amplitudes: {1: 1/√2, 2: -1/√2}
```

### GHZ State (n qubits)
```
|GHZ⟩ = (|0...0⟩ + |1...1⟩)/√2
For n=3: amplitudes: {0: 1/√2, 7: 1/√2}
```

### Gate Matrices (Verified Values)
```javascript
// Use these exact values in tests
const H = [[0.7071067811865475, 0.7071067811865475],
           [0.7071067811865475, -0.7071067811865475]];

const S = [[1, 0], [0, {real: 0, imag: 1}]];

const T = [[1, 0], [0, {real: 0.7071067811865476, imag: 0.7071067811865475}]];
```

---

## 📚 APPENDIX C: Weekly Standup Template

```markdown
## Week X Standup - casimirQ Phase 1

### Date: _______

#### Completed Since Last Standup
- [ ] Task 1
- [ ] Task 2

#### Blockers
| Blocker | Owner | ETA Resolution |
|---------|-------|----------------|
| _______ | _____ | _________ |

#### This Week's Goals
- [ ] Goal 1
- [ ] Goal 2

#### Audit Findings (if any)
- Finding: _______
- Severity: _______
- Owner: _______
- ETA Fix: _______

---
Team Signature: _______________
```

---

## 📚 APPENDIX D: Code Review Checklist

```markdown
## Code Review Template

### PR: _______
### Author: _______
### Reviewer: _______

#### Code Quality
- [ ] Follows style guide
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Meaningful variable names
- [ ] Functions are focused and small

#### Testing
- [ ] Unit tests included
- [ ] Tests cover edge cases
- [ ] All tests pass
- [ ] Coverage meets threshold

#### Documentation
- [ ] JSDoc for public APIs
- [ ] Complex logic commented
- [ ] README updated if needed

#### Quantum Correctness (if applicable)
- [ ] Gate matrices verified
- [ ] Unitary check passed
- [ ] Physics review completed

#### Security
- [ ] No secrets in code
- [ ] Input validated
- [ ] No injection vulnerabilities

#### Performance
- [ ] No obvious bottlenecks
- [ ] BigInt used for >32 qubits
- [ ] Memory efficient

**Approval:** ☐ Approved ☐ Changes Requested
**Reviewer:** _______________ **Date:** _______
```

---

*Document Version: 1.0*
*Phase: 1 (Foundation & Core Engine)*
*Duration: 4 Weeks*
*Last Updated: 2026-06-27*
