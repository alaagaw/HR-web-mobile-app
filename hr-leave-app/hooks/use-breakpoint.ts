import { useWindowDimensions } from 'react-native';

/**
 * Single source of truth for the web/mobile layout cutoff.
 *
 * At or above MOBILE_BREAKPOINT the app renders the EXACT existing
 * desktop-web layout (sidebar, MUI DataGrids, wide dialogs) — no
 * mobile code path runs, so the desktop experience is unchanged.
 *
 * Below it, screens opt into the mobile "app-like" treatment
 * (bottom tabs + hamburger Drawer, stacked cards instead of tables,
 * full-screen dialogs).
 *
 * 1200px == a 12"-class laptop and MUI's `lg` breakpoint: laptops
 * and desktops keep the web layout; tablets (incl. iPad landscape)
 * and phones get the mobile layout. Chosen deliberately — do not
 * change without revisiting every `isMobile` call site.
 */
export const MOBILE_BREAKPOINT = 1200;

export function useBreakpoint() {
  const { width } = useWindowDimensions();

  const isMobile = width < MOBILE_BREAKPOINT;

  return {
    /** Viewport width in CSS px (reactive — updates on resize/rotate). */
    width,
    /** True below 1200px: render the mobile / card layout. */
    isMobile,
    /** True at/above 1200px: render the current desktop-web layout. */
    isDesktop: !isMobile,
  };
}
