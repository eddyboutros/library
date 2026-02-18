import { useState, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen, LayoutDashboard, ArrowLeftRight, Users, Bot, SearchCode,
  LogOut, Menu, X, Moon, Sun, ChevronDown, Shield, BookMarked, User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DarkVeil from './DarkVeil';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'librarian', 'member'] },
  { to: '/books', icon: BookOpen, label: 'Books', roles: ['admin', 'librarian', 'member'] },
  { to: '/content-search', icon: SearchCode, label: 'Content Search', roles: ['admin', 'librarian', 'member'] },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions', roles: ['admin', 'librarian', 'member'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['admin', 'librarian'] },
  { to: '/ai-assistant', icon: Bot, label: 'AI Assistant', roles: ['admin', 'librarian', 'member'] },
];

const VEIL_PRESETS = {
  dark: { hueShift: 200, noiseIntensity: 0.03, scanlineIntensity: 0, speed: 0.3, scanlineFrequency: 0, warpAmount: 0.4 },
  light: { hueShift: 30, noiseIntensity: 0.01, scanlineIntensity: 0, speed: 0.2, scanlineFrequency: 0, warpAmount: 0.2 },
};

function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-red-500/15 text-red-300 dark:text-red-400',
    librarian: 'bg-blue-500/15 text-blue-300 dark:text-blue-400',
    member: 'bg-emerald-500/15 text-emerald-300 dark:text-emerald-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || ''}`}>
      <Shield className="w-3 h-3" />
      {role}
    </span>
  );
}

export default function Layout() {
  const { user, logout, hasRole, theme, setTheme } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const dark = theme === 'dark';
  const veilConfig = useMemo(() => dark ? VEIL_PRESETS.dark : VEIL_PRESETS.light, [dark]);

  const toggleDark = () => {
    setTheme(dark ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = NAV_ITEMS.filter(item => item.roles.some(r => hasRole(r)));

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <DarkVeil {...veilConfig} resolutionScale={0.5} />
        <div className={`absolute inset-0 transition-colors duration-500 ${
          dark ? 'bg-gray-950/60' : 'bg-white/50'
        }`} />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 glass-sidebar border-r transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10 dark:border-white/5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-600/30">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Athena</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Library System</p>
            </div>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
            {filteredNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 dark:bg-white/10 text-primary-700 dark:text-primary-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="px-3 py-4 border-t border-white/10 dark:border-white/5">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-500/20 text-primary-400">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center gap-4 px-4 sm:px-6 py-3 glass-topbar border-b">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="flex-1" />

          <button
            onClick={toggleDark}
            className="p-2 rounded-lg glass-button transition-all duration-200"
          >
            {dark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(p => !p)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-lg glass-button transition-all duration-200"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 text-sm font-medium">
                {user?.name?.charAt(0)}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 py-2 glass-dropdown rounded-xl shadow-xl z-20">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
