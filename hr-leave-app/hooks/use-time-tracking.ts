import { useState, useCallback } from 'react';
import { timeTrackingService } from '@/services';
import type { TimeEntry } from '@/types/models';
import { todayDateOnly } from '@/lib/date-only';

export function useTimeTracking() {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<TimeEntry[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<
    { date: string; totalMinutes: number; entries: TimeEntry[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveEntry = useCallback(async (employeeId: string) => {
    try {
      const entry = await timeTrackingService.getActiveEntry(employeeId);
      setActiveEntry(entry);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchTodayEntries = useCallback(async (employeeId: string) => {
    try {
      const today = todayDateOnly();
      const entries = await timeTrackingService.getEntriesByDate(employeeId, today);
      setTodayEntries(entries);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchHistory = useCallback(
    async (employeeId: string, dateFrom: string, dateTo: string) => {
      setLoading(true);
      setError(null);
      try {
        const entries = await timeTrackingService.getHistory(employeeId, dateFrom, dateTo);
        setHistoryEntries(entries);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchWeeklySummary = useCallback(
    async (employeeId: string, weekStart: string) => {
      setLoading(true);
      setError(null);
      try {
        const summary = await timeTrackingService.getWeeklySummary(employeeId, weekStart);
        setWeeklySummary(summary);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clockIn = useCallback(
    async (employeeId: string, notes?: string) => {
      try {
        const entry = await timeTrackingService.clockIn(employeeId, notes);
        setActiveEntry(entry);
        // Refresh today's entries
        const today = todayDateOnly();
        const entries = await timeTrackingService.getEntriesByDate(employeeId, today);
        setTodayEntries(entries);
        return entry;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    []
  );

  const clockOut = useCallback(
    async (entryId: string, employeeId: string, notes?: string) => {
      try {
        const entry = await timeTrackingService.clockOut(entryId, notes);
        setActiveEntry(null);
        // Refresh today's entries
        const today = todayDateOnly();
        const entries = await timeTrackingService.getEntriesByDate(employeeId, today);
        setTodayEntries(entries);
        return entry;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    []
  );

  const createManualEntry = useCallback(
    async (employeeId: string, clockInTime: string, clockOutTime: string, notes?: string) => {
      try {
        const entry = await timeTrackingService.createManualEntry(
          employeeId,
          clockInTime,
          clockOutTime,
          notes
        );
        // Refresh today's entries
        const today = todayDateOnly();
        const entries = await timeTrackingService.getEntriesByDate(employeeId, today);
        setTodayEntries(entries);
        return entry;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    []
  );

  return {
    activeEntry,
    todayEntries,
    historyEntries,
    weeklySummary,
    loading,
    error,
    fetchActiveEntry,
    fetchTodayEntries,
    fetchHistory,
    fetchWeeklySummary,
    clockIn,
    clockOut,
    createManualEntry,
  };
}
