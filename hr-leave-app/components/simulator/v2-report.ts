// ============================================================
// Simulator V2 — printable report builder (web only).
//
// Produces a self-contained, PRINT-OPTIMIZED HTML document that
// mirrors the on-screen page (KPIs, parameters, cash timeline,
// breakdown, ratio, and the FULL employees table — not just the
// 60 rows the screen renders). The caller opens it in a new
// window and triggers window.print(); the browser's "Save as
// PDF" yields the shareable file.
//
// Deliberately a light theme: dark dashboard colors are
// unreadable/ink-hungry on paper. Pure string builder — no DOM,
// no dependencies — so it stays testable and reusable.
// ============================================================

import type { ModelV2, ParamsV2, PeriodSumV2, RosterRow, SimMonthV2 } from '@/lib/saudization-sim-v2';
import { SCHEMA_VERSION, kfmt, sar, sarPlain } from '@/lib/saudization-sim-v2';

export interface V2ReportInput {
  scenarioName: string;
  p: ParamsV2;
  m: ModelV2;
  ps: PeriodSumV2;
  period: number;
  periodLabel: string;
  roster: RosterRow[];
  curRatio: number;
  projRatio: number;
  meets: boolean;
  generatedAt: Date;
}

const esc = (s: string): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Print palette (light): same semantics as the app palette.
const INK = {
  text: '#0f172a',
  dim: '#475569',
  mute: '#64748b',
  border: '#cbd5e1',
  faint: '#e2e8f0',
  gold: '#b45309',
  goldFill: 'rgba(217,119,6,0.18)',
  green: '#15803d',
  rose: '#be123c',
  blue: '#1d4ed8',
  panel: '#f8fafc',
};

/** Static light-theme SVG of the monthly cash timeline (same math
 *  as CashTimelineChart, string-rendered for print). */
