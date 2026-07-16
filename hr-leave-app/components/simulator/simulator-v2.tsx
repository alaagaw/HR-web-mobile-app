/**
 * Saudization & HRDF Simulator — V2 (roster-based, reality-testable).
 *
 * Port of SaudizationSimulator.jsx (repo root) per
 * SaudizationSimulator_README.md, rebuilt on the app's stack:
 *   - engine + data contract: lib/saudization-sim-v2.ts (pure)
 *   - UI: reuses the V1 simulator primitives (SimPanel, Segmented,
 *     KpiCard, SimSlider, NumField, RatioBar, CashTimelineChart)
 *     and the theme-aware getSimPalette(isDark) — no recharts.
 *   - responsive via useBreakpoint (1200px), mobile-first stacking.
 *   - Import/Export/Template/CSV are web-gated (Blob/FileReader).
 *
 * Rendered as the second tab of the simulator page; keep this
 * component self-contained (own state) so switching tabs never
 * resets a scenario being edited.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { Button } from '@/components/ui/button';
import { getSimPalette, type SimPalette } from './palette';
import { SimPanel } from './sim-panel';
import { SimSlider } from './sim-slider';
import { Segmented } from './segmented';
import { KpiCard } from './kpi-card';
import { RatioBar } from './ratio-bar';
import { NumField } from './num-field';
import { CashTimelineChart } from './cash-timeline-chart';
import {
  SCHEMA_VERSION,
  type ParamsV2,
  type RosterRow,
  type ImportResult,
  defaultParamsV2,
  defaultRosterV2,
  buildScenario,
  applyScenario,
  detectAndParse,
  computeModelV2,
  periodSumV2,
  uid,
  sar,
  sarPlain,
} from '@/lib/saudization-sim-v2';

const isWeb = Platform.OS === 'web';

const PERIOD_OPTIONS = [
  { value: 1, label: '1 mo' },
  { value: 3, label: 'Quarter' },
  { value: 12, label: '1 year' },
  { value: 24, label: '2-year' },
];
const PERIOD_LABELS: Record<number, string> = {
  1: 'This month', 3: 'This quarter', 12: 'This year', 24: 'First 2 years',
};
const RATE_OPTIONS = [
  { value: 0.4, label: '40%' },
  { value: 0.5, label: '50%' },
];
const BASELINE_OPTIONS: { value: 'shadows' | 'absolute'; label: string }[] = [
  { value: 'shadows', label: 'vs. shadows' },
  { value: 'absolute', label: 'Absolute' },
];

// Browser download helper — web only (no-op elsewhere).
function downloadFile(content: string, filename: string, mime: string) {
  if (!isWeb || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ── Small local pieces ───────────────────────────────────────

function PillBtn({ label, onPress, palette, solid }: {
  label: string;
  onPress: () => void;
  palette: SimPalette;
  solid?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: solid ? palette.blue : palette.border,
        backgroundColor: solid ? palette.blue : palette.cardAlt,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: solid ? '#FFFFFF' : palette.dim }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Compact numeric cell input with NumField's keep-typing behavior. */
function RowNum({ value, onCommit, palette, width, min }: {
  value: number;
  onCommit: (v: number) => void;
  palette: SimPalette;
  width: number;
  min?: number;
}) {
  const [text, setText] = useState(() => String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(String(value));
  }, [value]);

  return (
    <TextInput
      value={text}
      keyboardType="numeric"
      onFocus={() => { focusedRef.current = true; }}
      onBlur={() => { focusedRef.current = false; setText(String(value)); }}
      onChangeText={(tx) => {
        setText(tx);
        const n = parseFloat(tx);
        const next = Number.isFinite(n) ? (min != null ? Math.max(min, n) : n) : (min ?? 0);
        onCommit(next);
      }}
      style={{
        width,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 7,
        paddingVertical: 6,
        paddingHorizontal: 7,
        fontSize: 12.5,
        color: palette.text,
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
      }}
    />
  );
}

function NoteBox({ children, palette }: { children: React.ReactNode; palette: SimPalette }) {
  return (
    <View
      style={{
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 9,
      }}
    >
      <Text style={{ fontSize: 11, color: palette.mute, lineHeight: 16 }}>{children}</Text>
    </View>
  );
}

// ── Component ────────────────────────────────────────────────

