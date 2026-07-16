import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import type { SimPalette } from './palette';

const isWeb = Platform.OS === 'web';

function clampStep(raw: number, min: number, max: number, step: number): number {
  const stepped = Math.round((raw - min) / step) * step + min;
  return Math.max(min, Math.min(max, stepped));
}

/**
 * Range slider with a labelled scale row underneath, matching the
 * prototype's salary / lag / support sliders.
 *
 * No slider dependency: on web this renders a real DOM
 * `<input type="range">` (styled via `accent-color`); on native it
 * renders a press/drag track built on the responder system, with
 * −/+ nudge buttons for precise adjustment.
 */
export function SimSlider({
  value,
  min,
  max,
  step,
  onChange,
  accent,
  palette,
  leftLabel,
  midLabel,
  rightLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Thumb / fill color (theme accent, e.g. palette.blue or palette.gold). */
  accent: string;
  palette: SimPalette;
  leftLabel?: string;
  midLabel?: string;
  rightLabel?: string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);

  const frac = max > min ? (value - min) / (max - min) : 0;

  const handleTouch = (locationX: number) => {
    const w = trackWidthRef.current;
    if (w <= 0) return;
    const f = Math.max(0, Math.min(1, locationX / w));
    onChange(clampStep(min + f * (max - min), min, max, step));
  };

  const scale = (leftLabel || midLabel || rightLabel) && (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
      <Text style={{ fontSize: 11.5, color: palette.mute }}>{leftLabel ?? ''}</Text>
      <Text style={{ fontSize: 11.5, color: palette.mute }}>{midLabel ?? ''}</Text>
      <Text style={{ fontSize: 11.5, color: palette.mute }}>{rightLabel ?? ''}</Text>
    </View>
  );

  if (isWeb) {
    return (
      <View>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e: any) => onChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: accent,
            cursor: 'pointer',
            margin: '6px 0',
            height: 17,
          }}
        />
        {scale}
      </View>
    );
  }

  const thumbSize = 17;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
        <Pressable
          onPress={() => onChange(clampStep(value - step, min, max, step))}
          hitSlop={6}
          accessibilityLabel="Decrease"
        >
          <Text style={{ fontSize: 16, color: palette.dim, width: 18, textAlign: 'center' }}>−</Text>
        </Pressable>

        <View
          style={{ flex: 1, height: 32, justifyContent: 'center' }}
          onLayout={(e) => {
            trackWidthRef.current = e.nativeEvent.layout.width;
            setTrackWidth(e.nativeEvent.layout.width);
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX)}
          onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
        >
          {/* Track */}
          <View style={{ height: 5, borderRadius: 5, backgroundColor: palette.border }} />
          {/* Fill */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              width: Math.max(0, frac * trackWidth),
              height: 5,
              borderRadius: 5,
              backgroundColor: accent,
              opacity: 0.55,
            }}
          />
          {/* Thumb */}
          <View
            style={{
              position: 'absolute',
              left: Math.max(0, frac * trackWidth - thumbSize / 2),
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: accent,
            }}
          />
        </View>

        <Pressable
          onPress={() => onChange(clampStep(value + step, min, max, step))}
          hitSlop={6}
          accessibilityLabel="Increase"
        >
          <Text style={{ fontSize: 16, color: palette.dim, width: 18, textAlign: 'center' }}>+</Text>
        </Pressable>
      </View>
      {scale}
    </View>
  );
}
