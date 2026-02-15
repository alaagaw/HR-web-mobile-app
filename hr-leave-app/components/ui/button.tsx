import { Pressable, Text, ActivityIndicator, type ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const variantStyles: Record<Variant, { base: string; text: string }> = {
  primary: {
    base: 'bg-primary active:bg-primary-dark',
    text: 'text-white',
  },
  secondary: {
    base: 'bg-transparent border border-primary active:bg-primary-light',
    text: 'text-primary',
  },
  ghost: {
    base: 'bg-transparent active:bg-gray-100 dark:active:bg-slate-700',
    text: 'text-text-primary dark:text-white',
  },
  destructive: {
    base: 'bg-error active:bg-red-700',
    text: 'text-white',
  },
};

const sizeStyles: Record<Size, { base: string; text: string }> = {
  sm: { base: 'px-3 py-2 rounded-lg', text: 'text-sm' },
  md: { base: 'px-5 py-3 rounded-xl', text: 'text-base' },
  lg: { base: 'px-6 py-4 rounded-xl', text: 'text-lg' },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${s.base} ${v.base} ${
        fullWidth ? 'w-full' : ''
      } ${isDisabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? '#fff' : '#2563EB'}
          style={{ marginRight: 8 }}
        />
      )}
      <Text className={`font-semibold ${s.text} ${v.text}`}>{children}</Text>
    </Pressable>
  );
}
