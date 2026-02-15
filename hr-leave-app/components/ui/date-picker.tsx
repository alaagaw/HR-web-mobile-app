import { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addDays,
  isSameDay,
  isWeekend,
  isBefore,
  startOfDay,
  getDay,
  setMonth,
  setYear,
  getMonth,
  getYear,
} from 'date-fns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DatePickerProps {
  label?: string;
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
  error?: string;
  includeWeekends?: boolean;
  /** When true, renders the calendar inline (no modal, no trigger). */
  inline?: boolean;
}

export function DatePicker({ label, startDate, endDate, onDateChange, error, includeWeekends = false, inline = false }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [daysInput, setDaysInput] = useState('');
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPadding = getDay(monthStart);

  const chevronColor = isDark ? '#E2E8F0' : '#0F172A';

  const currentYear = getYear(new Date());
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const handleDayPress = (day: Date) => {
    setDaysInput('');

    if (!selectingEnd || !startDate) {
      onDateChange(day, day);
      setSelectingEnd(true);
    } else {
      if (isBefore(day, startDate)) {
        onDateChange(day, day);
      } else {
        onDateChange(startDate, day);
        setSelectingEnd(false);
        if (!inline) setOpen(false);
      }
    }
  };

  const handleDaysInputChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setDaysInput(cleaned);

    if (!startDate || !cleaned) return;

    const numDays = parseInt(cleaned, 10);
    if (numDays <= 0 || isNaN(numDays)) return;

    let computed: Date;
    if (includeWeekends) {
      computed = addDays(startDate, numDays - 1);
    } else {
      let remaining = numDays - 1;
      computed = new Date(startDate);
      while (remaining > 0) {
        computed = addDays(computed, 1);
        if (!isWeekend(computed)) {
          remaining--;
        }
      }
    }

    onDateChange(startDate, computed);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIndex));
    setShowMonthPicker(false);
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setShowYearPicker(false);
  };

  const isInRange = (day: Date) => {
    if (!startDate || !endDate) return false;
    return day >= startDate && day <= endDate;
  };

  const displayValue = startDate
    ? startDate && endDate && !isSameDay(startDate, endDate)
      ? `${format(startDate, 'MM/dd/yyyy')} - ${format(endDate, 'MM/dd/yyyy')}`
      : format(startDate, 'MM/dd/yyyy')
    : '';

  // ─── Shared calendar body (used by both modal and inline) ─────────
  const calendarBody = (
    <>
      {/* Month/Year navigation */}
      {!showMonthPicker && !showYearPicker && (
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1">
            <ChevronLeft size={24} color={chevronColor} />
          </Pressable>

          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => { setShowMonthPicker(true); setShowYearPicker(false); }}
              className="flex-row items-center px-2 py-1 rounded-lg active:bg-gray-100 dark:active:bg-slate-700"
            >
              <Text className="text-base font-semibold text-text-primary dark:text-white">
                {MONTHS[getMonth(currentMonth)]}
              </Text>
              <ChevronDown size={16} color={chevronColor} style={{ marginLeft: 2 }} />
            </Pressable>

            <Pressable
              onPress={() => { setShowYearPicker(true); setShowMonthPicker(false); }}
              className="flex-row items-center px-2 py-1 rounded-lg active:bg-gray-100 dark:active:bg-slate-700"
            >
              <Text className="text-base font-semibold text-text-primary dark:text-white">
                {getYear(currentMonth)}
              </Text>
              <ChevronDown size={16} color={chevronColor} style={{ marginLeft: 2 }} />
            </Pressable>
          </View>

          <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1">
            <ChevronRight size={24} color={chevronColor} />
          </Pressable>
        </View>
      )}

      {/* Month picker grid */}
      {showMonthPicker && (
        <View className="mb-4">
          <Text className="text-sm font-semibold text-text-muted dark:text-slate-400 mb-3 text-center">Select Month</Text>
          <View className="flex-row flex-wrap">
            {MONTHS.map((month, i) => {
              const isActive = getMonth(currentMonth) === i;
              return (
                <Pressable
                  key={month}
                  onPress={() => handleMonthSelect(i)}
                  className={`w-[33.33%] py-2.5 items-center rounded-lg ${isActive ? 'bg-primary' : ''}`}
                >
                  <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-text-primary dark:text-white'}`}>
                    {month.slice(0, 3)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Year picker */}
      {showYearPicker && (
        <View className="mb-4">
          <Text className="text-sm font-semibold text-text-muted dark:text-slate-400 mb-3 text-center">Select Year</Text>
          <View className="flex-row flex-wrap justify-center">
            {years.map((year) => {
              const isActive = getYear(currentMonth) === year;
              return (
                <Pressable
                  key={year}
                  onPress={() => handleYearSelect(year)}
                  className={`px-5 py-2.5 mx-1 my-1 items-center rounded-lg ${isActive ? 'bg-primary' : ''}`}
                >
                  <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-text-primary dark:text-white'}`}>
                    {year}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Calendar grid */}
      {!showMonthPicker && !showYearPicker && (
        <>
          <View className="flex-row mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <View key={d} className="flex-1 items-center">
                <Text className="text-xs text-text-muted dark:text-slate-400 font-medium">{d}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {Array.from({ length: startPadding }).map((_, i) => (
              <View key={`pad-${i}`} className="w-[14.28%] h-11" />
            ))}

            {days.map((day) => {
              const isToday = isSameDay(day, today);
              const isPast = isBefore(day, today);
              const isStart = startDate && isSameDay(day, startDate);
              const isEnd = endDate && isSameDay(day, endDate);
              const inRange = isInRange(day);

              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => handleDayPress(day)}
                  className={`w-[14.28%] h-11 items-center justify-center ${
                    inRange && !isStart && !isEnd ? 'bg-primary-light' : ''
                  }`}
                >
                  <View
                    className={`w-9 h-9 items-center justify-center rounded-full ${
                      isStart || isEnd
                        ? 'bg-primary'
                        : isToday
                        ? 'border border-primary'
                        : ''
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isStart || isEnd
                          ? 'text-white font-semibold'
                          : isPast
                          ? 'text-text-light dark:text-slate-500'
                          : isWeekend(day)
                          ? 'text-text-muted dark:text-slate-400'
                          : 'text-text-primary dark:text-white'
                      }`}
                    >
                      {format(day, 'd')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Number of days input */}
          <View className="flex-row items-center mt-4 pt-3 border-t border-border dark:border-slate-600 gap-3">
            <Text className="text-xs text-text-muted dark:text-slate-400 font-medium">Or enter number of days:</Text>
            <TextInput
              value={daysInput}
              onChangeText={handleDaysInputChange}
              keyboardType="number-pad"
              placeholder="e.g. 5"
              placeholderTextColor="#94A3B8"
              className="border border-border dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-text-primary dark:text-white bg-surface dark:bg-slate-700 w-20 text-center"
              editable={!!startDate}
            />
          </View>

          {/* Legend */}
          <View className="flex-row items-center mt-3 gap-2">
            <View className="w-3 h-3 rounded-full bg-primary-light border border-primary" />
            <Text className="text-xs text-text-muted dark:text-slate-400">Your Request</Text>
          </View>
        </>
      )}
    </>
  );

  // ─── Inline mode: render calendar directly ────────────────────────
  if (inline) {
    return (
      <View>
        {label && (
          <Text className="text-sm font-medium text-text-primary dark:text-white mb-2">{label}</Text>
        )}
        {calendarBody}
        {error && <Text className="text-sm text-error mt-1">{error}</Text>}
      </View>
    );
  }

  // ─── Modal mode: trigger + modal ──────────────────────────────────
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-text-primary dark:text-white mb-1.5">{label}</Text>
      )}

      <Pressable
        onPress={() => {
          setSelectingEnd(false);
          setDaysInput('');
          setOpen(true);
        }}
        className={`flex-row items-center border ${
          error ? 'border-error' : 'border-border dark:border-slate-600'
        } rounded-xl px-4 py-3 bg-surface dark:bg-slate-800`}
      >
        <Text className={displayValue ? 'text-text-primary dark:text-white text-base flex-1' : 'text-text-light text-base flex-1'}>
          {displayValue || 'Select dates'}
        </Text>
        <Calendar size={20} color="#64748B" />
      </Pressable>

      {error && <Text className="text-sm text-error mt-1">{error}</Text>}

      <Modal visible={open} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/50 justify-center px-4" onPress={() => setOpen(false)}>
          <Pressable className="bg-surface dark:bg-slate-800 rounded-2xl p-4" onPress={(e) => e.stopPropagation()}>
            {calendarBody}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