function chartSvg(months: SimMonthV2[], supStart: number, supEnd: number): string {
  const W = 900;
  const H = 300;
  const PAD = { l: 56, r: 16, t: 18, b: 32 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const n = months.length;
  if (n < 2) return '';

  let yMax = 0;
  let yMin = 0;
  for (const d of months) {
    yMax = Math.max(yMax, d.hrdf, d.net);
    yMin = Math.min(yMin, d.net);
  }
  yMax = yMax * 1.12 || 1;
  if (yMin < 0) yMin = yMin * 1.12;
  const range = yMax - yMin;
  const X = (t: number) => PAD.l + ((t - 1) / (n - 1)) * plotW;
  const Y = (v: number) => PAD.t + ((yMax - v) / range) * plotH;

  // y gridlines + labels
  let grid = '';
  const TICKS = 4;
  for (let i = 0; i <= TICKS; i++) {
    const v = yMin + (range * i) / TICKS;
    const y = Y(v).toFixed(1);
    grid += `<line x1="${PAD.l}" y1="${y}" x2="${PAD.l + plotW}" y2="${y}" stroke="${INK.faint}" stroke-width="1"/>`;
    grid += `<text x="${PAD.l - 6}" y="${(Y(v) + 3).toFixed(1)}" font-size="10" fill="${INK.mute}" text-anchor="end">${kfmt(v)}</text>`;
  }

  // gold HRDF area
  let top = '';
  months.forEach((d, i) => {
    top += (i === 0 ? 'M' : 'L') + X(d.t).toFixed(1) + ' ' + Y(d.hrdf).toFixed(1) + ' ';
  });
  const base = Y(Math.max(0, yMin)).toFixed(1);
  const area = `${top}L${X(months[n - 1].t).toFixed(1)} ${base} L${X(1).toFixed(1)} ${base} Z`;

  // rose net line
  let line = '';
  months.forEach((d, i) => {
    line += (i === 0 ? 'M' : 'L') + X(d.t).toFixed(1) + ' ' + Y(d.net).toFixed(1) + ' ';
  });

  // support window + markers
  const winStartX = X(Math.max(1, supStart));
  const winEndX = X(Math.min(supEnd - 1, n));
  const winW = Math.max(0, winEndX - winStartX);
  let markers = `<rect x="${winStartX.toFixed(1)}" y="${PAD.t}" width="${winW.toFixed(1)}" height="${plotH}" fill="rgba(217,119,6,0.07)"/>`;
  if (supStart >= 1 && supStart <= n) {
    markers += `<line x1="${winStartX.toFixed(1)}" y1="${PAD.t}" x2="${winStartX.toFixed(1)}" y2="${PAD.t + plotH}" stroke="${INK.border}" stroke-dasharray="4 4"/>`;
    markers += `<text x="${(winStartX + 4).toFixed(1)}" y="${PAD.t + 11}" font-size="9.5" fill="${INK.mute}">support starts</text>`;
  }
  if (supEnd >= 1 && supEnd <= n) {
    markers += `<line x1="${X(supEnd).toFixed(1)}" y1="${PAD.t}" x2="${X(supEnd).toFixed(1)}" y2="${PAD.t + plotH}" stroke="${INK.border}" stroke-dasharray="4 4"/>`;
    markers += `<text x="${(X(supEnd) + 4).toFixed(1)}" y="${PAD.t + 24}" font-size="9.5" fill="${INK.mute}">support ends</text>`;
  }
  // zero line
  if (yMin < 0) {
    markers += `<line x1="${PAD.l}" y1="${Y(0).toFixed(1)}" x2="${PAD.l + plotW}" y2="${Y(0).toFixed(1)}" stroke="${INK.border}"/>`;
  }

  // x labels every 6 months + last
  let xl = '';
  for (let t = 1; t <= n; t += 6) {
    xl += `<text x="${X(t).toFixed(1)}" y="${H - 10}" font-size="10" fill="${INK.mute}" text-anchor="middle">M${t}</text>`;
  }
  xl += `<text x="${X(n).toFixed(1)}" y="${H - 10}" font-size="10" fill="${INK.mute}" text-anchor="end">M${n}</text>`;

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">
    ${grid}${markers}
    <path d="${area}" fill="${INK.goldFill}" stroke="none"/>
    <path d="${top.trim()}" fill="none" stroke="${INK.gold}" stroke-width="1.6"/>
    <path d="${line.trim()}" fill="none" stroke="${INK.rose}" stroke-width="2"/>
    ${xl}
  </svg>`;
}

export function buildV2ReportHtml(input: V2ReportInput): string {
  const { scenarioName, p, m, ps, period, periodLabel, roster, curRatio, projRatio, meets, generatedAt } = input;

  const netSign = m.netActive >= 0;
  const pmNet = m.grossMonthly - m.hrdfMonthly - (p.baseline === 'shadows' ? m.shadowSavings : 0);
  const capThreshold = p.rate > 0 ? p.cap / p.rate : 0;
  const techCount = roster.filter((e) => e.role === 'Technician').length;

  const kpi = (caption: string, value: string, foot: string, color: string) => `
    <div class="kpi" style="border-left-color:${color}">
      <div class="kpi-cap">${esc(caption)}</div>
      <div class="kpi-val" style="color:${color}">${esc(value)}</div>
      <div class="kpi-foot">${esc(foot)}</div>
    </div>`;

  const paramRow = (l: string, v: string) => `<tr><td>${esc(l)}</td><td class="num">${esc(v)}</td></tr>`;

  const rosterRows = roster
    .map((e) => {
      const h = m.empHRDF(e);
      const capped = p.rate * (e.salary || 0) > p.cap;
      return `<tr>
        <td>${esc(e.role)}</td>
        <td class="num">${esc(e.empCode || '—')}</td>
        <td>${esc(e.name)}</td>
        <td class="num">${sarPlain(e.salary)}</td>
        <td class="num">M${e.startMonth}</td>
        <td class="num" style="color:${INK.gold}">${sarPlain(h)}${capped ? ' <span class="cap">cap</span>' : ''}</td>
      </tr>`;
    })
    .join('');

  const breakdown = [
    { l: 'Gross salary (Basic+Housing)', pm: m.grossMonthly, pp: ps.gross, c: INK.text, s: '' },
    { l: 'HRDF support received', pm: m.hrdfMonthly, pp: ps.hrdf, c: INK.gold, s: '−' },
    ...(p.baseline === 'shadows'
      ? [{ l: 'Shadow employees avoided', pm: m.shadowSavings, pp: ps.shadow, c: INK.green, s: '−' }]
      : []),
  ]
    .map(
      (r) => `<tr>
        <td>${esc(r.l)}</td>
        <td class="num" style="color:${r.c}">${r.s}${sarPlain(r.pm)}</td>
        <td class="num" style="color:${r.c}">${r.s}${sarPlain(r.pp)}</td>
      </tr>`,
    )
    .join('');

  const ratioPct = Math.min(100, projRatio * 100);
  const targetPct = Math.min(100, p.target * 100);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(scenarioName)} — Saudization &amp; HRDF Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif; color: ${INK.text}; font-size: 12px; padding: 28px 32px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, Consolas, monospace; }
  h1 { font-size: 19px; margin-bottom: 2px; }
  h2 { font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: ${INK.dim}; margin: 22px 0 8px; }
  .meta { font-size: 11px; color: ${INK.mute}; margin-bottom: 4px; }
  .grid { display: flex; gap: 10px; flex-wrap: wrap; }
  .kpi { flex: 1 1 200px; border: 1px solid ${INK.faint}; border-left: 3px solid; border-radius: 8px; padding: 10px 12px; background: ${INK.panel}; break-inside: avoid; }
  .kpi-cap { font-size: 9.5px; letter-spacing: .8px; text-transform: uppercase; color: ${INK.dim}; }
  .kpi-val { font-size: 19px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .kpi-foot { font-size: 10px; color: ${INK.mute}; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { text-align: left; font-size: 9.5px; letter-spacing: .6px; text-transform: uppercase; color: ${INK.mute}; font-weight: 600; padding: 6px 8px; border-bottom: 1px solid ${INK.border}; }
  th.num { text-align: right; }
  td { padding: 6px 8px; border-bottom: 1px solid ${INK.faint}; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  .total td { border-top: 1.5px solid ${INK.border}; border-bottom: none; font-weight: 700; }
  .cap { font-size: 8.5px; color: ${INK.gold}; border: 1px solid ${INK.gold}; border-radius: 4px; padding: 0 3px; }
  .panel { border: 1px solid ${INK.faint}; border-radius: 8px; padding: 12px; background: #fff; break-inside: avoid; }
  .note { font-size: 10px; color: ${INK.mute}; background: ${INK.panel}; border: 1px solid ${INK.faint}; border-radius: 6px; padding: 8px 10px; margin-top: 8px; line-height: 1.5; }
  .cols { display: flex; gap: 14px; align-items: flex-start; }
  .cols > div { flex: 1; }
  .bar { position: relative; height: 16px; border: 1px solid ${INK.border}; border-radius: 6px; overflow: hidden; background: ${INK.panel}; margin: 8px 0 4px; }
  .bar-fill { position: absolute; left: 0; top: 0; bottom: 0; background: ${meets ? '#86efac' : '#fda4af'}; }
  .bar-target { position: absolute; top: -2px; bottom: -2px; width: 2px; background: ${INK.gold}; }
  .pill { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; color: ${meets ? INK.green : INK.rose}; border: 1px solid currentColor; }
  .legend { font-size: 10px; color: ${INK.mute}; margin-bottom: 4px; }
  .legend b { font-weight: 600; }
  .footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid ${INK.faint}; font-size: 9.5px; color: ${INK.mute}; display: flex; justify-content: space-between; gap: 10px; }
  @page { margin: 14mm 12mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Saudization &amp; HRDF Workforce Simulator — ${esc(scenarioName)}</h1>
  <div class="meta">Generated ${esc(generatedAt.toLocaleString('en-GB'))} · ${roster.length} hires (${techCount} tech · ${roster.length - techCount} eng) · HRDF ${(p.rate * 100).toFixed(0)}% capped at ${esc(sar(p.cap))}/mo · baseline: ${p.baseline === 'shadows' ? 'vs. keeping shadow employees' : 'absolute (net of support)'}</div>

  <h2>Key figures</h2>
  <div class="grid">
    ${kpi('Net cost / month', (netSign ? '' : '+') + 'SAR ' + sarPlain(Math.abs(m.netActive)), p.baseline === 'shadows' ? 'vs. keeping shadow employees' : 'new payroll, net of support', netSign ? INK.rose : INK.green)}
    ${kpi('HRDF support / month', 'SAR ' + sarPlain(m.hrdfMonthly), `once approved · ${(p.rate * 100).toFixed(0)}% of approved salary`, INK.gold)}
    ${kpi('Total HRDF over program', 'SAR ' + sarPlain(m.totalHRDF), `${p.support} active months per hire`, INK.gold)}
    ${kpi('Shadow cost avoided / yr', 'SAR ' + sarPlain(m.shadowSavings * 12), `${p.shadowCount} non-operational roles removed`, INK.green)}
  </div>

  <h2>Monthly cash timeline</h2>
  <div class="panel">
    <div class="legend"><b style="color:${INK.gold}">▮</b> HRDF received &nbsp;&nbsp; <b style="color:${INK.rose}">—</b> Net cost</div>
    ${chartSvg(m.months, m.supStart, m.supEnd)}
  </div>

  <div class="cols" style="margin-top:14px">
    <div>
      <h2 style="margin-top:0">Program parameters</h2>
      <div class="panel">
        <table>
          ${paramRow('Approval delay', `${p.lag} month${p.lag > 1 ? 's' : ''} (${p.lag * 30} days)`)}
          ${paramRow('Support duration', `${p.support} months`)}
          ${paramRow('HRDF cap / month', sar(p.cap))}
          ${paramRow('Other cost / hire / month', sar(p.otherCost))}
          ${paramRow('Shadow employees', `${p.shadowCount} × ${sar(p.shadowCost)}/mo`)}
          ${paramRow('Violations exposure', `${p.violCount} × ${sar(p.violAvg)} = ${sar(m.violExposure)}`)}
        </table>
        <div class="note">At ${(p.rate * 100).toFixed(0)}%, the ${esc(sar(p.cap))} cap starts biting above <b>${esc(sar(capThreshold))}</b>. ${m.cappedCount > 0 ? `${m.cappedCount} hire(s) currently capped.` : 'No hires capped.'}</div>
      </div>
    </div>
    <div>
      <h2 style="margin-top:0">Saudization ratio</h2>
      <div class="panel">
        <table>
          ${paramRow('Saudis in category (now)', String(p.curSaudi))}
          ${paramRow('Total in category', String(p.totScope))}
          ${paramRow('Now', (curRatio * 100).toFixed(1) + '%')}
          ${paramRow(`After +${roster.length} hires`, (projRatio * 100).toFixed(1) + '%')}
        </table>
        <div class="bar"><div class="bar-fill" style="width:${ratioPct.toFixed(1)}%"></div><div class="bar-target" style="left:${targetPct.toFixed(1)}%"></div></div>
        <span class="pill">${meets ? 'Meets' : 'Below'} ${(p.target * 100).toFixed(0)}% target</span>
      </div>
    </div>
  </div>

  <h2>Breakdown by period — ${esc(periodLabel)}</h2>
  <div class="panel">
    <table>
      <thead><tr><th>Line item</th><th class="num">Per month</th><th class="num">${esc(periodLabel)}</th></tr></thead>
      <tbody>
        ${breakdown}
        <tr class="total">
          <td>Net cost ${p.baseline === 'shadows' ? 'vs. status quo' : '(net of support)'}</td>
          <td class="num" style="color:${pmNet >= 0 ? INK.rose : INK.green}">${pmNet >= 0 ? '' : '+'}${sarPlain(Math.abs(pmNet))}</td>
          <td class="num" style="color:${ps.net >= 0 ? INK.rose : INK.green}">${ps.net >= 0 ? '' : '+'}${sarPlain(Math.abs(ps.net))}</td>
        </tr>
      </tbody>
    </table>
    <div class="note">${ps.activeMonths < period ? `Support is pending for ${period - ps.activeMonths} of these ${period} month(s) (Taqat review), reflecting real cash timing.` : `Support is active across all ${period} months here.`}</div>
  </div>

  <h2>Employees (${roster.length})</h2>
  <table>
    <thead><tr><th>Role</th><th class="num">Emp #</th><th>Name / ID</th><th class="num">Salary (B+H)</th><th class="num">Start</th><th class="num">HRDF / mo</th></tr></thead>
    <tbody>
      ${rosterRows}
      <tr class="total">
        <td colspan="3">Totals</td>
        <td class="num">${sarPlain(roster.reduce((s, e) => s + (e.salary || 0), 0))}</td>
        <td></td>
        <td class="num" style="color:${INK.gold}">${sarPlain(m.hrdfMonthly)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Per-hire HRDF = min(${(p.rate * 100).toFixed(0)}% × approved salary, ${esc(sar(p.cap))}). Each hire's support window runs from its start month + approval delay. Net cost is measured ${p.baseline === 'shadows' ? 'against the status quo of keeping shadow employees' : 'as new payroll net of support'}.</span>
    <span>Schema v${SCHEMA_VERSION}</span>
  </div>
</body>
</html>`;
}
