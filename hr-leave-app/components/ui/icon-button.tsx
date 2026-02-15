import { Pressable } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  size?: number;
  color?: string;
  className?: string;
  disabled?: boolean;
}

export function IconButton({
  icon: Icon,
  onPress,
  size = 22,
  color = '#0F172A',
  className = '',
  disabled = false,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center justify-center w-11 h-11 rounded-full active:bg-gray-100 ${
        disabled ? 'opacity-40' : ''
      } ${className}`}
    >
      <Icon size={size} color={color} />
    </Pressable>
  );
}
