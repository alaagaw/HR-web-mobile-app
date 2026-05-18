import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  /**
   * When true the border reflects completion state *live* (not only on
   * submit error): red while empty, green once filled. A " *" is also
   * appended to the label. This is the reusable mandatory-field visual
   * used across every React-Hook-Form / Input-based form.
   */
  required?: boolean;
}

export function Input({
  label,
  error,
  helper,
  required,
  className = '',
  style,
  ...props
}: InputProps) {
  const hasValue =
    typeof props.value === 'string'
      ? props.value.trim().length > 0
      : props.value != null;

  // Precedence: a real submitted error wins (red). Otherwise a required
  // field is red while empty and green once filled. Non-required fields
  // keep the default themed border.
  let borderColor: string | undefined;
  if (error || (required && !hasValue)) borderColor = '#EF4444';
  else if (required && hasValue) borderColor = '#16A34A';

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-text-primary dark:text-white mb-1.5">
          {label}
          {required && <Text className="text-error"> *</Text>}
        </Text>
      )}
      <TextInput
        className={`border border-border focus:border-primary dark:border-slate-600 rounded-xl px-4 py-3 text-base text-text-primary dark:text-white bg-surface dark:bg-slate-800 ${className}`}
        placeholderTextColor="#94A3B8"
        style={[borderColor ? { borderColor, borderWidth: 1 } : null, style]}
        {...props}
      />
      {error && <Text className="text-sm text-error mt-1">{error}</Text>}
      {helper && !error && (
        <Text className="text-sm text-text-muted mt-1">{helper}</Text>
      )}
    </View>
  );
}
