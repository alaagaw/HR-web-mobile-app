import { View, Text } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';

type BannerVariant = 'warning' | 'info' | 'error';

interface BannerProps {
  children: string;
  variant?: BannerVariant;
  className?: string;
}

const variantConfig: Record<BannerVariant, { bg: string; text: string; iconColor: string }> = {
  warning: { bg: 'bg-warning-light', text: 'text-yellow-800', iconColor: '#92400E' },
  info: { bg: 'bg-info-light', text: 'text-blue-800', iconColor: '#1E40AF' },
  error: { bg: 'bg-error-light', text: 'text-red-800', iconColor: '#991B1B' },
};

export function Banner({ children, variant = 'warning', className = '' }: BannerProps) {
  const config = variantConfig[variant];
  const Icon = variant === 'info' ? Info : AlertTriangle;

  return (
    <View className={`${config.bg} rounded-xl px-4 py-3 flex-row items-start ${className}`}>
      <Icon size={20} color={config.iconColor} style={{ marginTop: 2, marginRight: 10 }} />
      <Text className={`${config.text} text-sm flex-1 font-medium`}>{children}</Text>
    </View>
  );
}
