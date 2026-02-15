/**
 * MUI Theme Provider — wraps web-only DataGrid components with a MUI theme
 * that matches the app's current light/dark mode.
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
          primary: { main: '#2563EB' },
          background: {
            default: isDark ? '#0F172A' : '#F8FAFC',
            paper: isDark ? '#1E293B' : '#FFFFFF',
          },
          text: {
            primary: isDark ? '#F1F5F9' : '#0F172A',
            secondary: isDark ? '#94A3B8' : '#64748B',
          },
          divider: isDark ? '#334155' : '#E2E8F0',
        },
        typography: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 13,
        },
        components: {
          MuiDataGrid: {
            styleOverrides: {
              root: {
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderBottom: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
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
                  borderBottom: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)'}`,
                  fontSize: 14,
                  justifyContent: 'center',
                  textAlign: 'center',
                },
                '& .MuiDataGrid-row:nth-of-type(odd)': {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF',
                },
                '& .MuiDataGrid-row:nth-of-type(even)': {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.08)' : 'rgba(37, 99, 235, 0.04)',
                  cursor: 'pointer',
                },
                '& .MuiDataGrid-row.Mui-selected': {
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
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
          },
        },
      }),
    [isDark]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
