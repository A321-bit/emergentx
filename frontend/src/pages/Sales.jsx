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
  Receipt, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Payment method icons and labels
const PAYMENT_METHODS = {
  nakit: { label: 'Nakit', icon: Banknote, color: 'text-green-600' },
  kart: { label: 'Kredi/Banka Kartı', icon: CreditCard, color: 'text-blue-600' },
  havale: { label: 'Havale/EFT', icon: Building, color: 'text-purple-600' },
  cek: { label: 'Çek', icon: FileCheck, color: 'text-orange-600' },
  vadeli: { label: 'Vadeli', icon: Clock, color: 'text-amber-600' },
  diger: { label: 'Diğer', icon: Receipt, color: 'text-gray-600' }
};

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
  const [upcomingPayments, setUpcomingPayments] = useState(null);
  const [upcomingChecks, setUpcomingChecks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statsPeriod, setStatsPeriod] = useState('monthly');
  const [systemExchangeRate, setSystemExchangeRate] = useState(34.0);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showChecks, setShowChecks] = useState(true);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    input_currency: 'USD',
    sale_amount_usd: '',
    sale_amount_tl: '',
    purchase_amount_usd: '',
    purchase_amount_tl: '',
    exchange_rate: '34.00',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
    payment_method: 'nakit',
    paid_amount_tl: '',
    due_date: '',
    checks: []  // Çekler listesi
  });

  // Yeni çek ekleme için boş şablon
  const emptyCheck = {
    check_no: '',
    bank_name: '',
    amount_tl: '',
    due_date: ''
  };

  const [paymentFormData, setPaymentFormData] = useState({
    amount_tl: '',
    payment_method: 'nakit',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('finance_manage');

  useEffect(() => {
    fetchData();
    fetchExchangeRate();
    fetchUpcomingPayments();
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

  const fetchUpcomingPayments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sales/upcoming-payments`);
      setUpcomingPayments(response.data);
    } catch (error) {
      console.error('Yaklaşan tahsilatlar alınamadı');
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

  // Çek ekleme
  const addCheck = () => {
    setFormData(prev => ({
      ...prev,
      checks: [...prev.checks, { ...emptyCheck }]
    }));
  };

  // Çek silme
  const removeCheck = (index) => {
    setFormData(prev => ({
      ...prev,
      checks: prev.checks.filter((_, i) => i !== index)
    }));
  };

  // Çek güncelleme
  const updateCheck = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      checks: prev.checks.map((check, i) => 
        i === index ? { ...check, [field]: value } : check
      )
    }));
  };

  // Çek tahsil etme
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

  // Toplam çek tutarını hesapla
  const getTotalChecksAmount = () => {
    return formData.checks.reduce((sum, check) => sum + (parseFloat(check.amount_tl) || 0), 0);
  };

  const handleInputCurrencyChange = (currency) => {
    setFormData(prev => ({ 
      ...prev, 
      input_currency: currency,
      sale_amount_usd: '',
      sale_amount_tl: '',
      purchase_amount_usd: '',
      purchase_amount_tl: '',
      paid_amount_tl: ''
    }));
  };

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

    // Çek validasyonu
    if (formData.payment_method === 'cek') {
      if (formData.checks.length === 0) {
        toast.error('En az bir çek eklemelisiniz');
        return;
      }
      for (let i = 0; i < formData.checks.length; i++) {
        if (!formData.checks[i].amount_tl || !formData.checks[i].due_date) {
          toast.error(`Çek ${i + 1}: Tutar ve vade tarihi zorunludur`);
          return;
        }
      }
    }
    
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
      payment_method: formData.payment_method,
      paid_amount_tl: parseFloat(formData.paid_amount_tl) || 0,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      checks: formData.payment_method === 'cek' ? formData.checks.map(check => ({
        check_no: check.check_no,
        bank_name: check.bank_name,
        amount_tl: parseFloat(check.amount_tl) || 0,
        due_date: new Date(check.due_date).toISOString(),
        is_collected: false
      })) : null
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
      fetchUpcomingPayments();
      fetchUpcomingChecks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    
    if (!selectedSaleForPayment || !paymentFormData.amount_tl) {
      toast.error('Tutar zorunludur');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/sales/${selectedSaleForPayment.id}/payments`, {
        sale_id: selectedSaleForPayment.id,
        amount_tl: parseFloat(paymentFormData.amount_tl),
        payment_method: paymentFormData.payment_method,
        payment_date: new Date(paymentFormData.payment_date).toISOString(),
        notes: paymentFormData.notes
      });
      
      toast.success('Tahsilat kaydedildi');
      setIsPaymentModalOpen(false);
      setSelectedSaleForPayment(null);
      setPaymentFormData({
        amount_tl: '',
        payment_method: 'nakit',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchData();
      fetchUpcomingPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Tahsilat kaydedilemedi');
    }
  };

  const openPaymentModal = (sale) => {
    setSelectedSaleForPayment(sale);
    setPaymentFormData({
      amount_tl: sale.remaining_amount_tl?.toString() || '',
      payment_method: 'nakit',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      customer_id: sale.customer_id || '',
      customer_name: sale.customer_name,
      input_currency: sale.currency || 'USD',
      sale_amount_usd: sale.sale_amount_usd?.toString() || '',
      sale_amount_tl: sale.sale_amount_tl?.toString() || '',
      purchase_amount_usd: sale.purchase_amount_usd?.toString() || '',
      purchase_amount_tl: sale.purchase_amount_tl?.toString() || '',
      exchange_rate: sale.exchange_rate?.toString() || systemExchangeRate.toString(),
      sale_date: sale.sale_date?.split('T')[0] || '',
      notes: sale.notes || '',
      payment_method: sale.payment_method || 'nakit',
      paid_amount_tl: sale.paid_amount_tl?.toString() || '',
      due_date: sale.due_date?.split('T')[0] || '',
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
      fetchUpcomingPayments();
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
      input_currency: 'USD',
      sale_amount_usd: '',
      sale_amount_tl: '',
      purchase_amount_usd: '',
      purchase_amount_tl: '',
      exchange_rate: systemExchangeRate.toString(),
      sale_date: new Date().toISOString().split('T')[0],
      notes: '',
      payment_method: 'nakit',
      paid_amount_tl: '',
      due_date: '',
      checks: []
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

  const getPaymentStatusBadge = (status) => {
    const statusInfo = PAYMENT_STATUS[status] || PAYMENT_STATUS.bekliyor;
    return <Badge className={`${statusInfo.color} text-xs`}>{statusInfo.label}</Badge>;
  };

  const filteredSales = sales.filter(sale => 
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentStats = stats?.[statsPeriod] || {};

  // Calculate remaining amount in form
  const calculatedRemaining = (parseFloat(formData.sale_amount_tl) || 0) - (parseFloat(formData.paid_amount_tl) || 0);

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

      {/* Upcoming Payments Alert */}
      {upcomingPayments && (upcomingPayments.overdue?.length > 0 || upcomingPayments.upcoming?.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Yaklaşan Tahsilatlar
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowUpcoming(!showUpcoming)}>
                {showUpcoming ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showUpcoming && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                  <p className="text-xs text-red-700 dark:text-red-300">Gecikmiş</p>
                  <p className="text-lg font-bold text-red-800 dark:text-red-200">
                    {formatCurrency(upcomingPayments.total_overdue_amount)}
                  </p>
                  <p className="text-xs text-red-600">{upcomingPayments.overdue?.length || 0} adet</p>
                </div>
                <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">7 Gün İçinde</p>
                  <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                    {formatCurrency(upcomingPayments.total_upcoming_amount)}
                  </p>
                  <p className="text-xs text-amber-600">{upcomingPayments.upcoming?.length || 0} adet</p>
                </div>
              </div>
              
              {/* Overdue list */}
              {upcomingPayments.overdue?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-700">Gecikmiş Tahsilatlar:</p>
                  {upcomingPayments.overdue.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded p-2 text-sm">
                      <div>
                        <span className="font-medium">{item.customer_name}</span>
                        <span className="text-xs text-red-600 ml-2">
                          ({Math.abs(item.days_until_due)} gün gecikmiş)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-red-600">{formatCurrency(item.remaining_amount_tl)}</span>
                        {canManage && (
                          <Button size="sm" variant="outline" onClick={() => openPaymentModal(item)}>
                            Tahsil Et
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upcoming list */}
              {upcomingPayments.upcoming?.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-sm font-medium text-amber-700">Yaklaşan Vadeler:</p>
                  {upcomingPayments.upcoming.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded p-2 text-sm">
                      <div>
                        <span className="font-medium">{item.customer_name}</span>
                        {item.days_until_due !== null && (
                          <span className="text-xs text-amber-600 ml-2">
                            ({item.days_until_due} gün kaldı)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatCurrency(item.remaining_amount_tl)}</span>
                        {canManage && (
                          <Button size="sm" variant="outline" onClick={() => openPaymentModal(item)}>
                            Tahsil Et
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

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
                <TableHead>Ödeme</TableHead>
                <TableHead className="text-right">Satış (TL)</TableHead>
                <TableHead className="text-right">Ödenen</TableHead>
                <TableHead className="text-right">Kalan</TableHead>
                <TableHead className="text-center">Durum</TableHead>
                <TableHead>Vade</TableHead>
                {canManage && <TableHead className="text-right">İşlemler</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => {
                const PaymentIcon = PAYMENT_METHODS[sale.payment_method]?.icon || Receipt;
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="text-sm">{formatDate(sale.sale_date)}</TableCell>
                    <TableCell className="font-medium">{sale.customer_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PaymentIcon className={`h-4 w-4 ${PAYMENT_METHODS[sale.payment_method]?.color || ''}`} />
                        <span className="text-xs">{PAYMENT_METHODS[sale.payment_method]?.label || sale.payment_method}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(sale.sale_amount_tl)}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatCurrency(sale.paid_amount_tl || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatCurrency(sale.remaining_amount_tl !== undefined && sale.remaining_amount_tl !== null ? sale.remaining_amount_tl : sale.sale_amount_tl)}
                    </TableCell>
                    <TableCell className="text-center">{getPaymentStatusBadge(sale.payment_status)}</TableCell>
                    <TableCell className="text-sm">{sale.due_date ? formatDate(sale.due_date) : '-'}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(sale.remaining_amount_tl > 0 || !sale.paid_amount_tl) && (
                            <Button variant="ghost" size="icon" onClick={() => openPaymentModal(sale)} title="Tahsilat Ekle">
                              <Receipt className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
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
                );
              })}
              {filteredSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
        {filteredSales.map((sale) => {
          const PaymentIcon = PAYMENT_METHODS[sale.payment_method]?.icon || Receipt;
          return (
            <Card key={sale.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium">{sale.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(sale.sale_date)}</p>
                </div>
                {getPaymentStatusBadge(sale.payment_status)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <p className="text-muted-foreground text-xs">Satış</p>
                  <p className="font-mono">{formatCurrency(sale.sale_amount_tl)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Ödenen</p>
                  <p className="font-mono text-green-600">{formatCurrency(sale.paid_amount_tl || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Kalan</p>
                  <p className="font-mono text-red-600">
                    {formatCurrency(sale.remaining_amount_tl !== undefined && sale.remaining_amount_tl !== null ? sale.remaining_amount_tl : sale.sale_amount_tl)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <PaymentIcon className={`h-4 w-4 ${PAYMENT_METHODS[sale.payment_method]?.color || ''}`} />
                {PAYMENT_METHODS[sale.payment_method]?.label}
                {sale.due_date && <span className="ml-auto">Vade: {formatDate(sale.due_date)}</span>}
              </div>
              {canManage && (
                <div className="flex justify-end gap-2 pt-3 border-t">
                  {(sale.remaining_amount_tl > 0 || !sale.paid_amount_tl) && (
                    <Button variant="outline" size="sm" onClick={() => openPaymentModal(sale)}>
                      <Receipt className="h-4 w-4 mr-1" />
                      Tahsil Et
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleEdit(sale)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(sale.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Sale Modal */}
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

            {/* Currency Selection */}
            <div className="space-y-3">
              <Label>Giriş Para Birimi</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.input_currency === 'USD' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleInputCurrencyChange('USD')}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  USD ($)
                </Button>
                <Button
                  type="button"
                  variant={formData.input_currency === 'TRY' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleInputCurrencyChange('TRY')}
                >
                  ₺ TL
                </Button>
              </div>
            </div>

            {/* Exchange Rate */}
            <div className="space-y-2">
              <Label>Döviz Kuru (1 USD = ? TL)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.exchange_rate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={useSystemRate}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {systemExchangeRate}
                </Button>
              </div>
            </div>

            {/* Sale Amount */}
            {formData.input_currency === 'USD' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Satış Tutarı (USD) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.sale_amount_usd}
                      onChange={(e) => handleUsdInput('sale_amount_usd', e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Satış Tutarı (TL)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₺</span>
                    <Input type="number" value={formData.sale_amount_tl} readOnly className="pl-7 bg-muted" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Satış Tutarı (TL) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.sale_amount_tl}
                      onChange={(e) => handleTlInput('sale_amount_tl', e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Satış Tutarı (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input type="number" value={formData.sale_amount_usd} readOnly className="pl-7 bg-muted" />
                  </div>
                </div>
              </div>
            )}

            {/* Purchase/Cost Amount */}
            {formData.input_currency === 'USD' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Alış/Maliyet (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.purchase_amount_usd}
                      onChange={(e) => handleUsdInput('purchase_amount_usd', e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Alış/Maliyet (TL)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₺</span>
                    <Input type="number" value={formData.purchase_amount_tl} readOnly className="pl-7 bg-muted" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Alış/Maliyet (TL)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.purchase_amount_tl}
                      onChange={(e) => handleTlInput('purchase_amount_tl', e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Alış/Maliyet (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input type="number" value={formData.purchase_amount_usd} readOnly className="pl-7 bg-muted" />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Ödeme Yöntemi</Label>
              <Select value={formData.payment_method} onValueChange={(val) => {
                setFormData(prev => ({ 
                  ...prev, 
                  payment_method: val,
                  checks: val === 'cek' ? (prev.checks.length > 0 ? prev.checks : [{ ...emptyCheck }]) : []
                }));
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHODS).map(([key, { label, icon: Icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Çek Girişi - Sadece Çek seçiliyse */}
            {formData.payment_method === 'cek' && (
              <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <Label className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Çekler ({formData.checks.length} adet)
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addCheck}>
                    <Plus className="h-4 w-4 mr-1" />
                    Çek Ekle
                  </Button>
                </div>

                {formData.checks.map((check, index) => (
                  <div key={index} className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Çek #{index + 1}</span>
                      {formData.checks.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeCheck(index)} className="h-6 w-6 text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Çek No</Label>
                        <Input
                          placeholder="Opsiyonel"
                          value={check.check_no}
                          onChange={(e) => updateCheck(index, 'check_no', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Banka</Label>
                        <Input
                          placeholder="Opsiyonel"
                          value={check.bank_name}
                          onChange={(e) => updateCheck(index, 'bank_name', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tutar (TL) *</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₺</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={check.amount_tl}
                            onChange={(e) => updateCheck(index, 'amount_tl', e.target.value)}
                            className="h-9 pl-6"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Vade Tarihi *</Label>
                        <Input
                          type="date"
                          value={check.due_date}
                          onChange={(e) => updateCheck(index, 'due_date', e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {formData.checks.length > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                    <span className="text-sm text-orange-700 dark:text-orange-300">Toplam Çek Tutarı:</span>
                    <span className="font-bold text-orange-800 dark:text-orange-200">{formatCurrency(getTotalChecksAmount())}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment & Due Date - Çek haricinde göster */}
            {formData.payment_method !== 'cek' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ödenen Tutar (TL)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.paid_amount_tl}
                      onChange={(e) => setFormData(prev => ({ ...prev, paid_amount_tl: e.target.value }))}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vade Tarihi</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Remaining Amount Preview */}
            {formData.sale_amount_tl && (
              <div className={`p-3 rounded-lg ${calculatedRemaining > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                <div className="flex justify-between text-sm">
                  <span>Kalan Tutar:</span>
                  <span className={`font-bold ${calculatedRemaining > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                    {formatCurrency(calculatedRemaining)}
                  </span>
                </div>
                {calculatedRemaining <= 0 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Tam ödeme yapıldı
                  </p>
                )}
              </div>
            )}

            {/* Sale Date */}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
              <Button type="submit">{editingSale ? 'Güncelle' : 'Ekle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tahsilat Ekle</DialogTitle>
          </DialogHeader>
          {selectedSaleForPayment && (
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{selectedSaleForPayment.customer_name}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Toplam</p>
                    <p className="font-mono">{formatCurrency(selectedSaleForPayment.sale_amount_tl)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Kalan</p>
                    <p className="font-mono text-red-600">{formatCurrency(selectedSaleForPayment.remaining_amount_tl)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tahsilat Tutarı (TL) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₺</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentFormData.amount_tl}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount_tl: e.target.value }))}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ödeme Yöntemi</Label>
                <Select value={paymentFormData.payment_method} onValueChange={(val) => setPaymentFormData(prev => ({ ...prev, payment_method: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHODS).map(([key, { label, icon: Icon }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tahsilat Tarihi</Label>
                <Input
                  type="date"
                  value={paymentFormData.payment_date}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Not</Label>
                <Input
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Opsiyonel"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>İptal</Button>
                <Button type="submit">Tahsilat Kaydet</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
