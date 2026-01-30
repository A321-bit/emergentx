import React, { useState, useEffect } from 'react';
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
  Tags,
  Menu,
  X,
  ShoppingCart,
  Calculator,
  BarChart3,
  ShoppingBag,
  UserCog,
  Calendar,
  Banknote,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '../ui/button';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState(['hr', 'packages']); // Default expanded

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  // Auto-expand menu if current path is in submenu
  useEffect(() => {
    if (['/employees', '/attendance', '/payroll'].includes(location.pathname)) {
      setExpandedMenus(prev => prev.includes('hr') ? prev : [...prev, 'hr']);
    }
    if (['/packages', '/package-categories'].includes(location.pathname)) {
      setExpandedMenus(prev => prev.includes('packages') ? prev : [...prev, 'packages']);
    }
  }, [location.pathname]);

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // Check permissions
  const hasPermission = (perm) => {
    const perms = user?.permissions || [];
    return perms.includes('all') || perms.includes(perm);
  };

  // Build nav items based on permissions
  const navItems = [];

  if (hasPermission('dashboard_view')) {
    navItems.push({ path: '/dashboard', icon: LayoutDashboard, label: 'Panel' });
  }
  if (hasPermission('users_view') || hasPermission('users_manage')) {
    navItems.push({ path: '/users', icon: Users, label: 'Kullanıcılar' });
  }
  if (hasPermission('roles_manage')) {
    navItems.push({ path: '/roles', icon: Shield, label: 'Roller & Yetkiler' });
  }
  if (hasPermission('categories_view') || hasPermission('categories_manage')) {
    navItems.push({ path: '/categories', icon: Folder, label: 'Kategoriler' });
  }
  if (hasPermission('products_view') || hasPermission('products_manage')) {
    navItems.push({ path: '/products', icon: Package, label: 'Ürünler' });
  }
  // Paketler artık ayrı menü olarak değil, expandable olarak eklenecek
  if (hasPermission('stock_view') || hasPermission('stock_manage')) {
    navItems.push({ path: '/stock', icon: Boxes, label: 'Stok' });
  }
  if (hasPermission('customers_view') || hasPermission('customers_manage')) {
    navItems.push({ path: '/customers', icon: UserCircle, label: 'Müşteriler' });
  }
  if (hasPermission('customer_categories_manage') || hasPermission('customer_sources_manage')) {
    navItems.push({ path: '/customer-settings', icon: Tags, label: 'Müşteri Ayarları' });
  }
  if (hasPermission('quotes_view') || hasPermission('quotes_manage')) {
    navItems.push({ path: '/quotes', icon: FileText, label: 'Teklifler' });
  }
  if (hasPermission('dealer_groups_manage')) {
    navItems.push({ path: '/dealer-groups', icon: UsersRound, label: 'Bayi Grupları' });
  }
  if (hasPermission('dealers_view') || hasPermission('dealers_manage')) {
    navItems.push({ path: '/dealers', icon: Building2, label: 'Bayiler' });
  }
  if (hasPermission('finance_view') || hasPermission('finance_manage')) {
    navItems.push({ path: '/sales', icon: ShoppingCart, label: 'Satışlar' });
  }
  if (hasPermission('finance_view') || hasPermission('finance_manage')) {
    navItems.push({ path: '/accounting', icon: Calculator, label: 'Muhasebe' });
  }
  
  // HR Menu with submenus
  const hasHrAccess = hasPermission('hr_view') || hasPermission('hr_manage') || hasPermission('payroll_view') || hasPermission('payroll_manage');
  
  if (hasPermission('finance_view')) {
    navItems.push({ path: '/finance', icon: TrendingUp, label: 'Finans' });
  }
  if (hasPermission('finance_view')) {
    navItems.push({ path: '/reports', icon: BarChart3, label: 'Raporlar' });
  }
  if (hasPermission('settings_manage')) {
    navItems.push({ path: '/settings', icon: Settings, label: 'Ayarlar' });
  }

  // HR submenu items
  const hrSubItems = [];
  if (hasPermission('hr_view') || hasPermission('hr_manage')) {
    hrSubItems.push({ path: '/employees', icon: UserCog, label: 'Personel Listesi' });
  }
  if (hasPermission('hr_view') || hasPermission('hr_manage')) {
    hrSubItems.push({ path: '/attendance', icon: Calendar, label: 'Puantaj' });
  }
  if (hasPermission('payroll_view') || hasPermission('payroll_manage')) {
    hrSubItems.push({ path: '/payroll', icon: Banknote, label: 'Bordro' });
  }

  const isHrActive = ['/employees', '/attendance', '/payroll'].includes(location.pathname);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-72 lg:w-64 border-r border-border bg-card/95 backdrop-blur-xl flex flex-col transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-4 lg:p-6 border-b border-border flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Sun className="h-7 w-7 lg:h-8 lg:w-8 text-primary" />
            <span className="text-lg lg:text-xl font-bold font-outfit tracking-tight">SolarPro</span>
          </Link>
          {/* Close button (mobile only) */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            // Insert HR menu before Finans
            if (item.path === '/finance' && hasHrAccess) {
              return (
                <React.Fragment key="hr-menu">
                  {/* HR Expandable Menu */}
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleMenu('hr')}
                      className={cn(
                        "sidebar-nav-item w-full justify-between",
                        isHrActive && "active"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <UserCog className="h-5 w-5" />
                        <span>Personel</span>
                      </div>
                      {expandedMenus.includes('hr') ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {/* Submenu */}
                    {expandedMenus.includes('hr') && (
                      <div className="ml-4 pl-3 border-l-2 border-border space-y-1">
                        {hrSubItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = location.pathname === subItem.path;
                          
                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              data-testid={`nav-${subItem.path.slice(1)}`}
                              className={cn(
                                "sidebar-nav-item text-sm py-2",
                                isSubActive && "active"
                              )}
                            >
                              <SubIcon className="h-4 w-4" />
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Original Finance item */}
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
                </React.Fragment>
              );
            }
            
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
        <div className="p-3 lg:p-4 border-t border-border space-y-2 lg:space-y-3">
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
    </>
  );
};

// Mobile Header Component
export const MobileHeader = ({ onMenuClick }) => {
  return (
    <header className="sticky top-0 z-30 lg:hidden bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          data-testid="mobile-menu-btn"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <Link to="/dashboard" className="flex items-center gap-2">
          <Sun className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold font-outfit">SolarPro</span>
        </Link>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>
    </header>
  );
};

export default Sidebar;
