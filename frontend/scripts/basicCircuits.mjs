// Single source of truth for the Circuit Library — the buildable subset of the
// basic_circuits_complet.md catalogue, expressed in the CasimirQ engine's gate
// set. Each entry is verified against the live simulate endpoint and written to
// src/data/basicCircuits.json for the frontend Library page.
//
// Operation format matches the backend: { gate, targets:[...], params?:[...] }.
// For controlled gates targets = [control, target]; ccx = [c1, c2, t];
// ccz (alias of mcz) = [c1, c2, target].

const PI = Math.PI;
const g = (gate, targets, params) => (params ? { gate, targets, params } : { gate, targets });

export const CATEGORIES = [
  { id: 1, label: 'Single-Qubit Gates', blurb: 'The alphabet — one qubit at a time.' },
  { id: 2, label: 'Two-Qubit Gates', blurb: 'The glue — controlled operations that entangle.' },
  { id: 3, label: 'Three-Qubit Gates', blurb: 'Reversible classical logic as primitives.' },
  { id: 4, label: 'State Preparation', blurb: 'Getting qubits into a known starting state.' },
  { id: 5, label: 'Measurement', blurb: 'Reading classical information out of qubits.' },
  { id: 6, label: 'Interface & Subroutines', blurb: 'Reusable patterns inside larger algorithms.' },
];

