import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { leaveService } from '@/services';
import { LeaveStatus, LeaveType } from '@/types/enums';
import { formatDateRange, formatHours, getInitials, getRoleLabel } from '@/lib/utils';
import { getLeaveTypeLabel, getLeaveTypeVariant } from '@/lib/state-machine';
import type { LeaveRequest } from '@/types/models';
import {
  format,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

const isWeb = Platform.OS === 'web';

// Lazy-load MUI components only on web
let MuiThemeProvider: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let MuiButton: any;
let Chip: any;
let ToggleButtonGroup: any;
let ToggleButton: any;
let MuiSelect: any;
let MuiMenuItem: any;
let MuiFormControl: any;

if (isWeb) {
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiButton = require('@mui/material/Button').default;
  Chip = require('@mui/material/Chip').default;
  ToggleButtonGroup = require('@mui/material/ToggleButtonGroup').default;
  ToggleButton = require('@mui/material/ToggleButton').default;
  MuiSelect = require('@mui/material/Select').default;
  MuiMenuItem = require('@mui/material/MenuItem').default;
  MuiFormControl = require('@mui/material/FormControl').default;
}

// ======================== Types & Constants ========================

type ViewMode = 'week' | 'month' | 'year';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOT = '\u00b7'; // middle dot

// Vibrant, modern palette — higher saturation, better contrast on dark backgrounds
const PALETTE = [
  '#3B82F6', // vivid blue
  '#8B5CF6', // vivid purple
  '#06B6D4', // cyan
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // orange
  '#A855F7', // violet
  '#0EA5E9', // sky
  '#84CC16', // lime
];

// ======================== Helpers ========================

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getLeavesForDay(date: Date, requests: LeaveRequest[]): LeaveRequest[] {
  const d = format(date, 'yyyy-MM-dd');
  return requests.filter((r) => r.start_date <= d && r.end_date >= d);
}

function getUniqueDepartments(requests: LeaveRequest[]): string[] {
  const depts = new Set<string>();
  requests.forEach((r) => {
    if (r.employee?.department) depts.add(r.employee.department);
  });
  return Array.from(depts).sort();
}

function getMonthDays(date: Date): Date[] {
  const calStart = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  return Array.from({ length: 42 }, (_, i) => addDays(calStart, i));
}

function leaveColor(leave: LeaveRequest): string {
  return leave.leave_type === LeaveType.Emergency ? '#EF4444'
    : leave.leave_type === LeaveType.NonPaidTimeOff ? '#F59E0B'
    : hashColor(leave.employee_id);
}

// ======================== WEB: Toolbar ========================

function CalendarToolbar({
  viewMode,
  onViewModeChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
  department,
  onDepartmentChange,
  departments,
  isDark,
  leaveTypeFilter,
  onLeaveTypeFilterChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  department: string;
  onDepartmentChange: (dept: string) => void;
  departments: string[];
  isDark: boolean;
  leaveTypeFilter: string;
  onLeaveTypeFilterChange: (type: string) => void;
}) {
  let title = '';
  if (viewMode === 'month') title = format(currentDate, 'MMMM yyyy');
  else if (viewMode === 'week') {
    const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
    const we = endOfWeek(currentDate, { weekStartsOn: 0 });
    title = `${format(ws, 'MMM d')} \u2013 ${format(we, 'MMM d, yyyy')}`;
  } else {
    title = format(currentDate, 'yyyy');
  }

  const arrowBtn: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: `1px solid ${isDark ? '#475569' : '#CBD5E1'}`,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    flexShrink: 0,
    transition: 'all 0.15s',
  };

  const arrowColor = isDark ? '#E2E8F0' : '#334155';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 14px', flexWrap: 'wrap' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div onClick={onPrev} style={arrowBtn} className="hover-lift">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={arrowColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </div>
        <div onClick={onNext} style={arrowBtn} className="hover-lift">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={arrowColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </div>
        <div
          onClick={onToday}
          style={{
            ...arrowBtn,
            width: 'auto',
            padding: '0 16px',
            fontSize: 13,
            fontWeight: 700,
            color: '#3B82F6',
            border: `1px solid ${isDark ? '#3B82F650' : '#3B82F640'}`,
            backgroundColor: isDark ? '#3B82F615' : '#3B82F610',
          }}
        >
          Today
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A', minWidth: 200, letterSpacing: -0.3 }}>
        {title}
      </div>

      <div style={{ flex: 1 }} />

      {/* Leave type filter */}
      <MuiFormControl size="small" sx={{ minWidth: 130 }}>
        <MuiSelect
          value={leaveTypeFilter}
          onChange={(e: any) => onLeaveTypeFilterChange(e.target.value)}
          displayEmpty
          sx={{ fontSize: 13, fontWeight: 600, borderRadius: 2 }}
        >
          <MuiMenuItem value="">All Types</MuiMenuItem>
          <MuiMenuItem value={LeaveType.PTO}>PTO</MuiMenuItem>
          <MuiMenuItem value={LeaveType.Emergency}>Emergency</MuiMenuItem>
          <MuiMenuItem value={LeaveType.NonPaidTimeOff}>Non-Paid</MuiMenuItem>
        </MuiSelect>
      </MuiFormControl>

      {/* Department filter */}
      <MuiFormControl size="small" sx={{ minWidth: 160 }}>
        <MuiSelect
          value={department}
          onChange={(e: any) => onDepartmentChange(e.target.value)}
          displayEmpty
          sx={{ fontSize: 13, fontWeight: 600, borderRadius: 2 }}
        >
          <MuiMenuItem value="">All Departments</MuiMenuItem>
          {departments.map((d) => (
            <MuiMenuItem key={d} value={d}>{d}</MuiMenuItem>
          ))}
        </MuiSelect>
      </MuiFormControl>

      {/* View mode */}
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_: any, v: string) => v && onViewModeChange(v as ViewMode)}
        size="small"
        sx={{ '& .MuiToggleButton-root': { borderRadius: '8px !important' } }}
      >
        <ToggleButton value="week" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, px: 2 }}>Week</ToggleButton>
        <ToggleButton value="month" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, px: 2 }}>Month</ToggleButton>
        <ToggleButton value="year" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, px: 2 }}>Year</ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}

