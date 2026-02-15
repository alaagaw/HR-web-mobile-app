import { View, Text } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-text-muted dark:text-slate-300' },
  success: { bg: 'bg-success-light', text: 'text-success' },
  warning: { bg: 'bg-warning-light', text: 'text-warning' },
  error: { bg: 'bg-error-light', text: 'text-error' },
  info: { bg: 'bg-info-light', text: 'text-info' },
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const s = variantStyles[variant];

  return (
    <View className={`${s.bg} rounded-full px-3 py-1 self-start ${className}`}>
      <Text className={`text-xs font-semibold ${s.text}`}>{children}</Text>
    </View>
  );
}
