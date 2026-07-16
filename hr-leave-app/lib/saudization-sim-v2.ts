// ============================================================
// Saudization & HRDF simulator V2 — roster-based engine + the
// canonical scenario data contract (schema 1.0).
//
// Faithful port of the SaudizationSimulator.jsx prototype (repo
// root) per SaudizationSimulator_README.md. Differences from the
// V1 engine (lib/saudization-sim.ts):
//   - Per-HIRE roster (role, name, approvedSalary, startMonth)
//     with the HRDF cap applied per employee — averaging is
//     mathematically wrong above the cap threshold.
//   - Phased hiring: each hire gets its own approval-lag +
//     support window on the timeline.
//   - Canonical scenario object: export file === import file ===
//     future API body (buildScenario / applyScenario are the only
//     adapters). CSV convenience import for the roster.
//
// Keep this file dependency-free and side-effect-free (pure math
// + pure parsers) so it can be unit-tested and reused server-side.
// ============================================================

export const SCHEMA_VERSION = '1.0';

// Re-use V1's formatting helpers so both tabs format identically.
export { sar, sarPlain, kfmt } from './saudization-sim';

export type RosterRole = 'Technician' | 'Engineer';

export interface RosterRow {
  id: string;
  role: RosterRole;
  name: string;
  /** Basic + Housing only — the HRDF base (contract: approvedSalary). */
  salary: number;
  /** 1-indexed month the hire begins. */
  startMonth: number;
  /** Optional employee code when seeded from the DB. Additive to
   *  schema 1.0 (unknown fields are ignored on import per the spec). */
  empCode?: string | null;
}

export interface ParamsV2 {
  rate: number;        // HRDF support fraction (0.4 | 0.5)
  cap: number;         // SAR/mo per-employee support cap
  lag: number;         // approval delay, months
  support: number;     // support duration, months
  otherCost: number;   // SAR/mo per hire, in gross but NOT in the HRDF base
  shadowCount: number;
  shadowCost: number;  // SAR/mo each
  violCount: number;
  violAvg: number;     // SAR per fine
  baseline: 'shadows' | 'absolute';
  curSaudi: number;
  totScope: number;
  target: number;      // fraction
}

/** Canonical scenario object — file body === API body (schema 1.0). */
export interface ScenarioV2 {
  schemaVersion: string;
  meta: { scenarioName: string; currency: 'SAR'; generatedAt: string; source: string };
  params: {
    hrdfRate: number;
    hrdfCap: number;
    approvalLagMonths: number;
    supportMonths: number;
    otherMonthlyCostPerHire: number;
    baseline: 'shadows' | 'absolute';
    shadow: { count: number; monthlyCostEach: number };
    violations: { count: number; avgFine: number };
    compliance: { saudisInCategory: number; totalInCategory: number; targetRatio: number };
  };
  roster: { role: string; name: string; approvedSalary: number; startMonth: number; empCode?: string }[];
}

const num = (v: unknown, dv: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : dv;
};

let _seq = 0;
export const uid = (): string => `e${++_seq}`;

export function defaultRosterV2(): RosterRow[] {
  const r: RosterRow[] = [];
  for (let i = 0; i < 8; i++) r.push({ id: uid(), role: 'Technician', name: `Technician ${i + 1}`, salary: 5250, startMonth: 1 });
  for (let i = 0; i < 2; i++) r.push({ id: uid(), role: 'Engineer', name: `Engineer ${i + 1}`, salary: 7500, startMonth: 1 });
  return r;
}

export function defaultParamsV2(): ParamsV2 {
  return {
    rate: 0.5, cap: 3000, lag: 3, support: 24, otherCost: 0,
    shadowCount: 10, shadowCost: 2000, violCount: 3, violAvg: 10500,
    baseline: 'shadows',
    curSaudi: 23, totScope: 100, target: 0.3,
  };
}

// ── Canonical scenario ⇄ internal state (the only adapters) ──

