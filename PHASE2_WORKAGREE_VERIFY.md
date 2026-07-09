# 🚀 casimirQ — Phase 2: Simulation Backends

> **Phase 2 Work Agreement, Implementation Plan & Verification Protocol**

---

## 📋 PHASE 2 CONTRACT

### Scope
Implement multiple simulation backends for different use cases, enabling scale from 20+ qubits (dense) to 50+ qubits (low entanglement) to 1000+ qubits (stabilizer circuits).

### Timeline
**4 Weeks** (Weeks 5-8)

### Deliverables
| Week | Deliverable | Owner | Verification Method |
|------|-------------|-------|---------------------|
| W5 | MPS Engine | Quantum Engineer | 50-qubit benchmark |
| W6 | Clifford Engine | Quantum Engineer | 1000-qubit stabilizer test |
| W7 | Density Matrix Engine | Backend Lead | Mixed state simulation |
| W8 | Backend Router | Backend Lead | Auto-selection validation |

### Success Criteria (Pass/Fail)
- [ ] MPS engine handles 50+ qubits with low entanglement
- [ ] Clifford engine handles 1000+ qubits for stabilizer circuits
- [ ] Density matrix supports decoherence modeling
- [ ] Smart routing chooses optimal backend based on circuit characteristics
- [ ] All backends pass correctness tests against reference implementations
- [ ] Performance benchmarks meet targets
- [ ] Code review approved by at least 2 reviewers
- [ ] Documentation complete

---

## 🤝 WORK AGREEMENT

### 1. Roles & Responsibilities

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PHASE 2 TEAM                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Project Lead    │  │ Quantum Engineer │  │ Backend Engineer │ │
│  │                  │  │                  │  │                  │ │
│  │ • Milestone     │  │ • MPS tensors   │  │ • Backend router │ │
│  │   approval       │  │ • CHP algorithm │  │ • Interface      │ │
│  │ • Blockers       │  │ • Stabilizers   │  │ • Integration    │ │
│  │ • Final sign-off │  │ • Noise models  │  │ • Optimization   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐                       │
│  │ QA Engineer      │  │ DevOps Engineer  │                       │ │
│  │                  │  │                  │                       │ │
│  │ • Benchmarks     │  │ • CI/CD          │                       │ │
│  │ • Reference      │  │ • Performance    │                       │ │
│  │   comparisons    │  │   monitoring     │                       │ │
│  └──────────────────┘  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Communication Protocol

| Event | Channel | Response Time | Escalation |
|-------|---------|---------------|------------|
| Daily Standup | Slack #phase2-standup | Async by 10 AM | Auto-escalate if missed |
| Blockers | Slack @project-lead | 2 hours | Emergency call if >4h |
| Code Review | GitHub PR | 24 hours | Force merge with 2 approvals |
| Verification | PR comment | Sync with PR | Block merge if failed |
| Benchmark Results | Email + Dashboard | 4 hours | Weekly review meeting |

### 3. Definition of Done (Per Task)

**Required Checklist for EVERY task:**

```markdown
## Task Completion Checklist

### Implementation
- [ ] Code written following NestJS style guide
- [ ] No TypeScript compiler errors
- [ ] No ESLint warnings
- [ ] Algorithm matches reference paper/implementation

### Testing
- [ ] Unit tests written (≥80% coverage)
- [ ] Integration tests with StatevectorEngine comparison
- [ ] Performance benchmarks
- [ ] All tests passing (`npm run test`)
- [ ] Correctness verified against reference

### Documentation
- [ ] JSDoc comments for public APIs
- [ ] Algorithm reference (paper/link)
- [ ] Complexity analysis (time/space)

### Review
- [ ] Self-review completed (author)
- [ ] Peer review approved (1 reviewer min)
- [ ] Quantum Engineer review (physics validation)

### Verification
- [ ] Verification steps executed and passed
- [ ] Benchmark results recorded
- [ ] Reference comparison documented

### Audit
- [ ] Security scan passed
- [ ] Performance regression check
- [ ] Memory leak check
```

