import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { SimPalette } from './palette';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

/**
 * Small pill segment control (HRDF rate toggle, breakdown period
 * selector). One option is always active.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  palette,
  label,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  palette: SimPalette;
  /** Optional tiny uppercase caption rendered before the options. */
  label?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 10,
        padding: 3,
      }}
    >
      {label && (
        <Text
          style={{
            fontSize: 10,
            color: palette.mute,
            textTransform: 'uppercase',
            letterSpacing: 1,
            paddingLeft: 6,
            paddingRight: 8,
          }}
        >
          {label}
        </Text>
      )}
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            style={{
              paddingVertical: 7,
              paddingHorizontal: 13,
              borderRadius: 7,
              backgroundColor: on ? palette.card : 'transparent',
              borderWidth: on ? 1 : 0,
              borderColor: on ? palette.borderStrong : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: on ? '700' : '500',
                color: on ? palette.text : palette.dim,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
