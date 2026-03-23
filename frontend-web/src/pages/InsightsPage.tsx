import { useState } from 'react';
import {
  Brain,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  RefreshCw,
  X,
  Eye,
} from 'lucide-react';
import {
  useInsights,
  useGenerateInsights,
  useMarkInsightRead,
  useDismissInsight,
  useUpdateMemory,
} from '@/hooks/useInsights';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import { formatRelativeDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { InsightType, InsightSeverity } from '@/types/insight';

const TYPE_CONFIG: Record<InsightType, { icon: typeof Brain; label: string; color: string }> = {
  spending_pattern: { icon: TrendingUp, label: 'Pattern', color: 'text-primary-600' },
  anomaly: { icon: AlertTriangle, label: 'Anomaly', color: 'text-danger-500' },
  prediction: { icon: Sparkles, label: 'Prediction', color: 'text-warning-600' },
  suggestion: { icon: Lightbulb, label: 'Suggestion', color: 'text-accent-600' },
};

const SEVERITY_VARIANT: Record<InsightSeverity, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

export function InsightsPage() {
  const [filter, setFilter] = useState<string>('all');
  const { data: insights, isLoading } = useInsights({
    insight_type: filter !== 'all' ? filter : undefined,
    is_dismissed: false,
  });
  const generateMut = useGenerateInsights();
  const markRead = useMarkInsightRead();
  const dismissMut = useDismissInsight();
  const updateMem = useUpdateMemory();

  const unreadCount = (insights || []).filter((i) => !i.is_read).length;

  return (
    <div>
      <PageHeader
        title="AI Insights"
        description="Personalized financial intelligence powered by AI"
        action={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateMem.mutate()}
              loading={updateMem.isPending}
            >
              <Brain className="h-4 w-4" /> Update Profile
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => generateMut.mutate()}
              loading={generateMut.isPending}
            >
              <RefreshCw className="h-4 w-4" /> Generate Insights
            </Button>
          </div>
        }
      />

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-primary-100 p-1 w-fit">
        {[
          { key: 'all', label: 'All' },
          { key: 'spending_pattern', label: 'Patterns' },
          { key: 'prediction', label: 'Predictions' },
          { key: 'anomaly', label: 'Anomalies' },
          { key: 'suggestion', label: 'Tips' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f.key ? 'bg-white text-primary-800 shadow-sm' : 'text-primary-500 hover:text-primary-700',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {unreadCount > 0 && (
        <p className="mb-4 text-sm text-primary-500">
          {unreadCount} unread insight{unreadCount > 1 ? 's' : ''}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : !insights || insights.length === 0 ? (
        <EmptyState
          icon={<Brain className="h-12 w-12" />}
          title="No insights yet"
          description="Click 'Generate Insights' to analyze your financial data and get personalized recommendations."
          actionLabel="Generate Now"
          onAction={() => generateMut.mutate()}
        />
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const config = TYPE_CONFIG[insight.insight_type] || TYPE_CONFIG.suggestion;
            const Icon = config.icon;
            const severityVariant = SEVERITY_VARIANT[insight.severity] || 'info';

            return (
              <Card key={insight.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                    insight.is_read ? 'bg-primary-100' : 'bg-accent-50',
                  )}>
                    <Icon className={cn('h-5 w-5', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        'text-sm font-semibold',
                        insight.is_read ? 'text-primary-500' : 'text-primary-800',
                      )}>
                        {insight.title}
                      </h3>
                      <Badge variant={severityVariant}>{config.label}</Badge>
                      {!insight.is_read && (
                        <span className="h-2 w-2 rounded-full bg-accent-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-primary-600 leading-relaxed">{insight.description}</p>
                    <p className="mt-1.5 text-xs text-primary-400">{formatRelativeDate(insight.generated_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!insight.is_read && (
                      <button
                        onClick={() => markRead.mutate(insight.id)}
                        className="rounded p-1.5 text-primary-400 hover:bg-primary-100 hover:text-primary-600"
                        title="Mark as read"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => dismissMut.mutate(insight.id)}
                      className="rounded p-1.5 text-primary-400 hover:bg-danger-50 hover:text-danger-500"
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
