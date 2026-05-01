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
        <p className="text-[#dc2626]">Failed to load dashboard</p>
        <p className="mt-1 text-sm text-[#78716c]">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#fafaf9] text-[#292524] font-['Plus_Jakarta_Sans',sans-serif] min-h-screen p-6 -m-6 rounded-xl selection:bg-[#1e3a8a] selection:text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
      `}</style>
      
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#292524]">
          {user ? `Welcome back, ${user.first_name}` : 'Dashboard'}
        </h1>
        <p className="mt-2 text-base font-medium text-[#78716c] leading-relaxed">
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
        <div className="mt-8 flex flex-wrap gap-4">
          {dashboard.unread_notifications > 0 && (
            <Link
              to="/notifications"
              className="group inline-flex items-center gap-3 rounded bg-[#fffbeb] px-5 py-3 text-sm font-semibold text-[#d97706] shadow-sm border-l-4 border-[#d97706] hover:shadow transition-all"
            >
              <div className="rounded-full bg-[#fef3c7] p-1.5 text-[#d97706]">
                <Bell className="h-4 w-4" />
              </div>
              {dashboard.unread_notifications} unread notification
              {dashboard.unread_notifications !== 1 ? 's' : ''}
            </Link>
          )}
          {dashboard.unread_insights > 0 && (
            <Link
              to="/insights"
              className="group inline-flex items-center gap-3 rounded bg-[#f0fdf4] px-5 py-3 text-sm font-semibold text-[#15803d] shadow-sm border-l-4 border-[#1e3a8a] hover:shadow transition-all"
            >
              <div className="rounded-full bg-[#1e3a8a]/10 p-1.5 text-[#1e3a8a]">
                <Brain className="h-4 w-4" />
              </div>
              {dashboard.unread_insights} new AI insight
              {dashboard.unread_insights !== 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}

      {/* Charts row */}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="relative overflow-hidden rounded bg-[#f5f5f4] p-6 shadow-sm border border-[#e7e5e4] hover:border-[#1e3a8a]/30 transition-colors">
          <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
          <div className="mb-6 flex items-center justify-between relative z-10">
            <h2 className="text-lg font-semibold text-[#292524]">Spending by Category</h2>
            <Link
              to="/reports"
              className="text-sm font-semibold text-[#1e3a8a] hover:text-[#1e3a8a]/80 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="relative z-10">
            {isLoading ? <CardSkeleton /> : (
              <SpendingChart categories={dashboard?.top_categories || []} currency={currency} />
            )}
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded bg-[#f5f5f4] p-6 shadow-sm border border-[#e7e5e4] hover:border-[#1e3a8a]/30 transition-colors">
          <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
          <div className="mb-6 flex items-center justify-between relative z-10">
            <h2 className="text-lg font-semibold text-[#292524]">Income vs Expenses</h2>
            <Link
              to="/reports"
              className="text-sm font-semibold text-[#1e3a8a] hover:text-[#1e3a8a]/80 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="relative z-10">
            <IncomeExpenseChart data={monthlyData || []} />
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3 relative overflow-hidden rounded bg-[#f5f5f4] p-6 shadow-sm border border-[#e7e5e4] hover:border-[#1e3a8a]/30 transition-colors">
          <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
          <div className="mb-6 flex items-center justify-between relative z-10">
            <h2 className="text-lg font-semibold text-[#292524]">Recent Expenses</h2>
            <Link
              to="/expenses"
              className="text-sm font-semibold text-[#1e3a8a] hover:text-[#1e3a8a]/80 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="relative z-10">
            {isLoading ? <CardSkeleton /> : (
              <RecentExpenses expenses={dashboard?.recent_expenses || []} currency={currency} />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2 relative overflow-hidden rounded bg-[#f5f5f4] p-6 shadow-sm border border-[#e7e5e4] hover:border-[#1e3a8a]/30 transition-colors">
          <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
          <div className="mb-6 flex items-center justify-between relative z-10">
            <h2 className="text-lg font-semibold text-[#292524]">Top Categories</h2>
            <Link
              to="/categories"
              className="text-sm font-semibold text-[#1e3a8a] hover:text-[#1e3a8a]/80 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="relative z-10">
            {isLoading ? <CardSkeleton /> : (
              <TopCategories categories={dashboard?.top_categories || []} currency={currency} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}



