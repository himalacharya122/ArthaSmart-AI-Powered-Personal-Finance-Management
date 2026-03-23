export type InsightType = 'spending_pattern' | 'anomaly' | 'prediction' | 'suggestion';
export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface AIInsight {
  id: number;
  insight_type: InsightType;
  title: string;
  description: string;
  data: Record<string, unknown>;
  severity: InsightSeverity;
  is_read: boolean;
  is_dismissed: boolean;
  generated_at: string;
  expires_at: string | null;
}
