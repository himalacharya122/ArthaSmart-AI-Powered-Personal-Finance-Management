import type { CategoryMinimal } from './category';

export interface Income {
  id: number;
  amount: string;
  currency: string;
  category: CategoryMinimal | null;
  source_name: string;
  description: string;
  date: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeDetail extends Income {
  category_id: number | null;
  recurring: number | null;
  metadata: Record<string, unknown>;
  is_deleted: boolean;
}

export interface IncomeCreate {
  amount: string;
  currency?: string;
  category_id?: number | null;
  source_name: string;
  description?: string;
  date: string;
}

export interface IncomeFilters {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  category?: number;
  source_name?: string;
  date_after?: string;
  date_before?: string;
  min_amount?: string;
  max_amount?: string;
}

export interface IncomeSummary {
  total: string;
  by_source: { source_name: string; total: string }[];
  by_month: { month: string; total: string }[];
}
