import type { CategoryMinimal } from './category';

export interface Budget {
  id: number;
  name: string;
  amount: string;
  spent: string;
  currency: string;
  category: CategoryMinimal | null;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  alert_threshold: number;
  rollover: boolean;
  is_active: boolean;
  percentage_used: number;
  remaining: string;
  is_over_budget: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BudgetCreate {
  name: string;
  amount: string;
  currency?: string;
  category_id?: number | null;
  period: string;
  start_date: string;
  end_date: string;
  alert_threshold?: number;
  rollover?: boolean;
}

export interface BudgetFilters {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  category?: number;
  period?: string;
  ordering?: string;
}
