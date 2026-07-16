import React from 'react';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { SimPalette } from './palette';

/**
 * KPI stat card: colored left edge + dot, uppercase caption,
 * big tabular number with a small "SAR" prefix, footnote.
 */
export function KpiCard({
  caption,
  value,
  foot,
  accent,
  palette,
  currencyPrefix = 'SAR',
  style,
}: {
  caption: string;
  /** Pre-formatted number, WITHOUT the currency prefix. */
  value: string;
  foot: string;
  /** Semantic accent color (edge, dot, and value tint). */
  accent: string;
  palette: SimPalette;
  currencyPrefix?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 14,
          paddingVertical: 15,
          paddingHorizontal: 16,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: accent,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
        <Text
          style={{
            fontSize: 11,
            color: palette.dim,
            textTransform: 'uppercase',
            letterSpacing: 0.9,
          }}
        >
          {caption}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 9 }}>
        {currencyPrefix ? (
          <Text style={{ fontSize: 12, color: palette.mute, fontWeight: '500', marginRight: 4 }}>
            {currencyPrefix}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: 25,
            fontWeight: '600',
            color: accent,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
      </View>
      <Text style={{ fontSize: 11.5, color: palette.mute, marginTop: 7 }}>{foot}</Text>
    </View>
  );
}
