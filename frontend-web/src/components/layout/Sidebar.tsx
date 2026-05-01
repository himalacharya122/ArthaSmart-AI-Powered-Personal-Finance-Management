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
        style={{ backgroundColor: 'var(--surface)' }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-border text-white lg:static lg:z-auto',
          'transition-[width,transform] duration-200 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-green font-bold text-background-start text-sm shadow-glow-green">
              A
            </div>
            <span className={cn(
              'text-xl font-bold tracking-tighter transition-opacity duration-200',
              sidebarOpen ? 'text-primary-text opacity-100' : 'opacity-0',
            )}>
              {APP_NAME}
            </span>
          </div>
          <button
            className="rounded-md p-1 hover:bg-surface-hover lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300',
                  isActive
                    ? 'bg-accent-green/10 text-accent-green shadow-inner-glow'
                    : 'text-primary-secondary hover:bg-surface-hover hover:text-primary-text',
                  !sidebarOpen && 'justify-center px-0',
                )
              }
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", sidebarOpen ? "" : "mx-auto")} />
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
        <div className="border-t border-border p-4 overflow-hidden whitespace-nowrap">
          <p className={cn(
            'text-xs text-primary-secondary transition-opacity duration-200',
            sidebarOpen ? 'opacity-100' : 'opacity-0',
          )}>
            &copy; 2026 {APP_NAME}
          </p>
        </div>
      </aside>
    </>
  );
}
