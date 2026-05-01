import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, ChevronDown, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useUnreadCount } from '@/hooks/useNotifications';
import { logout as logoutApi } from '@/api/auth';
import toast from 'react-hot-toast';

export function Header() {
  const { user, refreshToken, logout } = useAuthStore();
  const { toggleSidebar, setMobileNavOpen } = useUIStore();
  const navigate = useNavigate();

  const { data: unreadCount } = useUnreadCount();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
      // Token may already be invalid, proceed with logout
    }
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  const initials = user
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    : '??';

  return (
    <header 
      style={{ backgroundColor: 'var(--surface)' }}
      className="flex h-16 items-center justify-between border-b border-border px-4 lg:pl-4 lg:pr-10"
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg p-2 text-primary-secondary hover:bg-surface-hover hover:text-primary-text transition-colors lg:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          className="hidden rounded-lg p-2 text-primary-secondary hover:bg-surface-hover hover:text-primary-text transition-colors lg:block"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications bell */}
        <button
          className="relative rounded-lg p-2 text-primary-secondary hover:bg-surface-hover hover:text-primary-text transition-colors"
          onClick={() => navigate('/notifications')}
        >
          <Bell className="h-5 w-5" />
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-bold text-white shadow-glow-red">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center rounded-xl gap-2 p-1 hover:bg-surface-hover transition-colors"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-green/20 to-blue-500/20 text-accent-green border border-accent-green/20 text-xs font-bold shadow-glow-green">
              {initials}
            </div>

            <span className="hidden text-sm font-semibold text-primary-text md:block ml-1">
              {user?.first_name}
            </span>
            <ChevronDown className={cn("ml-1 hidden h-4 w-4 text-primary-secondary transition-transform duration-200 md:block", dropdownOpen && "rotate-180")} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-surface py-2 shadow-2xl z-50 backdrop-blur-xl">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-bold text-primary-text">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-primary-secondary mt-0.5 truncate">{user?.email}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-primary-text rounded-lg hover:bg-surface-hover transition-colors"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/settings');
                  }}
                >
                  <Settings className="h-4 w-4 text-primary-secondary" />
                  Settings
                </button>
                <button
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-accent-red rounded-lg hover:bg-accent-red/10 transition-colors"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
