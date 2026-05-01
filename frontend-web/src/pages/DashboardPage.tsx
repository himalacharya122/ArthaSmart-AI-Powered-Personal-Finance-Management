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
        <p className="text-accent-red">Failed to load dashboard</p>
        <p className="mt-1 text-sm text-primary-secondary">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-text tracking-tight">
          {user ? `Welcome back, ${user.first_name}` : 'Dashboard'}
        </h1>
        <p className="mt-2 text-lg font-medium text-primary-secondary">
          Here&apos;s your financial overview
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Balance"
          value={dashboard ? formatCurrency(dashboard.total_balance, currency) : '--'}
          icon={<Wallet className="h-5 w-5" />}
          loading={isLoading}
          trendUp
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
        <div className="mt-8 flex flex-wrap gap-4">
          {dashboard.unread_notifications > 0 && (
            <Link
              to="/notifications"
              className="group relative flex items-center gap-3 overflow-hidden rounded-xl border-l-4 border-accent-gold bg-surface p-4 shadow-inner-glow transition-all hover:border-accent-gold/80 hover:shadow-glow-gold/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-gold/10 text-accent-gold">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-text">New Notifications</p>
                <p className="text-xs text-primary-secondary">
                  You have {dashboard.unread_notifications} unread notification
                  {dashboard.unread_notifications !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          )}
          {dashboard.unread_insights > 0 && (
            <Link
              to="/insights"
              className="group relative flex items-center gap-3 overflow-hidden rounded-xl border-l-4 border-accent-green bg-surface p-4 shadow-inner-glow transition-all hover:border-accent-green/80 hover:shadow-glow-green/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-green/10 text-accent-green">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-text">AI Insights Ready</p>
                <p className="text-xs text-primary-secondary">
                  {dashboard.unread_insights} new financial insight
                  {dashboard.unread_insights !== 1 ? 's' : ''} available
                </p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Charts row */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-medium text-primary-text">Spending by Category</h2>
            <Link
              to="/reports"
              className="text-sm font-semibold text-accent-green hover:underline"
            >
              View all
            </Link>
          </div>
          {isLoading ? <CardSkeleton /> : (
            <SpendingChart categories={dashboard?.top_categories || []} currency={currency} />
          )}
        </Card>

        <Card>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-medium text-primary-text">Income vs Expenses</h2>
            <Link
              to="/reports"
              className="text-sm font-semibold text-accent-green hover:underline"
            >
              View all
            </Link>
          </div>
          <IncomeExpenseChart data={monthlyData || []} />
        </Card>
      </div>

      {/* Bottom row */}
      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-medium text-primary-text">Recent Expenses</h2>
            <Link
              to="/expenses"
              className="text-sm font-semibold text-accent-green hover:underline"
            >
              View all
            </Link>
          </div>
          {isLoading ? <CardSkeleton /> : (
            <RecentExpenses expenses={dashboard?.recent_expenses || []} currency={currency} />
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-medium text-primary-text">Top Categories</h2>
            <Link
              to="/categories"
              className="text-sm font-semibold text-accent-green hover:underline"
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