export function buildScenario(roster: RosterRow[], p: ParamsV2, name: string): ScenarioV2 {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      scenarioName: name || 'Untitled scenario',
      currency: 'SAR',
      generatedAt: new Date().toISOString(),
      source: 'sensei-simulator',
    },
    params: {
      hrdfRate: p.rate,
      hrdfCap: p.cap,
      approvalLagMonths: p.lag,
      supportMonths: p.support,
      otherMonthlyCostPerHire: p.otherCost,
      baseline: p.baseline,
      shadow: { count: p.shadowCount, monthlyCostEach: p.shadowCost },
      violations: { count: p.violCount, avgFine: p.violAvg },
      compliance: { saudisInCategory: p.curSaudi, totalInCategory: p.totScope, targetRatio: p.target },
    },
    roster: roster.map((e) => ({
      role: e.role,
      name: e.name,
      approvedSalary: e.salary,
      startMonth: e.startMonth,
      ...(e.empCode ? { empCode: e.empCode } : {}),
    })),
  };
}

export function applyScenario(obj: Partial<ScenarioV2> | null | undefined): { params: ParamsV2; roster: RosterRow[] } {
  const d = defaultParamsV2();
  const P: any = obj && (obj as any).params ? (obj as any).params : {};
  const params: ParamsV2 = {
    ...d,
    rate: num(P.hrdfRate, d.rate),
    cap: num(P.hrdfCap, d.cap),
    lag: num(P.approvalLagMonths, d.lag),
    support: num(P.supportMonths, d.support),
    otherCost: num(P.otherMonthlyCostPerHire, d.otherCost),
    baseline: P.baseline === 'absolute' ? 'absolute' : 'shadows',
    shadowCount: num(P.shadow && P.shadow.count, d.shadowCount),
    shadowCost: num(P.shadow && P.shadow.monthlyCostEach, d.shadowCost),
    violCount: num(P.violations && P.violations.count, d.violCount),
    violAvg: num(P.violations && P.violations.avgFine, d.violAvg),
    curSaudi: num(P.compliance && P.compliance.saudisInCategory, d.curSaudi),
    totScope: num(P.compliance && P.compliance.totalInCategory, d.totScope),
    target: num(P.compliance && P.compliance.targetRatio, d.target),
  };
  const roster: RosterRow[] = (obj && Array.isArray((obj as any).roster) ? (obj as any).roster : []).map((r: any) => ({
    id: uid(),
    role: /eng/i.test(r.role || '') ? 'Engineer' : 'Technician',
    name: r.name || r.role || 'Hire',
    // Contract key is approvedSalary; accept legacy `salary` on import.
    salary: num(r.approvedSalary != null ? r.approvedSalary : r.salary, 0),
    startMonth: Math.max(1, num(r.startMonth, 1)),
    empCode: r.empCode != null ? String(r.empCode) : null,
  }));
  return { params, roster };
}

// ── CSV convenience import (roster only) ─────────────────────

export function parseRosterCSV(text: string): RosterRow[] {
  const out: RosterRow[] = [];
  text.split(/\r?\n/).forEach((ln) => {
    if (!ln.trim()) return;
    const parts = ln.split(/[,\t;]/).map((s) => s.trim());
    const rt = (parts[0] || '').toLowerCase();
    let role: RosterRole | null = null;
    if (/tech/.test(rt)) role = 'Technician';
    else if (/eng/.test(rt)) role = 'Engineer';
    else return; // skip header / unrecognized lines
    const nums = parts.slice(1).filter((x) => x !== '' && !isNaN(parseFloat(x))).map(Number);
    const name = parts.slice(1).find((x) => x !== '' && isNaN(parseFloat(x))) || role;
    out.push({ id: uid(), role, name, salary: nums[0] || 0, startMonth: nums[1] || 1 });
  });
  return out;
}

export type ImportResult =
  | { error: string }
  | { type: 'roster'; roster: RosterRow[] }
  | { type: 'scenario'; params: ParamsV2; roster: RosterRow[]; name?: string };

