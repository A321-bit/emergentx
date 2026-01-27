import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Building2,
  Settings,
  LogOut,
  Sun,
  Moon,
  TrendingUp,
  UserCircle,
  Boxes
} from 'lucide-react';
import { Button } from '../ui/button';

const Sidebar = () => {
  const { user, logout, isAdmin, isPersonel, isBayi } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const adminNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
    { path: '/users', icon: Users, label: 'Kullanıcılar' },
    { path: '/products', icon: Package, label: 'Ürünler' },
    { path: '/stock', icon: Boxes, label: 'Stok' },
    { path: '/customers', icon: UserCircle, label: 'Müşteriler' },
    { path: '/quotes', icon: FileText, label: 'Teklifler' },
    { path: '/dealers', icon: Building2, label: 'Bayiler' },
    { path: '/finance', icon: TrendingUp, label: 'Finans' },
    { path: '/settings', icon: Settings, label: 'Ayarlar' },
  ];

  const personelNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
    { path: '/customers', icon: UserCircle, label: 'Müşteriler' },
    { path: '/quotes', icon: FileText, label: 'Teklifler' },
    { path: '/products', icon: Package, label: 'Ürünler' },
  ];

  const bayiNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
    { path: '/products', icon: Package, label: 'Ürünler' },
    { path: '/customers', icon: UserCircle, label: 'Müşteriler' },
    { path: '/quotes', icon: FileText, label: 'Teklifler' },
  ];

  const navItems = isAdmin ? adminNavItems : isPersonel ? personelNavItems : bayiNavItems;

  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Sun className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold font-outfit tracking-tight">SolarPro</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.path.slice(1)}`}
              className={cn(
                "sidebar-nav-item",
                isActive && "active"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-2"
          data-testid="theme-toggle"
        >
          {theme === 'light' ? (
            <>
              <Moon className="h-4 w-4" />
              <span>Koyu Tema</span>
            </>
          ) : (
            <>
              <Sun className="h-4 w-4" />
              <span>Açık Tema</span>
            </>
          )}
        </Button>

        {/* User info */}
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <span className={cn("role-badge mt-1", user?.role)}>
            {user?.role === 'admin' ? 'Yönetici' : user?.role === 'personel' ? 'Personel' : 'Bayi'}
          </span>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          data-testid="logout-btn"
        >
          <LogOut className="h-4 w-4" />
          <span>Çıkış Yap</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