---

## 🔍 VERIFICATION PROTOCOL

### Weekly Verification Gates

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VERIFICATION WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WEEK 5: MPS ENGINE                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Implement│───→│ Unit Test│───→│ 50-Qubit │───→│  Compare │     │
│  │  Tensors │    │  SVD     │    │ Benchmark│    │ vs Dense │     │
│  │  Bonds   │    │  Canon   │    │          │    │          │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│       │                               │                  │          │
│       └───────────────────────────────┴──────────────────┘          │
│                    Gate: ALL PASS → Proceed to W6                   │
│                    Gate: ANY FAIL → Fix → Re-verify                 │
│                                                                      │
│  WEEK 6: CLIFFORD ENGINE                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │Implement │───→│  CHP     │───→│ 1000-Q   │───→│  Verify  │     │
│  │  Tableau │    │  Algo    │    │  Test    │    │  Stabs   │     │
│  │  Stabs   │    │          │    │          │    │          │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                      │
│  WEEK 7: DENSITY MATRIX ENGINE                                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │Implement │───→│  Noise   │───→│  Mixed   │───→│  Audit   │     │
│  │  ρ Matrix│    │  Channels│    │  States  │    │  Report  │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                      │
│  WEEK 8: BACKEND ROUTER                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  Router  │───→│  Circuit │───→│  Auto    │───→│  Audit   │     │
│  │  Logic   │    │  Analyzer│    │  Select  │    │  Report  │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 PHASE 2 IMPLEMENTATION PLAN

### Week 5: MPS Engine (Matrix Product States)

