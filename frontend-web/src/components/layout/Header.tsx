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
    <header className="flex h-16 items-center justify-between border-b border-primary-950/20 bg-card px-4 lg:pl-4 lg:pr-10">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          className="rounded-md p-2 text-primary-950/80 hover:bg-primary-950/10 lg:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          className="hidden rounded-md p-2 text-primary-950/80 hover:bg-primary-950/10 lg:block"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        <button
          className="relative rounded-md p-2 text-primary-950/8- hover:bg-primary-950/10"
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
            className="flex items-center rounded-md gap-2 px-2 py-1.5"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-950 text-xs font-semibold text-white">
              {initials}
            </div>

            <span className="hidden text-sm font-medium text-primary-950/80 hover:text-primary-950 md:block">
              {user?.first_name}
            </span>
            <ChevronDown className="ml-1 hidden h-4 w-4 text-primary-950/80 hover:text-primary-950 md:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-md border border-primary-950/20 bg-white py-2 shadow-lg">
              <div className="border-b border-primary-950/20 px-4 py-2">
                <p className="text-sm font-bold text-primary-950">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-primary-950/70">{user?.email}</p>
              </div>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-primary-950/80 hover:bg-primary-50"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
              >
                Settings
              </button>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-danger-500 hover:bg-danger-50"
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
