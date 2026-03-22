import { cn } from '@/utils/cn';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && <div className="mb-4 text-primary-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-primary-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-primary-400">{description}</p>
      {actionLabel && onAction && (
        <Button variant="accent" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
