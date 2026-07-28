 Here is the complete catalog of **basic quantum circuits** and **interface circuits** — the atomic building blocks from which every larger quantum algorithm is constructed. Think of these as the "letters" that form the "words" and "sentences" of quantum computation.

---

## Category 1: Single-Qubit Gates (The Alphabet)

These manipulate one qubit at a time. Every multi-qubit circuit is ultimately decomposed into these.

| # | Circuit Name | What It Does |
|---|-------------|-------------|
| 1 | **Pauli-X Gate Circuit** | Quantum NOT gate — flips \|0⟩ ↔ \|1⟩ |
| 2 | **Pauli-Y Gate Circuit** | Flips and adds a phase (rotates around Y-axis by π) |
| 3 | **Pauli-Z Gate Circuit** | Phase flip — leaves \|0⟩ unchanged, flips sign of \|1⟩ |
| 4 | **Hadamard Gate Circuit (H)** | Creates superposition: turns \|0⟩ into (|0⟩+|1⟩)/√2 |
| 5 | **Phase Gate Circuit (S Gate)** | Adds 90° phase to \|1⟩ — S² = Z |
| 6 | **π/8 Gate Circuit (T Gate)** | Adds 45° phase to \|1⟩ — T² = S — the "magic" gate for universality |
| 7 | **T† Gate Circuit** (T-dagger) | Inverse of T — subtracts 45° phase |
| 8 | **S† Gate Circuit** (S-dagger) | Inverse of S — subtracts 90° phase |
| 9 | **Rx(θ) Rotation Circuit** | Rotates around X-axis by angle θ |
| 10 | **Ry(θ) Rotation Circuit** | Rotates around Y-axis by angle θ |
| 11 | **Rz(θ) Rotation Circuit** | Rotates around Z-axis by angle θ |
| 12 | **General U3(θ,φ,λ) Circuit** | Most general single-qubit unitary (IBM's native gate) |
| 13 | **√X Gate Circuit** (Square-root of X) | Halfway between identity and X — used in some hardware |
| 14 | **√Z Gate Circuit** (Square-root of Z) | Equivalent to S gate |
| 15 | **Identity Gate Circuit (I)** | Does nothing — placeholder for timing/noise isolation |

---

## Category 2: Two-Qubit Gates (The Glue)

These create entanglement — the "secret sauce" of quantum computing. No multi-qubit algorithm works without them.

| # | Circuit Name | What It Does |
|---|-------------|-------------|
| 16 | **Controlled-NOT Circuit (CNOT / CX)** | Flips target qubit if control is \|1⟩ — the most important two-qubit gate |
| 17 | **Controlled-Z Circuit (CZ)** | Applies Z to target if control is \|1⟩ — symmetric, no "direction" |
| 18 | **Controlled-Y Circuit (CY)** | Applies Y to target if control is \|1⟩ |
| 19 | **SWAP Gate Circuit** | Exchanges the states of two qubits |
| 20 | **√SWAP Gate Circuit** | Halfway swap — creates entanglement |
| 21 | **iSWAP Gate Circuit** | Swap with a phase — native on some superconducting hardware |
| 22 | **√iSWAP Gate Circuit** | Google's Sycamore native gate |
| 23 | **Controlled-Phase Circuit (CP)** | General controlled phase rotation |
| 24 | **Controlled-U Circuit** | Applies any single-qubit gate U conditionally |
| 25 | **B Gate Circuit** (Berkeley gate) | A specific two-qubit entangling gate |
| 26 | **Molmer-Sorensen Gate Circuit** | Native gate on trapped-ion systems |
| 27 | **Cross-Resonance Gate Circuit** | IBM's native two-qubit gate |
| 28 | **fSim Gate Circuit** | Google's native gate family (combination of iSWAP and CZ) |

---

## Category 3: Three-Qubit Gates (Classical Reversible Logic)

These are built from single and two-qubit gates, but are so commonly used they are treated as primitives.

| # | Circuit Name | What It Does |
|---|-------------|-------------|
| 29 | **Toffoli Gate Circuit (CCNOT / CCX)** | Controlled-Controlled-NOT — flips target only if both controls are \|1⟩ |
| 30 | **Fredkin Gate Circuit (CSWAP)** | Controlled-SWAP — swaps two qubits if control is \|1⟩ |
| 31 | **Controlled-Controlled-Z Circuit (CCZ)** | Applies Z if both controls are \|1⟩ |
| 32 | **Peres Gate Circuit** | A simplified universal reversible gate |
| 33 | **Deutsch Gate Circuit** | A 3-qubit gate that is universal by itself |

---

## Category 4: State Preparation Circuits (Getting Started)

Before any computation, qubits must be put into the right initial state.

| # | Circuit Name | What It Prepares |
|---|-------------|-----------------|
| 34 | **|0⟩ Initialization Circuit** | Resets qubit to ground state |
| 35 | **|1⟩ Preparation Circuit** | Applies X to |0⟩ to get |1⟩ |
| 36 | **|+⟩ Preparation Circuit** | Applies H to |0⟩ — equal superposition |
| 37 | **|-⟩ Preparation Circuit** | Applies H to |1⟩ — equal superposition with negative phase |
| 38 | **|+i⟩ Preparation Circuit** | Applies S then H to |0⟩ |
| 39 | **|-i⟩ Preparation Circuit** | Applies S† then H to |0⟩ |
| 40 | **Bell State Preparation Circuit** | Creates maximally entangled Bell pair (|00⟩+|11⟩)/√2 |
| 41 | **GHZ State Preparation Circuit** | Creates (|000...0⟩ + |111...1⟩)/√2 for n qubits |
| 42 | **W State Preparation Circuit** | Creates equal superposition of all "one-hot" states |
| 43 | **Dicke State Preparation Circuit** | Creates states with fixed Hamming weight |
| 44 | **Graph State Preparation Circuit** | Prepares cluster states for measurement-based QC |
| 45 | **Magic State Preparation Circuit** | Prepares |T⟩ = (|0⟩ + e^(iπ/4)|1⟩)/√2 for fault-tolerant T-gates |

---

## Category 5: Measurement Circuits (Reading Out)

These extract classical information from quantum states.

| # | Circuit Name | What It Does |
|---|-------------|-------------|
| 46 | **Computational Basis Measurement Circuit (Z-basis)** | Measures in |0⟩/|1⟩ basis |
| 47 | **X-Basis Measurement Circuit** | Measures in |+⟩/|-⟩ basis (H then Z-measure) |
| 48 | **Y-Basis Measurement Circuit** | Measures in |+i⟩/|-i⟩ basis |
| 49 | **Bell Basis Measurement Circuit** | Projects onto the four Bell states |
| 50 | **Parity Measurement Circuit** | Measures joint parity of two qubits |
| 51 | **Stabilizer Measurement Circuit** | Measures Pauli strings for error correction |
| 52 | **Weak Measurement Circuit** | Partial, non-destructive measurement |
| 53 | **Quantum Non-Demolition Measurement Circuit** | Measures without collapsing the state |

---

## Category 6: Interface & Subroutine Circuits (Reusable Patterns)

These are the "helper circuits" that appear again and again inside larger algorithms.

| # | Circuit Name | What It Does |
|---|-------------|-------------|
| 54 | **Quantum Teleportation Protocol Circuit** | Transfers an unknown quantum state using entanglement + classical communication |
| 55 | **Superdense Coding Protocol Circuit** | Sends 2 classical bits using 1 qubit and entanglement |
| 56 | **Entanglement Swapping Circuit** | Creates entanglement between distant qubits via intermediate Bell measurement |
| 57 | **Swap Test Circuit** | Compares two quantum states for similarity |
| 58 | **Destructive Swap Test Circuit** | Variant that destroys the states being compared |
| 59 | **Hadamard Test Circuit** | Estimates ⟨ψ|U|ψ⟩ for a unitary U |
| 60 | **Quantum Phase Estimation Subroutine Circuit** | Estimates eigenvalue phase of a unitary |
| 61 | **Grover Diffusion Operator Circuit** | The "reflection about average" operator in Grover's search |
| 62 | **Oracle Construction Circuit** | Encodes a classical function into a quantum phase or Boolean oracle |
| 63 | **Quantum Fourier Transform (QFT) Circuit** | Transforms from computational to Fourier basis |
| 64 | **Inverse QFT Circuit** | The reverse transformation |
| 65 | **Amplitude Amplification Circuit** | Generalization of Grover's iteration |
| 66 | **Quantum Walk Step Circuit** | One step of a discrete-time quantum walk |
| 67 | **Trotter-Suzuki Decomposition Circuit** | Breaks Hamiltonian evolution into small gate sequences |
| 68 | **Qubitization / Quantum Singular Value Transform Circuit** | Advanced Hamiltonian simulation technique |
| 69 | **Quantum Adder Circuit** (Draper / Cuccaro / QFT-based) | Adds two quantum numbers |
| 70 | **Quantum Modular Exponentiation Circuit** | Computes a^x mod N — core of Shor's algorithm |
| 71 | **Quantum Comparator Circuit** | Compares two quantum registers |
| 72 | **Quantum Multiplier Circuit** | Multiplies two quantum numbers |
| 73 | **Quantum Ripple-Carry Adder Circuit** | Classical-style adder with carry propagation |
| 74 | **Quantum Carry-Lookahead Adder Circuit** | Faster parallel adder |
| 75 | **Controlled-Rotation Circuit** | Applies rotation angle controlled by a quantum register |
| 76 | **Multiplexer Circuit (Quantum)** | Routes quantum information based on control |
| 77 | **Quantum RAM (QRAM) Interface Circuit** | Theoretical model for quantum memory access |
| 78 | **Magic State Distillation Circuit** | Purifies noisy magic states for fault-tolerant T-gates |
| 79 | **Syndrome Extraction Circuit** | Reads error syndromes without collapsing data |
| 80 | **Flag Qubit Circuit** | Detects high-weight errors during syndrome measurement |
| 81 | **Lattice Surgery Circuit** | Merges/splits logical qubits in surface codes |
| 82 | **Transversal Gate Circuit** | Fault-tolerant gates that don't spread errors |

---

## Category 7: Universal Gate Sets (The Minimal Toolkits)

These are the smallest collections of basic circuits that can approximate **any** quantum computation. Every circuit above can be built from one of these sets.

| # | Universal Set | Gates Included |
|---|---------------|---------------|
| 83 | **Clifford + T Set** | {H, S, CNOT, T} — the standard fault-tolerant set |
| 84 | **Barenco Universal Set** | {CNOT, all single-qubit gates} |
| 85 | **Boykin Universal Set** | {CNOT, H, T} |
| 86 | **Kitaev Universal Set** | {CNOT, Rz(π/4), S} |
| 87 | **Toffoli + H Universal Set** | {Toffoli, H} — classical reversible + quantum |
| 88 | **Deutsch Gate Universal Set** | {Deutsch gate} — single 3-qubit gate is enough |
| 89 | **IBM Native Set** | {U3, CNOT} — U3 is general single-qubit |
| 90 | **Google Sycamore Set** | {√iSWAP, S, H, CZ} |
| 91 | **Trapped-Ion Native Set** | {MS gate (Molmer-Sorensen), single-qubit rotations} |

---

## The "Baby Steps" Hierarchy

If you want to learn these in order, here is the progression:

```
Step 1:  Single-Qubit Gates (1-15)        → Learn the alphabet
Step 2:  State Preparation (34-45)        → Learn to write words  
Step 3:  Two-Qubit Gates (16-28)          → Learn to connect words
Step 4:  Measurement (46-53)               → Learn to read what you wrote
Step 5:  Three-Qubit Gates (29-33)        → Learn compound words
Step 6:  Interface Subroutines (54-82)     → Learn sentences
Step 7:  Universal Sets (83-91)            → Learn that any language can be spoken
Step 8:  Full Algorithms                   → Write essays (Shor, Grover, etc.)
```

Every quantum algorithm ever invented — from Deutsch's algorithm to Shor's factoring to VQE — is nothing more than a clever arrangement of these 91 fundamental building blocks.