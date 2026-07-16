import React from 'react';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { SimPalette } from './palette';

/**
 * Bordered section card with an uppercase panel title and an
 * optional right-side element in the header (segment control,
 * status pill, legend…). Mirrors the prototype's `.panel`.
 */
export function SimPanel({
  title,
  right,
  palette,
  children,
  style,
}: {
  title: string;
  right?: React.ReactNode;
  palette: SimPalette;
  children: React.ReactNode;
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
        },
        style,
      ]}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 1.3,
            color: palette.dim,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>
        {right}
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 }}>{children}</View>
    </View>
  );
}
