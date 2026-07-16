import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import type { SimPalette } from './palette';

/**
 * Small labelled numeric input (shadow employees, violations,
 * compliance figures). Keeps a local text buffer so partial
 * typing ("1.", "") doesn't fight the parsed value; blank or
 * invalid input reads as 0, and blur re-syncs the display.
 */
export function NumField({
  label,
  value,
  onChange,
  palette,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  palette: SimPalette;
}) {
  const [text, setText] = useState(() => String(value));
  const focusedRef = useRef(false);

  // External changes (e.g. Reset) refresh the display unless the
  // user is mid-edit in this exact field.
  useEffect(() => {
    if (!focusedRef.current) setText(String(value));
  }, [value]);

  return (
    <View style={{ flex: 1, gap: 5 }}>
      <Text style={{ fontSize: 11, color: palette.mute }}>{label}</Text>
      <TextInput
        value={text}
        keyboardType="numeric"
        onChangeText={(t) => {
          setText(t);
          const v = parseFloat(t);
          onChange(Number.isNaN(v) ? 0 : Math.max(0, v));
        }}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          setText(String(value));
        }}
        style={{
          backgroundColor: palette.cardAlt,
          borderWidth: 1,
          borderColor: palette.border,
          color: palette.text,
          borderRadius: 9,
          paddingVertical: 9,
          paddingHorizontal: 10,
          fontSize: 14,
          fontVariant: ['tabular-nums'],
        }}
      />
    </View>
  );
}
