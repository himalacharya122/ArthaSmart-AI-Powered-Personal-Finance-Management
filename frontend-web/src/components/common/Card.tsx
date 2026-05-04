import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div 
      className={cn(
        'group relative overflow-hidden bg-white transition-all duration-300',
        paddingClasses[padding],
        className
      )}
      style={{ 
        borderRadius: '14px', 
        border: '1px solid rgba(9,29,42,0.07)',
        boxShadow: 'none'
      }}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
