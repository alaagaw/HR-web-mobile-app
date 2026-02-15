import { View, Text, Pressable } from 'react-native';

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
  helper?: string;
}

export function Toggle({
  label,
  value,
  onValueChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  helper,
}: ToggleProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-text-primary mb-2">{label}</Text>
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => onValueChange(true)}
          className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl border ${
            value ? 'border-primary bg-primary-light' : 'border-border bg-surface'
          }`}
        >
          <View
            className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
              value ? 'border-primary' : 'border-gray-300'
            }`}
          >
            {value && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
          </View>
          <Text className={`text-base ${value ? 'text-primary font-medium' : 'text-text-muted'}`}>
            {yesLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onValueChange(false)}
          className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl border ${
            !value ? 'border-primary bg-primary-light' : 'border-border bg-surface'
          }`}
        >
          <View
            className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
              !value ? 'border-primary' : 'border-gray-300'
            }`}
          >
            {!value && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
          </View>
          <Text className={`text-base ${!value ? 'text-primary font-medium' : 'text-text-muted'}`}>
            {noLabel}
          </Text>
        </Pressable>
      </View>
      {helper && <Text className="text-sm text-text-muted mt-1.5">{helper}</Text>}
    </View>
  );
}