export function SimulatorV2() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isDesktop, width } = useBreakpoint();
  const palette = getSimPalette(isDark);

  const [roster, setRoster] = useState<RosterRow[]>(defaultRosterV2);
  const [p, setP] = useState<ParamsV2>(defaultParamsV2);
  const [scenarioName, setScenarioName] = useState('Proposal baseline');
  const [period, setPeriod] = useState(3);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const m = useMemo(() => computeModelV2(roster, p), [roster, p]);
  const ps = useMemo(() => periodSumV2(m, period), [m, period]);

  const setParam = <K extends keyof ParamsV2>(k: K, v: ParamsV2[K]) =>
    setP((pp) => ({ ...pp, [k]: v }));
  const setEmp = (id: string, patch: Partial<RosterRow>) =>
    setRoster((rs) => rs.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const addEmp = (role: RosterRow['role']) =>
    setRoster((rs) => [
      ...rs,
      {
        id: uid(),
        role,
        name: `${role} ${rs.filter((x) => x.role === role).length + 1}`,
        salary: role === 'Engineer' ? 7500 : 5250,
        startMonth: 1,
      },
    ]);
  const delEmp = (id: string) => setRoster((rs) => rs.filter((e) => e.id !== id));

  const reset = () => {
    setRoster(defaultRosterV2());
    setP(defaultParamsV2());
    setScenarioName('Proposal baseline');
    setPeriod(3);
  };

  // ── Import / export (web-gated) ───────────────────────────

  const preview: ImportResult = useMemo(() => detectAndParse(importText), [importText]);
  const applyImport = (res: ImportResult) => {
    if (!res || 'error' in res) return;
    if (res.type === 'scenario') {
      setRoster(res.roster);
      setP(res.params);
      if (res.name) setScenarioName(res.name);
    } else {
      setRoster(res.roster);
    }
    setImportOpen(false);
    setImportText('');
  };
  const onFile = (ev: any) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => applyImport(detectAndParse(String(rd.result)));
    rd.readAsText(f);
  };
  const exportScenario = () =>
    downloadFile(
      JSON.stringify(buildScenario(roster, p, scenarioName), null, 2),
      `${scenarioName.replace(/\s+/g, '-').toLowerCase()}.scenario.json`,
      'application/json',
    );
  const exportCSV = () =>
    downloadFile(
      ['role,name,approvedSalary,startMonth', ...roster.map((e) => `${e.role},${e.name},${e.salary},${e.startMonth}`)].join('\n'),
      'roster.csv',
      'text/csv',
    );
  const downloadTemplate = () => {
    const tpl = buildScenario(
      [
        { id: uid(), role: 'Technician', name: 'Ahmed Al-Otaibi', salary: 5000, startMonth: 1 },
        { id: uid(), role: 'Engineer', name: 'Sara Al-Harbi', salary: 7500, startMonth: 2 },
      ],
      defaultParamsV2(),
      'TEMPLATE — fill me',
    );
    downloadFile(JSON.stringify(tpl, null, 2), 'saudization.template.json', 'application/json');
  };

  // ── Derived display values ────────────────────────────────

  const netSign = m.netActive >= 0;
  const capThreshold = p.rate > 0 ? p.cap / p.rate : 0;
  const pmNet = m.grossMonthly - m.hrdfMonthly - (p.baseline === 'shadows' ? m.shadowSavings : 0);
  const curRatio = p.totScope > 0 ? p.curSaudi / p.totScope : 0;
  const projRatio = p.totScope + roster.length > 0 ? (p.curSaudi + roster.length) / (p.totScope + roster.length) : 0;
  const meets = projRatio >= p.target - 1e-9;

  const kpiCards = [
    {
      caption: 'Net cost / month',
      value: (netSign ? '' : '+') + sarPlain(Math.abs(m.netActive)),
      foot: p.baseline === 'shadows' ? 'vs. keeping shadow employees' : 'new payroll, net of support',
      accent: netSign ? palette.rose : palette.green,
    },
    {
      caption: 'HRDF support / month',
      value: sarPlain(m.hrdfMonthly),
      foot: `once approved · ${(p.rate * 100).toFixed(0)}% of approved salary`,
      accent: palette.gold,
    },
    {
      caption: 'Total HRDF over program',
      value: sarPlain(m.totalHRDF),
      foot: `${p.support} active months per hire`,
      accent: palette.gold,
    },
    {
      caption: 'Shadow cost avoided / yr',
      value: sarPlain(m.shadowSavings * 12),
      foot: `${p.shadowCount} non-operational roles removed`,
      accent: palette.green,
    },
  ];
  const kpiCardStyle = isDesktop
    ? { flex: 1 }
    : { flexBasis: (width < 480 ? '100%' : '47%') as any, flexGrow: 1 };

  const breakdownRows = [
    { l: 'Gross salary (Basic+Housing)', pm: m.grossMonthly, pp: ps.gross, c: palette.text, s: '' },
    { l: 'HRDF support received', pm: m.hrdfMonthly, pp: ps.hrdf, c: palette.gold, s: '−' },
    ...(p.baseline === 'shadows'
      ? [{ l: 'Shadow employees avoided', pm: m.shadowSavings, pp: ps.shadow, c: palette.green, s: '−' }]
      : []),
  ];

  const numColWidth = isDesktop ? 110 : 92;

  // ── Roster row (desktop row / mobile card) ────────────────

  const renderHire = (e: RosterRow) => {
    const h = m.empHRDF(e);
    const capped = p.rate * (e.salary || 0) > p.cap;
    const rolePill = (
      <Pressable
        onPress={() => setEmp(e.id, { role: e.role === 'Technician' ? 'Engineer' : 'Technician' })}
        style={{
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.cardAlt,
          minWidth: 52,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 11.5, fontWeight: '600', color: e.role === 'Engineer' ? palette.blue : palette.dim }}>
          {e.role === 'Engineer' ? 'Eng' : 'Tech'}
        </Text>
      </Pressable>
    );
    const nameInput = (
      <TextInput
        value={e.name}
        onChangeText={(tx) => setEmp(e.id, { name: tx })}
        placeholder="Name / ID"
        placeholderTextColor={palette.mute}
        style={{ flex: 1, fontSize: 12.5, color: palette.dim, paddingVertical: 4, paddingHorizontal: 2 }}
      />
    );
    const hrdfText = (
      <Text style={{ fontSize: 12.5, color: palette.gold, fontVariant: ['tabular-nums'] }}>
        {sarPlain(h)}
        {capped && <Text style={{ fontSize: 9.5, color: palette.gold, opacity: 0.8 }}> cap</Text>}
      </Text>
    );
    const delBtn = (
      <Pressable onPress={() => delEmp(e.id)} hitSlop={8} style={{ padding: 4 }}>
        <Text style={{ fontSize: 14, color: palette.mute }}>✕</Text>
      </Pressable>
    );

    if (isDesktop) {
      return (
        <View
          key={e.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
          }}
        >
          {rolePill}
          {nameInput}
          <RowNum value={e.salary} onCommit={(v) => setEmp(e.id, { salary: v })} palette={palette} width={96} />
          <RowNum value={e.startMonth} onCommit={(v) => setEmp(e.id, { startMonth: Math.max(1, Math.round(v)) })} palette={palette} width={52} min={1} />
          <View style={{ width: 86, alignItems: 'flex-end' }}>{hrdfText}</View>
          {delBtn}
        </View>
      );
    }

    // Mobile: stacked card
    return (
      <View
        key={e.id}
        style={{
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 10,
          padding: 10,
          marginBottom: 8,
          backgroundColor: palette.cardAlt,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {rolePill}
          {nameInput}
          {delBtn}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: palette.mute, marginBottom: 3 }}>SALARY</Text>
            <RowNum value={e.salary} onCommit={(v) => setEmp(e.id, { salary: v })} palette={palette} width={numColWidth} />
          </View>
          <View>
            <Text style={{ fontSize: 10, color: palette.mute, marginBottom: 3 }}>START</Text>
            <RowNum value={e.startMonth} onCommit={(v) => setEmp(e.id, { startMonth: Math.max(1, Math.round(v)) })} palette={palette} width={56} min={1} />
          </View>
          <View style={{ alignItems: 'flex-end', flex: 1 }}>
            <Text style={{ fontSize: 10, color: palette.mute, marginBottom: 3 }}>HRDF/MO</Text>
            {hrdfText}
          </View>
        </View>
      </View>
    );
  };

  // ── Panels ────────────────────────────────────────────────

  const paramsPanel = (
    <SimPanel title="Program parameters" palette={palette}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 12.5, color: palette.dim, marginBottom: 8 }}>
          Approval delay — {p.lag} month{p.lag > 1 ? 's' : ''} ({p.lag * 30} days)
        </Text>
        <SimSlider value={p.lag} min={1} max={6} step={1} onChange={(v) => setParam('lag', v)} accent={palette.gold} palette={palette} leftLabel="1 mo" rightLabel="6 mo" />
      </View>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 12.5, color: palette.dim, marginBottom: 8 }}>
          Support duration — {p.support} months
        </Text>
        <SimSlider value={p.support} min={12} max={24} step={1} onChange={(v) => setParam('support', v)} accent={palette.gold} palette={palette} leftLabel="12" rightLabel="24" />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <NumField label="HRDF cap / mo" value={p.cap} onChange={(v) => setParam('cap', v)} palette={palette} />
        </View>
        <View style={{ flex: 1 }}>
          <NumField label="Other cost / hire" value={p.otherCost} onChange={(v) => setParam('otherCost', v)} palette={palette} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <NumField label="Shadow employees" value={p.shadowCount} onChange={(v) => setParam('shadowCount', v)} palette={palette} />
        </View>
        <View style={{ flex: 1 }}>
          <NumField label="Cost each / mo" value={p.shadowCost} onChange={(v) => setParam('shadowCost', v)} palette={palette} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <NumField label="Violations (count)" value={p.violCount} onChange={(v) => setParam('violCount', v)} palette={palette} />
        </View>
        <View style={{ flex: 1 }}>
          <NumField label="Avg fine (SAR)" value={p.violAvg} onChange={(v) => setParam('violAvg', v)} palette={palette} />
        </View>
      </View>
      <NoteBox palette={palette}>
        At <Text style={{ color: palette.dim, fontWeight: '600' }}>{(p.rate * 100).toFixed(0)}%</Text>, the SAR{' '}
        {sarPlain(p.cap)} cap starts biting above{' '}
        <Text style={{ color: palette.gold, fontWeight: '600' }}>{sar(capThreshold)}</Text>.{' '}
        {m.cappedCount > 0 ? `${m.cappedCount} hire(s) currently capped.` : 'No hires capped.'}
      </NoteBox>
    </SimPanel>
  );

  const rosterPanel = (
    <SimPanel
      title="Hiring roster — enter actual salaries"
      palette={palette}
      style={{ flex: isDesktop ? 1 : undefined }}
    >
      {/* Actions */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <PillBtn label="+ Tech" onPress={() => addEmp('Technician')} palette={palette} />
        <PillBtn label="+ Eng" onPress={() => addEmp('Engineer')} palette={palette} />
        {isWeb && (
          <>
            <PillBtn label={importOpen ? 'Close import' : 'Import'} onPress={() => setImportOpen((v) => !v)} palette={palette} />
            <PillBtn label="Scenario ⤓" onPress={exportScenario} palette={palette} />
            <PillBtn label="Template ⤓" onPress={downloadTemplate} palette={palette} />
          </>
        )}
      </View>

      {/* Import panel (web) */}
      {isWeb && importOpen && (
        <View
          style={{
            backgroundColor: palette.cardAlt,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 11.5, color: palette.dim, marginBottom: 6 }}>
            Paste a <Text style={{ color: palette.blue, fontWeight: '600' }}>scenario JSON</Text> (full round-trip) or{' '}
            <Text style={{ color: palette.blue, fontWeight: '600' }}>CSV rows</Text>{' '}
            <Text style={{ color: palette.mute }}>role,salary,name,startMonth</Text> — format auto-detects.
          </Text>
          <TextInput
            value={importText}
            onChangeText={setImportText}
            multiline
            placeholder={'{ "schemaVersion": "1.0", ... }\n— or —\nTechnician, 5000, Ahmed, 1\nEngineer, 7500, Sara, 2'}
            placeholderTextColor={palette.mute}
            style={{
              minHeight: 84,
              textAlignVertical: 'top',
              backgroundColor: palette.card,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 8,
              padding: 9,
              fontSize: 12,
              color: palette.text,
            }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <PillBtn
              label={'error' in preview ? 'Waiting for valid input' : `Import ${preview.type === 'scenario' ? 'scenario' : `${preview.roster.length} rows`}`}
              onPress={() => applyImport(preview)}
              palette={palette}
              solid={!('error' in preview)}
            />
            <PillBtn label="Upload file" onPress={() => fileRef.current && fileRef.current.click()} palette={palette} />
            <PillBtn label="Export CSV" onPress={exportCSV} palette={palette} />
            <Text style={{ fontSize: 11.5, color: 'error' in preview ? palette.rose : palette.green }}>
              {importText.trim() ? ('error' in preview ? preview.error : `Detected: ${preview.type}`) : ''}
            </Text>
          </View>
          <input
            ref={fileRef as any}
            type="file"
            accept=".json,.csv,.txt"
            onChange={onFile}
            style={{ display: 'none' }}
          />
        </View>
      )}

      {/* Column headers (desktop) */}
      {isDesktop && roster.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: palette.border }}>
          <Text style={{ width: 52, fontSize: 10, color: palette.mute }}>ROLE</Text>
          <Text style={{ flex: 1, fontSize: 10, color: palette.mute }}>NAME / ID</Text>
          <Text style={{ width: 96, fontSize: 10, color: palette.mute, textAlign: 'right' }}>SALARY (B+H)</Text>
          <Text style={{ width: 52, fontSize: 10, color: palette.mute, textAlign: 'right' }}>START</Text>
          <Text style={{ width: 86, fontSize: 10, color: palette.mute, textAlign: 'right' }}>HRDF/MO</Text>
          <View style={{ width: 22 }} />
        </View>
      )}

      {roster.length === 0 ? (
        <Text style={{ paddingVertical: 22, textAlign: 'center', color: palette.mute, fontSize: 12.5 }}>
          No hires yet. Add a row{isWeb ? ', import a scenario, or download the template to fill' : ''}.
        </Text>
      ) : (
        roster.map(renderHire)
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        <Text style={{ fontSize: 12, color: palette.dim }}>
          {roster.length} hires · {roster.filter((e) => e.role === 'Technician').length} tech ·{' '}
          {roster.filter((e) => e.role === 'Engineer').length} eng
        </Text>
        <Text style={{ fontSize: 12, color: palette.dim, fontVariant: ['tabular-nums'] }}>
          Gross {sar(m.grossMonthly)} / mo · HRDF {sar(m.hrdfMonthly)} / mo
        </Text>
      </View>
    </SimPanel>
  );

  const chartPanel = (
    <SimPanel title="Monthly cash timeline" palette={palette}>
      <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 13, height: 13, borderRadius: 4, backgroundColor: palette.gold }} />
          <Text style={{ fontSize: 12, color: palette.dim }}>HRDF received</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 16, height: 3, borderRadius: 3, backgroundColor: palette.rose }} />
          <Text style={{ fontSize: 12, color: palette.dim }}>Net cost</Text>
        </View>
      </View>
      <CashTimelineChart
        months={m.months}
        lag={p.lag}
        support={p.support}
        windowStart={m.supStart}
        windowEnd={m.supEnd}
        palette={palette}
      />
    </SimPanel>
  );

  const breakdownPanel = (
    <SimPanel
      title="Breakdown by period"
      palette={palette}
      style={{ flex: isDesktop ? 1.4 : undefined }}
      right={<Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} palette={palette} />}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: palette.border }}>
        <Text style={{ flex: 1, fontSize: 10, color: palette.mute }}>LINE ITEM</Text>
        <Text style={{ width: numColWidth, fontSize: 10, color: palette.mute, textAlign: 'right' }}>PER MONTH</Text>
        <Text style={{ width: numColWidth, fontSize: 10, color: palette.mute, textAlign: 'right' }}>
          {PERIOD_LABELS[period].toUpperCase()}
        </Text>
      </View>
      {breakdownRows.map((r) => (
        <View
          key={r.l}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.border }}
        >
          <Text style={{ flex: 1, fontSize: 13, color: palette.dim }}>{r.l}</Text>
          <Text style={{ width: numColWidth, fontSize: 13, color: r.c, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
            {r.s}{sarPlain(r.pm)}
          </Text>
          <Text style={{ width: numColWidth, fontSize: 13, color: r.c, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
            {r.s}{sarPlain(r.pp)}
          </Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: palette.text }}>
          Net cost {p.baseline === 'shadows' ? 'vs. status quo' : '(net of support)'}
        </Text>
        <Text style={{ width: numColWidth, fontSize: 13, fontWeight: '700', color: pmNet >= 0 ? palette.rose : palette.green, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
          {pmNet >= 0 ? '' : '+'}{sarPlain(Math.abs(pmNet))}
        </Text>
        <Text style={{ width: numColWidth, fontSize: 13, fontWeight: '700', color: ps.net >= 0 ? palette.rose : palette.green, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
          {ps.net >= 0 ? '' : '+'}{sarPlain(Math.abs(ps.net))}
        </Text>
      </View>
      <NoteBox palette={palette}>
        {ps.activeMonths < period ? (
          <>
            Support is{' '}
            <Text style={{ color: palette.dim, fontWeight: '600' }}>
              pending for {period - ps.activeMonths} of these {period} month(s)
            </Text>{' '}
            (Taqat review), reflecting real cash timing.
          </>
        ) : (
          <>Support is active across all {period} months here.</>
        )}
      </NoteBox>
    </SimPanel>
  );

  const ratioPanel = (
    <SimPanel
      title="Saudization ratio"
      palette={palette}
      style={{ flex: isDesktop ? 1 : undefined }}
      right={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 11,
            paddingVertical: 5,
            borderRadius: 20,
            backgroundColor: meets ? palette.greenBg : palette.roseBg,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: meets ? palette.green : palette.rose }} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: meets ? palette.green : palette.rose }}>
            {meets ? `Meets ${(p.target * 100).toFixed(0)}%` : `Below ${(p.target * 100).toFixed(0)}%`}
          </Text>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
        <View style={{ flex: 1 }}>
          <NumField label="Saudis in category (now)" value={p.curSaudi} onChange={(v) => setParam('curSaudi', v)} palette={palette} />
        </View>
        <View style={{ flex: 1 }}>
          <NumField label="Total in category" value={p.totScope} onChange={(v) => setParam('totScope', Math.max(1, v))} palette={palette} />
        </View>
      </View>
      <RatioBar projected={projRatio} target={p.target} meets={meets} palette={palette} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11.5, color: palette.mute }}>
          Now:{' '}
          <Text style={{ color: palette.blue, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {(curRatio * 100).toFixed(1)}%
          </Text>
        </Text>
        <Text style={{ fontSize: 11.5, color: palette.mute }}>
          After +{roster.length} hires:{' '}
          <Text style={{ color: palette.green, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {(projRatio * 100).toFixed(1)}%
          </Text>
        </Text>
      </View>
      <NoteBox palette={palette}>
        <Text style={{ fontWeight: '600', color: palette.dim }}>Example figures.</Text> Replace with live
        Qiwa values for your Technician-category ratio.
      </NoteBox>
    </SimPanel>
  );

  // ── Body ──────────────────────────────────────────────────

  return (
    <View style={{ gap: 18 }}>
      {/* Sub-header: scenario name + toggles */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          justifyContent: 'space-between',
          alignItems: isDesktop ? 'center' : 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontSize: 12.5, color: palette.dim }}>
            Roster-based: per-hire salaries, phased starts, per-employee HRDF cap.
          </Text>
          <TextInput
            value={scenarioName}
            onChangeText={setScenarioName}
            placeholder="Scenario name"
            placeholderTextColor={palette.mute}
            style={{
              color: palette.dim,
              fontSize: 12.5,
              paddingVertical: 2,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
              borderStyle: 'dashed' as any,
              alignSelf: 'flex-start',
              minWidth: 180,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Segmented label="HRDF rate" options={RATE_OPTIONS} value={p.rate} onChange={(v) => setParam('rate', v)} palette={palette} />
          <Segmented label="Baseline" options={BASELINE_OPTIONS} value={p.baseline} onChange={(v) => setParam('baseline', v)} palette={palette} />
          <Button size="sm" variant="secondary" onPress={reset}>
            Reset to proposal
          </Button>
        </View>
      </View>

      {/* KPIs */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {kpiCards.map((c) => (
          <KpiCard
            key={c.caption}
            caption={c.caption}
            value={c.value}
            foot={c.foot}
            accent={c.accent}
            palette={palette}
            style={kpiCardStyle}
          />
        ))}
      </View>

      {/* Params + roster */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 18, alignItems: isDesktop ? 'flex-start' : 'stretch' }}>
        <View style={{ width: isDesktop ? 340 : '100%' }}>{paramsPanel}</View>
        {rosterPanel}
      </View>

      {/* Chart */}
      {chartPanel}

      {/* Breakdown + ratio */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 18, alignItems: 'stretch' }}>
        {breakdownPanel}
        {ratioPanel}
      </View>

      {/* Footer */}
      <View style={{ paddingTop: 4, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Text style={{ fontSize: 11, color: palette.mute, lineHeight: 16, flexShrink: 1 }}>
          Per-hire HRDF = min({(p.rate * 100).toFixed(0)}% × approved salary, {sar(p.cap)}). Each hire's
          support window runs from its start month + approval delay.
        </Text>
        <Text style={{ fontSize: 10.5, color: palette.gold, letterSpacing: 1 }}>
          SCHEMA v{SCHEMA_VERSION}
        </Text>
      </View>
    </View>
  );
}
