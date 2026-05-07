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
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-accent-600 mb-6">
        <Lightbulb className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-[800] text-primary-950 mb-2 text-center">How can I help you?</h3>
      <p className="text-sm font-medium text-primary-950/50 mb-8 text-center max-w-sm">
        Ask about your spending, budgets, or simply log a new transaction by typing below.
      </p>
      <div className="flex flex-wrap justify-center gap-3 max-w-xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="rounded-xl border border-[rgba(9,29,42,0.07)] bg-white px-4 py-2.5 text-xs font-[700] text-primary-950/70 transition-all hover:border-accent-500 hover:bg-[#F6F7F9] hover:text-primary-950 shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
