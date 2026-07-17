import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-bold text-primary-950/80"
          >
            {label}
          </label>
        )}
        <div className="relative mt-2">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-950/50 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full rounded-md border border-primary-950/20 bg-white py-3 px-4 text-primary-950 placeholder-primary-950/50 focus:border-primary-950/40 transition-colors focus:outline-none focus:ring-0',
              error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500',
              icon && 'pl-10',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';