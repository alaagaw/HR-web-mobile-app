// ============================================================
// Simulator palette — theme-aware colors for the Saudization &
// HRDF simulator components.
//
// The prototype was dark-only; here the base surfaces map onto
// the app's slate theme (same hexes the admin pages hardcode via
// `isDark ? ... : ...`), and the accent SEMANTICS are preserved:
//   gold  = HRDF / government support (money in)
//   green = savings / net gain
//   rose  = cost / net outflow / violations
//   blue  = neutral / headcount / primary
// Light-mode accents are darker steps of the same hues so they
// stay readable on white cards.
// ============================================================

export interface SimPalette {
  bg: string;
  card: string;
  /** Slightly recessed surface (inputs, segment tracks). */
  cardAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  dim: string;
  mute: string;

  blue: string;
  gold: string;
  green: string;
  rose: string;

  /** Soft tinted backgrounds for status pills. */
  goldBg: string;
  greenBg: string;
  roseBg: string;

  /** Chart fills. */
  goldAreaTop: string;
  goldAreaBottom: string;
  supportWindowFill: string;
}

export function getSimPalette(isDark: boolean): SimPalette {
  if (isDark) {
    return {
      bg: '#0F172A',
      card: '#1E293B',
      cardAlt: '#0F172A',
      border: '#334155',
      borderStrong: '#475569',
      text: '#F1F5F9',
      dim: '#94A3B8',
      mute: '#64748B',

      blue: '#60A5FA',
      gold: '#F2B23A',
      green: '#3DDC97',
      rose: '#FB6F84',

      goldBg: 'rgba(242,178,58,0.12)',
      greenBg: 'rgba(61,220,151,0.12)',
      roseBg: 'rgba(251,111,132,0.12)',

      goldAreaTop: 'rgba(242,178,58,0.42)',
      goldAreaBottom: 'rgba(242,178,58,0.03)',
      supportWindowFill: 'rgba(242,178,58,0.05)',
    };
  }
  return {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    cardAlt: '#F1F5F9',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    text: '#0F172A',
    dim: '#64748B',
    mute: '#94A3B8',

    blue: '#2563EB',
    gold: '#D97706',
    green: '#16A34A',
    rose: '#E11D48',

    goldBg: 'rgba(217,119,6,0.10)',
    greenBg: 'rgba(22,163,74,0.10)',
    roseBg: 'rgba(225,29,72,0.10)',

    goldAreaTop: 'rgba(217,119,6,0.30)',
    goldAreaBottom: 'rgba(217,119,6,0.02)',
    supportWindowFill: 'rgba(217,119,6,0.06)',
  };
}
