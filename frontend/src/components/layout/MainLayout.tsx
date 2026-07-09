/**
 * Main Layout Component
 * Layout with sidebar navigation for authenticated users
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useLogout } from '@/api/hooks/useAuth';
import {
  LayoutDashboard,
  Cpu,
  Play,
  BookOpen,
  LogOut,
  User,
  Settings,
  Atom,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/stores/authStore';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Circuit Builder', href: '/circuits', icon: Cpu },
  { name: 'Simulations', href: '/simulations', icon: Play },
  { name: 'Algorithms', href: '/algorithms', icon: BookOpen },
];

export function MainLayout() {
  const location = useLocation();
  const logout = useLogout();
  const user = useUser();

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <Atom className="mr-2 h-8 w-8 text-primary" />
            <span className="text-xl font-bold">casimirQ</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Settings className="h-4 w-4" />}
              >
                Settings
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                leftIcon={<LogOut className="h-4 w-4" />}
                onClick={handleLogout}
                isLoading={logout.isPending}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
