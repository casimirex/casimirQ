# Quantum Computing Concepts

## Quantum Gates

### Single-Qubit Gates

#### Hadamard (H)
Creates superposition:
```
H|0⟩ = |+⟩ = (|0⟩ + |1⟩)/√2
H|1⟩ = |−⟩ = (|0⟩ - |1⟩)/√2
```

#### Pauli Gates
- **X** (NOT): |0⟩ ↔ |1⟩
- **Y**: Phase flip + bit flip
- **Z**: Phase flip (|1⟩ → -|1⟩)

#### Phase Gates
- **S** (π/2): |1⟩ → i|1⟩
- **T** (π/4): |1⟩ → e^(iπ/4)|1⟩

### Multi-Qubit Gates

#### CNOT (Controlled-NOT)
```
|00⟩ → |00⟩
|01⟩ → |01⟩
|10⟩ → |11⟩
|11⟩ → |10⟩
```

#### Toffoli (CCNOT)
Controlled-controlled-NOT: flips target if both controls are |1⟩.

#### SWAP
Exchanges states of two qubits.

## Quantum States

### Bloch Sphere
A qubit's state can be visualized as a point on the surface of a sphere:
- **North pole**: |0⟩
- **South pole**: |1⟩
- **Equator**: Equal superposition

State representation:
```
|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
```

### Entanglement
Two qubits are entangled when their joint state cannot be factored:
```
|Φ+⟩ = (|00⟩ + |11⟩)/√2  (Bell state)
```

## Measurement

### Computational Basis
Measurement collapses the state to |0⟩ or |1⟩ with probability:
```
P(|0⟩) = |α|² where |ψ⟩ = α|0⟩ + β|1⟩
```

### Expectation Values
For observable O: ⟨O⟩ = ⟨ψ|O|ψ⟩

## Simulation Methods

### Statevector Simulation
- **Best for**: Small to medium circuits (≤20 qubits)
- **Memory**: O(2ⁿ) complex numbers
- **Speed**: Fast for dense circuits

### Clifford Simulation
- **Best for**: Clifford circuits (stabilizer circuits)
- **Memory**: O(n²) for tableau representation
- **Speed**: Extremely fast, polynomial in n

### Matrix Product States (MPS)
- **Best for**: Large circuits with limited entanglement
- **Memory**: O(n × D²) where D is bond dimension
- **Speed**: Good for low-entanglement circuits

## Quantum Algorithms

### Grover's Search
- **Purpose**: Search unsorted database
- **Speedup**: Quadratic (O(√N) vs O(N))
- **Key component**: Grover diffusion operator

### Shor's Algorithm
- **Purpose**: Integer factorization
- **Speedup**: Exponential
- **Key component**: Quantum Fourier Transform

### Quantum Fourier Transform (QFT)
- **Purpose**: Basis for many quantum algorithms
- **Use cases**: Phase estimation, Shor's algorithm

### VQE (Variational Quantum Eigensolver)
- **Purpose**: Find ground state energy
- **Approach**: Hybrid quantum-classical
- **Key component**: Parameterized ansatz circuit

## Quantum Error Correction

### Steane Code [[7,1,3]]
- **Physical qubits**: 7
- **Logical qubits**: 1
- **Distance**: 3 (corrects 1 error)

### Shor Code [[9,1,3]]
- **Physical qubits**: 9
- **Logical qubits**: 1
- **Distance**: 3 (corrects arbitrary single-qubit error)

### Stabilizer Formalism
Error detection via syndrome measurement without disturbing encoded information.

## Noise Models

### Depolarizing Channel
```
ρ → (1-p)ρ + p/3(XρX + YρY + ZρZ)
```

### Amplitude Damping
Models energy relaxation (T₁ processes):
```
|1⟩ → |0⟩ with probability γ
```

### Phase Damping
Models dephasing (T₂ processes):
```
|+⟩ → mixed state with probability γ
```

## Quantum Machine Learning

### Quantum Kernels
Compute similarity between data points using quantum circuits:
```
K(x, y) = |⟨φ(x)|φ(y)⟩|²
```

### Variational Circuits
Parameterized circuits trained via gradient descent:
```
minimize C(θ) = ⟨ψ(θ)|H|ψ(θ)⟩
```

### Data Encoding
Methods to encode classical data:
- **Basis encoding**: Map to computational basis
- **Amplitude encoding**: Encode in amplitudes
- **Angle encoding**: Use rotation gates

## Circuit Optimization

### Gate Cancellation
Adjacent inverse gates cancel: X·X = I

### Commutation Rules
Some gates can be reordered:
```
CNOT(a,b)·CNOT(c,d) = CNOT(c,d)·CNOT(a,b) if {a,b} ∩ {c,d} = ∅
```

### Circuit Compilation
Transform high-level circuits to hardware-compatible gates.
