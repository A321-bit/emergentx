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
  ChevronRight,
  Wallet,
  Phone,
  FileImage
} from 'lucide-react';
import { Button } from '../ui/button';

// Mobile Header Component
export const MobileHeader = ({ onMenuClick }) => {
  return (
    <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Sun className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold font-outfit">SolarPro</span>
      </div>
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState([]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  // Auto-expand menu if current path is in submenu
  useEffect(() => {
    if (['/users', '/roles'].includes(location.pathname)) {
      setExpandedMenus(prev => prev.includes('users') ? prev : [...prev, 'users']);
    }
    if (['/packages', '/package-categories'].includes(location.pathname)) {
      setExpandedMenus(prev => prev.includes('packages') ? prev : [...prev, 'packages']);
    }
    if (['/dealers', '/dealer-groups'].includes(location.pathname)) {
      setExpandedMenus(prev => prev.includes('dealers') ? prev : [...prev, 'dealers']);
    }
    if (['/accounting', '/finance', '/employees', '/attendance', '/payroll'].includes(location.pathname)) {
      setExpandedMenus(prev => prev.includes('accounting') ? prev : [...prev, 'accounting']);
    }
    if (['/quotes', '/quotes/callbacks'].includes(location.pathname)) {
      setExpandedMenus(prev => prev.includes('quotes') ? prev : [...prev, 'quotes']);
    }
    if (['/settings', '/settings/quote-templates'].includes(location.pathname)) {
      setExpandedMenus(prev => prev.includes('settings') ? prev : [...prev, 'settings']);
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

  // ===== KULLANICILAR ALT MENÜSÜ =====
  const usersSubItems = [];
  if (hasPermission('users_view') || hasPermission('users_manage')) {
    usersSubItems.push({ path: '/users', icon: Users, label: 'Kullanıcı Listesi' });
  }
  if (hasPermission('roles_manage')) {
    usersSubItems.push({ path: '/roles', icon: Shield, label: 'Roller & Yetkiler' });
  }
  const hasUsersAccess = usersSubItems.length > 0;
  const isUsersActive = ['/users', '/roles'].includes(location.pathname);

  // ===== PAKETLER ALT MENÜSÜ =====
  const packagesSubItems = [];
  if (hasPermission('products_view') || hasPermission('products_manage')) {
    packagesSubItems.push({ path: '/packages', icon: ShoppingBag, label: 'Tüm Paketler' });
  }
  if (hasPermission('products_manage')) {
    packagesSubItems.push({ path: '/package-categories', icon: Folder, label: 'Paket Kategorileri' });
  }
  const hasPackagesAccess = packagesSubItems.length > 0;
  const isPackagesActive = ['/packages', '/package-categories'].includes(location.pathname);

  // ===== BAYİLER ALT MENÜSÜ =====
  const dealersSubItems = [];
  if (hasPermission('dealers_view') || hasPermission('dealers_manage')) {
    dealersSubItems.push({ path: '/dealers', icon: Building2, label: 'Bayi Listesi' });
  }
  if (hasPermission('dealer_groups_manage')) {
    dealersSubItems.push({ path: '/dealer-groups', icon: UsersRound, label: 'Bayi Grupları' });
  }
  const hasDealersAccess = dealersSubItems.length > 0;
  const isDealersActive = ['/dealers', '/dealer-groups'].includes(location.pathname);

  // ===== MUHASEBE ALT MENÜSÜ =====
  const accountingSubItems = [];
  if (hasPermission('finance_view') || hasPermission('finance_manage')) {
    accountingSubItems.push({ path: '/accounting', icon: Calculator, label: 'Gider/Gelir' });
  }
  if (hasPermission('finance_view')) {
    accountingSubItems.push({ path: '/finance', icon: TrendingUp, label: 'Finans' });
  }
  if (hasPermission('hr_view') || hasPermission('hr_manage')) {
    accountingSubItems.push({ path: '/employees', icon: UserCog, label: 'Personel Listesi' });
  }
  if (hasPermission('hr_view') || hasPermission('hr_manage')) {
    accountingSubItems.push({ path: '/attendance', icon: Calendar, label: 'Puantaj' });
  }
  if (hasPermission('payroll_view') || hasPermission('payroll_manage')) {
    accountingSubItems.push({ path: '/payroll', icon: Banknote, label: 'Bordro' });
  }
  const hasAccountingAccess = accountingSubItems.length > 0;
  const isAccountingActive = ['/accounting', '/finance', '/employees', '/attendance', '/payroll'].includes(location.pathname);

  // ===== TEKLİFLER ALT MENÜSÜ =====
  const quotesSubItems = [];
  if (hasPermission('quotes_view') || hasPermission('quotes_manage')) {
    quotesSubItems.push({ path: '/quotes', icon: FileText, label: 'Tüm Teklifler' });
    quotesSubItems.push({ path: '/quotes/callbacks', icon: Phone, label: 'Aranacaklar' });
  }
  const hasQuotesAccess = quotesSubItems.length > 0;
  const isQuotesActive = ['/quotes', '/quotes/callbacks'].includes(location.pathname);

  // ===== AYARLAR ALT MENÜSÜ =====
  const settingsSubItems = [];
  if (hasPermission('settings_manage')) {
    settingsSubItems.push({ path: '/settings', icon: Settings, label: 'Genel Ayarlar' });
    settingsSubItems.push({ path: '/settings/quote-templates', icon: FileImage, label: 'Teklif Şablonları' });
  }
  const hasSettingsAccess = settingsSubItems.length > 0;
  const isSettingsActive = ['/settings', '/settings/quote-templates'].includes(location.pathname);

  // Render expandable menu helper
  const renderExpandableMenu = (menuId, icon, label, subItems, isActive) => {
    const Icon = icon;
    const isExpanded = expandedMenus.includes(menuId);
    
    return (
      <div key={menuId} className="space-y-1">
        <button
          onClick={() => toggleMenu(menuId)}
          className={cn(
            "sidebar-nav-item w-full justify-between",
            isActive && "active"
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        
        {isExpanded && (
          <div className="ml-4 pl-4 border-l border-border space-y-1">
            {subItems.map((subItem) => {
              const SubIcon = subItem.icon;
              const isSubActive = location.pathname === subItem.path;
              return (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  className={cn(
                    "sidebar-nav-item text-sm",
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
    );
  };

  // Render single nav item helper
  const renderNavItem = (path, icon, label) => {
    const Icon = icon;
    const isActive = location.pathname === path;
    return (
      <Link
        key={path}
        to={path}
        className={cn(
          "sidebar-nav-item",
          isActive && "active"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>
    );
  };

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
          
          {/* Panel */}
          {hasPermission('dashboard_view') && renderNavItem('/dashboard', LayoutDashboard, 'Panel')}
          
          {/* Kullanıcılar (Alt menü: Kullanıcı Listesi, Roller & Yetkiler) */}
          {hasUsersAccess && renderExpandableMenu('users', Users, 'Kullanıcılar', usersSubItems, isUsersActive)}
          
          {/* Kategoriler */}
          {(hasPermission('categories_view') || hasPermission('categories_manage')) && 
            renderNavItem('/categories', Folder, 'Kategoriler')}
          
          {/* Ürünler */}
          {(hasPermission('products_view') || hasPermission('products_manage')) && 
            renderNavItem('/products', Package, 'Ürünler')}
          
          {/* Paketler (Alt menü) */}
          {hasPackagesAccess && renderExpandableMenu('packages', ShoppingBag, 'Paketler', packagesSubItems, isPackagesActive)}
          
          {/* Stok */}
          {(hasPermission('stock_view') || hasPermission('stock_manage')) && 
            renderNavItem('/stock', Boxes, 'Stok')}
          
          {/* Müşteriler */}
          {(hasPermission('customers_view') || hasPermission('customers_manage')) && 
            renderNavItem('/customers', UserCircle, 'Müşteriler')}
          
          {/* Müşteri Ayarları */}
          {(hasPermission('customer_categories_manage') || hasPermission('customer_sources_manage')) && 
            renderNavItem('/customer-settings', Tags, 'Müşteri Ayarları')}
          
          {/* Teklifler (Alt menü: Tüm Teklifler, Aranacaklar) */}
          {hasQuotesAccess && renderExpandableMenu('quotes', FileText, 'Teklifler', quotesSubItems, isQuotesActive)}
          
          {/* Bayiler (Alt menü: Bayi Listesi, Bayi Grupları) */}
          {hasDealersAccess && renderExpandableMenu('dealers', Building2, 'Bayiler', dealersSubItems, isDealersActive)}
          
          {/* Satışlar */}
          {(hasPermission('finance_view') || hasPermission('finance_manage')) && 
            renderNavItem('/sales', ShoppingCart, 'Satışlar')}
          
          {/* Muhasebe (Alt menü: Gider/Gelir, Finans, Personel, Puantaj, Bordro) */}
          {hasAccountingAccess && renderExpandableMenu('accounting', Calculator, 'Muhasebe', accountingSubItems, isAccountingActive)}
          
          {/* Raporlar */}
          {hasPermission('finance_view') && renderNavItem('/reports', BarChart3, 'Raporlar')}
          
          {/* Ayarlar (Alt menü: Genel Ayarlar, Teklif Şablonları) */}
          {hasSettingsAccess && renderExpandableMenu('settings', Settings, 'Ayarlar', settingsSubItems, isSettingsActive)}

        </nav>

        {/* User Info & Actions */}
        <div className="p-3 lg:p-4 border-t border-border space-y-2">
          {/* User Info */}
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{user?.name || 'Kullanıcı'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-5 w-5" />
                <span>Açık Tema</span>
              </>
            ) : (
              <>
                <Moon className="h-5 w-5" />
                <span>Koyu Tema</span>
              </>
            )}
          </Button>
          
          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            <span>Çıkış Yap</span>
          </Button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
