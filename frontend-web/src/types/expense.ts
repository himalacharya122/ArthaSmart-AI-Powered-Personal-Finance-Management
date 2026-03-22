import type { CategoryMinimal } from './category';

export interface Expense {
  id: number;
  amount: string;
  currency: string;
  category: CategoryMinimal | null;
  description: string;
  merchant: string;
  date: string;
  time: string | null;
  source: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDetail extends Expense {
  amount_in_base: string | null;
  exchange_rate: string | null;
  category_id: number | null;
  recurring: number | null;
  location: string;
  tags: string[];
  metadata: Record<string, unknown>;
  ai_categorized: boolean;
  ai_confidence: number | null;
  is_deleted: boolean;
}

export interface ExpenseCreate {
  amount: string;
  currency?: string;
  category_id?: number | null;
  description?: string;
  merchant?: string;
  date: string;
  time?: string;
  tags?: string[];
  location?: string;
}

export interface ExpenseFilters {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  category?: number;
  source?: string;
  date_after?: string;
  date_before?: string;
  min_amount?: string;
  max_amount?: string;
  is_recurring?: boolean;
  merchant?: string;
}

export interface ExpenseSummary {
  total: string;
  by_category: {
    category_id: number;
    name: string;
    color: string;
    icon: string;
    total: string;
  }[];
  by_month: { month: string; total: string }[];
}