// ======================== WEB: Month View ========================

function MonthView({
  currentDate,
  leaves,
  isDark,
  onLeaveClick,
  onDayClick,
}: {
  currentDate: Date;
  leaves: LeaveRequest[];
  isDark: boolean;
  onLeaveClick: (leave: LeaveRequest) => void;
  onDayClick: (date: Date, leaves: LeaveRequest[]) => void;
}) {
  const days = getMonthDays(currentDate);
  const MAX_VISIBLE = 3;
  const border = isDark ? '#1E293B' : '#E2E8F0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Weekday headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        }}
      >
        {WEEKDAY_LABELS.map((label, i) => {
          const isWeekend = i === 0 || i === 6;
          return (
            <div
              key={label}
              style={{
                padding: '10px 0',
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: isWeekend
                  ? isDark ? '#64748B' : '#94A3B8'
                  : isDark ? '#94A3B8' : '#64748B',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', flex: 1 }}>
        {days.map((day) => {
          const dayLeaves = getLeavesForDay(day, leaves);
          const inMonth = isSameMonth(day, currentDate);
          const tod = isToday(day);
          const weekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={day.toISOString()}
              style={{
                borderRight: `1px solid ${border}`,
                borderBottom: `1px solid ${border}`,
                padding: 4,
                minHeight: 0,
                overflow: 'hidden',
                backgroundColor: !inMonth
                  ? isDark ? '#080D19' : '#F1F5F9'
                  : weekend
                    ? isDark ? '#0C1222' : '#FAFBFE'
                    : isDark ? '#111827' : '#FFFFFF',
                transition: 'background-color 0.15s',
              }}
            >
              {/* Date number */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: tod ? 800 : inMonth ? 600 : 400,
                    backgroundColor: tod ? '#3B82F6' : 'transparent',
                    boxShadow: tod ? '0 2px 8px rgba(59,130,246,0.5)' : 'none',
                    color: tod
                      ? '#FFFFFF'
                      : !inMonth
                        ? isDark ? '#334155' : '#CBD5E1'
                        : isDark ? '#CBD5E1' : '#334155',
                  }}
                >
                  {format(day, 'd')}
                </div>
              </div>

              {/* Leave pills */}
              {inMonth && dayLeaves.slice(0, MAX_VISIBLE).map((leave) => {
                const color = leaveColor(leave);
                return (
                  <div
                    key={leave.id}
                    onClick={(e) => { e.stopPropagation(); onLeaveClick(leave); }}
                    style={{
                      background: isDark
                        ? `linear-gradient(135deg, ${color}35, ${color}20)`
                        : `linear-gradient(135deg, ${color}25, ${color}15)`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 5,
                      padding: '2px 7px',
                      marginBottom: 3,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      color: isDark ? '#F1F5F9' : '#1E293B',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px ${color}30`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    {leave.employee?.full_name || '\u2014'}
                  </div>
                );
              })}

              {inMonth && dayLeaves.length > MAX_VISIBLE && (
                <div
                  onClick={() => onDayClick(day, dayLeaves)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#3B82F6',
                    cursor: 'pointer',
                    paddingLeft: 6,
                    marginTop: 1,
                  }}
                >
                  +{dayLeaves.length - MAX_VISIBLE} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ======================== WEB: Week View ========================

function WeekView({
  currentDate,
  leaves,
  isDark,
  onLeaveClick,
}: {
  currentDate: Date;
  leaves: LeaveRequest[];
  isDark: boolean;
  onLeaveClick: (leave: LeaveRequest) => void;
}) {
  const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const border = isDark ? '#1E293B' : '#E2E8F0';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, overflow: 'hidden' }}>
      {days.map((day) => {
        const dayLeaves = getLeavesForDay(day, leaves);
        const tod = isToday(day);
        const weekend = day.getDay() === 0 || day.getDay() === 6;

        return (
          <div
            key={day.toISOString()}
            style={{
              borderRight: `1px solid ${border}`,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: weekend
                ? isDark ? '#0C1222' : '#FAFBFE'
                : isDark ? '#111827' : '#FFFFFF',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '12px 8px',
                borderBottom: `2px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                textAlign: 'center',
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: tod ? '#3B82F6' : isDark ? '#64748B' : '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {format(day, 'EEE')}
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  fontWeight: tod ? 800 : 600,
                  marginTop: 4,
                  backgroundColor: tod ? '#3B82F6' : 'transparent',
                  boxShadow: tod ? '0 2px 10px rgba(59,130,246,0.5)' : 'none',
                  color: tod ? '#FFFFFF' : isDark ? '#E2E8F0' : '#0F172A',
                }}
              >
                {format(day, 'd')}
              </div>
            </div>

            {/* Leave cards */}
            <div style={{ flex: 1, padding: 8, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayLeaves.length === 0 && (
                <div style={{ fontSize: 12, color: isDark ? '#334155' : '#E2E8F0', textAlign: 'center', marginTop: 32, fontStyle: 'italic' }}>
                  No leave
                </div>
              )}
              {dayLeaves.map((leave) => {
                const color = leaveColor(leave);
                return (
                  <div
                    key={leave.id}
                    onClick={() => onLeaveClick(leave)}
                    style={{
                      background: isDark
                        ? `linear-gradient(135deg, ${color}22, ${color}10)`
                        : `linear-gradient(135deg, ${color}18, ${color}08)`,
                      borderLeft: `4px solid ${color}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'transform 0.12s, box-shadow 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${color}25`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 800,
                          color: '#FFFFFF',
                          flexShrink: 0,
                          boxShadow: `0 2px 6px ${color}40`,
                        }}
                      >
                        {getInitials(leave.employee?.full_name || '?')}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#F1F5F9' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {leave.employee?.full_name}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', marginLeft: 36 }}>
                      {leave.employee?.department || '\u2014'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginLeft: 36 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: leave.leave_type === LeaveType.Emergency ? '#EF444425'
                            : leave.leave_type === LeaveType.NonPaidTimeOff ? '#F59E0B25'
                            : '#3B82F620',
                          color: leave.leave_type === LeaveType.Emergency ? '#EF4444'
                            : leave.leave_type === LeaveType.NonPaidTimeOff ? '#F59E0B'
                            : '#3B82F6',
                        }}
                      >
                        {getLeaveTypeLabel(leave.leave_type).toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8' }}>
                        {formatHours(leave.requested_hours)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ======================== WEB: Year View ========================

function YearView({
  currentDate,
  leaves,
  isDark,
  onMonthClick,
}: {
  currentDate: Date;
  leaves: LeaveRequest[];
  isDark: boolean;
  onMonthClick: (month: Date) => void;
}) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  const miniWeekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: 12, overflow: 'auto', flex: 1 }}>
      {months.map((month) => {
        const days = getMonthDays(month);
        const currentMonth = isSameMonth(month, new Date());

        return (
          <div
            key={month.getMonth()}
            onClick={() => onMonthClick(month)}
            style={{
              cursor: 'pointer',
              padding: 14,
              borderRadius: 14,
              border: `1px solid ${currentMonth ? (isDark ? '#3B82F650' : '#3B82F640') : (isDark ? '#1E293B' : '#E2E8F0')}`,
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              transition: 'all 0.2s',
              boxShadow: currentMonth ? `0 0 0 1px ${isDark ? '#3B82F630' : '#3B82F620'}` : 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = isDark
                ? '0 8px 24px rgba(0,0,0,0.4)'
                : '0 8px 24px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = currentMonth ? `0 0 0 1px ${isDark ? '#3B82F630' : '#3B82F620'}` : 'none';
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: currentMonth ? '#3B82F6' : isDark ? '#E2E8F0' : '#0F172A',
                marginBottom: 10,
                textAlign: 'center',
                letterSpacing: -0.2,
              }}
            >
              {format(month, 'MMMM')}
            </div>

            {/* Mini weekday headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
              {miniWeekdays.map((label, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: isDark ? '#475569' : '#CBD5E1', padding: '2px 0' }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Mini day grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {days.map((day) => {
                const inMonth = isSameMonth(day, month);
                const count = inMonth ? getLeavesForDay(day, leaves).length : 0;
                const tod = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: tod ? 800 : count > 0 ? 700 : 400,
                      borderRadius: '50%',
                      color: !inMonth
                        ? 'transparent'
                        : tod
                          ? '#FFFFFF'
                          : count > 0
                            ? '#FFFFFF'
                            : isDark ? '#64748B' : '#94A3B8',
                      background: !inMonth
                        ? 'transparent'
                        : tod
                          ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                          : count > 0
                            ? `linear-gradient(135deg, rgba(59,130,246,${Math.min(0.4 + count * 0.2, 0.95)}), rgba(99,102,241,${Math.min(0.35 + count * 0.2, 0.9)}))`
                            : 'transparent',
                      boxShadow: tod ? '0 1px 4px rgba(59,130,246,0.5)' : 'none',
                    }}
                  >
                    {inMonth ? format(day, 'd') : ''}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ======================== WEB: Leave Detail Dialog ========================

function LeaveDetailDialog({
  leave,
  onClose,
  isDark,
}: {
  leave: LeaveRequest | null;
  onClose: () => void;
  isDark: boolean;
}) {
  if (!leave) return null;

  const color = leaveColor(leave);

  const typeColorMap: Record<string, { bg: string; fg: string; border: string }> = {
    [LeaveType.Emergency]: { bg: '#EF444420', fg: '#EF4444', border: '#EF444440' },
    [LeaveType.NonPaidTimeOff]: { bg: '#F59E0B20', fg: '#F59E0B', border: '#F59E0B40' },
  };
  const typeColors = typeColorMap[leave.leave_type] || { bg: '#3B82F620', fg: '#3B82F6', border: '#3B82F640' };

  return (
    <Dialog
      open={!!leave}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* Colored header banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}BB)`,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 800,
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          {getInitials(leave.employee?.full_name || '?')}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>{leave.employee?.full_name}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
            {leave.employee?.department || 'No department'} {DOT} {getRoleLabel(leave.employee?.role as any || 'employee')}
          </div>
        </div>
      </div>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info rows */}
          {[
            {
              label: 'Leave Type',
              value: (
                <Chip
                  label={getLeaveTypeLabel(leave.leave_type)}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    backgroundColor: typeColors.bg,
                    color: typeColors.fg,
                    border: `1px solid ${typeColors.border}`,
                  }}
                />
              ),
            },
            { label: 'Dates', value: <span style={{ fontSize: 14, fontWeight: 700 }}>{formatDateRange(leave.start_date, leave.end_date)}</span> },
            { label: 'Requested Hours', value: <span style={{ fontSize: 14, fontWeight: 700 }}>{formatHours(leave.requested_hours)}</span> },
            {
              label: 'Status',
              value: (
                <Chip
                  label="Approved"
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    backgroundColor: '#10B98120',
                    color: '#10B981',
                    border: '1px solid #10B98140',
                  }}
                />
              ),
            },
            ...(leave.case_number ? [{ label: 'Case #', value: <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: isDark ? '#94A3B8' : '#64748B' }}>{leave.case_number}</span> }] : []),
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 500 }}>{row.label}</span>
              {typeof row.value === 'string' ? <span style={{ fontSize: 14, fontWeight: 700 }}>{row.value}</span> : row.value}
            </div>
          ))}

          {leave.employee_comment && (
            <div>
              <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 500, marginBottom: 6 }}>Comment</div>
              <div
                style={{
                  fontSize: 13,
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                  lineHeight: 1.5,
                }}
              >
                {leave.employee_comment}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <MuiButton
          onClick={onClose}
          variant="contained"
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            backgroundColor: isDark ? '#334155' : '#F1F5F9',
            color: isDark ? '#E2E8F0' : '#334155',
            boxShadow: 'none',
            '&:hover': { backgroundColor: isDark ? '#475569' : '#E2E8F0', boxShadow: 'none' },
          }}
        >
          Close
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ======================== WEB: Day Detail Dialog ========================

function DayDetailDialog({
  day,
  onClose,
  onLeaveClick,
  isDark,
}: {
  day: { date: Date; leaves: LeaveRequest[] } | null;
  onClose: () => void;
  onLeaveClick: (leave: LeaveRequest) => void;
  isDark: boolean;
}) {
  if (!day) return null;

  return (
    <Dialog
      open={!!day}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* Header */}
      <div
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #1E293B, #0F172A)'
            : 'linear-gradient(135deg, #F8FAFC, #EFF6FF)',
          padding: '18px 24px',
          borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>
          {format(day.date, 'EEEE, MMMM d, yyyy')}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
          {day.leaves.length} {day.leaves.length === 1 ? 'person' : 'people'} on leave
        </div>
      </div>

      <DialogContent sx={{ pt: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {day.leaves.map((leave) => {
            const color = leaveColor(leave);
            return (
              <div
                key={leave.id}
                onClick={() => { onClose(); setTimeout(() => onLeaveClick(leave), 200); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: isDark
                    ? `linear-gradient(135deg, ${color}18, ${color}08)`
                    : `linear-gradient(135deg, ${color}12, ${color}06)`,
                  borderLeft: `4px solid ${color}`,
                  cursor: 'pointer',
                  transition: 'transform 0.12s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: `0 2px 8px ${color}40`,
                  }}
                >
                  {getInitials(leave.employee?.full_name || '?')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#F1F5F9' : '#0F172A' }}>{leave.employee?.full_name}</div>
                  <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', marginTop: 1 }}>
                    {leave.employee?.department || '\u2014'} {DOT} {getLeaveTypeLabel(leave.leave_type)}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color }}>
                  {formatHours(leave.requested_hours)}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <MuiButton
          onClick={onClose}
          variant="contained"
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            backgroundColor: isDark ? '#334155' : '#F1F5F9',
            color: isDark ? '#E2E8F0' : '#334155',
            boxShadow: 'none',
            '&:hover': { backgroundColor: isDark ? '#475569' : '#E2E8F0', boxShadow: 'none' },
          }}
        >
          Close
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ======================== Main Screen ========================

export default function CalendarScreen() {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isMobile } = useBreakpoint();

  const [viewMode, setViewMode] = useViewState<ViewMode>('tabs/calendar.viewMode', 'month');
  const [currentDateIso, setCurrentDateIso] = useViewState(
    'tabs/calendar.currentDate',
    new Date().toISOString()
  );
  const currentDate = useMemo(() => new Date(currentDateIso), [currentDateIso]);
  const setCurrentDate = useCallback(
    (next: Date | ((prev: Date) => Date)) => {
      if (typeof next === 'function') {
        setCurrentDateIso((prevIso) =>
          (next as (prev: Date) => Date)(new Date(prevIso)).toISOString()
        );
      } else {
        setCurrentDateIso(next.toISOString());
      }
    },
    [setCurrentDateIso]
  );
  const [department, setDepartment] = useViewState('tabs/calendar.department', '');
  const [leaveTypeFilter, setLeaveTypeFilter] = useViewState('tabs/calendar.leaveTypeFilter', '');
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [, setLoading] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; leaves: LeaveRequest[] } | null>(null);

  // Mobile state
  const [mobileSelectedDayIso, setMobileSelectedDayIso] = useViewState(
    'tabs/calendar.mobileSelectedDay',
    new Date().toISOString()
  );
  const mobileSelectedDay = useMemo(
    () => new Date(mobileSelectedDayIso),
    [mobileSelectedDayIso]
  );
  const setMobileSelectedDay = useCallback(
    (next: Date) => setMobileSelectedDayIso(next.toISOString()),
    [setMobileSelectedDayIso]
  );

  useAutoRefresh(() => {
    if (!user) return;
    setLoading(true);
    leaveService
      .getAllRequests({ status: LeaveStatus.Approved })
      .then(setAllRequests)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filteredRequests = useMemo(() => {
    let data = allRequests;
    if (department) data = data.filter((r) => r.employee?.department === department);
    if (leaveTypeFilter) data = data.filter((r) => r.leave_type === leaveTypeFilter);
    return data;
  }, [allRequests, department, leaveTypeFilter]);

  const departments = useMemo(() => getUniqueDepartments(allRequests), [allRequests]);

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subYears(d, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addYears(d, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleMonthClick = (month: Date) => {
    setCurrentDate(month);
    setViewMode('month');
  };

  // ============ WEB RENDER ============
  if (isWeb && !isMobile) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
        <View style={{ flex: 1, padding: 16, display: 'flex' as any, flexDirection: 'column' as any }}>
          <MuiThemeProvider isDark={isDark}>
            <CalendarToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              currentDate={currentDate}
              onPrev={handlePrev}
              onNext={handleNext}
              onToday={handleToday}
              department={department}
              onDepartmentChange={setDepartment}
              departments={departments}
              isDark={isDark}
              leaveTypeFilter={leaveTypeFilter}
              onLeaveTypeFilterChange={setLeaveTypeFilter}
            />

            <div
              style={{
                flex: 1,
                borderRadius: 14,
                border: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}`,
                overflow: 'hidden',
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isDark
                  ? '0 4px 24px rgba(0,0,0,0.3)'
                  : '0 4px 24px rgba(0,0,0,0.04)',
              }}
            >
              {viewMode === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  leaves={filteredRequests}
                  isDark={isDark}
                  onLeaveClick={setSelectedLeave}
                  onDayClick={(date, leaves) => setSelectedDay({ date, leaves })}
                />
              )}
              {viewMode === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  leaves={filteredRequests}
                  isDark={isDark}
                  onLeaveClick={setSelectedLeave}
                />
              )}
              {viewMode === 'year' && (
                <YearView
                  currentDate={currentDate}
                  leaves={filteredRequests}
                  isDark={isDark}
                  onMonthClick={handleMonthClick}
                />
              )}
            </div>

            <LeaveDetailDialog
              leave={selectedLeave}
              onClose={() => setSelectedLeave(null)}
              isDark={isDark}
            />
            <DayDetailDialog
              day={selectedDay}
              onClose={() => setSelectedDay(null)}
              onLeaveClick={setSelectedLeave}
              isDark={isDark}
            />
          </MuiThemeProvider>
        </View>
      </View>
    );
  }

  // ============ MOBILE RENDER ============
  const mobileDays = getMonthDays(currentDate);
  const mobileDayLeaves = getLeavesForDay(mobileSelectedDay, filteredRequests);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Calendar" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Month navigation */}
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => setCurrentDate((d) => subMonths(d, 1))} className="p-2">
            <Text className="text-primary text-lg font-bold">{'\u2039'}</Text>
          </Pressable>
          <Pressable onPress={handleToday}>
            <Text className="text-lg font-bold text-text-primary dark:text-white">
              {format(currentDate, 'MMMM yyyy')}
            </Text>
          </Pressable>
          <Pressable onPress={() => setCurrentDate((d) => addMonths(d, 1))} className="p-2">
            <Text className="text-primary text-lg font-bold">{'\u203A'}</Text>
          </Pressable>
        </View>

        {/* Department filter chips */}
        {departments.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <Pressable
              onPress={() => setDepartment('')}
              className={`mr-2 px-3 py-1.5 rounded-full ${!department ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <Text className={`text-xs font-semibold ${!department ? 'text-white' : 'text-text-primary dark:text-white'}`}>
                All
              </Text>
            </Pressable>
            {departments.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDepartment(department === d ? '' : d)}
                className={`mr-2 px-3 py-1.5 rounded-full ${department === d ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <Text className={`text-xs font-semibold ${department === d ? 'text-white' : 'text-text-primary dark:text-white'}`}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Compact month grid */}
        <Card className="mb-4">
          {/* Weekday row */}
          <View className="flex-row mb-2">
            {WEEKDAY_LABELS.map((label) => (
              <View key={label} className="flex-1 items-center">
                <Text className="text-xs font-semibold text-text-muted dark:text-slate-400">{label}</Text>
              </View>
            ))}
          </View>

          {/* Day cells */}
          {Array.from({ length: 6 }, (_, weekIdx) => (
            <View key={weekIdx} className="flex-row">
              {mobileDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => {
                const inMonth = isSameMonth(day, currentDate);
                const selected = isSameDay(day, mobileSelectedDay);
                const tod = isToday(day);
                const hasLeave = getLeavesForDay(day, filteredRequests).length > 0;

                return (
                  <Pressable
                    key={day.toISOString()}
                    onPress={() => setMobileSelectedDay(day)}
                    className="flex-1 items-center py-1.5"
                  >
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        selected ? 'bg-primary' : tod ? 'bg-blue-100 dark:bg-blue-900/40' : ''
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          selected
                            ? 'text-white font-bold'
                            : !inMonth
                              ? 'text-slate-300 dark:text-slate-600'
                              : tod
                                ? 'text-primary dark:text-blue-400 font-bold'
                                : 'text-text-primary dark:text-white'
                        }`}
                      >
                        {format(day, 'd')}
                      </Text>
                    </View>
                    {hasLeave && !selected && (
                      <View className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                    )}
                    {hasLeave && selected && (
                      <View className="w-1.5 h-1.5 rounded-full bg-white mt-0.5" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>

        {/* Selected day leaves */}
        <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">
          {format(mobileSelectedDay, 'EEEE, MMMM d')}
        </Text>

        {mobileDayLeaves.length === 0 ? (
          <Card>
            <Text className="text-sm text-text-muted dark:text-slate-400 text-center py-4">
              No leave on this day
            </Text>
          </Card>
        ) : (
          mobileDayLeaves.map((leave) => {
            const color = leaveColor(leave);
            return (
              <Card key={leave.id} className="mb-3">
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Text style={{ color }} className="text-sm font-bold">
                      {getInitials(leave.employee?.full_name || '?')}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-text-primary dark:text-white">
                      {leave.employee?.full_name}
                    </Text>
                    <Text className="text-xs text-text-muted dark:text-slate-400">
                      {leave.employee?.department || '\u2014'}
                    </Text>
                    <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                      {formatDateRange(leave.start_date, leave.end_date)} {DOT} {formatHours(leave.requested_hours)}
                    </Text>
                  </View>
                  <Badge variant={getLeaveTypeVariant(leave.leave_type)}>
                    {getLeaveTypeLabel(leave.leave_type)}
                  </Badge>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
