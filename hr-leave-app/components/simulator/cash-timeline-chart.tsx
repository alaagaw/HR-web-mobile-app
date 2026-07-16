import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Path,
  Line,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { SimMonth } from '@/lib/saudization-sim';
import { sar, kfmt } from '@/lib/saudization-sim';
import type { SimPalette } from './palette';

// Fixed viewBox geometry (same as the prototype); the SVG scales
// to the measured container width, preserving aspect ratio.
const VB_W = 900;
const VB_H = 320;
const PAD = { l: 52, r: 18, t: 18, b: 34 };
const PLOT_W = VB_W - PAD.l - PAD.r;
const PLOT_H = VB_H - PAD.t - PAD.b;
const TIP_W = 165;

/**
 * Monthly cash timeline: gold HRDF-support area + rose net-cost
 * line, support-window shading, start/end markers, and a
 * hover/drag tooltip (mouse hover on web, press/drag on touch).
 */
export function CashTimelineChart({
  months,
  lag,
  support,
  palette,
  windowStart,
  windowEnd,
}: {
  months: SimMonth[];
  lag: number;
  support: number;
  palette: SimPalette;
  /** Optional support-window override (first month support is received)
   *  for phased hiring (V2). Defaults to the V1 derivation `lag + 1`. */
  windowStart?: number;
  /** Optional: month AFTER the last support window ends. Defaults to
   *  `lag + support + 1`. */
  windowEnd?: number;
}) {
  const [width, setWidth] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const n = months.length;

  const geo = useMemo(() => {
    let yMax = 0;
    let yMin = 0;
    for (const d of months) {
      yMax = Math.max(yMax, d.hrdf, d.net);
      yMin = Math.min(yMin, d.net);
    }
    yMax = yMax * 1.12 || 1;
    if (yMin < 0) yMin = yMin * 1.12;
    const range = yMax - yMin;

    const X = (t: number) => PAD.l + ((t - 1) / (n - 1)) * PLOT_W;
    const Y = (v: number) => PAD.t + ((yMax - v) / range) * PLOT_H;

    // y gridlines + labels
    const ticks: { y: number; label: string }[] = [];
    const TICKS = 4;
    for (let i = 0; i <= TICKS; i++) {
      const v = yMin + (range * i) / TICKS;
      ticks.push({ y: Y(v), label: kfmt(v) });
    }

    // gold HRDF area + top line
    let areaTop = '';
    months.forEach((d, i) => {
      areaTop += (i === 0 ? 'M' : 'L') + X(d.t).toFixed(1) + ' ' + Y(d.hrdf).toFixed(1) + ' ';
    });
    const base = Y(Math.max(0, yMin));
    const area =
      areaTop +
      'L' + X(months[n - 1].t).toFixed(1) + ' ' + base.toFixed(1) +
      ' L' + X(1).toFixed(1) + ' ' + base.toFixed(1) + ' Z';

    // rose net-cost line
    let line = '';
    months.forEach((d, i) => {
      line += (i === 0 ? 'M' : 'L') + X(d.t).toFixed(1) + ' ' + Y(d.net).toFixed(1) + ' ';
    });

    // x labels every 6 months + last
    const xLabels: { x: number; label: string; anchor: 'middle' | 'end' }[] = [];
    for (let t = 1; t <= n; t += 6) {
      xLabels.push({ x: X(t), label: 'M' + t, anchor: 'middle' });
    }
    xLabels.push({ x: X(n), label: 'M' + n, anchor: 'end' });

    return { yMin, X, Y, ticks, area, areaTop: areaTop.trim(), line: line.trim(), xLabels };
  }, [months, n]);

  const { X, Y } = geo;

  // px → month index (container px coords → viewBox coords)
  const handlePointer = (px: number) => {
    if (width <= 0 || n < 2) return;
    const vx = (px * VB_W) / width;
    let frac = (vx - PAD.l) / PLOT_W;
    frac = Math.max(0, Math.min(1, frac));
    setHoverIdx(Math.round(frac * (n - 1)));
  };

  const height = width > 0 ? (width * VB_H) / VB_W : 0;
  const pxScale = width > 0 ? width / VB_W : 1;

  const hovered = hoverIdx != null ? months[hoverIdx] : null;

  // Tooltip pixel position (flip when it would overflow right edge).
  let tipLeft = 0;
  let tipTop = 0;
  if (hovered) {
    const xPx = X(hovered.t) * pxScale;
    tipLeft = xPx + 14;
    if (tipLeft > width - TIP_W) tipLeft = xPx - TIP_W;
    const topAnchor = Math.min(Y(hovered.hrdf), Y(hovered.net)) * pxScale;
    tipTop = Math.max(4, Math.min(topAnchor - 78, height - 90));
  }

  const supStartT = windowStart ?? lag + 1;
  const supEndT = windowEnd ?? lag + support + 1;
  const xWinStart = X(supStartT);
  const xWinEnd = X(Math.min(supEndT - 1, n));

  return (
    <View
      style={{ width: '100%' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <View
          // Touch: press/drag anywhere on the plot. Web: pointer
          // move gives a live hover without pressing.
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e: any) => handlePointer(e.nativeEvent.locationX)}
          onResponderMove={(e: any) => handlePointer(e.nativeEvent.locationX)}
          onPointerMove={(e: any) =>
            handlePointer(e.nativeEvent.offsetX ?? e.nativeEvent.locationX)
          }
          onPointerLeave={() => setHoverIdx(null)}
        >
          <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
            <Defs>
              <LinearGradient id="simGoldGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={palette.goldAreaTop} />
                <Stop offset="1" stopColor={palette.goldAreaBottom} />
              </LinearGradient>
            </Defs>

            {/* y gridlines + labels */}
            {geo.ticks.map((tk, i) => (
              <React.Fragment key={`t${i}`}>
                <Line
                  x1={PAD.l}
                  y1={tk.y}
                  x2={PAD.l + PLOT_W}
                  y2={tk.y}
                  stroke={palette.border}
                  strokeWidth={1}
                />
                <SvgText
                  x={PAD.l - 8}
                  y={tk.y + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill={palette.mute}
                >
                  {tk.label}
                </SvgText>
              </React.Fragment>
            ))}

            {/* zero line when the net dips negative */}
            {geo.yMin < 0 && (
              <Line
                x1={PAD.l}
                y1={Y(0)}
                x2={PAD.l + PLOT_W}
                y2={Y(0)}
                stroke={palette.borderStrong}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            )}

            {/* support window shading */}
            <Rect
              x={xWinStart}
              y={PAD.t}
              width={Math.max(0, xWinEnd - xWinStart)}
              height={PLOT_H}
              fill={palette.supportWindowFill}
            />

            {/* gold HRDF area + outline */}
            <Path d={geo.area} fill="url(#simGoldGrad)" />
            <Path d={geo.areaTop} fill="none" stroke={palette.gold} strokeWidth={1.6} />

            {/* rose net-cost line */}
            <Path
              d={geo.line}
              fill="none"
              stroke={palette.rose}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* start / end markers */}
            {supStartT >= 1 && supStartT <= n && (
              <>
                <Line
                  x1={X(supStartT)}
                  y1={PAD.t}
                  x2={X(supStartT)}
                  y2={PAD.t + PLOT_H}
                  stroke={palette.borderStrong}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText x={X(supStartT) + 4} y={PAD.t + 11} fontSize={10} fill={palette.dim}>
                  support starts
                </SvgText>
              </>
            )}
            {supEndT >= 1 && supEndT <= n && (
              <>
                <Line
                  x1={X(supEndT)}
                  y1={PAD.t}
                  x2={X(supEndT)}
                  y2={PAD.t + PLOT_H}
                  stroke={palette.borderStrong}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText x={X(supEndT) + 4} y={PAD.t + 25} fontSize={10} fill={palette.dim}>
                  support ends
                </SvgText>
              </>
            )}

            {/* x labels */}
            {geo.xLabels.map((xl, i) => (
              <SvgText
                key={`x${i}`}
                x={xl.x}
                y={PAD.t + PLOT_H + 18}
                textAnchor={xl.anchor}
                fontSize={10}
                fill={palette.mute}
              >
                {xl.label}
              </SvgText>
            ))}

            {/* hover marker */}
            {hovered && (
              <>
                <Line
                  x1={X(hovered.t)}
                  y1={PAD.t}
                  x2={X(hovered.t)}
                  y2={PAD.t + PLOT_H}
                  stroke={palette.borderStrong}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <Circle cx={X(hovered.t)} cy={Y(hovered.hrdf)} r={3.5} fill={palette.gold} />
                <Circle cx={X(hovered.t)} cy={Y(hovered.net)} r={3.5} fill={palette.rose} />
              </>
            )}
          </Svg>

          {/* tooltip */}
          {hovered && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: tipLeft,
                top: tipTop,
                minWidth: 150,
                backgroundColor: palette.card,
                borderWidth: 1,
                borderColor: palette.borderStrong,
                borderRadius: 10,
                paddingVertical: 9,
                paddingHorizontal: 11,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  color: palette.mute,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 5,
                }}
              >
                Month {hovered.t}
                {hovered.active ? ' · support active' : ''}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                <Text style={{ fontSize: 11.5, color: palette.gold }}>HRDF in</Text>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '600',
                    color: palette.gold,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {sar(hovered.hrdf)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    color: hovered.net >= 0 ? palette.rose : palette.green,
                  }}
                >
                  Net
                </Text>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '600',
                    color: hovered.net >= 0 ? palette.rose : palette.green,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {hovered.net >= 0 ? `${sar(hovered.net)} cost` : `+${sar(-hovered.net)} gain`}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
