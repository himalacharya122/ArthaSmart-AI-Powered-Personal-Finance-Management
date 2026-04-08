import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Bell,
  Brain,
} from 'lucide-react';
import { useDashboard, useIncomeVsExpense } from '@/hooks/useDashboard';
import { useAuthStore } from '@/store/authStore';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { SpendingChart } from '@/components/dashboard/SpendingChart';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { TopCategories } from '@/components/dashboard/TopCategories';
import { RecentExpenses } from '@/components/dashboard/RecentExpenses';
import { Card } from '@/components/common/Card';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import { formatCurrency, formatPercentage } from '@/utils/format';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: dashboard, isLoading, error } = useDashboard();
  const { data: monthlyData } = useIncomeVsExpense(6);
  const currency = user?.preferred_currency || 'NPR';

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-danger-500">Failed to load dashboard</p>
        <p className="mt-1 text-sm text-primary-950/70">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-950">
          {user ? `Welcome back, ${user.first_name}` : 'Dashboard'}
        </h1>
        <p className="mt-1 text-sm font-medium text-primary-950/70">
          Here&apos;s your financial overview
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Balance"
          value={dashboard ? formatCurrency(dashboard.total_balance, currency) : '--'}
          icon={<Wallet className="h-5 w-5" />}
          loading={isLoading}
        />
        <SummaryCard
          label="Income This Month"
          value={dashboard ? formatCurrency(dashboard.total_income_this_month, currency) : '--'}
          icon={<ArrowUpCircle className="h-5 w-5" />}
          trendUp
          loading={isLoading}
        />
        <SummaryCard
          label="Expenses This Month"
          value={dashboard ? formatCurrency(dashboard.total_expenses_this_month, currency) : '--'}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          loading={isLoading}
        />
        <SummaryCard
          label="Savings Rate"
          value={dashboard ? formatPercentage(dashboard.savings_rate) : '--'}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={
            dashboard
              ? `${dashboard.active_budgets} active budget${dashboard.active_budgets !== 1 ? 's' : ''}`
              : undefined
          }
          trendUp
          loading={isLoading}
        />
      </div>

      {/* Alerts */}
      {dashboard && (dashboard.unread_notifications > 0 || dashboard.unread_insights > 0) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {dashboard.unread_notifications > 0 && (
            <Link
              to="/notifications"
              className="inline-flex items-center gap-2 rounded-lg border border-warning-400 bg-warning-50 px-4 py-2 text-sm font-medium text-warning-700 hover:bg-warning-100"
            >
              <Bell className="h-4 w-4" />
              {dashboard.unread_notifications} unread notification
              {dashboard.unread_notifications !== 1 ? 's' : ''}
            </Link>
          )}
          {dashboard.unread_insights > 0 && (
            <Link
              to="/insights"
              className="inline-flex items-center gap-2 rounded-lg border border-primary-950/20 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100"
            >
              <Brain className="h-4 w-4" />
              {dashboard.unread_insights} new AI insight
              {dashboard.unread_insights !== 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}

      {/* Charts row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border border-primary-950/20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-primary-950">Spending by Category</h2>
            <Link
              to="/reports"
              className="text-sm font-semibold text-accent-600 underline hover:text-accent-700"
            >
              View all
            </Link>
          </div>
          {isLoading ? <CardSkeleton /> : (
            <SpendingChart categories={dashboard?.top_categories || []} currency={currency} />
          )}
        </Card>

        <Card className="border border-primary-950/20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-primary-950">Income vs Expenses</h2>
            <Link
              to="/reports"
              className="text-sm font-semibold text-accent-600 underline hover:text-accent-700"
            >
              View all
            </Link>
          </div>
          <IncomeExpenseChart data={monthlyData || []} />
        </Card>
      </div>

      {/* Bottom row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 border border-primary-950/20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-primary-950">Recent Expenses</h2>
            <Link
              to="/expenses"
              className="text-sm font-semibold text-accent-600 underline hover:text-accent-700"
            >
              View all
            </Link>
          </div>
          {isLoading ? <CardSkeleton /> : (
            <RecentExpenses expenses={dashboard?.recent_expenses || []} currency={currency} />
          )}
        </Card>

        <Card className="lg:col-span-2 border border-primary-950/20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-primary-950">Top Categories</h2>
            <Link
              to="/categories"
              className="text-sm font-semibold text-accent-600 underline hover:text-accent-700"
            >
              View all
            </Link>
          </div>
          {isLoading ? <CardSkeleton /> : (
            <TopCategories categories={dashboard?.top_categories || []} currency={currency} />
          )}
        </Card>
      </div>
    </div>
  );
}