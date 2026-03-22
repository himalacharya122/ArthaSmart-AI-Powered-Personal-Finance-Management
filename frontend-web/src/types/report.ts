export interface DashboardData {
  total_balance: string;
  total_income_this_month: string;
  total_expenses_this_month: string;
  savings_rate: string;
  active_budgets: number;
  budgets_at_risk: number;
  recent_expenses: {
    id: number;
    amount: string;
    currency: string;
    description: string;
    merchant: string;
    date: string;
    category_name: string;
    category_icon: string;
    category_color: string;
  }[];
  top_categories: {
    name: string;
    color: string;
    icon: string;
    total: string;
  }[];
  unread_notifications: number;
  unread_insights: number;
}

export interface SpendingByCategory {
  category__name: string;
  total: string;
  count: number;
}

export interface IncomeVsExpenseMonth {
  month: string;
  income: string;
  expense: string;
  net: string;
}

export interface IncomeVsExpenseResponse {
  monthly_data: IncomeVsExpenseMonth[];
}
