import React, { useState, useEffect } from 'react';
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
import { 
  Plus, Pencil, Trash2, TrendingUp, DollarSign, Calendar, Search, RefreshCw,
  CreditCard, Banknote, Building, FileCheck, Clock, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PAYMENT_STATUS = {
  odendi: { label: 'Ödendi', color: 'bg-green-100 text-green-800' },
  bekliyor: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
  kismi: { label: 'Kısmi Ödeme', color: 'bg-blue-100 text-blue-800' },
  gecikti: { label: 'Gecikmiş', color: 'bg-red-100 text-red-800' }
};

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [upcomingChecks, setUpcomingChecks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statsPeriod, setStatsPeriod] = useState('monthly');
  const [systemExchangeRate, setSystemExchangeRate] = useState(34.0);
  const [showChecks, setShowChecks] = useState(true);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    input_currency: 'TRY',
    sale_amount_usd: '',
    sale_amount_tl: '',
    purchase_amount_usd: '',
    purchase_amount_tl: '',
    exchange_rate: '34.00',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
    // Çoklu ödeme
    nakit_tl: '',
    kart_tl: '',
    havale_tl: '',
    checks: []
  });

  const emptyCheck = {
    check_no: '',
    bank_name: '',
    amount_tl: '',
    due_date: ''
  };

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('finance_manage');

  useEffect(() => {
    fetchData();
    fetchExchangeRate();
    fetchUpcomingChecks();
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

  const fetchUpcomingChecks = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/checks/upcoming`);
      setUpcomingChecks(response.data);
    } catch (error) {
      console.error('Yaklaşan çekler alınamadı');
    }
  };

  // Currency conversion handlers
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

  // Check handlers
  const addCheck = () => {
    setFormData(prev => ({
      ...prev,
      checks: [...prev.checks, { ...emptyCheck }]
    }));
  };

  const removeCheck = (index) => {
    setFormData(prev => ({
      ...prev,
      checks: prev.checks.filter((_, i) => i !== index)
    }));
  };

  const updateCheck = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      checks: prev.checks.map((check, i) => 
        i === index ? { ...check, [field]: value } : check
      )
    }));
  };

  // Calculate totals
  const getTotalPayments = () => {
    const nakit = parseFloat(formData.nakit_tl) || 0;
    const kart = parseFloat(formData.kart_tl) || 0;
    const havale = parseFloat(formData.havale_tl) || 0;
    const checkTotal = formData.checks.reduce((sum, c) => sum + (parseFloat(c.amount_tl) || 0), 0);
    return nakit + kart + havale + checkTotal;
  };

  const getRemaining = () => {
    const total = parseFloat(formData.sale_amount_tl) || 0;
    return total - getTotalPayments();
  };

  // Collect check
  const handleCollectCheck = async (saleId, checkId) => {
    try {
      await axios.put(`${API_URL}/api/sales/${saleId}/checks/${checkId}/collect`);
      toast.success('Çek tahsil edildi');
      fetchData();
      fetchUpcomingChecks();
    } catch (error) {
      toast.error('Çek tahsil edilemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name) {
      toast.error('Müşteri adı zorunludur');
      return;
    }

    // Validate checks
    for (let i = 0; i < formData.checks.length; i++) {
      if (formData.checks[i].amount_tl && !formData.checks[i].due_date) {
        toast.error(`Çek ${i + 1}: Vade tarihi zorunludur`);
        return;
      }
    }

    // Filter valid checks
    const validChecks = formData.checks.filter(c => c.amount_tl && c.due_date);
    
    const data = {
      customer_id: formData.customer_id || null,
      customer_name: formData.customer_name,
      currency: formData.input_currency,
      sale_amount_usd: parseFloat(formData.sale_amount_usd) || 0,
      sale_amount_tl: parseFloat(formData.sale_amount_tl) || 0,
      purchase_amount_usd: parseFloat(formData.purchase_amount_usd) || 0,
      purchase_amount_tl: parseFloat(formData.purchase_amount_tl) || 0,
      exchange_rate: parseFloat(formData.exchange_rate) || 1,
      sale_date: new Date(formData.sale_date).toISOString(),
      notes: formData.notes,
      nakit_tl: parseFloat(formData.nakit_tl) || 0,
      kart_tl: parseFloat(formData.kart_tl) || 0,
      havale_tl: parseFloat(formData.havale_tl) || 0,
      checks: validChecks.map(check => ({
        check_no: check.check_no,
        bank_name: check.bank_name,
        amount_tl: parseFloat(check.amount_tl) || 0,
        due_date: new Date(check.due_date).toISOString(),
        is_collected: check.is_collected || false
      }))
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
      fetchUpcomingChecks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      customer_id: sale.customer_id || '',
      customer_name: sale.customer_name,
      input_currency: sale.currency || 'TRY',
      sale_amount_usd: sale.sale_amount_usd?.toString() || '',
      sale_amount_tl: sale.sale_amount_tl?.toString() || '',
      purchase_amount_usd: sale.purchase_amount_usd?.toString() || '',
      purchase_amount_tl: sale.purchase_amount_tl?.toString() || '',
      exchange_rate: sale.exchange_rate?.toString() || systemExchangeRate.toString(),
      sale_date: sale.sale_date?.split('T')[0] || '',
      notes: sale.notes || '',
      nakit_tl: sale.nakit_tl?.toString() || '',
      kart_tl: sale.kart_tl?.toString() || '',
      havale_tl: sale.havale_tl?.toString() || '',
      checks: (sale.checks || []).map(c => ({
        id: c.id,
        check_no: c.check_no || '',
        bank_name: c.bank_name || '',
        amount_tl: c.amount_tl?.toString() || '',
        due_date: c.due_date?.split('T')[0] || '',
        is_collected: c.is_collected || false
      }))
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu satışı silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/sales/${id}`);
      toast.success('Satış silindi');
      fetchData();
      fetchUpcomingChecks();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const resetForm = () => {
    setEditingSale(null);
    setFormData({
      customer_id: '',
      customer_name: '',
      input_currency: 'TRY',
      sale_amount_usd: '',
      sale_amount_tl: '',
      purchase_amount_usd: '',
      purchase_amount_tl: '',
      exchange_rate: systemExchangeRate.toString(),
      sale_date: new Date().toISOString().split('T')[0],
      notes: '',
      nakit_tl: '',
      kart_tl: '',
      havale_tl: '',
      checks: []
    });
  };

  const formatCurrency = (value, currency = 'TRY') => {
    if (currency === 'USD') return `$${(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    return `₺${(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const getPaymentStatusBadge = (status) => {
    const statusInfo = PAYMENT_STATUS[status] || PAYMENT_STATUS.bekliyor;
    return <Badge className={`${statusInfo.color} text-xs`}>{statusInfo.label}</Badge>;
  };

  // Get payment summary for display
  const getPaymentSummary = (sale) => {
    const parts = [];
    if (sale.nakit_tl > 0) parts.push(`Nakit: ${formatCurrency(sale.nakit_tl)}`);
    if (sale.kart_tl > 0) parts.push(`Kart: ${formatCurrency(sale.kart_tl)}`);
    if (sale.havale_tl > 0) parts.push(`Havale: ${formatCurrency(sale.havale_tl)}`);
    if (sale.check_total_tl > 0) parts.push(`Çek: ${formatCurrency(sale.check_total_tl)}`);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const filteredSales = sales.filter(sale => 
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentStats = stats?.[statsPeriod] || {};
  const remaining = getRemaining();

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

      {/* Upcoming Checks Alert */}
      {upcomingChecks && (upcomingChecks.overdue?.length > 0 || upcomingChecks.upcoming?.length > 0) && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-orange-600" />
                Vadesi Gelen Çekler
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowChecks(!showChecks)}>
                {showChecks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showChecks && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                  <p className="text-xs text-red-700 dark:text-red-300">Gecikmiş</p>
                  <p className="text-lg font-bold text-red-800">{formatCurrency(upcomingChecks.total_overdue_amount)}</p>
                  <p className="text-xs text-red-600">{upcomingChecks.overdue?.length || 0} adet</p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-3">
                  <p className="text-xs text-orange-700 dark:text-orange-300">Yaklaşan</p>
                  <p className="text-lg font-bold text-orange-800">{formatCurrency(upcomingChecks.total_upcoming_amount)}</p>
                  <p className="text-xs text-orange-600">{upcomingChecks.upcoming?.length || 0} adet</p>
                </div>
              </div>
              
              {upcomingChecks.overdue?.slice(0, 3).map((check, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded p-2 text-sm mb-2">
                  <div>
                    <span className="font-medium">{check.customer_name}</span>
                    {check.check_no && <span className="text-xs text-muted-foreground ml-1">#{check.check_no}</span>}
                    <span className="text-xs text-red-600 ml-2">({Math.abs(check.days_until_due)} gün gecikmiş)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-red-600">{formatCurrency(check.amount_tl)}</span>
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => handleCollectCheck(check.sale_id, check.check_id)}>
                        Tahsil Et
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {upcomingChecks.upcoming?.slice(0, 3).map((check, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded p-2 text-sm mb-2">
                  <div>
                    <span className="font-medium">{check.customer_name}</span>
                    {check.check_no && <span className="text-xs text-muted-foreground ml-1">#{check.check_no}</span>}
                    <span className="text-xs text-orange-600 ml-2">({check.days_until_due} gün - {formatDate(check.due_date)})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{formatCurrency(check.amount_tl)}</span>
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => handleCollectCheck(check.sale_id, check.check_id)}>
                        Tahsil Et
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Satış (TL)</p>
            <p className="text-xl font-bold">{formatCurrency(currentStats.sale_tl)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Satış (USD)</p>
            <p className="text-xl font-bold">{formatCurrency(currentStats.sale_usd, 'USD')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Kar (TL)</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(currentStats.profit_tl)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Satış Adedi</p>
            <p className="text-xl font-bold">{currentStats.count || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Filter & Search */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {['daily', 'weekly', 'monthly', 'yearly'].map(period => (
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
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Müşteri ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-48"
          />
        </div>
      </div>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead className="text-right">Satış</TableHead>
                <TableHead>Ödeme Detayı</TableHead>
                <TableHead className="text-right">Tahsil</TableHead>
                <TableHead className="text-right">Kalan</TableHead>
                <TableHead className="text-center">Durum</TableHead>
                {canManage && <TableHead className="text-right">İşlem</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="text-sm">{formatDate(sale.sale_date)}</TableCell>
                  <TableCell className="font-medium">{sale.customer_name}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(sale.sale_amount_tl)}</TableCell>
                  <TableCell className="text-xs max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {sale.nakit_tl > 0 && <Badge variant="outline" className="text-green-600">💵 {formatCurrency(sale.nakit_tl)}</Badge>}
                      {sale.kart_tl > 0 && <Badge variant="outline" className="text-blue-600">💳 {formatCurrency(sale.kart_tl)}</Badge>}
                      {sale.havale_tl > 0 && <Badge variant="outline" className="text-purple-600">🏦 {formatCurrency(sale.havale_tl)}</Badge>}
                      {sale.check_total_tl > 0 && <Badge variant="outline" className="text-orange-600">📄 {formatCurrency(sale.check_total_tl)}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-600">{formatCurrency(sale.paid_amount_tl || 0)}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {formatCurrency(sale.remaining_amount_tl !== undefined && sale.remaining_amount_tl !== null ? sale.remaining_amount_tl : sale.sale_amount_tl)}
                  </TableCell>
                  <TableCell className="text-center">{getPaymentStatusBadge(sale.payment_status)}</TableCell>
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

      {/* Add/Edit Sale Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSale ? 'Satış Düzenle' : 'Yeni Satış Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Müşteri Seç</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(val) => {
                    const cust = customers.find(c => c.id === val);
                    setFormData(prev => ({ ...prev, customer_id: val, customer_name: cust?.name || '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Listeden seç" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Müşteri Adı *</Label>
                <Input
                  placeholder="veya elle yazın"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                />
              </div>
            </div>

            {/* Currency & Exchange Rate */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant={formData.input_currency === 'TRY' ? 'default' : 'outline'} 
                    onClick={() => setFormData(prev => ({ ...prev, input_currency: 'TRY' }))}>₺ TL</Button>
                  <Button type="button" size="sm" variant={formData.input_currency === 'USD' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, input_currency: 'USD' }))}>$ USD</Button>
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Kur (1 USD = ? TL)</Label>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" value={formData.exchange_rate} onChange={(e) => handleRateChange(e.target.value)} />
                  <Button type="button" variant="outline" onClick={() => handleRateChange(systemExchangeRate.toString())}>
                    <RefreshCw className="h-4 w-4 mr-1" />{systemExchangeRate}
                  </Button>
                </div>
              </div>
            </div>

            {/* Sale & Cost Amounts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Satış Tutarı {formData.input_currency === 'TRY' ? '(TL)' : '(USD)'} *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {formData.input_currency === 'TRY' ? '₺' : '$'}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-7"
                    value={formData.input_currency === 'TRY' ? formData.sale_amount_tl : formData.sale_amount_usd}
                    onChange={(e) => formData.input_currency === 'TRY' 
                      ? handleTlInput('sale_amount_tl', e.target.value)
                      : handleUsdInput('sale_amount_usd', e.target.value)
                    }
                  />
                </div>
                {formData.sale_amount_tl && formData.input_currency === 'USD' && (
                  <p className="text-xs text-muted-foreground">= ₺{formData.sale_amount_tl}</p>
                )}
                {formData.sale_amount_usd && formData.input_currency === 'TRY' && (
                  <p className="text-xs text-muted-foreground">= ${formData.sale_amount_usd}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Maliyet {formData.input_currency === 'TRY' ? '(TL)' : '(USD)'}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {formData.input_currency === 'TRY' ? '₺' : '$'}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-7"
                    value={formData.input_currency === 'TRY' ? formData.purchase_amount_tl : formData.purchase_amount_usd}
                    onChange={(e) => formData.input_currency === 'TRY'
                      ? handleTlInput('purchase_amount_tl', e.target.value)
                      : handleUsdInput('purchase_amount_usd', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Payment Section Header */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Ödeme Bilgileri</h3>
                {formData.sale_amount_tl && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Toplam: <span className="font-bold">{formatCurrency(parseFloat(formData.sale_amount_tl) || 0)}</span></p>
                  </div>
                )}
              </div>

              {/* Direct Payments (Nakit, Kart, Havale) */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <Banknote className="h-4 w-4 text-green-600" /> Nakit
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="pl-6 h-9"
                      value={formData.nakit_tl}
                      onChange={(e) => setFormData(prev => ({ ...prev, nakit_tl: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <CreditCard className="h-4 w-4 text-blue-600" /> Kart
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="pl-6 h-9"
                      value={formData.kart_tl}
                      onChange={(e) => setFormData(prev => ({ ...prev, kart_tl: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <Building className="h-4 w-4 text-purple-600" /> Havale
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="pl-6 h-9"
                      value={formData.havale_tl}
                      onChange={(e) => setFormData(prev => ({ ...prev, havale_tl: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Checks Section */}
              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <FileCheck className="h-4 w-4" />
                    Çekler ({formData.checks.length} adet)
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addCheck}>
                    <Plus className="h-4 w-4 mr-1" /> Çek Ekle
                  </Button>
                </div>

                {formData.checks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">Çek eklenmedi</p>
                ) : (
                  <div className="space-y-3">
                    {formData.checks.map((check, index) => (
                      <div key={index} className="bg-white dark:bg-slate-800 rounded p-3 border relative">
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost" 
                          className="absolute right-1 top-1 h-6 w-6 text-red-500"
                          onClick={() => removeCheck(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs">Çek No</Label>
                            <Input
                              placeholder="Opsiyonel"
                              className="h-8 text-sm"
                              value={check.check_no}
                              onChange={(e) => updateCheck(index, 'check_no', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Banka</Label>
                            <Input
                              placeholder="Opsiyonel"
                              className="h-8 text-sm"
                              value={check.bank_name}
                              onChange={(e) => updateCheck(index, 'bank_name', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Tutar (TL) *</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₺</span>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-sm pl-5"
                                value={check.amount_tl}
                                onChange={(e) => updateCheck(index, 'amount_tl', e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Vade *</Label>
                            <Input
                              type="date"
                              className="h-8 text-sm"
                              value={check.due_date}
                              onChange={(e) => updateCheck(index, 'due_date', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Summary */}
              {formData.sale_amount_tl && (
                <div className={`mt-4 p-3 rounded-lg ${remaining > 0.01 ? 'bg-amber-100 dark:bg-amber-900/30' : remaining < -0.01 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Toplam Ödeme:</span>
                      <span className="font-bold ml-2">{formatCurrency(getTotalPayments())}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Kalan:</span>
                      <span className={`font-bold ml-2 ${remaining > 0.01 ? 'text-amber-700' : remaining < -0.01 ? 'text-red-700' : 'text-green-700'}`}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>
                  {remaining <= 0.01 && remaining >= -0.01 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ödeme tamamlandı
                    </p>
                  )}
                  {remaining < -0.01 && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Ödeme tutarı satış tutarını aşıyor!</p>
                  )}
                </div>
              )}
            </div>

            {/* Sale Date & Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Satış Tarihi</Label>
                <Input
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, sale_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Notlar</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Opsiyonel"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
              <Button type="submit">{editingSale ? 'Güncelle' : 'Kaydet'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
