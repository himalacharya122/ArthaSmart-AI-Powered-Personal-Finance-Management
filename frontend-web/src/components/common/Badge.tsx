import { cn } from '@/utils/cn';

const variants = {
  success: 'bg-accent-50 text-accent-700 border-accent-200',
  warning: 'bg-warning-50 text-warning-700 border-warning-400',
  danger: 'bg-danger-50 text-danger-600 border-danger-100',
  info: 'bg-primary-50 text-primary-700 border-primary-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
} as const;

interface BadgeProps {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