export const CIRCUITS = [
  // ---- Category 1: Single-Qubit Gates ----
  { key: 'pauli-x', cat: 1, name: 'Pauli-X Gate', n: 1, desc: 'Quantum NOT — flips |0⟩ ↔ |1⟩.', ops: [g('x', [0])] },
  { key: 'pauli-y', cat: 1, name: 'Pauli-Y Gate', n: 1, desc: 'Bit + phase flip (π rotation about Y).', ops: [g('y', [0])] },
  { key: 'pauli-z', cat: 1, name: 'Pauli-Z Gate', n: 1, desc: 'Phase flip — shown on |+⟩ so the sign is visible.', ops: [g('h', [0]), g('z', [0])] },
  { key: 'hadamard', cat: 1, name: 'Hadamard Gate', n: 1, desc: 'Creates superposition: |0⟩ → (|0⟩+|1⟩)/√2.', ops: [g('h', [0])] },
  { key: 's-gate', cat: 1, name: 'Phase Gate (S)', n: 1, desc: 'Adds 90° phase to |1⟩. S² = Z.', ops: [g('h', [0]), g('s', [0])] },
  { key: 't-gate', cat: 1, name: 'π/8 Gate (T)', n: 1, desc: 'Adds 45° phase to |1⟩. The "magic" gate for universality.', ops: [g('h', [0]), g('t', [0])] },
  { key: 't-dagger', cat: 1, name: 'T† Gate', n: 1, desc: 'Inverse of T — subtracts 45° phase.', ops: [g('h', [0]), g('tdg', [0])] },
  { key: 's-dagger', cat: 1, name: 'S† Gate', n: 1, desc: 'Inverse of S — subtracts 90° phase.', ops: [g('h', [0]), g('sdg', [0])] },
  { key: 'rx', cat: 1, name: 'Rx(θ) Rotation', n: 1, desc: 'Rotation about the X-axis (θ = π/2 shown).', ops: [g('rx', [0], [PI / 2])] },
  { key: 'ry', cat: 1, name: 'Ry(θ) Rotation', n: 1, desc: 'Rotation about the Y-axis (θ = π/2 shown).', ops: [g('ry', [0], [PI / 2])] },
  { key: 'rz', cat: 1, name: 'Rz(θ) Rotation', n: 1, desc: 'Rotation about the Z-axis (θ = π/2 shown), on |+⟩.', ops: [g('h', [0]), g('rz', [0], [PI / 2])] },
  { key: 'u3', cat: 1, name: 'U3(θ,φ,λ) Gate', n: 1, desc: 'General single-qubit unitary as Rz(λ)·Ry(θ)·Rz(φ).', ops: [g('rz', [0], [PI / 8]), g('ry', [0], [PI / 2]), g('rz', [0], [PI / 4])] },
  { key: 'sqrt-x', cat: 1, name: '√X Gate', n: 1, desc: 'Square-root of X ≈ Rx(π/2) — halfway between I and X.', ops: [g('rx', [0], [PI / 2])] },
  { key: 'sqrt-z', cat: 1, name: '√Z Gate', n: 1, desc: 'Square-root of Z — identical to the S gate, on |+⟩.', ops: [g('h', [0]), g('s', [0])] },
  { key: 'identity', cat: 1, name: 'Identity Gate (I)', n: 1, desc: 'Does nothing — Rz(0), a timing/placeholder gate.', ops: [g('rz', [0], [0])] },

  // ---- Category 2: Two-Qubit Gates (control prepared in |1⟩ so the effect shows) ----
  { key: 'cnot', cat: 2, name: 'CNOT (CX)', n: 2, desc: 'Flips the target when control = |1⟩. Control set to |1⟩ → |11⟩.', ops: [g('x', [0]), g('cx', [0, 1])] },
  { key: 'cz', cat: 2, name: 'Controlled-Z (CZ)', n: 2, desc: 'Phase-flips when both are |1⟩. Target |+⟩ → |−⟩.', ops: [g('x', [0]), g('h', [1]), g('cz', [0, 1])] },
  { key: 'cy', cat: 2, name: 'Controlled-Y (CY)', n: 2, desc: 'Applies Y to the target when control = |1⟩.', ops: [g('x', [0]), g('cy', [0, 1])] },
  { key: 'ch', cat: 2, name: 'Controlled-H (CH)', n: 2, desc: 'Applies Hadamard to the target when control = |1⟩.', ops: [g('x', [0]), g('ch', [0, 1])] },
  { key: 'swap', cat: 2, name: 'SWAP Gate', n: 2, desc: 'Exchanges the two qubits: |10⟩ → |01⟩.', ops: [g('x', [0]), g('swap', [0, 1])] },
  { key: 'cphase', cat: 2, name: 'Controlled-Phase (CP)', n: 2, desc: 'Controlled phase rotation (λ = π/2), on |1,+⟩.', ops: [g('x', [0]), g('h', [1]), g('cp', [0, 1], [PI / 2])] },

  // ---- Category 3: Three-Qubit Gates ----
  { key: 'toffoli', cat: 3, name: 'Toffoli (CCX)', n: 3, desc: 'Flips the target only if both controls are |1⟩ → |111⟩.', ops: [g('x', [0]), g('x', [1]), g('ccx', [0, 1, 2])] },
  { key: 'fredkin', cat: 3, name: 'Fredkin (CSWAP)', n: 3, desc: 'Swaps two qubits if the control is |1⟩: |1,1,0⟩ → |1,0,1⟩.', ops: [g('x', [0]), g('x', [1]), g('cswap', [0, 1, 2])] },
  { key: 'ccz', cat: 3, name: 'Controlled-Controlled-Z (CCZ)', n: 3, desc: 'Phase-flip when both controls are |1⟩. Target |+⟩ → |−⟩.', ops: [g('x', [0]), g('x', [1]), g('h', [2]), g('ccz', [0, 1, 2])] },
  { key: 'peres', cat: 3, name: 'Peres Gate', n: 3, desc: 'A universal reversible gate: Toffoli followed by CNOT.', ops: [g('x', [0]), g('x', [1]), g('ccx', [0, 1, 2]), g('cx', [0, 1])] },

  // ---- Category 4: State Preparation ----
  { key: 'prep-0', cat: 4, name: '|0⟩ Initialization', n: 1, desc: 'Ground state — the default qubit state.', ops: [g('rz', [0], [0])] },
  { key: 'prep-1', cat: 4, name: '|1⟩ Preparation', n: 1, desc: 'Apply X to |0⟩.', ops: [g('x', [0])] },
  { key: 'prep-plus', cat: 4, name: '|+⟩ Preparation', n: 1, desc: 'Apply H to |0⟩ — equal superposition.', ops: [g('h', [0])] },
  { key: 'prep-minus', cat: 4, name: '|−⟩ Preparation', n: 1, desc: 'Apply H to |1⟩ — superposition with a minus phase.', ops: [g('x', [0]), g('h', [0])] },
  { key: 'prep-plus-i', cat: 4, name: '|+i⟩ Preparation', n: 1, desc: 'Apply H then S to |0⟩.', ops: [g('h', [0]), g('s', [0])] },
  { key: 'prep-minus-i', cat: 4, name: '|−i⟩ Preparation', n: 1, desc: 'Apply H then S† to |0⟩.', ops: [g('h', [0]), g('sdg', [0])] },
  { key: 'bell', cat: 4, name: 'Bell State', n: 2, desc: 'Maximally entangled pair (|00⟩+|11⟩)/√2.', ops: [g('h', [0]), g('cx', [0, 1])] },
  { key: 'ghz', cat: 4, name: 'GHZ State', n: 3, desc: '(|000⟩+|111⟩)/√2 — all-or-nothing entanglement.', ops: [g('h', [0]), g('cx', [0, 1]), g('cx', [1, 2])] },
  { key: 'graph-state', cat: 4, name: 'Graph / Cluster State', n: 3, desc: 'H on every qubit, then CZ on each edge of a line.', ops: [g('h', [0]), g('h', [1]), g('h', [2]), g('cz', [0, 1]), g('cz', [1, 2])] },
  { key: 'magic-state', cat: 4, name: 'Magic State |T⟩', n: 1, desc: '(|0⟩+e^{iπ/4}|1⟩)/√2 — resource for fault-tolerant T gates.', ops: [g('h', [0]), g('t', [0])] },

  // ---- Category 5: Measurement ----
  { key: 'meas-z', cat: 5, name: 'Z-basis Measurement', n: 1, desc: 'Measure a |+⟩ superposition in the computational basis → 50/50.', ops: [g('h', [0]), g('measure', [0])] },
  { key: 'meas-x', cat: 5, name: 'X-basis Measurement', n: 1, desc: 'Rotate with H then measure — |+⟩ reads out deterministically.', ops: [g('h', [0]), g('h', [0]), g('measure', [0])] },
  { key: 'meas-y', cat: 5, name: 'Y-basis Measurement', n: 1, desc: 'S†·H basis change before measuring |+i⟩.', ops: [g('h', [0]), g('s', [0]), g('sdg', [0]), g('h', [0]), g('measure', [0])] },
  { key: 'meas-bell', cat: 5, name: 'Bell-basis Measurement', n: 2, desc: 'CX·H basis change projects a Bell pair onto the Bell basis.', ops: [g('h', [0]), g('cx', [0, 1]), g('cx', [0, 1]), g('h', [0]), g('measure', [0, 1])] },
  { key: 'meas-parity', cat: 5, name: 'Parity Measurement', n: 3, desc: 'XOR two data qubits onto an ancilla and measure the parity.', ops: [g('x', [0]), g('cx', [0, 2]), g('cx', [1, 2]), g('measure', [2])] },

  // ---- Category 6: Interface & Subroutines ----
  { key: 'qft3', cat: 6, name: 'Quantum Fourier Transform (3q)', n: 3, desc: 'Hadamards + controlled phases + a final swap.', ops: [g('h', [0]), g('cp', [1, 0], [PI / 2]), g('cp', [2, 0], [PI / 4]), g('h', [1]), g('cp', [2, 1], [PI / 2]), g('h', [2]), g('swap', [0, 2])] },
  { key: 'iqft3', cat: 6, name: 'Inverse QFT (3q)', n: 3, desc: 'The QFT run backwards, with negated phases.', ops: [g('swap', [0, 2]), g('h', [2]), g('cp', [2, 1], [-PI / 2]), g('h', [1]), g('cp', [2, 0], [-PI / 4]), g('cp', [1, 0], [-PI / 2]), g('h', [0])] },
  { key: 'oracle', cat: 6, name: 'Phase Oracle', n: 2, desc: 'Marks |11⟩ with a −1 phase via CZ.', ops: [g('h', [0]), g('h', [1]), g('cz', [0, 1])] },
  { key: 'grover-diffusion', cat: 6, name: 'Grover Diffusion Operator', n: 2, desc: 'Reflection about the mean: H·X·CZ·X·H.', ops: [g('h', [0]), g('h', [1]), g('x', [0]), g('x', [1]), g('cz', [0, 1]), g('x', [0]), g('x', [1]), g('h', [0]), g('h', [1])] },
  { key: 'grover-iter', cat: 6, name: 'Amplitude Amplification (Grover iteration)', n: 2, desc: 'One oracle + one diffusion step — amplifies |11⟩.', ops: [g('h', [0]), g('h', [1]), g('cz', [0, 1]), g('h', [0]), g('h', [1]), g('x', [0]), g('x', [1]), g('cz', [0, 1]), g('x', [0]), g('x', [1]), g('h', [0]), g('h', [1])] },
  { key: 'teleportation', cat: 6, name: 'Quantum Teleportation', n: 3, desc: 'Bell pair + Bell measurement + X/Z corrections (deferred).', ops: [g('ry', [0], [0.8]), g('h', [1]), g('cx', [1, 2]), g('cx', [0, 1]), g('h', [0]), g('cx', [1, 2]), g('cz', [0, 2]), g('measure', [0, 1])] },
  { key: 'superdense', cat: 6, name: 'Superdense Coding', n: 2, desc: 'Send 2 classical bits (here "11") over 1 qubit + entanglement.', ops: [g('h', [0]), g('cx', [0, 1]), g('z', [0]), g('x', [0]), g('cx', [0, 1]), g('h', [0]), g('measure', [0, 1])] },
  { key: 'swap-test', cat: 6, name: 'Swap Test', n: 3, desc: 'Ancilla + controlled-SWAP + H estimates state overlap.', ops: [g('h', [0]), g('cswap', [0, 1, 2]), g('h', [0]), g('measure', [0])] },
  { key: 'hadamard-test', cat: 6, name: 'Hadamard Test', n: 2, desc: 'Estimates Re⟨ψ|U|ψ⟩ for U = Z via an ancilla.', ops: [g('h', [0]), g('h', [1]), g('cz', [0, 1]), g('h', [0]), g('measure', [0])] },
  { key: 'trotter-step', cat: 6, name: 'Trotter Step (e^{-iθ ZZ})', n: 2, desc: 'One Trotter slice: CNOT · Rz(2θ) · CNOT plus X fields.', ops: [g('cx', [0, 1]), g('rz', [1], [PI / 4]), g('cx', [0, 1]), g('rx', [0], [PI / 8]), g('rx', [1], [PI / 8])] },
  { key: 'controlled-rotation', cat: 6, name: 'Controlled-Rotation (CRz)', n: 2, desc: 'Applies Rz(θ) to the target when the control is |1⟩.', ops: [g('x', [0]), g('crz', [0, 1], [PI / 2])] },
  { key: 'syndrome-extraction', cat: 6, name: 'Syndrome Extraction (bit-flip code)', n: 5, desc: 'Two ancillas read Z₀Z₁ and Z₁Z₂ parities without touching the data.', ops: [g('cx', [0, 3]), g('cx', [1, 3]), g('cx', [1, 4]), g('cx', [2, 4]), g('measure', [3, 4])] },
  { key: 'transversal-cnot', cat: 6, name: 'Transversal CNOT', n: 4, desc: 'Fault-tolerant CNOT between two 2-qubit code blocks, qubit-wise.', ops: [g('x', [0]), g('cx', [0, 2]), g('cx', [1, 3])] },
];

// Entries from the catalogue that this engine cannot express as a concrete
// circuit — shown on the Library page as "conceptual", never faked.
export const CONCEPTUAL = [
  { name: 'iSWAP / √iSWAP / √SWAP', why: 'hardware-native two-qubit gates, not in the engine basis' },
  { name: 'Mølmer–Sørensen · Cross-Resonance · fSim · B gate', why: 'device-native entangling gates' },
  { name: 'W state · Dicke state', why: 'need amplitude-exact multi-controlled prep beyond the basic set' },
  { name: 'Quantum adders · multiplier · comparator · modular exponentiation', why: 'large arithmetic circuits' },
  { name: 'QRAM · magic-state distillation · lattice surgery · flag qubits', why: 'fault-tolerance / architecture constructs' },
  { name: 'Qubitization / QSVT · weak & QND measurement', why: 'advanced / non-projective primitives' },
  { name: 'Universal gate sets (Clifford+T, IBM, Sycamore, …)', why: 'these are gate *sets*, not individual circuits' },
];
