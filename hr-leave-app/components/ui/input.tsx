import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
}

export function Input({ label, error, helper, className = '', ...props }: InputProps) {
  const borderColor = error ? 'border-error' : 'border-border focus:border-primary';

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-text-primary dark:text-white mb-1.5">{label}</Text>
      )}
      <TextInput
        className={`border ${borderColor} dark:border-slate-600 rounded-xl px-4 py-3 text-base text-text-primary dark:text-white bg-surface dark:bg-slate-800 ${className}`}
        placeholderTextColor="#94A3B8"
        {...props}
      />
      {error && <Text className="text-sm text-error mt-1">{error}</Text>}
      {helper && !error && (
        <Text className="text-sm text-text-muted mt-1">{helper}</Text>
      )}
    </View>
  );
}
