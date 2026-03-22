import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, ChevronDown } from 'lucide-react';
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
    <header className="flex h-16 items-center justify-between border-b border-primary-100 bg-card px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          className="rounded-md p-2 text-primary-400 hover:bg-primary-50 hover:text-primary-600 lg:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          className="hidden rounded-md p-2 text-primary-400 hover:bg-primary-50 hover:text-primary-600 lg:block"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        <button
          className="relative rounded-md p-2 text-primary-400 hover:bg-primary-50 hover:text-primary-600"
          onClick={() => navigate('/notifications')}
        >
          <Bell className="h-5 w-5" />
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-primary-50"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700 text-sm font-semibold text-white">
              {initials}
            </div>
            <span className="hidden text-sm font-medium text-primary-700 md:block">
              {user?.first_name}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-primary-400 md:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-primary-100 bg-white py-1 shadow-lg">
              <div className="border-b border-primary-100 px-4 py-2">
                <p className="text-sm font-medium text-primary-800">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-primary-400">{user?.email}</p>
              </div>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-primary-50"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
              >
                Settings
              </button>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-500 hover:bg-danger-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
