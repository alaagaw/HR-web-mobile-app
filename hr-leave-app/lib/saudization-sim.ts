// ============================================================
// Saudization & HRDF simulator — pure financial engine.
//
// Faithful port of the standalone prototype's compute() logic
// (saudization-hrdf-simulator.html at the repo root). Keep this
// file dependency-free and side-effect-free: it is plain math so
// the page/components stay dumb renderers and the numbers can be
// unit-tested or reused later (e.g. server-side what-if reports).
//
// Model summary:
//   - HRDF support per head = min(rate × salary, cap of SAR 3,000)
//   - Net monthly cost is measured AGAINST THE STATUS QUO of
//     keeping shadow employees: gross − HRDF − shadow savings.
//   - Approval delay (lag) defers support; the support window
//     ends after the chosen duration. Timeline months outside the
//     window carry full gross minus shadow savings.
//   - Compliance projection assumes every hire is a Saudi added
//     to both numerator and denominator: (cur+N)/(total+N).
// ============================================================

export interface SimState {
  techCount: number;
  techSalary: number;
  engCount: number;
  engSalary: number;
  /** HRDF reimbursement rate (0.40 or 0.50). */
  rate: number;
  /** HRDF per-head monthly cap (SAR). */
  cap: number;
  /** Approval delay in months (Taqat review). */
  lag: number;
  /** Support duration in months once approved. */
  support: number;
  shadowCount: number;
  shadowCost: number;
  violCount: number;
  violAvg: number;
  /** Saudis currently in the category (Qiwa figure). */
  curSaudi: number;
  /** Total employees in the category. */
  totScope: number;
  /** Saudization target ratio (0–1). */
  target: number;
}

/** Editable example figures — mirror the prototype's proposal defaults. */
export const SIM_DEFAULTS: SimState = {
  techCount: 8,
  techSalary: 5250,
  engCount: 2,
  engSalary: 7500,
  rate: 0.5,
  cap: 3000,
  lag: 3,
  support: 24,
  shadowCount: 10,
  shadowCost: 2000,
  violCount: 3,
  violAvg: 10500,
  curSaudi: 23,
  totScope: 100,
  target: 0.3,
};

export interface SimMonth {
  /** Calendar month from start of hiring (1-based). */
  t: number;
  /** HRDF support received this month. */
  hrdf: number;
  /** Net cost vs. status quo this month. */
  net: number;
  /** Cumulative net cost through this month. */
  cum: number;
  /** True while the support window is active. */
  active: boolean;
}

export interface SimResult {
  hrdfTech: number;
  hrdfEng: number;
  grossMonthly: number;
  hrdfMonthly: number;
  shadowSavings: number;
  /** Net monthly vs. status quo while support is live. */
  netActive: number;
  /** Net monthly vs. status quo after support ends. */
  netPost: number;
  /** Total HRDF over the full program (active months). */
  totalHRDF: number;
  violExposure: number;
  months: SimMonth[];
  horizon: number;
  totalHires: number;
}

export function computeSim(s: SimState): SimResult {
  const hrdfTech = Math.min(s.rate * s.techSalary, s.cap);
  const hrdfEng = Math.min(s.rate * s.engSalary, s.cap);

  const grossMonthly = s.techCount * s.techSalary + s.engCount * s.engSalary;
  const hrdfMonthly = s.techCount * hrdfTech + s.engCount * hrdfEng;
  const shadowSavings = s.shadowCount * s.shadowCost;

  const netActive = grossMonthly - hrdfMonthly - shadowSavings; // vs status quo, support live
  const netPost = grossMonthly - shadowSavings; // support ended
  const totalHRDF = hrdfMonthly * s.support; // full program (active months)
  const violExposure = s.violCount * s.violAvg;

  // Timeline (calendar months from start of hiring).
  const horizon = Math.max(36, s.lag + s.support + 6);
  const months: SimMonth[] = [];
  let cum = 0;
  for (let t = 1; t <= horizon; t++) {
    const active = t > s.lag && t <= s.lag + s.support;
    const hrdf_t = active ? hrdfMonthly : 0;
    const net_t = grossMonthly - hrdf_t - shadowSavings;
    cum += net_t;
    months.push({ t, hrdf: hrdf_t, net: net_t, cum, active });
  }

  return {
    hrdfTech,
    hrdfEng,
    grossMonthly,
    hrdfMonthly,
    shadowSavings,
    netActive,
    netPost,
    totalHRDF,
    violExposure,
    months,
    horizon,
    totalHires: s.techCount + s.engCount,
  };
}

export interface PeriodSum {
  gross: number;
  hrdf: number;
  shadow: number;
  net: number;
}

/** Sum the first P calendar months (real cash timing, incl. lag). */
export function periodSum(m: SimResult, P: number): PeriodSum {
  let g = 0;
  let h = 0;
  let s = 0;
  let n = 0;
  for (let i = 0; i < P && i < m.months.length; i++) {
    g += m.grossMonthly;
    h += m.months[i].hrdf;
    s += m.shadowSavings;
    n += m.months[i].net;
  }
  return { gross: g, hrdf: h, shadow: s, net: n };
}

// ── Formatting helpers (match the prototype's output) ─────────

export function sar(n: number): string {
  return 'SAR ' + Math.round(n).toLocaleString('en-US');
}

export function sarPlain(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Compact axis label: 1.2M / 34k / 900. */
export function kfmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e3) return Math.round(n / 1e3) + 'k';
  return Math.round(n).toString();
}