/** Auto-detect: JSON scenario, JSON roster array, or CSV rows. */
export function detectAndParse(text: string): ImportResult {
  const t = (text || '').trim();
  if (!t) return { error: 'Nothing to import.' };
  if (t[0] === '{' || t[0] === '[') {
    try {
      const j = JSON.parse(t);
      if (Array.isArray(j)) {
        const { roster } = applyScenario({ roster: j } as any);
        return roster.length ? { type: 'roster', roster } : { error: 'JSON array had no valid roster rows.' };
      }
      const { params, roster } = applyScenario(j);
      return { type: 'scenario', params, roster, name: j.meta && j.meta.scenarioName };
    } catch (e: any) {
      return { error: 'Invalid JSON: ' + e.message };
    }
  }
  const roster = parseRosterCSV(t);
  return roster.length
    ? { type: 'roster', roster }
    : { error: 'No rows recognized. Start each line with Technician or Engineer.' };
}

// ── Financial engine (pure) ──────────────────────────────────

export interface SimMonthV2 {
  /** 1-indexed month (named `t` to match the chart's SimMonth). */
  t: number;
  hrdf: number;
  net: number;
  gross: number;
  cum: number;
  /** True while any hire's support window is active (chart contract). */
  active: boolean;
}

export interface ModelV2 {
  grossMonthly: number;
  hrdfMonthly: number;
  shadowSavings: number;
  totalHRDF: number;
  violExposure: number;
  netActive: number;
  months: SimMonthV2[];
  horizon: number;
  cappedCount: number;
  empHRDF: (e: RosterRow) => number;
  firstStart: number;
  lastStart: number;
  /** First month any support is received / month after the last window ends. */
  supStart: number;
  supEnd: number;
}

export function computeModelV2(roster: RosterRow[], p: ParamsV2): ModelV2 {
  const empHRDF = (e: RosterRow) => Math.min(p.rate * (e.salary || 0), p.cap);
  const grossMonthly = roster.reduce((s, e) => s + (e.salary || 0) + p.otherCost, 0);
  const hrdfMonthly = roster.reduce((s, e) => s + empHRDF(e), 0);
  const shadowSavings = p.shadowCount * p.shadowCost;
  const totalHRDF = roster.reduce((s, e) => s + empHRDF(e) * p.support, 0);
  const violExposure = p.violCount * p.violAvg;

  const firstStart = roster.reduce((mn, e) => Math.min(mn, e.startMonth || 1), roster.length ? 99 : 1);
  const lastStart = roster.reduce((mx, e) => Math.max(mx, e.startMonth || 1), 1);
  const horizon = Math.max(36, lastStart + p.lag + p.support + 6);

  const months: SimMonthV2[] = [];
  let cum = 0;
  for (let t = 1; t <= horizon; t++) {
    let g = 0;
    let h = 0;
    for (const e of roster) {
      const st = e.startMonth || 1;
      if (t >= st) g += (e.salary || 0) + p.otherCost;
      const aStart = st + p.lag;
      if (t >= aStart && t < aStart + p.support) h += empHRDF(e);
    }
    const shadow = p.baseline === 'shadows' ? shadowSavings : 0;
    const net = g - h - shadow;
    cum += net;
    months.push({ t, hrdf: Math.round(h), net: Math.round(net), gross: Math.round(g), cum: Math.round(cum), active: h > 0 });
  }

  const netActive = grossMonthly - hrdfMonthly - (p.baseline === 'shadows' ? shadowSavings : 0);
  const cappedCount = roster.filter((e) => p.rate * (e.salary || 0) > p.cap).length;
  const supStart = firstStart + p.lag;
  const supEnd = roster.reduce((mx, e) => Math.max(mx, (e.startMonth || 1) + p.lag + p.support), 0);

  return {
    grossMonthly, hrdfMonthly, shadowSavings, totalHRDF, violExposure,
    netActive, months, horizon, cappedCount, empHRDF,
    firstStart, lastStart, supStart, supEnd,
  };
}

export interface PeriodSumV2 {
  gross: number;
  hrdf: number;
  net: number;
  shadow: number;
  activeMonths: number;
}

export function periodSumV2(m: ModelV2, P: number): PeriodSumV2 {
  let gross = 0;
  let hrdf = 0;
  let net = 0;
  const active = m.months.slice(0, P);
  for (const d of active) {
    gross += d.gross;
    hrdf += d.hrdf;
    net += d.net;
  }
  return { gross, hrdf, net, shadow: m.shadowSavings * P, activeMonths: active.filter((d) => d.hrdf > 0).length };
}
