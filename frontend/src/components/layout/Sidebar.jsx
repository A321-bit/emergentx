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
  Boxes,
  Folder,
  UsersRound,
  Shield,
  Tags
} from 'lucide-react';
import { Button } from '../ui/button';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Check permissions
  const hasPermission = (perm) => {
    const perms = user?.permissions || [];
    return perms.includes('all') || perms.includes(perm);
  };

  // Build nav items based on permissions
  const navItems = [];

  // Dashboard - everyone can see
  if (hasPermission('dashboard_view')) {
    navItems.push({ path: '/dashboard', icon: LayoutDashboard, label: 'Panel' });
  }

  // User Management
  if (hasPermission('users_view') || hasPermission('users_manage')) {
    navItems.push({ path: '/users', icon: Users, label: 'Kullanıcılar' });
  }
  if (hasPermission('roles_manage')) {
    navItems.push({ path: '/roles', icon: Shield, label: 'Roller & Yetkiler' });
  }

  // Product Management
  if (hasPermission('categories_view') || hasPermission('categories_manage')) {
    navItems.push({ path: '/categories', icon: Folder, label: 'Kategoriler' });
  }
  if (hasPermission('products_view') || hasPermission('products_manage')) {
    navItems.push({ path: '/products', icon: Package, label: 'Ürünler' });
  }
  if (hasPermission('stock_view') || hasPermission('stock_manage')) {
    navItems.push({ path: '/stock', icon: Boxes, label: 'Stok' });
  }

  // Customer Management
  if (hasPermission('customers_view') || hasPermission('customers_manage')) {
    navItems.push({ path: '/customers', icon: UserCircle, label: 'Müşteriler' });
  }
  if (hasPermission('customer_categories_manage') || hasPermission('customer_sources_manage')) {
    navItems.push({ path: '/customer-settings', icon: Tags, label: 'Müşteri Ayarları' });
  }

  // Quotes
  if (hasPermission('quotes_view') || hasPermission('quotes_manage')) {
    navItems.push({ path: '/quotes', icon: FileText, label: 'Teklifler' });
  }

  // Dealer Management
  if (hasPermission('dealer_groups_manage')) {
    navItems.push({ path: '/dealer-groups', icon: UsersRound, label: 'Bayi Grupları' });
  }
  if (hasPermission('dealers_view') || hasPermission('dealers_manage')) {
    navItems.push({ path: '/dealers', icon: Building2, label: 'Bayiler' });
  }

  // Finance
  if (hasPermission('finance_view')) {
    navItems.push({ path: '/finance', icon: TrendingUp, label: 'Finans' });
  }

  // Settings
  if (hasPermission('settings_manage')) {
    navItems.push({ path: '/settings', icon: Settings, label: 'Ayarlar' });
  }

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
            <Shield className="h-3 w-3" />
            {user?.role_name || 'Kullanıcı'}
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
