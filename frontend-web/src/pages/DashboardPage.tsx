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
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import { formatCurrency, formatPercentage } from '@/utils/format';

const PanelCard = ({ title, linkTo, linkText, children, className = "" }: any) => (
  <div 
    className={`group relative overflow-hidden bg-white p-6 transition-all duration-300 ${className}`}
    style={{ borderRadius: '14px', border: '1px solid rgba(9,29,42,0.07)' }}
  >
    <div className="mb-6 flex items-center justify-between relative z-10">
      <div className="flex items-center gap-2">
        <div className="w-1 h-1 bg-accent-500"></div>
        <h2 className="text-[12px] font-[700] text-primary-950 uppercase tracking-wider">{title}</h2>
      </div>
      <Link
        to={linkTo}
        className="text-[12px] font-[700] text-primary-950 opacity-50 hover:opacity-100 transition-opacity uppercase tracking-wider"
      >
        {linkText}
      </Link>
    </div>
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: dashboard, isLoading, error } = useDashboard();
  const { data: monthlyData } = useIncomeVsExpense(6);
  const currency = user?.preferred_currency || 'NPR';

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-danger-500 font-bold">Failed to load dashboard</p>
        <p className="mt-1 text-sm text-primary-950/60">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#F6F7F9] font-sans min-h-screen p-6 -m-6">
      
      {/* Masthead */}
      <div className="bg-primary-950 -mx-6 -mt-6 px-8 pt-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-6">
          {/* Header left */}
          <div>
            <p className="text-[13px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.40)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-3xl font-[800] text-white">
              {user ? `Welcome back, ${user.first_name}` : 'Dashboard'}
            </h1>
            <p className="mt-2 text-base font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Here&apos;s your financial overview
            </p>
          </div>

          {/* Hero Text: Total Balance */}
          <div className="md:text-right">
             <div className="inline-flex items-center gap-2 mb-2 md:justify-end">
               <Wallet className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.55)' }} />
               <p className="text-[13px] font-[700] tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
                 Total Balance
               </p>
             </div>
             <p className="text-[44px] font-[800] tracking-[-0.03em] text-white leading-none">
               {isLoading ? '...' : dashboard ? formatCurrency(dashboard.total_balance, currency) : '--'}
             </p>
          </div>
        </div>

        {/* Alerts */}
        {dashboard && (dashboard.unread_notifications > 0 || dashboard.unread_insights > 0) && (
          <div className="flex flex-wrap gap-4 mt-8">
            {dashboard.unread_notifications > 0 && (
              <Link
                to="/notifications"
                className="group inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
              >
                <Bell className="h-4 w-4" />
                {dashboard.unread_notifications} unread notification{dashboard.unread_notifications !== 1 ? 's' : ''}
              </Link>
            )}
            {dashboard.unread_insights > 0 && (
              <Link
                to="/insights"
                className="group inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
              >
                <Brain className="h-4 w-4" />
                {dashboard.unread_insights} new AI insight{dashboard.unread_insights !== 1 ? 's' : ''}
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Summary cards grid */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-3 relative z-10" style={{ marginTop: '-24px' }}>
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

      {/* Charts row */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <PanelCard title="Spending by Category" linkTo="/reports" linkText="View all">
          {isLoading ? <CardSkeleton /> : (
            <SpendingChart categories={dashboard?.top_categories || []} currency={currency} />
          )}
        </PanelCard>

        <PanelCard title="Income vs Expenses" linkTo="/reports" linkText="View all">
          <IncomeExpenseChart data={monthlyData || []} />
        </PanelCard>
      </div>

      {/* Bottom row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <PanelCard title="Recent Expenses" linkTo="/expenses" linkText="View all" className="lg:col-span-3">
          {isLoading ? <CardSkeleton /> : (
            <RecentExpenses expenses={dashboard?.recent_expenses || []} currency={currency} />
          )}
        </PanelCard>

        <PanelCard title="Top Categories" linkTo="/categories" linkText="View all" className="lg:col-span-2">
          {isLoading ? <CardSkeleton /> : (
            <TopCategories categories={dashboard?.top_categories || []} currency={currency} />
          )}
        </PanelCard>
      </div>
    </div>
  );
}


