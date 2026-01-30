import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, Pencil, Trash2, Package, Search, Sun, Battery, Zap, Home, Factory, Folder,
  AlertTriangle, CheckCircle, Tag, TrendingUp, Percent, Filter, ChevronDown, ChevronRight,
  X, Users, Building, Warehouse, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
const formatTRY = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);

const LEVEL_OPTIONS = [
  { value: 'basic', label: 'Basic', color: 'bg-slate-500' },
  { value: 'plus', label: 'Plus', color: 'bg-blue-500' },
  { value: 'pro', label: 'Pro', color: 'bg-amber-500' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif', color: 'bg-green-500' },
  { value: 'inactive', label: 'Pasif', color: 'bg-slate-500' },
  { value: 'campaign', label: 'Kampanyalı', color: 'bg-orange-500' },
];

const SUITABLE_OPTIONS = [
  { value: 'yazlik_ev', label: 'Yazlık Ev', icon: Home },
  { value: 'bahce_evi', label: 'Bahçe Evi', icon: Home },
  { value: 'ciftlik', label: 'Çiftlik', icon: Warehouse },
  { value: 'sanayi', label: 'Sanayi', icon: Factory },
  { value: 'kesinti_bolgesi', label: 'Kesinti Yoğun Bölge', icon: Zap },
  { value: 'yuksek_fatura', label: 'Yüksek Fatura', icon: TrendingUp },
];

const ICON_MAP = {
  sun: Sun, battery: Battery, zap: Zap, home: Home, factory: Factory, folder: Folder
};

const Packages = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    level: 'basic',
    system_power_kwp: '',
    battery_capacity_kwh: '',
    daily_production_kwh: '',
    yearly_production_kwh: '',
    suitable_for: [],
    items: [],
    status: 'active'
  });
  
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('products_manage');
  const canSeePrices = user?.permissions?.includes('all') || user?.permissions?.includes('products_prices_view');

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-expand all categories on load
  useEffect(() => {
    if (categories.length > 0 && expandedCategories.length === 0) {
      setExpandedCategories(categories.map(c => c.id));
    }
  }, [categories]);

  const fetchData = async () => {
    try {
      const [packagesRes, categoriesRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/packages`),
        axios.get(`${API_URL}/api/package-categories`),
        axios.get(`${API_URL}/api/products`)
      ]);
      setPackages(packagesRes.data);
      setCategories(categoriesRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Group packages by category
  const packagesByCategory = useMemo(() => {
    const filtered = packages.filter(pkg => {
      const matchSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || pkg.category_id === categoryFilter;
      const matchLevel = levelFilter === 'all' || pkg.level === levelFilter;
      const matchStatus = statusFilter === 'all' || pkg.status === statusFilter;
      return matchSearch && matchCategory && matchLevel && matchStatus;
    });
    
    const grouped = {};
    categories.forEach(cat => {
      grouped[cat.id] = {
        category: cat,
        packages: filtered.filter(p => p.category_id === cat.id)
      };
    });
    
    // Uncategorized packages
    const uncategorized = filtered.filter(p => !categories.find(c => c.id === p.category_id));
    if (uncategorized.length > 0) {
      grouped['uncategorized'] = {
        category: { id: 'uncategorized', name: 'Kategorisiz', icon: 'folder', color: '#666' },
        packages: uncategorized
      };
    }
    
    return grouped;
  }, [packages, categories, searchTerm, categoryFilter, levelFilter, statusFilter]);

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const resetForm = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      category_id: categories[0]?.id || '',
      description: '',
      level: 'basic',
      system_power_kwp: '',
      battery_capacity_kwh: '',
      daily_production_kwh: '',
      yearly_production_kwh: '',
      suitable_for: [],
      items: [],
      status: 'active'
    });
    setProductSearch('');
    setSelectedProduct('');
    setSelectedQuantity(1);
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      category_id: pkg.category_id,
      description: pkg.description || '',
      level: pkg.level || 'basic',
      system_power_kwp: pkg.system_power_kwp || '',
      battery_capacity_kwh: pkg.battery_capacity_kwh || '',
      daily_production_kwh: pkg.daily_production_kwh || '',
      yearly_production_kwh: pkg.yearly_production_kwh || '',
      suitable_for: pkg.suitable_for || [],
      items: pkg.items || [],
      status: pkg.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast.error('Lütfen ürün seçin');
      return;
    }
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    const existingIndex = formData.items.findIndex(item => item.product_id === selectedProduct);
    
    if (existingIndex >= 0) {
      const updatedItems = [...formData.items];
      updatedItems[existingIndex].quantity += selectedQuantity;
      setFormData({ ...formData, items: updatedItems });
    } else {
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: selectedQuantity,
        unit_price: product.sale_price || 0,
        stock_quantity: product.stock_quantity || 0
      };
      setFormData({ ...formData, items: [...formData.items, newItem] });
    }
    
    setSelectedProduct('');
    setSelectedQuantity(1);
  };

  const handleRemoveProduct = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Paket adı zorunludur');
      return;
    }
    if (!formData.category_id) {
      toast.error('Kategori seçiniz');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('En az bir ürün ekleyiniz');
      return;
    }

    try {
      const submitData = {
        ...formData,
        system_power_kwp: formData.system_power_kwp ? parseFloat(formData.system_power_kwp) : null,
        battery_capacity_kwh: formData.battery_capacity_kwh ? parseFloat(formData.battery_capacity_kwh) : null,
        daily_production_kwh: formData.daily_production_kwh ? parseFloat(formData.daily_production_kwh) : null,
        yearly_production_kwh: formData.yearly_production_kwh ? parseFloat(formData.yearly_production_kwh) : null,
      };

      if (editingPackage) {
        await axios.put(`${API_URL}/api/packages/${editingPackage.id}`, submitData);
        toast.success('Paket güncellendi');
      } else {
        await axios.post(`${API_URL}/api/packages`, submitData);
        toast.success('Paket oluşturuldu');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu paketi silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/packages/${id}`);
      toast.success('Paket silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme işlemi başarısız');
    }
  };

  const handleStatusChange = async (pkgId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/packages/${pkgId}/status?status=${newStatus}`);
      toast.success('Durum güncellendi');
      fetchData();
    } catch (error) {
      toast.error('Durum güncellenemedi');
    }
  };

  const toggleSuitableFor = (value) => {
    setFormData(prev => ({
      ...prev,
      suitable_for: prev.suitable_for.includes(value)
        ? prev.suitable_for.filter(v => v !== value)
        : [...prev.suitable_for, value]
    }));
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Calculate form totals
  const formTotalPrice = formData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="packages-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Solar Paketler</h1>
          <p className="text-muted-foreground mt-1">
            {packages.length} paket • {categories.length} kategori
          </p>
        </div>
        {canManage && (
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="new-package-btn">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Paket
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Paket ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Seviye" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Seviyeler</SelectItem>
                {LEVEL_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Packages by Category */}
      <div className="space-y-4">
        {Object.entries(packagesByCategory).map(([catId, { category, packages: catPackages }]) => {
          if (catPackages.length === 0 && categoryFilter !== 'all') return null;
          
          const IconComponent = ICON_MAP[category.icon] || Folder;
          const isExpanded = expandedCategories.includes(catId);
          
          return (
            <Card key={catId} className="overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(catId)}
                className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${category.color || '#F59E0B'}20` }}
                  >
                    <IconComponent className="h-5 w-5" style={{ color: category.color || '#F59E0B' }} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{catPackages.length} paket</p>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </button>
              
              {/* Packages Grid */}
              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  {catPackages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {catPackages.map((pkg) => {
                        const levelInfo = LEVEL_OPTIONS.find(l => l.value === pkg.level) || LEVEL_OPTIONS[0];
                        const statusInfo = STATUS_OPTIONS.find(s => s.value === pkg.status) || STATUS_OPTIONS[0];
                        const hasStockWarning = pkg.available_stock < 3;
                        
                        return (
                          <Card 
                            key={pkg.id} 
                            className={cn(
                              "cursor-pointer hover:shadow-lg transition-all group border-l-4",
                              pkg.status === 'campaign' && "border-l-orange-500",
                              pkg.status === 'inactive' && "opacity-60",
                              pkg.status === 'active' && "border-l-green-500"
                            )}
                            onClick={() => handleEdit(pkg)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex gap-2">
                                  <Badge className={levelInfo.color}>{levelInfo.label}</Badge>
                                  {pkg.status === 'campaign' && (
                                    <Badge className="bg-orange-500">Kampanya</Badge>
                                  )}
                                </div>
                                {canManage && (
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => { e.stopPropagation(); handleEdit(pkg); }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500"
                                      onClick={(e) => { e.stopPropagation(); handleDelete(pkg.id); }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              
                              <h4 className="font-semibold text-lg mb-2">{pkg.name}</h4>
                              
                              {/* Technical specs */}
                              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                {pkg.system_power_kwp && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Zap className="h-3 w-3" />
                                    <span>{pkg.system_power_kwp} kWp</span>
                                  </div>
                                )}
                                {pkg.battery_capacity_kwh && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Battery className="h-3 w-3" />
                                    <span>{pkg.battery_capacity_kwh} kWh</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Products count */}
                              <p className="text-sm text-muted-foreground mb-3">
                                {pkg.items?.length || 0} ürün
                              </p>
                              
                              {/* Prices */}
                              <div className="border-t pt-3 space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">USD:</span>
                                  <span className="font-semibold text-blue-600">{formatUSD(pkg.total_price_usd)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">TL:</span>
                                  <span className="font-semibold text-green-600">{formatTRY(pkg.total_price_tl)}</span>
                                </div>
                                {canSeePrices && pkg.profit_margin !== undefined && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Kar:</span>
                                    <span className={cn("font-semibold", pkg.profit_margin >= 20 ? "text-green-600" : "text-orange-500")}>
                                      %{pkg.profit_margin?.toFixed(1)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Stock warning */}
                              <div className={cn(
                                "mt-3 flex items-center gap-2 text-sm rounded-lg px-2 py-1",
                                hasStockWarning ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
                              )}>
                                {hasStockWarning ? (
                                  <>
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Stokta {pkg.available_stock} adet</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    <span>{pkg.available_stock} adet hazır</span>
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      Bu kategoride henüz paket yok
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
        
        {Object.keys(packagesByCategory).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Henüz paket eklenmemiş. Önce kategori oluşturun, sonra paket ekleyin.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Package Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paket Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: 5kW Konut Paketi"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Seviye</Label>
                <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Durum</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Paket hakkında detaylı bilgi"
                rows={2}
              />
            </div>

            {/* Technical Specs */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Teknik Özellikler
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Sistem Gücü (kWp)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.system_power_kwp}
                    onChange={(e) => setFormData({ ...formData, system_power_kwp: e.target.value })}
                    placeholder="5.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Batarya (kWh)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.battery_capacity_kwh}
                    onChange={(e) => setFormData({ ...formData, battery_capacity_kwh: e.target.value })}
                    placeholder="10.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Günlük Üretim (kWh)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.daily_production_kwh}
                    onChange={(e) => setFormData({ ...formData, daily_production_kwh: e.target.value })}
                    placeholder="20.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yıllık Üretim (kWh)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.yearly_production_kwh}
                    onChange={(e) => setFormData({ ...formData, yearly_production_kwh: e.target.value })}
                    placeholder="7300"
                  />
                </div>
              </div>
            </div>

            {/* Suitable For */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Kime Uygun?
              </h4>
              <div className="flex flex-wrap gap-2">
                {SUITABLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = formData.suitable_for.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleSuitableFor(opt.value)}
                      className={cn(
                        "px-3 py-2 rounded-lg border flex items-center gap-2 transition-all",
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" />
                Paket İçeriği
              </h4>
              
              {/* Add Product - Two Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-accent/30 rounded-lg">
                {/* Option 1: Select from dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Listeden Seç</Label>
                  <Select 
                    value={selectedProduct} 
                    onValueChange={(v) => {
                      setSelectedProduct(v);
                      setProductSearch('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ürün seçin..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Stok: {product.stock_quantity}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Option 2: Search by typing */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Yazarak Ara</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ürün adı veya SKU..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        if (!e.target.value) setSelectedProduct('');
                      }}
                      className="pl-9"
                    />
                    {productSearch && selectedProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch('');
                          setSelectedProduct('');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {productSearch && !selectedProduct && filteredProducts.length > 0 && (
                    <div className="border rounded-lg max-h-40 overflow-y-auto bg-background shadow-lg absolute z-50 w-full">
                      {filteredProducts.slice(0, 10).map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(product.id);
                            setProductSearch(product.name);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-accent flex justify-between items-center border-b last:border-b-0"
                        >
                          <span className="text-sm font-medium">{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Stok: {product.stock_quantity}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {productSearch && filteredProducts.length === 0 && (
                    <p className="text-sm text-muted-foreground">Ürün bulunamadı</p>
                  )}
                </div>
              </div>
              
              {/* Selected product info & quantity */}
              {selectedProduct && (
                <div className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      Seçilen: {products.find(p => p.id === selectedProduct)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stok: {products.find(p => p.id === selectedProduct)?.stock_quantity} adet
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Adet:</Label>
                    <Input
                      type="number"
                      min="1"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  </div>
                  <Button type="button" onClick={handleAddProduct} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Ekle
                  </Button>
                </div>
              )}
                    min="1"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button type="button" onClick={handleAddProduct}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Products Table */}
              {formData.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead className="w-20 text-center">Adet</TableHead>
                        <TableHead className="w-28 text-right">Birim Fiyat</TableHead>
                        <TableHead className="w-28 text-right">Toplam</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Stok: {item.stock_quantity}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...formData.items];
                                updated[index].quantity = parseInt(e.target.value) || 1;
                                setFormData({ ...formData, items: updated });
                              }}
                              className="w-16 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {formatUSD(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatUSD(item.unit_price * item.quantity)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleRemoveProduct(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Total */}
              {formData.items.length > 0 && (
                <div className="bg-accent/50 rounded-lg p-4 flex justify-between items-center">
                  <span className="font-medium">Toplam Fiyat:</span>
                  <span className="text-xl font-bold text-primary">{formatUSD(formTotalPrice)}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit">
                {editingPackage ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Packages;