#### Day 1-2: Tensor Network Foundation
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: MPS Tensor Implementation                                    │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Quantum Engineer                                             │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Tensor3 class (3-way tensor)                                      │
│ ✓ Tensor contractions                                               │
│ ✓ SVD (Singular Value Decomposition)                               │
│ ✓ Truncation based on bond dimension χ                             │
│                                                                     │
│ Reference:                                                          │
│ - Schollwöck (2011) "The density-matrix renormalization group"      │
│ - https://tensornetwork.org/mps/                                    │
│                                                                     │
│ Verification:                                                       │
│ ☐ SVD produces correct singular values                              │
│ ☐ Tensor contractions preserve indices                              │
│ ☐ Truncation keeps largest singular values                          │
│                                                                     │
│ Performance Targets:                                                  │
│ ☐ SVD on 100×100 matrix < 10ms                                      │
│ ☐ Memory O(n·χ²) where n = qubits, χ = bond dimension               │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 3-4: MPS State Representation
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: MPS State Vector                                              │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Quantum Engineer                                               │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ MPS state initialization (product state)                          │
│ ✓ Canonical forms (left/right/canonical)                            │
│ ✓ Bond dimension management                                           │
│ ✓ Entanglement entropy calculation                                  │
│                                                                     │
│ Key Formula:                                                        │
│ |ψ⟩ = Σ A^1_{α1} A^2_{α1,α2} ... A^n_{αn-1} |i1,i2,...,in⟩        │
│                                                                     │
│ Verification:                                                       │
│ ☐ Product state has zero entanglement entropy                       │
│ ☐ Bell state has entanglement entropy = ln(2)                       │
│ ☐ Canonical form preserves orthogonality                            │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 5-7: MPS Gate Application
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Apply Gates to MPS                                            │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Quantum Engineer                                               │
│ Duration: 3 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Single-qubit gate application                                     │
│ ✓ Two-qubit gate application (SWAP method)                        │
│ ✓ Canonicalization after gates                                      │
│ ✓ SVD truncation to control bond dimension                          │
│                                                                     │
│ Algorithm:                                                          │
│ 1. Apply gate to local tensors                                      │
│ 2. Perform SVD on merged tensor                                     │
│ 3. Truncate to bond dimension χ                                     │
│ 4. Restore canonical form                                           │
│                                                                     │
│ Verification:                                                       │
│ ☐ Gate application preserves normalization                          │
│ ☐ Results match dense simulation for χ ≥ 2^n                         │
│ ☐ Truncation error controlled                                       │
└────────────────────────────────────────────────────────────────────┘
```

---

### Week 6: Clifford Engine (Stabilizer Circuits)

#### Day 8-9: Stabilizer Tableau
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: CHP Algorithm Implementation                                │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Quantum Engineer                                               │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Stabilizer tableau (2n × 2n binary matrix)                       │
│ ✓ Destabilizer tableau                                              │
│ ✓ Phase vector (r)                                                  │
│ ✓ Pauli operator representation                                     │
│                                                                     │
│ Reference:                                                          │
│ - Aaronson & Gottesman (2004) "Improved simulation of stabilizer"   │
│ - CHP: C implementation of stabilizer circuits                      │
│                                                                     │
│ Verification:                                                       │
│ ☐ Tableau represents stabilizer group correctly                     │
│ ☐ All Pauli operators commute                                       │
│ ☐ Phase is ±1                                                       │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 10-11: Clifford Gate Operations
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Clifford Gates on Tableau                                     │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Quantum Engineer                                               │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ H gate conjugation of Pauli operators                             │
│ ✓ S gate conjugation                                                │
│ ✓ CNOT gate conjugation                                            │
│ ✓ Measurement in computational basis                                 │
│                                                                     │
│ Key Operations:                                                     │
│ H: X ↔ Z                                                            │
│ S: X → Y, Z → Z                                                     │
│ CNOT: Xi → XiXj, Zi → Zi, Xj → Xj, Zj → ZiZj                      │
│                                                                     │
│ Verification:                                                       │
│ ☐ Gate operations are O(n) time                                     │
│ ☐ Results match dense simulation for Clifford circuits            │
│ ☐ Measurement produces ±1 outcomes                                  │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 12-14: 1000-Qubit Benchmark
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Large-Scale Clifford Simulation                               │
├────────────────────────────────────────────────────────────────────┤
│ Owner: QA Engineer                                                    │
│ Duration: 3 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Benchmark circuits with 1000 qubits                             │
│ ✓ Verify correctness against known results                          │
│ ✓ Performance profiling                                               │
│ ✓ Memory usage analysis                                             │
│                                                                     │
│ Test Circuits:                                                      │
│ ☐ 1000-qubit GHZ state                                              │
│ ☐ 1000-qubit graph state                                            │
│ ☐ Random Clifford circuit                                             │
│                                                                     │
│ Verification:                                                       │
│ ☐ Simulation completes in < 1 second                                │
│ ☐ Memory usage < 100 MB                                             │
│ ☐ Results match reference implementation                            │
└────────────────────────────────────────────────────────────────────┘
```

---

### Week 7: Density Matrix Engine

