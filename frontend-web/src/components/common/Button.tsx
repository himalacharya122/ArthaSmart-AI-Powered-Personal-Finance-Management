import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const variants = {
  primary: 'bg-primary-800 text-white hover:bg-primary-800',
  secondary: 'bg-white text-primary-950 border border-primary-200 hover:bg-primary-50',
  accent: 'bg-accent-500 text-white hover:bg-accent-600',
  danger: 'bg-danger-500 text-white hover:bg-danger-600',
  ghost: 'text-primary-950',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
