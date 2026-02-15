import { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function Select({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  error,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-text-primary mb-1.5">{label}</Text>
      )}

      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between border ${
          error ? 'border-error' : 'border-border'
        } rounded-xl px-4 py-3 bg-surface`}
      >
        <Text className={selected ? 'text-text-primary text-base' : 'text-text-light text-base'}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={20} color="#64748B" />
      </Pressable>

      {error && <Text className="text-sm text-error mt-1">{error}</Text>}

      <Modal visible={open} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setOpen(false)}
        >
          <View className="bg-surface rounded-t-2xl max-h-[60%]">
            <View className="px-5 py-4 border-b border-border">
              <Text className="text-lg font-semibold text-text-primary">
                {label || 'Select'}
              </Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onValueChange(item.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between px-5 py-4 border-b border-border/50"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-base text-text-primary">{item.label}</Text>
                    {item.description && (
                      <Text className="text-sm text-text-muted mt-0.5">
                        {item.description}
                      </Text>
                    )}
                  </View>
                  {value === item.value && <Check size={20} color="#2563EB" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
