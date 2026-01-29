import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Pencil, Trash2, TrendingUp, DollarSign, Calendar, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statsPeriod, setStatsPeriod] = useState('monthly');
  const [systemExchangeRate, setSystemExchangeRate] = useState(34.0);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    input_currency: 'USD', // Hangi para birimi cinsinden giriş yapılıyor
    sale_amount_usd: '',
    sale_amount_tl: '',
    purchase_amount_usd: '',
    purchase_amount_tl: '',
    exchange_rate: '34.00',
    sale_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('finance_manage');

  useEffect(() => {
    fetchData();
    fetchExchangeRate();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, customersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sales`),
        axios.get(`${API_URL}/api/customers`),
        axios.get(`${API_URL}/api/sales/stats`)
      ]);
      setSales(salesRes.data);
      setCustomers(customersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/exchange-rates`);
      const rate = response.data.usd_to_try || 34.0;
      setSystemExchangeRate(rate);
      setFormData(prev => ({ ...prev, exchange_rate: rate.toString() }));
    } catch (error) {
      console.error('Kur alınamadı');
    }
  };

  const handleInputCurrencyChange = (currency) => {
    // Para birimi değiştiğinde diğer alanları temizle
    setFormData(prev => ({ 
      ...prev, 
      input_currency: currency,
      sale_amount_usd: '',
      sale_amount_tl: '',
      purchase_amount_usd: '',
      purchase_amount_tl: ''
    }));
  };

  // USD girişi -> TL'ye çevir
  const handleUsdInput = (field, value) => {
    const numValue = parseFloat(value) || 0;
    const rate = parseFloat(formData.exchange_rate) || 1;
    
    if (field === 'sale_amount_usd') {
      setFormData(prev => ({
        ...prev,
        sale_amount_usd: value,
        sale_amount_tl: numValue > 0 ? (numValue * rate).toFixed(2) : ''
      }));
    } else if (field === 'purchase_amount_usd') {
      setFormData(prev => ({
        ...prev,
        purchase_amount_usd: value,
        purchase_amount_tl: numValue > 0 ? (numValue * rate).toFixed(2) : ''
      }));
    }
  };

  // TL girişi -> USD'ye çevir
  const handleTlInput = (field, value) => {
    const numValue = parseFloat(value) || 0;
    const rate = parseFloat(formData.exchange_rate) || 1;
    
    if (field === 'sale_amount_tl') {
      setFormData(prev => ({
        ...prev,
        sale_amount_tl: value,
        sale_amount_usd: numValue > 0 ? (numValue / rate).toFixed(2) : ''
      }));
    } else if (field === 'purchase_amount_tl') {
      setFormData(prev => ({
        ...prev,
        purchase_amount_tl: value,
        purchase_amount_usd: numValue > 0 ? (numValue / rate).toFixed(2) : ''
      }));
    }
  };

  const handleRateChange = (rate) => {
    const numRate = parseFloat(rate) || 1;
    
    // Giriş türüne göre hesaplama yap
    if (formData.input_currency === 'USD') {
      const saleUsd = parseFloat(formData.sale_amount_usd) || 0;
      const purchaseUsd = parseFloat(formData.purchase_amount_usd) || 0;
      setFormData(prev => ({
        ...prev,
        exchange_rate: rate,
        sale_amount_tl: saleUsd > 0 ? (saleUsd * numRate).toFixed(2) : '',
        purchase_amount_tl: purchaseUsd > 0 ? (purchaseUsd * numRate).toFixed(2) : ''
      }));
    } else {
      const saleTl = parseFloat(formData.sale_amount_tl) || 0;
      const purchaseTl = parseFloat(formData.purchase_amount_tl) || 0;
      setFormData(prev => ({
        ...prev,
        exchange_rate: rate,
        sale_amount_usd: saleTl > 0 ? (saleTl / numRate).toFixed(2) : '',
        purchase_amount_usd: purchaseTl > 0 ? (purchaseTl / numRate).toFixed(2) : ''
      }));
    }
  };

  const useSystemRate = () => {
    handleRateChange(systemExchangeRate.toString());
    toast.success(`Güncel kur uygulandı: ${systemExchangeRate} TL`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name) {
      toast.error('Müşteri adı zorunludur');
      return;
    }
    
    const data = {
      ...formData,
      sale_amount_usd: parseFloat(formData.sale_amount_usd) || 0,
      sale_amount_tl: parseFloat(formData.sale_amount_tl) || 0,
      purchase_amount_usd: parseFloat(formData.purchase_amount_usd) || 0,
      purchase_amount_tl: parseFloat(formData.purchase_amount_tl) || 0,
      exchange_rate: parseFloat(formData.exchange_rate) || 1,
      sale_date: new Date(formData.sale_date).toISOString()
    };
    
    try {
      if (editingSale) {
        await axios.put(`${API_URL}/api/sales/${editingSale.id}`, data);
        toast.success('Satış güncellendi');
      } else {
        await axios.post(`${API_URL}/api/sales`, data);
        toast.success('Satış eklendi');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      customer_id: sale.customer_id || '',
      customer_name: sale.customer_name,
      currency: sale.currency || 'USD',
      sale_amount_usd: sale.sale_amount_usd?.toString() || '',
      sale_amount_tl: sale.sale_amount_tl?.toString() || '',
      purchase_amount_usd: sale.purchase_amount_usd?.toString() || '',
      purchase_amount_tl: sale.purchase_amount_tl?.toString() || '',
      exchange_rate: sale.exchange_rate?.toString() || '1',
      sale_date: sale.sale_date?.split('T')[0] || '',
      notes: sale.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu satışı silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/sales/${id}`);
      toast.success('Satış silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const resetForm = () => {
    setEditingSale(null);
    setFormData({
      customer_id: '',
      customer_name: '',
      currency: 'USD',
      sale_amount_usd: '',
      sale_amount_tl: '',
      purchase_amount_usd: '',
      purchase_amount_tl: '',
      exchange_rate: '34.50',
      sale_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const formatCurrency = (value, currency = 'TRY') => {
    if (currency === 'USD') return `$${(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    if (currency === 'EUR') return `€${(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    return `₺${(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const filteredSales = sales.filter(sale => 
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentStats = stats?.[statsPeriod] || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sales-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Satışlar</h1>
          <p className="text-muted-foreground mt-1">{sales.length} satış kaydı</p>
        </div>
        {canManage && (
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-sale-btn">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Satış
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Satış (TL)</p>
                <p className="text-sm sm:text-xl font-bold truncate">{formatCurrency(currentStats.sale_tl)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Satış (USD)</p>
                <p className="text-sm sm:text-xl font-bold truncate">{formatCurrency(currentStats.sale_usd, 'USD')}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Kar (TL)</p>
                <p className="text-sm sm:text-xl font-bold text-green-600 truncate">{formatCurrency(currentStats.profit_tl)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Satış Adedi</p>
                <p className="text-sm sm:text-xl font-bold">{currentStats.count || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-violet-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Filter */}
      <div className="flex flex-wrap gap-2">
        {['daily', 'weekly', 'monthly', 'yearly', 'total'].map(period => (
          <Button
            key={period}
            variant={statsPeriod === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatsPeriod(period)}
          >
            {period === 'daily' && 'Günlük'}
            {period === 'weekly' && 'Haftalık'}
            {period === 'monthly' && 'Aylık'}
            {period === 'yearly' && 'Yıllık'}
            {period === 'total' && 'Toplam'}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Müşteri ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sales Table - Desktop */}
      <Card className="hidden sm:block">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead className="text-right">Satış (USD)</TableHead>
                <TableHead className="text-right">Satış (TL)</TableHead>
                <TableHead className="text-right">Alış (USD)</TableHead>
                <TableHead className="text-right">Alış (TL)</TableHead>
                <TableHead className="text-right">Kar (TL)</TableHead>
                {canManage && <TableHead className="text-right">İşlemler</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="text-sm">{formatDate(sale.sale_date)}</TableCell>
                  <TableCell className="font-medium">{sale.customer_name}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(sale.sale_amount_usd, 'USD')}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(sale.sale_amount_tl)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(sale.purchase_amount_usd, 'USD')}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(sale.purchase_amount_tl)}</TableCell>
                  <TableCell className="text-right font-mono text-green-600 font-medium">{formatCurrency(sale.profit_tl)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(sale)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sale.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Satış kaydı bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sales Cards - Mobile */}
      <div className="sm:hidden space-y-3">
        {filteredSales.map((sale) => (
          <Card key={sale.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-medium">{sale.customer_name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(sale.sale_date)}</p>
              </div>
              <span className="text-sm font-bold text-green-600">{formatCurrency(sale.profit_tl)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Satış USD</p>
                <p className="font-mono">{formatCurrency(sale.sale_amount_usd, 'USD')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Satış TL</p>
                <p className="font-mono">{formatCurrency(sale.sale_amount_tl)}</p>
              </div>
            </div>
            {canManage && (
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => handleEdit(sale)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Düzenle
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(sale.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSale ? 'Satış Düzenle' : 'Yeni Satış Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer */}
            <div className="space-y-2">
              <Label>Müşteri *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(val) => {
                  const cust = customers.find(c => c.id === val);
                  setFormData(prev => ({ 
                    ...prev, 
                    customer_id: val, 
                    customer_name: cust?.name || ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçin veya elle yazın" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="veya müşteri adını yazın"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
              />
            </div>

            {/* Currency & Exchange Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.currency === 'USD' && (
                <div className="space-y-2">
                  <Label>Döviz Kuru (USD/TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.exchange_rate}
                    onChange={(e) => handleRateChange(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Sale Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Satış Tutarı (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sale_amount_usd}
                  onChange={(e) => handleAmountChange('sale_amount_usd', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Satış Tutarı (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sale_amount_tl}
                  onChange={(e) => setFormData(prev => ({ ...prev, sale_amount_tl: e.target.value }))}
                  className={formData.currency === 'USD' ? 'bg-muted' : ''}
                  readOnly={formData.currency === 'USD'}
                />
              </div>
            </div>

            {/* Purchase Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alış Tutarı (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_amount_usd}
                  onChange={(e) => handleAmountChange('purchase_amount_usd', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Alış Tutarı (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_amount_tl}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_amount_tl: e.target.value }))}
                  className={formData.currency === 'USD' ? 'bg-muted' : ''}
                  readOnly={formData.currency === 'USD'}
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Satış Tarihi</Label>
              <Input
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData(prev => ({ ...prev, sale_date: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>

            {/* Profit Preview */}
            {(formData.sale_amount_tl && formData.purchase_amount_tl) && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-300">
                  Tahmini Kar: <strong>{formatCurrency(parseFloat(formData.sale_amount_tl || 0) - parseFloat(formData.purchase_amount_tl || 0))}</strong>
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
              <Button type="submit">{editingSale ? 'Güncelle' : 'Ekle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
