import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Clock } from 'lucide-react-native';

interface TimePickerProps {
  label?: string;
  value: string | null; // "HH:MM"
  onValueChange: (value: string) => void;
  error?: string;
}

function generateTimes(): string[] {
  const times: string[] = [];
  for (let h = 6; h <= 22; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }
  return times;
}

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

const TIMES = generateTimes();

export function TimePicker({ label, value, onValueChange, error }: TimePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-text-primary mb-1.5">{label}</Text>
      )}

      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center border ${
          error ? 'border-error' : 'border-border'
        } rounded-xl px-4 py-3 bg-surface`}
      >
        <Text
          className={`flex-1 text-base ${value ? 'text-text-primary' : 'text-text-light'}`}
        >
          {value ? formatTimeDisplay(value) : 'Select time'}
        </Text>
        <Clock size={20} color="#64748B" />
      </Pressable>

      {error && <Text className="text-sm text-error mt-1">{error}</Text>}

      <Modal visible={open} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setOpen(false)}>
          <View className="bg-surface rounded-t-2xl max-h-[50%]">
            <View className="px-5 py-4 border-b border-border">
              <Text className="text-lg font-semibold text-text-primary">{label || 'Select Time'}</Text>
            </View>
            <ScrollView>
              {TIMES.map((time) => (
                <Pressable
                  key={time}
                  onPress={() => {
                    onValueChange(time);
                    setOpen(false);
                  }}
                  className={`px-5 py-3.5 border-b border-border/50 ${
                    value === time ? 'bg-primary-light' : ''
                  }`}
                >
                  <Text
                    className={`text-base ${
                      value === time ? 'text-primary font-semibold' : 'text-text-primary'
                    }`}
                  >
                    {formatTimeDisplay(time)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
