import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Tags,
  BarChart3,
  Brain,
  Bell,
  MessageSquare,
  Cpu,
  ScanLine,  // IoT Receipt Scanner: Receipts nav icon
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/uiStore';
import { APP_NAME } from '@/utils/constants';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare, end: false },
  { to: '/expenses', label: 'Expenses', icon: ArrowDownCircle, end: false },
  { to: '/incomes', label: 'Incomes', icon: ArrowUpCircle, end: false },
  { to: '/budgets', label: 'Budgets', icon: Wallet, end: false },
  { to: '/categories', label: 'Categories', icon: Tags, end: false },
  { to: '/reports', label: 'Reports', icon: BarChart3, end: false },
  { to: '/insights', label: 'AI Insights', icon: Brain, end: false },
  { to: '/notifications', label: 'Notifications', icon: Bell, end: false },
  { to: '/iot-devices', label: 'IoT Devices', icon: Cpu, end: false },
  // IoT Receipt Scanner: link to receipt review page — remove if removing feature
  { to: '/receipts', label: 'Receipts', icon: ScanLine, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const;

export function Sidebar() {
  const { sidebarOpen, mobileNavOpen, setMobileNavOpen } = useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-white border-r border-primary-950/20 text-white lg:static lg:z-auto',
          'transition-[width,transform] duration-200 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-primary-950/20">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-950/80 font-bold text-white text-sm">
              A
            </div>
            <span className={cn(
              'text-lg font-bold tracking-tight transition-opacity duration-200',
              sidebarOpen ? 'text-primary-950 opacity-100' : 'opacity-0',
            )}>
              {APP_NAME}
            </span>
          </div>
          <button
            className="rounded-md p-1 hover:bg-primary-600 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium whitespace-nowrap overflow-hidden transition-colors',
                  isActive
                    ? 'bg-primary-950/80 text-white'
                    : 'text-black/70 hover:bg-primary-600 hover:text-white',
                  !sidebarOpen && 'justify-center',
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className={cn(
                'transition-opacity duration-200',
                sidebarOpen ? 'opacity-100' : 'opacity-0 w-0',
              )}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-primary-950/20 p-4 overflow-hidden whitespace-nowrap">
          <p className={cn(
            'text-xs text-black/70 transition-opacity duration-200',
            sidebarOpen ? 'opacity-100' : 'opacity-0',
          )}>
            &copy; 2026 {APP_NAME}
          </p>
        </div>
      </aside>
    </>
  );
}
