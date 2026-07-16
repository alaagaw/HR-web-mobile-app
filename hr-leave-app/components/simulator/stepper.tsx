import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { SimPalette } from './palette';

/**
 * − / value / + integer stepper with a unit tag, matching the
 * prototype's headcount steppers. Works identically on web and
 * touch (no slider dependency needed).
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  unit = 'heads',
  palette,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  palette: SimPalette;
}) {
  const step = (d: number) => {
    let next = value + d;
    if (next < min) next = min;
    if (max != null && next > max) next = max;
    onChange(next);
  };

  const btnStyle = {
    width: 42,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: palette.cardAlt,
      }}
    >
      <Pressable onPress={() => step(-1)} style={btnStyle} accessibilityLabel="Decrease">
        <Text style={{ fontSize: 18, color: palette.dim }}>−</Text>
      </Pressable>
      <View
        style={{
          flex: 1,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: palette.border,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: palette.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
      </View>
      <Pressable onPress={() => step(1)} style={btnStyle} accessibilityLabel="Increase">
        <Text style={{ fontSize: 18, color: palette.dim }}>+</Text>
      </Pressable>
      <View
        style={{
          width: 52,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderLeftWidth: 1,
          borderColor: palette.border,
        }}
      >
        <Text
          style={{
            fontSize: 10.5,
            color: palette.mute,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {unit}
        </Text>
      </View>
    </View>
  );
}
