import { Test, TestingModule } from '@nestjs/testing';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { SimulationEnginesModule } from '../../simulation-engines/simulation-engines.module';
import { ShorsAlgorithm } from './shors-algorithm';

describe('ShorsAlgorithm (genuine quantum order finding)', () => {
  let shor: ShorsAlgorithm;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
    }).compile();
    shor = new ShorsAlgorithm(module.get<SimulationEnginesService>(SimulationEnginesService));
  });

  it('builds a genuine order-finding circuit (not a bare QFT)', () => {
    const circuit = shor.buildCircuit(15, 7);
    // m=4 work + t=8 counting = 12 qubits.
    expect(circuit.getMetadata().qubitCount).toBe(12);
    // A real modular-exponentiation circuit has many gates.
    expect(circuit.getMetadata().gateCount).toBeGreaterThan(50);
  });

  it('recovers the order via QPE: ord_15(7) = 4, ord_15(2) = 4, ord_15(4) = 2', () => {
    expect(shor.quantumOrder(15, 7)).toBe(4);
    expect(shor.quantumOrder(15, 2)).toBe(4);
    expect(shor.quantumOrder(15, 4)).toBe(2);
  });

  it('recovers the order for N = 21: ord_21(2) = 6, ord_21(5) = 6', () => {
    expect(shor.quantumOrder(21, 2)).toBe(6);
    expect(shor.quantumOrder(21, 5)).toBe(6);
  });

  it('factors 15 into 3 × 5 via quantum order finding', () => {
    const out = shor.execute(15).output as { factors: number[]; period: number };
    expect(out.factors).toEqual([3, 5]);
    expect(out.period).toBeGreaterThan(0);
    expect(out.period % 2).toBe(0);
  });

  it('factors 21 into 3 × 7 via quantum order finding', () => {
    const out = shor.execute(21).output as { factors: number[]; period: number };
    expect(out.factors).toEqual([3, 7]);
  });

  it('handles trivial cases (prime, even)', () => {
    expect((shor.execute(13).output as { factors: number[] }).factors).toEqual([13]);
    expect((shor.execute(14).output as { factors: number[] }).factors).toEqual([2, 7]);
  });

  it('rejects a base not coprime to N and N too large for the simulator', () => {
    expect(() => shor.buildCircuit(15, 3)).toThrow(); // gcd(3,15)=3
    expect(() => shor.buildCircuit(35, 2)).toThrow(); // needs 18 qubits > cap
  });

  it('verify() factors its budgeted instances', () => {
    for (const r of shor.verify()) {
      expect(r.passed).toBe(true);
    }
  });
});
