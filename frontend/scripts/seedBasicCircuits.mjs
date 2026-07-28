// Verify, seed, and export the Circuit Library.
//   node scripts/seedBasicCircuits.mjs verify   -> simulate each circuit, report
//   node scripts/seedBasicCircuits.mjs seed      -> verify, then (re)create the
//                                                   saved circuits + write JSON
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CATEGORIES, CIRCUITS, CONCEPTUAL } from './basicCircuits.mjs';

const BASE = process.env.CASQ_BASE_URL ?? 'http://localhost:3000/api/v1';
const EMAIL = process.env.CASQ_EMAIL ?? 'admin@example.com';
const PASSWORD = process.env.CASQ_PASSWORD ?? 'admin123';
const PREFIX = 'Library · ';
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? 'Misc';
const savedName = (c) => `${PREFIX}${catLabel(c.cat)} · ${c.name}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Throttled fetch that respects the API's 100-req/min limit: 250ms base spacing
// plus a wait-and-retry when a 429 is returned.
async function req(url, opts, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, opts);
    if (r.status !== 429) {
      await sleep(650);
      return r;
    }
    const body = await r.json().catch(() => ({}));
    const secs = Number(String(body.message ?? '').match(/(\d+)\s*second/)?.[1] ?? 5);
    await sleep((secs + 1) * 1000);
  }
  throw new Error(`rate limited after ${tries} retries: ${url}`);
}

async function login() {
  const r = await req(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`login failed: ${r.status}`);
  return (await r.json()).access_token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

async function verify(token) {
  const results = [];
  for (const c of CIRCUITS) {
    try {
      const r = await req(`${BASE}/circuits/${c.key}-verify/simulate`, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ numQubits: c.n, operations: c.ops, circuitName: c.name, shots: 64 }),
      });
      if (r.ok) {
        results.push({ key: c.key, ok: true });
      } else {
        const body = await r.json().catch(() => ({}));
        results.push({ key: c.key, ok: false, msg: body.message ?? r.status });
      }
    } catch (e) {
      results.push({ key: c.key, ok: false, msg: e.message });
    }
  }
  const pass = results.filter((r) => r.ok).length;
  console.log(`\nVerification: ${pass}/${results.length} circuits simulate cleanly.\n`);
  for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.key}${r.ok ? '' : '  -> ' + r.msg}`);
  return results;
}

async function clearExisting(token) {
  const r = await req(`${BASE}/circuits?limit=500`, { headers: auth(token) });
  const list = (await r.json()).circuits ?? [];
  const lib = list.filter((c) => typeof c.name === 'string' && c.name.startsWith(PREFIX));
  for (const c of lib) {
    await req(`${BASE}/circuits/${c.id}`, { method: 'DELETE', headers: auth(token) });
  }
  console.log(`Removed ${lib.length} existing Library circuits.`);
}

async function seed(token, results) {
  await clearExisting(token);
  const okKeys = new Set(results.filter((r) => r.ok).map((r) => r.key));
  const created = [];
  for (const c of CIRCUITS) {
    if (!okKeys.has(c.key)) continue;
    const r = await req(`${BASE}/circuits`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ name: savedName(c), numQubits: c.n, operations: c.ops }),
    });
    if (r.ok) {
      const circuit = await r.json();
      created.push({ key: c.key, id: circuit.id });
    } else {
      console.log(`  ! failed to save ${c.key}: ${r.status}`);
    }
  }
  console.log(`\nSaved ${created.length} Library circuits.`);

  // Emit the frontend catalog: categories + circuits (with their saved name so
  // the page can join to backend ids) + the conceptual list.
  const catalog = {
    categories: CATEGORIES,
    circuits: CIRCUITS.map((c) => ({
      key: c.key,
      cat: c.cat,
      name: c.name,
      desc: c.desc,
      n: c.n,
      gates: c.ops.length,
      savedName: savedName(c),
    })),
    conceptual: CONCEPTUAL,
  };
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'basicCircuits.json');
  await writeFile(out, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Wrote catalog -> ${out}`);
}

const mode = process.argv[2] ?? 'verify';
const token = await login();
const results = await verify(token);
if (mode === 'seed') await seed(token, results);
