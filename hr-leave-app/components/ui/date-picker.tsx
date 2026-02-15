import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isWeekend,
  isBefore,
  startOfDay,
  getDay,
} from 'date-fns';

interface DatePickerProps {
  label?: string;
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
  error?: string;
}

export function DatePicker({ label, startDate, endDate, onDateChange, error }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with day of week
  const startPadding = getDay(monthStart); // 0=Sun, 1=Mon...

  const handleDayPress = (day: Date) => {
    if (isBefore(day, today)) return;

    if (!selectingEnd || !startDate) {
      onDateChange(day, day);
      setSelectingEnd(true);
    } else {
      if (isBefore(day, startDate)) {
        onDateChange(day, day);
      } else {
        onDateChange(startDate, day);
        setSelectingEnd(false);
        setOpen(false);
      }
    }
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

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-text-primary mb-1.5">{label}</Text>
      )}

      <Pressable
        onPress={() => {
          setSelectingEnd(false);
          setOpen(true);
        }}
        className={`flex-row items-center border ${
          error ? 'border-error' : 'border-border'
        } rounded-xl px-4 py-3 bg-surface`}
      >
        <Text className={displayValue ? 'text-text-primary text-base flex-1' : 'text-text-light text-base flex-1'}>
          {displayValue || 'Select dates'}
        </Text>
        <Calendar size={20} color="#64748B" />
      </Pressable>

      {error && <Text className="text-sm text-error mt-1">{error}</Text>}

      <Modal visible={open} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/50 justify-center px-4" onPress={() => setOpen(false)}>
          <Pressable className="bg-surface rounded-2xl p-4" onPress={(e) => e.stopPropagation()}>
            {/* Month navigation */}
            <View className="flex-row items-center justify-between mb-4">
              <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft size={24} color="#0F172A" />
              </Pressable>
              <Text className="text-base font-semibold text-text-primary">
                {format(currentMonth, 'MMMM yyyy')}
              </Text>
              <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight size={24} color="#0F172A" />
              </Pressable>
            </View>

            {/* Day headers */}
            <View className="flex-row mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <View key={d} className="flex-1 items-center">
                  <Text className="text-xs text-text-muted font-medium">{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View className="flex-row flex-wrap">
              {/* Padding for start of month */}
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
                    disabled={isPast}
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
                            ? 'text-text-light'
                            : isWeekend(day)
                            ? 'text-text-muted'
                            : 'text-text-primary'
                        }`}
                      >
                        {format(day, 'd')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Legend */}
            <View className="flex-row items-center mt-3 gap-2">
              <View className="w-3 h-3 rounded-full bg-primary-light border border-primary" />
              <Text className="text-xs text-text-muted">Your Request</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
