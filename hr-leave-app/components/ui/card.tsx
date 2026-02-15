import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <View
      className={`bg-surface dark:bg-slate-800 rounded-xl border border-border dark:border-slate-700 p-4 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