#### Day 15-17: Mixed State Representation
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Density Matrix Operations                                     │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 3 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ DensityMatrix class (ρ = |ψ⟩⟨ψ|)                                 │
│ ✓ Mixed state creation (convex combinations)                        │
│ ✓ Partial trace operation                                           │
│ ✓ Von Neumann entropy                                               │
│                                                                     │
│ Key Formulas:                                                       │
│ ρ = Σ p_i |ψ_i⟩⟨ψ_i|                                                │
│ S(ρ) = -Tr(ρ log ρ)                                                │
│                                                                     │
│ Verification:                                                       │
│ ☐ Pure state: ρ² = ρ                                                │
│ ☐ Mixed state: Tr(ρ²) < 1                                           │
│ ☐ Trace(ρ) = 1                                                      │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 18-19: Noise Channels
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Quantum Noise Models                                          │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Depolarizing channel                                              │
│ ✓ Amplitude damping (T1)                                            │
│ ✓ Phase damping (T2)                                                │
│ ✓ Generalized Pauli channels                                        │
│                                                                     │
│ Noise Operators:                                                    │
│ Depolarizing: E(ρ) = (1-p)ρ + p·I/2^n                              │
│ Amplitude damping: E0 = |0⟩⟨0| + √(1-γ)|1⟩⟨1|, E1 = √γ|0⟩⟨1|       │
│                                                                     │
│ Verification:                                                       │
│ ☐ Channel is completely positive trace-preserving (CPTP)          │
│ ☐ Kraus operators sum to identity                                   │
│ ☐ Results match Lindblad master equation (short times)              │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 20-21: Noisy Circuit Simulation
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Noisy Gate Execution                                          │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Apply gates with noise                                            │
│ ✓ Interleaved gate and noise operations                             │
│ ✓ Device-specific noise profiles (placeholder)                    │
│ ✓ Benchmark noisy circuits                                          │
│                                                                     │
│ Verification:                                                       │
│ ☐ Decoherence reduces off-diagonal elements                           │
│ ☐ T1 relaxation toward thermal state                                  │
│ ☐ Results match known noisy simulations                               │
└────────────────────────────────────────────────────────────────────┘
```

---

### Week 8: Backend Router

#### Day 22-23: Circuit Analysis
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Circuit Characterization                                        │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Entanglement entropy estimation                                   │
│ ✓ Circuit depth analysis                                            │
│ ✓ Gate type classification                                          │
│ ✓ Clifford circuit detection                                        │
│                                                                     │
│ Analysis Methods:                                                   │
│ ☐ Count non-Clifford gates (T, T†, Rx, Ry, Rz)                      │
│ ☐ Estimate bond dimension from gate pattern                         │
│ ☐ Check for mid-circuit measurements                                │
│                                                                     │
│ Verification:                                                       │
│ ☐ Correctly identifies Clifford circuits                            │
│ ☐ Estimates complexity accurately                                   │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 24-25: Backend Selection Logic
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Smart Backend Router                                            │
├────────────────────────────────────────────────────────────────────┤
│ Owner: Backend Lead                                                   │
│ Duration: 2 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Decision tree for backend selection                               │
│ ✓ Fallback mechanisms                                                 │
│ ✓ User override options                                               │
│ ✓ Performance prediction                                              │
│                                                                     │
│ Selection Rules:                                                      │
│ IF circuit has non-Clifford gates:                                  │
│   IF n ≤ 20: StatevectorEngine                                        │
│   IF n ≤ 50 AND low entanglement: MpsEngine                         │
│   IF requires noise: DensityMatrixEngine                              │
│ ELSE (Clifford only):                                                 │
│   USE CliffordEngine (up to 1000+ qubits)                             │
│                                                                     │
│ Verification:                                                       │
│ ☐ Correctly routes test circuits                                    │
│ ☐ Falls back gracefully on failure                                  │
│ ☐ User can override selection                                       │
└────────────────────────────────────────────────────────────────────┘
```

