import { Lightbulb } from 'lucide-react';

const SUGGESTIONS = [
  'How much did I spend this month?',
  "What's my budget status?",
  'Give me a savings tip',
  'Show my recent expenses',
  'I spent 500 on lunch',
  'I received 50000 salary',
] as const;

interface QuickActionsProps {
  onSelect: (text: string) => void;
}

export function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <Lightbulb className="h-8 w-8 text-accent-400 mb-3" />
      <p className="text-sm text-primary-500 mb-5 text-center">
        Try asking me something about your finances
      </p>
      <div className="flex flex-wrap justify-center gap-2 max-w-md">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="rounded-full border border-primary-200 bg-white px-3.5 py-1.5 text-xs text-primary-600 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
