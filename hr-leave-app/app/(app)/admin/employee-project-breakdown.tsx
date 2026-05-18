import { AccessGate } from '@/components/access/access-gate';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { overtimeService } from '@/services';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';

const isWeb = Platform.OS === 'web';

let MuiThemeProvider: any;
let DataGrid: any;
let MuiButton: any;
let Snackbar: any;
let Alert: any;
if (isWeb) {
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  DataGrid = require('@mui/x-data-grid').DataGrid;
  MuiButton = require('@mui/material/Button').default;
  Snackbar = require('@mui/material/Snackbar').default;
  Alert = require('@mui/material/Alert').default;
}

/**
 * Per-employee × per-project breakdown of timesheet hours for a month.
 *
 * Renders one row per (employee, project) with R / OT / Grand totals.
 * Employees who worked on multiple projects show one row per project,
 * grouped together by employee_name. A subtotal row per employee shows
 * their combined R / OT / Grand across all projects — that's the
 * "total OT per employee across all projects" the report was asked for.
 */
export default function EmployeeProjectBreakdownScreen() {
  return (
    <AccessGate resourceKey="nav:timesheet-management">
      <EmployeeProjectBreakdownScreenInner />
    </AccessGate>
  );
}

function EmployeeProjectBreakdownScreenInner() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const year = anchor.getFullYear();
      const month = anchor.getMonth() + 1;
      const data = await overtimeService.getEmployeeProjectBreakdown(year, month);
      // Build grid rows: original rows + a subtotal row per employee.
      const withSubtotals: any[] = [];
      let i = 0;
      while (i < data.length) {
        const empKey = data[i].employee_id ?? `name:${data[i].employee_name}`;
        const empGroup: typeof data = [];
        let j = i;
        while (j < data.length && (data[j].employee_id ?? `name:${data[j].employee_name}`) === empKey) {
          empGroup.push(data[j]);
          j++;
        }
        for (const r of empGroup) {
          withSubtotals.push({
            id: `${empKey}::${r.project_id}`,
            kind: 'detail',
            employee_name: r.employee_name,
            employee_number: r.employee_number,
            project: `${r.project_number} · ${r.project_name}`,
            regular: r.standard_hours,
            overtime: r.overtime_hours,
            total: r.total_hours,
          });
        }
        if (empGroup.length > 1) {
          const sumR = empGroup.reduce((s, r) => s + r.standard_hours, 0);
          const sumOT = empGroup.reduce((s, r) => s + r.overtime_hours, 0);
          withSubtotals.push({
            id: `${empKey}::__subtotal__`,
            kind: 'subtotal',
            employee_name: empGroup[0].employee_name,
            employee_number: empGroup[0].employee_number,
            project: `Subtotal across ${empGroup.length} projects`,
            regular: sumR,
            overtime: sumOT,
            total: sumR + sumOT,
          });
        }
        i = j;
      }
      setRows(withSubtotals);
    } catch (err: any) {
      setSnack({ open: true, msg: err.message || 'Failed to load breakdown', sev: 'error' });
    } finally {
      setLoading(false);
    }
  }, [anchor]);
  useEffect(() => { load(); }, [load]);

  const grandTotals = useMemo(() => {
    let r = 0, o = 0;
    for (const row of rows) {
      if (row.kind === 'detail') {
        r += row.regular;
        o += row.overtime;
      }
    }
    return { regular: r, overtime: o, total: r + o };
  }, [rows]);

  const columns = useMemo(() => [
    {
      field: 'employee_name', headerName: 'Employee', flex: 2, minWidth: 200,
      renderCell: (p: any) => (
        <span style={{ fontWeight: p.row.kind === 'subtotal' ? 700 : 500, opacity: p.row.kind === 'subtotal' ? 0.85 : 1 }}>
          {p.row.kind === 'subtotal' ? '' : p.row.employee_name}
        </span>
      ),
    },
    { field: 'employee_number', headerName: 'EMP #', width: 100,
      valueGetter: (p: any) => p?.row?.kind === 'subtotal' ? '' : (p?.row?.employee_number || '—'),
    },
    {
      field: 'project', headerName: 'Project', flex: 2, minWidth: 250,
      renderCell: (p: any) => (
        <span style={{ fontStyle: p.row.kind === 'subtotal' ? 'italic' : 'normal', opacity: p.row.kind === 'subtotal' ? 0.7 : 1 }}>
          {p.row.project}
        </span>
      ),
    },
    {
      field: 'regular', headerName: 'Regular', width: 100, type: 'number',
      renderCell: (p: any) => <span style={{ fontWeight: p.row.kind === 'subtotal' ? 700 : 400 }}>{p.row.regular}</span>,
    },
    {
      field: 'overtime', headerName: 'Overtime', width: 100, type: 'number',
      renderCell: (p: any) => <span style={{ color: '#F59E0B', fontWeight: p.row.kind === 'subtotal' ? 700 : 400 }}>{p.row.overtime}</span>,
    },
    {
      field: 'total', headerName: 'Grand', width: 100, type: 'number',
      renderCell: (p: any) => <span style={{ color: '#3b82f6', fontWeight: 700 }}>{p.row.total}</span>,
    },
  ], []);

  if (!isWeb || !DataGrid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }} edges={['top']}>
        <ScreenHeader title="Employee × Project Breakdown" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }} edges={['top']}>
      <ScreenHeader title="Employee × Project Breakdown" />
      <MuiThemeProvider isDark={isDark}>
        <View style={{ padding: 16, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <MuiButton size="small" variant="outlined" onClick={() => setAnchor(subMonths(anchor, 1))}>{'<'}</MuiButton>
            <div style={{ fontSize: 16, fontWeight: 700, minWidth: 140, textAlign: 'center', color: '#F8FAFC' }}>
              {format(anchor, 'MMMM yyyy')}
            </div>
            <MuiButton size="small" variant="outlined" onClick={() => setAnchor(addMonths(anchor, 1))}>{'>'}</MuiButton>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: '#94A3B8' }}>
              Total: <strong style={{ color: '#F8FAFC' }}>R {grandTotals.regular}</strong>
              <span style={{ color: '#F59E0B', marginLeft: 8 }}>· OT {grandTotals.overtime}</span>
              <span style={{ color: '#3b82f6', marginLeft: 8 }}>· Grand {grandTotals.total}</span>
            </div>
          </div>

          <div style={{ flex: 1, height: 600, backgroundColor: '#111a2e', borderRadius: 12, padding: 8 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
              getRowClassName={(p: any) => (p.row.kind === 'subtotal' ? 'subtotal-row' : '')}
              sx={{
                '& .subtotal-row': { backgroundColor: 'rgba(59,130,246,0.06)' },
                '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
              }}
            />
          </div>
        </View>

        {Snackbar && (
          <Snackbar
            open={snack.open}
            autoHideDuration={4000}
            onClose={() => setSnack((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.sev} variant="filled">
              {snack.msg}
            </Alert>
          </Snackbar>
        )}
      </MuiThemeProvider>
    </SafeAreaView>
  );
}
