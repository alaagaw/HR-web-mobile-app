/**
 * MUI Theme Provider — wraps web-only DataGrid components with a MUI theme
 * that matches the app's enterprise dark / light design system.
 */
import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

interface MuiThemeProviderProps {
  isDark: boolean;
  children: React.ReactNode;
}

export function MuiThemeProvider({ isDark, children }: MuiThemeProviderProps) {
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? 'dark' : 'light',
          primary: { main: '#3b82f6' },
          background: {
            default: isDark ? '#0b1220' : '#F8FAFC',
            paper: isDark ? '#111a2e' : '#FFFFFF',
          },
          text: {
            primary: isDark ? '#FFFFFF' : '#0F172A',
            secondary: isDark ? '#94A3B8' : '#64748B',
          },
          divider: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
        },
        typography: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 13,
        },
      }),
    [isDark],
  );

  // DataGrid overrides applied after theme creation to avoid strict TS issues
  // with @mui/x-data-grid types not being in base MUI Components type.
  (theme.components as any).MuiDataGrid = {
    styleOverrides: {
      root: {
        border: 'none',
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: isDark ? '#111a2e' : '#F8FAFC',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`,
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: isDark ? '#94A3B8' : '#64748B',
        },
        '& .MuiDataGrid-columnHeaderTitle': {
          fontWeight: 700,
          fontSize: 12,
        },
        '& .MuiDataGrid-columnHeader': {
          justifyContent: 'center',
        },
        '& .MuiDataGrid-columnHeaderTitleContainer': {
          justifyContent: 'center',
        },
        '& .MuiDataGrid-cell': {
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(226,232,240,0.6)'}`,
          fontSize: 14,
          justifyContent: 'center',
          textAlign: 'center',
        },
        '& .MuiDataGrid-row:nth-of-type(odd)': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
        },
        '& .MuiDataGrid-row:nth-of-type(even)': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
        },
        '& .MuiDataGrid-row:hover': {
          backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.04)',
          cursor: 'pointer',
        },
        '& .MuiDataGrid-row.Mui-selected': {
          backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
        },
        '& .MuiDataGrid-footerContainer': {
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`,
        },
        '& .MuiDataGrid-toolbarContainer': {
          padding: '8px 12px',
          gap: '8px',
        },
        '& .MuiDataGrid-columnSeparator': {
          display: 'none',
        },
      },
    },
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
