/**
 * HR Admin → Saudization & HRDF Support Simulator
 *
 * Interactive planning tool for HR Director / GM review: model
 * hiring Saudi technicians/engineers, HRDF salary support (40/50%
 * of approved salary, capped at SAR 3,000/head/month), approval
 * delay, shadow-employee savings, and the resulting cash timeline,
 * period breakdown, status-quo comparison, and Saudization ratio.
 *
 * All figures are editable examples — pure client-side math (see
 * lib/saudization-sim.ts), no backend data. Ported from the
 * standalone prototype `saudization-hrdf-simulator.html`.
 *
 * Access: HR Director only by default (seed migration 059);
 * HR can widen it from the Access Control screen.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { AccessGate } from '@/components/access/access-gate';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Button } from '@/components/ui/button';
import { getSimPalette, type SimPalette } from '@/components/simulator/palette';
import { SimPanel } from '@/components/simulator/sim-panel';
import { Stepper } from '@/components/simulator/stepper';
import { SimSlider } from '@/components/simulator/sim-slider';
import { Segmented } from '@/components/simulator/segmented';
import { KpiCard } from '@/components/simulator/kpi-card';
import { RatioBar } from '@/components/simulator/ratio-bar';
import { NumField } from '@/components/simulator/num-field';
import { CashTimelineChart } from '@/components/simulator/cash-timeline-chart';
import {
  SIM_DEFAULTS,
  computeSim,
  periodSum,
  sar,
  sarPlain,
  type SimState,
} from '@/lib/saudization-sim';

const PERIOD_OPTIONS = [
  { value: 1, label: '1 month' },
  { value: 3, label: 'Quarter' },
  { value: 12, label: '1 year' },
  { value: 24, label: '2-year' },
];

const PERIOD_LABELS: Record<number, string> = {
  1: 'This month',
  3: 'This quarter',
  12: 'This year',
  24: 'First 2 years',
};

const RATE_OPTIONS = [
  { value: 0.4, label: '40%' },
  { value: 0.5, label: '50%' },
];

// ── Small layout helpers ─────────────────────────────────────

function CtrlLabel({
  left,
  right,
  palette,
}: {
  left: string;
  right?: React.ReactNode;
  palette: SimPalette;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 12.5, color: palette.dim }}>{left}</Text>
      {right}
    </View>
  );
}

function Divider({ palette }: { palette: SimPalette }) {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: palette.border,
        marginVertical: 16,
        marginHorizontal: -16,
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

// ── Screen ───────────────────────────────────────────────────

export default function SaudizationSimulatorScreen() {
  return (
    <AccessGate resourceKey="page:admin/saudization-simulator">
      <SimulatorInner />
    </AccessGate>
  );
}

function SimulatorInner() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isDesktop, width } = useBreakpoint();
  const palette = getSimPalette(isDark);

  const [s, setS] = useState<SimState>(SIM_DEFAULTS);
  const [period, setPeriod] = useState(3);
  const patch = (p: Partial<SimState>) => setS((prev) => ({ ...prev, ...p }));

  const m = useMemo(() => computeSim(s), [s]);
  const ps = useMemo(() => periodSum(m, period), [m, period]);

  const reset = () => {
    setS(SIM_DEFAULTS);
    setPeriod(3);
  };

  // ── Controls sidebar ──────────────────────────────────────

  const controls = (
    <SimPanel title="Scenario controls" palette={palette}>
      {/* Saudi Technicians */}
      <View style={{ marginBottom: 16 }}>
        <CtrlLabel
          left="Saudi Technicians"
          palette={palette}
          right={
            <Text style={{ fontSize: 12.5, color: palette.gold, fontVariant: ['tabular-nums'] }}>
              {sar(m.hrdfTech)} <Text style={{ color: palette.mute }}>HRDF ea.</Text>
            </Text>
          }
        />
        <Stepper value={s.techCount} onChange={(v) => patch({ techCount: v })} palette={palette} />
      </View>

      {/* Technician salary */}
      <View style={{ marginBottom: 16 }}>
        <CtrlLabel
          left="Technician salary"
          palette={palette}
          right={
            <Text style={{ fontSize: 12.5, color: palette.text, fontWeight: '500', fontVariant: ['tabular-nums'] }}>
              {sar(s.techSalary)} <Text style={{ color: palette.mute, fontWeight: '400' }}>/mo</Text>
            </Text>
          }
        />
        <SimSlider
          value={s.techSalary}
          min={4000}
          max={7000}
          step={50}
          onChange={(v) => patch({ techSalary: v })}
          accent={palette.blue}
          palette={palette}
          leftLabel="SAR 4,000"
          midLabel="Basic + Housing"
          rightLabel="SAR 7,000"
        />
      </View>

      <Divider palette={palette} />

      {/* Saudi Engineers */}
      <View style={{ marginBottom: 16 }}>
        <CtrlLabel
          left="Saudi Engineers"
          palette={palette}
          right={
            <Text style={{ fontSize: 12.5, color: palette.gold, fontVariant: ['tabular-nums'] }}>
              {sar(m.hrdfEng)} <Text style={{ color: palette.mute }}>HRDF ea.</Text>
              {s.rate * s.engSalary > s.cap && <Text style={{ color: palette.gold }}> · capped</Text>}
            </Text>
          }
        />
        <Stepper value={s.engCount} onChange={(v) => patch({ engCount: v })} palette={palette} />
      </View>

      {/* Engineer salary */}
      <View style={{ marginBottom: 16 }}>
        <CtrlLabel
          left="Engineer salary"
          palette={palette}
          right={
            <Text style={{ fontSize: 12.5, color: palette.text, fontWeight: '500', fontVariant: ['tabular-nums'] }}>
              {sar(s.engSalary)} <Text style={{ color: palette.mute, fontWeight: '400' }}>/mo</Text>
            </Text>
          }
        />
        <SimSlider
          value={s.engSalary}
          min={5000}
          max={10000}
          step={100}
          onChange={(v) => patch({ engSalary: v })}
          accent={palette.blue}
          palette={palette}
          leftLabel="SAR 5,000"
          midLabel="Basic + Housing"
          rightLabel="SAR 10,000"
        />
      </View>

      <Divider palette={palette} />

      {/* Approval delay */}
      <View style={{ marginBottom: 16 }}>
        <CtrlLabel
          left="Approval delay"
          palette={palette}
          right={
            <Text style={{ fontSize: 12.5, color: palette.text, fontWeight: '500', fontVariant: ['tabular-nums'] }}>
              {s.lag} month{s.lag > 1 ? 's' : ''}{' '}
              <Text style={{ color: palette.mute, fontWeight: '400' }}>({s.lag * 30} days)</Text>
            </Text>
          }
        />
        <SimSlider
          value={s.lag}
          min={1}
          max={6}
          step={1}
          onChange={(v) => patch({ lag: v })}
          accent={palette.gold}
          palette={palette}
          leftLabel="1 mo"
          midLabel="Taqat review: 30–180 days"
          rightLabel="6 mo"
        />
      </View>

      {/* Support duration */}
      <View style={{ marginBottom: 16 }}>
        <CtrlLabel
          left="Support duration"
          palette={palette}
          right={
            <Text style={{ fontSize: 12.5, color: palette.text, fontWeight: '500', fontVariant: ['tabular-nums'] }}>
              {s.support} months
            </Text>
          }
        />
        <SimSlider
          value={s.support}
          min={12}
          max={24}
          step={1}
          onChange={(v) => patch({ support: v })}
          accent={palette.gold}
          palette={palette}
          leftLabel="12 mo"
          midLabel="HRDF program window"
          rightLabel="24 mo"
        />
      </View>

      <Divider palette={palette} />

      {/* Shadow employees */}
      <View style={{ marginBottom: 16 }}>
        <CtrlLabel left="Shadow employees replaced" palette={palette} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <NumField
            label="Headcount"
            value={s.shadowCount}
            onChange={(v) => patch({ shadowCount: v })}
            palette={palette}
          />
          <NumField
            label="Cost each / mo"
            value={s.shadowCost}
            onChange={(v) => patch({ shadowCost: v })}
            palette={palette}
          />
        </View>
      </View>

      {/* Violations */}
      <View>
        <CtrlLabel left="Regulatory violations (exposure)" palette={palette} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <NumField
            label="Active count"
            value={s.violCount}
            onChange={(v) => patch({ violCount: v })}
            palette={palette}
          />
          <NumField
            label="Avg fine (SAR)"
            value={s.violAvg}
            onChange={(v) => patch({ violAvg: v })}
            palette={palette}
          />
        </View>
      </View>
    </SimPanel>
  );

  // ── KPI cards ─────────────────────────────────────────────

  const netSign = m.netActive >= 0;
  const kpiCards = [
    {
      caption: 'Net cost / month',
      value: (netSign ? '' : '+') + sarPlain(Math.abs(m.netActive)),
      foot: netSign ? 'vs. status quo · during support' : 'net monthly gain during support',
      accent: netSign ? palette.rose : palette.green,
    },
    {
      caption: 'HRDF support / month',
      value: sarPlain(m.hrdfMonthly),
      foot: `once approved · ${s.rate * 100}% of approved salary`,
      accent: palette.gold,
    },
    {
      caption: 'Total HRDF over program',
      value: sarPlain(m.totalHRDF),
      foot: `${s.support} active months of support`,
      accent: palette.gold,
    },
    {
      caption: 'Shadow cost avoided / yr',
      value: sarPlain(m.shadowSavings * 12),
      foot: `${s.shadowCount} non-operational roles removed`,
      accent: palette.green,
    },
  ];

  // 4-across on desktop; 2-col on tablets/phones; 1-col when narrow.
  const kpiCardStyle = isDesktop
    ? { flex: 1 as const }
    : { flexBasis: (width < 480 ? '100%' : '47%') as any, flexGrow: 1 };

  // ── Breakdown table ───────────────────────────────────────

  const pmNet = m.grossMonthly - m.hrdfMonthly - m.shadowSavings;
  let activeInP = 0;
  for (let i = 0; i < period && i < m.months.length; i++) {
    if (m.months[i].active) activeInP++;
  }
  const pendingInP = period - activeInP;

  const brkRows: { label: string; pm: string; pp: string; color?: string }[] = [
    { label: 'Gross salary (Basic + Housing)', pm: sarPlain(m.grossMonthly), pp: sarPlain(ps.gross) },
    {
      label: 'HRDF support received',
      pm: '−' + sarPlain(m.hrdfMonthly),
      pp: '−' + sarPlain(ps.hrdf),
      color: palette.gold,
    },
    {
      label: 'Shadow employees avoided',
      pm: '−' + sarPlain(m.shadowSavings),
      pp: '−' + sarPlain(ps.shadow),
      color: palette.green,
    },
  ];

  let periodNote: string;
  if (pendingInP > 0 && activeInP > 0) {
    periodNote = `Over the first ${period} months, support is pending for ${pendingInP} month${pendingInP > 1 ? 's' : ''} (Taqat review) then active for ${activeInP}. The per-period column reflects that real cash timing.`;
  } else if (pendingInP > 0 && activeInP === 0) {
    periodNote = `Across all ${period} months here, HRDF support is still pending approval — the company carries full gross cost minus shadow savings until support begins.`;
  } else {
    periodNote = `Support is active for all ${period} months in this window.`;
  }

  const numColWidth = isDesktop ? 130 : 104;
  const numCell = (text: string, color?: string, bold?: boolean) => (
    <Text
      style={{
        width: numColWidth,
        textAlign: 'right',
        fontSize: 14,
        fontWeight: bold ? '600' : '400',
        color: color ?? palette.text,
        fontVariant: ['tabular-nums'],
      }}
    >
      {text}
    </Text>
  );

  // ── Status quo vs proposed rows ───────────────────────────

  const propCash = m.grossMonthly - m.hrdfMonthly;
  const cmpRows: { label: string; now: string; nowColor?: string; prop: string; propColor?: string }[] = [
    {
      label: 'Monthly workforce cash out',
      now: sar(m.shadowSavings),
      prop: sar(propCash),
      propColor: propCash > m.shadowSavings ? palette.rose : palette.green,
    },
    {
      label: 'Operational value added',
      now: 'None',
      nowColor: palette.rose,
      prop: `${m.totalHires} operational staff`,
      propColor: palette.green,
    },
    {
      label: 'Government support',
      now: 'SAR 0',
      prop: `${sar(m.hrdfMonthly)}/mo`,
      propColor: palette.gold,
    },
    {
      label: 'Saudization compliance',
      now: 'At risk',
      nowColor: palette.rose,
      prop: 'On track',
      propColor: palette.green,
    },
    {
      label: 'Violation exposure',
      now: sar(m.violExposure),
      nowColor: palette.rose,
      prop: 'Eliminated',
      propColor: palette.green,
    },
  ];

  // ── Compliance projection ─────────────────────────────────

  const N = m.totalHires;
  const curRatio = s.totScope > 0 ? s.curSaudi / s.totScope : 0;
  const projRatio = s.totScope + N > 0 ? (s.curSaudi + N) / (s.totScope + N) : 0;
  const meetsTarget = projRatio >= s.target - 1e-9;

  const compStatus = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 5,
        paddingHorizontal: 11,
        borderRadius: 20,
        backgroundColor: meetsTarget ? palette.greenBg : palette.roseBg,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: meetsTarget ? palette.green : palette.rose,
        }}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: meetsTarget ? palette.green : palette.rose,
        }}
      >
        {meetsTarget ? 'Meets 30% target' : 'Below 30% target'}
      </Text>
    </View>
  );

  // ── Results column ────────────────────────────────────────

  const legend = (
    <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ width: 13, height: 13, borderRadius: 4, backgroundColor: palette.gold }} />
        <Text style={{ fontSize: 12, color: palette.dim }}>HRDF support received</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ width: 16, height: 3, borderRadius: 3, backgroundColor: palette.rose }} />
        <Text style={{ fontSize: 12, color: palette.dim }}>Net cost vs. status quo</Text>
      </View>
    </View>
  );

  const results = (
    // flex:1 only in the desktop row layout — inside the mobile
    // column a 0-basis flex child would collapse to zero height.
    <View style={{ flex: isDesktop ? 1 : undefined, gap: 18 }}>
      {/* KPI cards */}
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

      {/* Monthly cash timeline */}
      <SimPanel title="Monthly cash timeline" right={legend} palette={palette}>
        <CashTimelineChart months={m.months} lag={s.lag} support={s.support} palette={palette} />
      </SimPanel>

      {/* Financial breakdown by period */}
      <SimPanel
        title="Financial breakdown by period"
        palette={palette}
        right={
          <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} palette={palette} />
        }
      >
        {/* header row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
              color: palette.mute,
            }}
          >
            Line item
          </Text>
          <Text
            style={{
              width: numColWidth,
              textAlign: 'right',
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
              color: palette.mute,
            }}
          >
            Per month
          </Text>
          <Text
            style={{
              width: numColWidth,
              textAlign: 'right',
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
              color: palette.mute,
            }}
          >
            {PERIOD_LABELS[period]}
          </Text>
        </View>

        {brkRows.map((r) => (
          <View
            key={r.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 11,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
            }}
          >
            <Text style={{ flex: 1, fontSize: 13, color: palette.dim }}>{r.label}</Text>
            {numCell(r.pm, r.color)}
            {numCell(r.pp, r.color)}
          </View>
        ))}

        {/* total row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 13 }}>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: palette.text }}>
            Net cost vs. status quo
          </Text>
          {numCell(
            (pmNet >= 0 ? '' : '+') + sarPlain(Math.abs(pmNet)),
            pmNet >= 0 ? palette.rose : palette.green,
            true,
          )}
          {numCell(
            (ps.net >= 0 ? '' : '+') + sarPlain(Math.abs(ps.net)),
            ps.net >= 0 ? palette.rose : palette.green,
            true,
          )}
        </View>

        <NoteBox palette={palette}>{periodNote}</NoteBox>
      </SimPanel>

      {/* Lower panels */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 18, alignItems: 'stretch' }}>
        {/* Status quo vs proposed */}
        <SimPanel title="Status quo vs. proposed" palette={palette} style={{ flex: isDesktop ? 1 : undefined }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 22,
              paddingBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: palette.border,
            }}
          >
            {['Do nothing', 'Proposed'].map((h) => (
              <Text
                key={h}
                style={{
                  minWidth: 88,
                  textAlign: 'right',
                  fontSize: 10.5,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: palette.mute,
                }}
              >
                {h}
              </Text>
            ))}
          </View>
          {cmpRows.map((r, i) => (
            <View
              key={r.label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 11,
                borderBottomWidth: i === cmpRows.length - 1 ? 0 : 1,
                borderBottomColor: palette.border,
              }}
            >
              <Text style={{ fontSize: 13, color: palette.dim, flex: 1 }}>{r.label}</Text>
              <View style={{ flexDirection: 'row', gap: 22 }}>
                <Text
                  style={{
                    minWidth: 88,
                    textAlign: 'right',
                    fontSize: 13,
                    color: r.nowColor ?? palette.mute,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {r.now}
                </Text>
                <Text
                  style={{
                    minWidth: 88,
                    textAlign: 'right',
                    fontSize: 13,
                    fontWeight: '600',
                    color: r.propColor ?? palette.text,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {r.prop}
                </Text>
              </View>
            </View>
          ))}
        </SimPanel>

        {/* Saudization compliance */}
        <SimPanel
          title="Saudization compliance"
          right={compStatus}
          palette={palette}
          style={{ flex: isDesktop ? 1 : undefined }}
        >
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
            <NumField
              label="Saudis in category (now)"
              value={s.curSaudi}
              onChange={(v) => patch({ curSaudi: v })}
              palette={palette}
            />
            <NumField
              label="Total in category"
              value={s.totScope}
              onChange={(v) => patch({ totScope: v })}
              palette={palette}
            />
          </View>
          <RatioBar projected={projRatio} target={s.target} meets={meetsTarget} palette={palette} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11.5, color: palette.mute }}>
              Now:{' '}
              <Text style={{ color: palette.blue, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {(curRatio * 100).toFixed(1)}%
              </Text>
            </Text>
            <Text style={{ fontSize: 11.5, color: palette.mute }}>
              After +{N} hires:{' '}
              <Text style={{ color: palette.green, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {(projRatio * 100).toFixed(1)}%
              </Text>
            </Text>
          </View>
          <NoteBox palette={palette}>
            <Text style={{ fontWeight: '600', color: palette.dim }}>Example figures.</Text> Replace
            "Saudis in category" and "Total in category" with live Qiwa / Ministry values for your
            Technician-category ratio. Target ratio is set to 30% per the proposal.
          </NoteBox>
        </SimPanel>
      </View>

      {/* Footer */}
      <View style={{ paddingTop: 4, paddingBottom: 8 }}>
        <Text style={{ fontSize: 11, color: palette.mute, lineHeight: 16 }}>
          Net cost is measured against the status quo (keeping shadow employees): gross salary −
          HRDF support − shadow savings. Approval delay defers support; the support window ends
          after the chosen duration. All figures are editable examples.
        </Text>
      </View>
    </View>
  );

  // ── Layout shell ──────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScreenHeader title="Saudization & HRDF Simulator" />
      <ScrollView
        contentContainerStyle={{
          padding: isDesktop ? 22 : 14,
          maxWidth: 1400,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        {/* Sub-header: intro + global actions */}
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            justifyContent: 'space-between',
            alignItems: isDesktop ? 'center' : 'flex-start',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <Text style={{ fontSize: 12.5, color: palette.dim, flexShrink: 1 }}>
            Model headcount changes, government support, and net cost across time — for HR & GM
            review.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Segmented
              label="HRDF rate"
              options={RATE_OPTIONS}
              value={s.rate}
              onChange={(v) => patch({ rate: v })}
              palette={palette}
            />
            <Button size="sm" variant="secondary" onPress={reset}>
              Reset to proposal
            </Button>
          </View>
        </View>

        {/* Controls + results */}
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 18,
            alignItems: isDesktop ? 'flex-start' : 'stretch',
          }}
        >
          <View style={{ width: isDesktop ? 312 : '100%' }}>{controls}</View>
          {results}
        </View>
      </ScrollView>
    </View>
  );
}
