import React from 'react';
import { View, Text } from 'react-native';
import type { SimPalette } from './palette';

/**
 * Saudization compliance ratio bar: projected-ratio fill (green
 * when the target is met, rose when below) with a gold target
 * marker at the target percentage.
 */
export function RatioBar({
  /** Projected ratio 0–1 (drives the fill width). */
  projected,
  /** Target ratio 0–1 (marker position). */
  target,
  meets,
  palette,
}: {
  projected: number;
  target: number;
  meets: boolean;
  palette: SimPalette;
}) {
  const fillPct = Math.min(100, projected * 100);
  return (
    <View style={{ marginTop: 18, marginBottom: 6 }}>
      <View
        style={{
          height: 30,
          backgroundColor: palette.cardAlt,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 8,
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${fillPct}%`,
            backgroundColor: meets ? palette.green : palette.rose,
            opacity: 0.75,
            borderTopLeftRadius: 7,
            borderBottomLeftRadius: 7,
          }}
        />
        {/* Target marker */}
        <View
          style={{
            position: 'absolute',
            left: `${target * 100}%`,
            top: -4,
            bottom: -4,
            width: 2,
            backgroundColor: palette.gold,
          }}
        />
        <Text
          style={{
            position: 'absolute',
            left: `${target * 100}%`,
            top: -18,
            marginLeft: -24,
            fontSize: 9.5,
            color: palette.gold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {Math.round(target * 100)}% target
        </Text>
      </View>
    </View>
  );
}
