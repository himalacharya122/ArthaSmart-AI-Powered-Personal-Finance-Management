import { useState } from 'react';
import { Download, TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { useIncomeVsExpense, useDashboard } from '@/hooks/useDashboard';
import { useSpendingByCategory } from '@/hooks/useReports';
import { useBudgets } from '@/hooks/useBudgets';
import { useAuthStore } from '@/store/authStore';
import { exportCsv } from '@/api/reports';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import { SpendingChart } from '@/components/dashboard/SpendingChart';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const currency = user?.preferred_currency || 'NPR';

  const [months, setMonths] = useState(6);
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: spendingData, isLoading: spendingLoading } = useSpendingByCategory(
    dateAfter || undefined,
    dateBefore || undefined,
  );
  const { data: monthlyData, isLoading: monthlyLoading } = useIncomeVsExpense(months);
  const { data: dashData, isLoading: dashLoading } = useDashboard();
  const { data: budgetData } = useBudgets({});

  async function handleExport(type: 'expenses' | 'incomes') {
    setExporting(type);
    try {
      const blob = await exportCsv(type, dateAfter || undefined, dateBefore || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type} exported`);
    } catch {
      toast.error('Export failed');
    }
    setExporting(null);
  }

  const spendingCategories = (spendingData || []).map((c) => ({
    name: c.name,
    color: c.color,
    total: c.total,
  }));

  const totalExpenses = Number(dashData?.total_expenses_this_month) || 0;
  const totalIncome = Number(dashData?.total_income_this_month) || 0;
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

  const budgets = budgetData?.results || [];
  const overBudgetCount = budgets.filter((b) => b.is_over_budget).length;
  const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Visualize your financial data" />

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100">
              <TrendingUp className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-primary-400">Total Income</p>
              {dashLoading ? (
                <div className="h-5 w-20 animate-pulse rounded bg-primary-100" />
              ) : (
                <p className="text-lg font-bold text-primary-800">{formatCurrency(totalIncome, currency)}</p>
              )}
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-50">
              <TrendingDown className="h-5 w-5 text-danger-500" />
            </div>
            <div>
              <p className="text-xs text-primary-400">Total Expenses</p>
              {dashLoading ? (
                <div className="h-5 w-20 animate-pulse rounded bg-primary-100" />
              ) : (
                <p className="text-lg font-bold text-primary-800">{formatCurrency(totalExpenses, currency)}</p>
              )}
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <PiggyBank className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-primary-400">Net Savings</p>
              {dashLoading ? (
                <div className="h-5 w-20 animate-pulse rounded bg-primary-100" />
              ) : (
                <p className={cn('text-lg font-bold', netSavings >= 0 ? 'text-accent-600' : 'text-danger-500')}>
                  {formatCurrency(netSavings, currency)}
                </p>
              )}
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-50">
              <Wallet className="h-5 w-5 text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-primary-400">Savings Rate</p>
              {dashLoading ? (
                <div className="h-5 w-20 animate-pulse rounded bg-primary-100" />
              ) : (
                <p className={cn('text-lg font-bold', Number(savingsRate) >= 0 ? 'text-accent-600' : 'text-danger-500')}>
                  {savingsRate}%
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending by Category */}
        <Card>
          <h2 className="mb-2 font-semibold text-primary-800">Spending by Category</h2>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={dateAfter}
              onChange={(e) => setDateAfter(e.target.value)}
              className="rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm text-primary-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span className="text-primary-400 text-sm">to</span>
            <input
              type="date"
              value={dateBefore}
              onChange={(e) => setDateBefore(e.target.value)}
              className="rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm text-primary-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          {spendingLoading ? <CardSkeleton /> : <SpendingChart categories={spendingCategories} currency={currency} />}

          {/* Category table */}
          {spendingData && spendingData.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-100 text-left text-xs font-semibold uppercase text-primary-400">
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-right">Count</th>
                    <th className="pb-2 text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const grandTotal = spendingData.reduce((s, c) => s + Number(c.total), 0);
                    return spendingData.map((cat) => {
                      const pct = grandTotal > 0 ? ((Number(cat.total) / grandTotal) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={cat.name} className="border-b border-primary-50 last:border-0">
                          <td className="py-2">
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                              <span className="text-primary-700">{cat.name}</span>
                            </span>
                          </td>
                          <td className="py-2 text-right text-primary-600">{formatCurrency(cat.total, currency)}</td>
                          <td className="py-2 text-right text-primary-400">{cat.count}</td>
                          <td className="py-2 text-right text-primary-400">{pct}%</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Income vs Expense chart */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-primary-800">Income vs Expenses</h2>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm text-primary-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>
          {monthlyLoading ? <CardSkeleton /> : <IncomeExpenseChart data={monthlyData || []} />}

          {/* Monthly trend table */}
          {monthlyData && monthlyData.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-100 text-left text-xs font-semibold uppercase text-primary-400">
                    <th className="pb-2">Month</th>
                    <th className="pb-2 text-right">Income</th>
                    <th className="pb-2 text-right">Expenses</th>
                    <th className="pb-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m) => {
                    const net = Number(m.income) - Number(m.expense);
                    return (
                      <tr key={m.month} className="border-b border-primary-50 last:border-0">
                        <td className="py-2 text-primary-700">{m.month}</td>
                        <td className="py-2 text-right text-accent-600">{formatCurrency(m.income, currency)}</td>
                        <td className="py-2 text-right text-danger-500">{formatCurrency(m.expense, currency)}</td>
                        <td className={cn('py-2 text-right font-medium', net >= 0 ? 'text-accent-600' : 'text-danger-500')}>
                          {formatCurrency(net, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Budget overview */}
      {budgets.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-4 font-semibold text-primary-800">Budget Overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-primary-100 p-4 text-center">
              <p className="text-sm text-primary-400">Total Budgeted</p>
              <p className="mt-1 text-xl font-bold text-primary-800">{formatCurrency(totalBudgeted, currency)}</p>
            </div>
            <div className="rounded-lg border border-primary-100 p-4 text-center">
              <p className="text-sm text-primary-400">Total Spent</p>
              <p className={cn('mt-1 text-xl font-bold', totalSpent > totalBudgeted ? 'text-danger-500' : 'text-primary-800')}>
                {formatCurrency(totalSpent, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-primary-100 p-4 text-center">
              <p className="text-sm text-primary-400">Over Budget</p>
              <p className={cn('mt-1 text-xl font-bold', overBudgetCount > 0 ? 'text-danger-500' : 'text-accent-600')}>
                {overBudgetCount} / {budgets.length}
              </p>
            </div>
          </div>

          {/* Budget progress bars */}
          <div className="mt-4 space-y-3">
            {budgets.map((b) => {
              const pct = Math.min(Number(b.percentage_used), 100);
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary-700">{b.name}</span>
                    <span className={cn('font-medium', b.is_over_budget ? 'text-danger-500' : 'text-primary-600')}>
                      {formatCurrency(b.spent, currency)} / {formatCurrency(b.amount, currency)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        b.is_over_budget ? 'bg-danger-500' : pct >= Number(b.alert_threshold) ? 'bg-warning-500' : 'bg-accent-500',
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Export section */}
      <Card className="mt-6">
        <h2 className="mb-4 font-semibold text-primary-800">Export Data</h2>
        <p className="mb-4 text-sm text-primary-400">
          Download your financial data as CSV files. Use the date filters above to limit the export range.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            loading={exporting === 'expenses'}
            onClick={() => handleExport('expenses')}
          >
            <Download className="h-4 w-4" /> Export Expenses
          </Button>
          <Button
            variant="secondary"
            loading={exporting === 'incomes'}
            onClick={() => handleExport('incomes')}
          >
            <Download className="h-4 w-4" /> Export Incomes
          </Button>
        </div>
      </Card>
    </div>
  );
}