#### Day 26-28: Integration & Final Testing
```
┌────────────────────────────────────────────────────────────────────┐
│ TASK: Phase 2 Integration                                             │
├────────────────────────────────────────────────────────────────────┤
│ Owner: All Team Members                                             │
│ Duration: 3 days                                                    │
│                                                                     │
│ Deliverables:                                                       │
│ ✓ Full integration test suite                                         │
│ ✓ Performance benchmarks                                              │
│ ✓ Reference comparison (all backends)                               │
│ ✓ Documentation complete                                              │
│                                                                     │
│ Integration Tests:                                                    │
│ ☐ Same circuit on all backends produces equivalent results          │
│ ☐ Router selects correct backend                                    │
│ ☐ Benchmark: 50-qubit MPS < 5s                                      │
│ ☐ Benchmark: 1000-qubit Clifford < 1s                               │
│ ☐ Benchmark: 10-qubit noisy circuit < 10s                             │
│                                                                     │
│ Performance Validation:                                               │
│ ☐ MPS 50 qubits: ___ ms (target < 5000ms)                           │
│ ☐ Clifford 1000 qubits: ___ ms (target < 1000ms)                    │
│ ☐ Density matrix 10 qubits: ___ ms (target < 10000ms)               │
│                                                                     │
│ Audit Checkpoints:                                                    │
│ ☐ Security: Full security scan pass                                 │
│ ☐ Performance: All benchmarks meet targets                            │
│ ☐ Coverage: Test coverage ≥80%                                        │
│ ☐ Docs: API documentation complete                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## ✅ PHASE 2 COMPLETION SIGN-OFF

### Final Verification Summary

| Checkpoint | Status | Date | Sign-off |
|------------|--------|------|----------|
| W5: MPS Engine | ☐ Pass ☐ Fail | _____ | _________ |
| W6: Clifford Engine | ☐ Pass ☐ Fail | _____ | _________ |
| W7: Density Matrix | ☐ Pass ☐ Fail | _____ | _________ |
| W8: Backend Router | ☐ Pass ☐ Fail | _____ | _________ |

### Benchmark Summary

| Backend | Max Qubits | Typical Use | Benchmark | Target | Result |
|---------|------------|-------------|-----------|--------|--------|
| Statevector | 28 | General circuits | 20-qubit GHZ | < 2000ms | _____ |
| MPS | 50+ | Low entanglement | 50-qubit chain | < 5000ms | _____ |
| Clifford | 1000+ | Stabilizer circuits | 1000-qubit GHZ | < 1000ms | _____ |
| Density | 15 | Noisy circuits | 10-qubit noisy | < 10000ms | _____ |

### Success Criteria Verification

- [ ] MPS engine handles 50+ qubits with low entanglement
  - Verified by: _______________ Date: _______
  
- [ ] Clifford engine handles 1000+ qubits for stabilizer circuits
  - Verified by: _______________ Date: _______
  
- [ ] Density matrix supports decoherence modeling
  - Verified by: _______________ Date: _______
  
- [ ] Smart routing chooses optimal backend
  - Verified by: _______________ Date: _______
  
- [ ] All backends pass correctness tests
  - Verified by: _______________ Date: _______
  
- [ ] Performance benchmarks met
  - Verified by: _______________ Date: _______
  
- [ ] Code review approved
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

---

## 🚪 PHASE 2 EXIT CRITERIA

**All items must be checked to proceed to Phase 3:**

```
┌────────────────────────────────────────────────────────────────────┐
│                    PHASE 2 EXIT GATE                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  REQUIREMENTS                                                       │
│  ☐ All 4 weekly checkpoints passed                                  │
│  ☐ All 4 backends implemented and tested                            │
│  ☐ Router correctly selects backends                                  │
│  ☐ All 8 success criteria verified                                  │
│  ☐ All 4 team members signed off                                    │
│  ☐ Performance benchmarks documented                                │
│  ☐ Documentation complete                                             │
│                                                                      │
│  STATUS: ☐ APPROVED FOR PHASE 3   ☐ BLOCKED (see issues below)      │
│                                                                      │
│  Blocker Issues (if any):                                             │
│  _______________________________________________________________    │
│  _______________________________________________________________    │
│                                                                      │
│  Approved by: _______________________ Date: _______________          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📚 APPENDIX A: Algorithm References

### MPS/Tensor Networks
1. Schollwöck, U. (2011). "The density-matrix renormalization group in the age of matrix product states." *Annals of Physics*, 326(1), 96-192.
2. https://tensornetwork.org/mps/

### Clifford/CHP
1. Aaronson, S., & Gottesman, D. (2004). "Improved simulation of stabilizer circuits." *Physical Review A*, 70(5), 052328.
2. Gottesman, D. (1998). "The Heisenberg representation of quantum computers." *arXiv:quant-ph/9807006*.

### Density Matrix
1. Nielsen & Chuang, Chapter 8: "Quantum Noise and Quantum Operations"
2. Lindblad, G. (1976). "On the generators of quantum dynamical semigroups." *Communications in Mathematical Physics*, 48(2), 119-130.

---

*Document Version: 1.0*  
*Phase: 2 (Simulation Backends)*  
*Duration: 4 Weeks*  
*Last Updated: 2026-06-27*
