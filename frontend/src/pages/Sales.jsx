import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
  ChevronDown, ChevronUp, X, UserPlus, Package, ShoppingCart, Percent, Wallet, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PAYMENT_STATUS = {
  odendi: { label: 'Ödendi', color: 'bg-green-100 text-green-800' },
  bekliyor: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
  kismi: { label: 'Kısmi Ödeme', color: 'bg-blue-100 text-blue-800' },
  gecikti: { label: 'Gecikmiş', color: 'bg-red-100 text-red-800' }
};

const Sales = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedSaleId, setHighlightedSaleId] = useState(null);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [cardProviders, setCardProviders] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [stats, setStats] = useState(null);
  const [upcomingChecks, setUpcomingChecks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCardProviderModalOpen, setIsCardProviderModalOpen] = useState(false);
  const [isBankAccountModalOpen, setIsBankAccountModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statsPeriod, setStatsPeriod] = useState('monthly');
  const [systemExchangeRate, setSystemExchangeRate] = useState(34.0);
  const [showChecks, setShowChecks] = useState(true);
  
  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    city: '',
    district: '',
    notes: ''
  });
  
  // New card provider form
  const [newCardProvider, setNewCardProvider] = useState({ name: '', description: '' });
  
  // New bank account form
  const [newBankAccount, setNewBankAccount] = useState({
    bank_name: '',
    bank_branch: '',
    account_holder: '',
    iban: '',
    currency: 'TRY'
  });
  
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
    // Items (ürün/paket)
    items: [],
    calculated_total: 0,
    discount_type: 'percent', // percent veya amount
    discount_percent: '',
    discount_amount: '',
    net_total: 0,
    manual_override: false,
    // Çoklu ödeme
    nakit_tl: '',
    kart_tl: '',
    kart_provider_id: '',
    kart_provider_name: '',
    havale_tl: '',
    havale_bank_account_id: '',
    havale_bank_name: '',
    havale_currency: 'TRY',
    havale_usd_amount: '',
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
    fetchProducts();
    fetchPackages();
    fetchCardProviders();
    fetchBankAccounts();
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

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Ürünler yüklenemedi');
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/packages`);
      setPackages(response.data);
    } catch (error) {
      console.error('Paketler yüklenemedi');
    }
  };

  const fetchCardProviders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/card-providers`);
      setCardProviders(response.data || []);
    } catch (error) {
      console.error('Kart tedarikçileri yüklenemedi');
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/sale-bank-accounts`);
      setBankAccounts(response.data || []);
    } catch (error) {
      console.error('Banka hesapları yüklenemedi');
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

  // Quick customer create
  const handleQuickCustomerCreate = async () => {
    if (!newCustomer.name.trim()) {
      toast.error('Müşteri adı zorunludur');
      return;
    }
    
    try {
      const response = await axios.post(`${API_URL}/api/customers/quick-create`, newCustomer);
      const createdCustomer = response.data;
      
      // Update customers list
      setCustomers(prev => [...prev, createdCustomer]);
      
      // Select the new customer in form
      setFormData(prev => ({
        ...prev,
        customer_id: createdCustomer.id,
        customer_name: createdCustomer.name
      }));
      
      setIsCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', city: '', district: '', notes: '' });
      toast.success('Müşteri oluşturuldu ve seçildi');
    } catch (error) {
      toast.error('Müşteri oluşturulamadı');
    }
  };

  // Add card provider
  const handleAddCardProvider = async () => {
    if (!newCardProvider.name.trim()) {
      toast.error('Tedarikçi adı zorunludur');
      return;
    }
    
    try {
      const response = await axios.post(`${API_URL}/api/settings/card-providers`, newCardProvider);
      setCardProviders(prev => [...prev, response.data]);
      setFormData(prev => ({
        ...prev,
        kart_provider_id: response.data.id,
        kart_provider_name: response.data.name
      }));
      setIsCardProviderModalOpen(false);
      setNewCardProvider({ name: '', description: '' });
      toast.success('Kart tedarikçisi eklendi');
    } catch (error) {
      toast.error('Tedarikçi eklenemedi');
    }
  };

  // Add bank account
  const handleAddBankAccount = async () => {
    if (!newBankAccount.bank_name.trim()) {
      toast.error('Banka adı zorunludur');
      return;
    }
    
    try {
      const response = await axios.post(`${API_URL}/api/settings/sale-bank-accounts`, newBankAccount);
      setBankAccounts(prev => [...prev, response.data]);
      setFormData(prev => ({
        ...prev,
        havale_bank_account_id: response.data.id,
        havale_bank_name: response.data.bank_name
      }));
      setIsBankAccountModalOpen(false);
      setNewBankAccount({ bank_name: '', bank_branch: '', account_holder: '', iban: '', currency: 'TRY' });
      toast.success('Banka hesabı eklendi');
    } catch (error) {
      toast.error('Banka hesabı eklenemedi');
    }
  };

  // Item management (ürün/paket)
  const addItem = (type) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { item_type: type, item_id: '', item_name: '', quantity: 1, unit_price: 0, line_total: 0 }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // If selecting product/package, auto-fill price
      if (field === 'item_id' && value) {
        const item = newItems[index];
        if (item.item_type === 'product') {
          const product = products.find(p => p.id === value);
          if (product) {
            newItems[index].item_name = product.name;
            newItems[index].unit_price = product.sale_price || 0;
          }
        } else if (item.item_type === 'package') {
          const pkg = packages.find(p => p.id === value);
          if (pkg) {
            newItems[index].item_name = pkg.name;
            newItems[index].unit_price = pkg.total_price || 0;
          }
        }
      }
      
      // Recalculate line total
      newItems[index].line_total = (parseFloat(newItems[index].quantity) || 0) * (parseFloat(newItems[index].unit_price) || 0);
      
      return { ...prev, items: newItems };
    });
  };

  // Calculate totals when items change
  useEffect(() => {
    const calculated = formData.items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    let discount = 0;
    
    if (formData.discount_type === 'percent' && formData.discount_percent) {
      discount = calculated * (parseFloat(formData.discount_percent) / 100);
    } else if (formData.discount_type === 'amount' && formData.discount_amount) {
      discount = parseFloat(formData.discount_amount) || 0;
    }
    
    const net = calculated - discount;
    
    setFormData(prev => ({
      ...prev,
      calculated_total: calculated,
      net_total: net,
      // If not manual override, update sale amount
      ...(!prev.manual_override && calculated > 0 ? {
        sale_amount_tl: net.toFixed(2),
        sale_amount_usd: prev.exchange_rate ? (net / parseFloat(prev.exchange_rate)).toFixed(2) : ''
      } : {})
    }));
  }, [formData.items, formData.discount_percent, formData.discount_amount, formData.discount_type]);

  // Currency conversion handlers
  const handleUsdInput = (field, value) => {
    const numValue = parseFloat(value) || 0;
    const rate = parseFloat(formData.exchange_rate) || 1;
    
    if (field === 'sale_amount_usd') {
      setFormData(prev => ({
        ...prev,
        sale_amount_usd: value,
        sale_amount_tl: numValue > 0 ? (numValue * rate).toFixed(2) : '',
        manual_override: prev.items.length > 0
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
        sale_amount_usd: numValue > 0 ? (numValue / rate).toFixed(2) : '',
        manual_override: prev.items.length > 0
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
      // Items
      items: formData.items.filter(i => i.item_id),
      calculated_total: formData.calculated_total,
      discount_percent: parseFloat(formData.discount_percent) || 0,
      discount_amount: parseFloat(formData.discount_amount) || 0,
      net_total: formData.net_total,
      manual_override: formData.manual_override,
      // Payments
      nakit_tl: parseFloat(formData.nakit_tl) || 0,
      kart_tl: parseFloat(formData.kart_tl) || 0,
      kart_provider_id: formData.kart_provider_id || null,
      kart_provider_name: formData.kart_provider_name || null,
      havale_tl: parseFloat(formData.havale_tl) || 0,
      havale_bank_account_id: formData.havale_bank_account_id || null,
      havale_bank_name: formData.havale_bank_name || null,
      havale_currency: formData.havale_currency,
      havale_usd_amount: parseFloat(formData.havale_usd_amount) || 0,
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
      // Items
      items: sale.items || [],
      calculated_total: sale.calculated_total || 0,
      discount_type: sale.discount_percent > 0 ? 'percent' : 'amount',
      discount_percent: sale.discount_percent?.toString() || '',
      discount_amount: sale.discount_amount?.toString() || '',
      net_total: sale.net_total || 0,
      manual_override: sale.manual_override || false,
      // Payments
      nakit_tl: sale.nakit_tl?.toString() || '',
      kart_tl: sale.kart_tl?.toString() || '',
      kart_provider_id: sale.kart_provider_id || '',
      kart_provider_name: sale.kart_provider_name || '',
      havale_tl: sale.havale_tl?.toString() || '',
      havale_bank_account_id: sale.havale_bank_account_id || '',
      havale_bank_name: sale.havale_bank_name || '',
      havale_currency: sale.havale_currency || 'TRY',
      havale_usd_amount: sale.havale_usd_amount?.toString() || '',
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
      items: [],
      calculated_total: 0,
      discount_type: 'percent',
      discount_percent: '',
      discount_amount: '',
      net_total: 0,
      manual_override: false,
      nakit_tl: '',
      kart_tl: '',
      kart_provider_id: '',
      kart_provider_name: '',
      havale_tl: '',
      havale_bank_account_id: '',
      havale_bank_name: '',
      havale_currency: 'TRY',
      havale_usd_amount: '',
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
                <TableHead>Ürün/Paket</TableHead>
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
                  <TableCell className="text-xs max-w-[150px]">
                    {sale.items && sale.items.length > 0 ? (
                      <div className="space-y-0.5">
                        {sale.items.slice(0, 2).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs mr-1">
                            {item.item_type === 'package' ? '📦' : '🔧'} {item.item_name?.substring(0, 15)}...
                          </Badge>
                        ))}
                        {sale.items.length > 2 && <span className="text-muted-foreground">+{sale.items.length - 2}</span>}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(sale.sale_amount_tl)}</TableCell>
                  <TableCell className="text-xs max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {sale.nakit_tl > 0 && <Badge variant="outline" className="text-green-600">💵 {formatCurrency(sale.nakit_tl)}</Badge>}
                      {sale.kart_tl > 0 && (
                        <Badge variant="outline" className="text-blue-600">
                          💳 {formatCurrency(sale.kart_tl)}
                          {sale.kart_provider_name && <span className="ml-1 text-xs opacity-70">({sale.kart_provider_name})</span>}
                        </Badge>
                      )}
                      {sale.havale_tl > 0 && (
                        <Badge variant="outline" className="text-purple-600">
                          🏦 {formatCurrency(sale.havale_tl)}
                          {sale.havale_bank_name && <span className="ml-1 text-xs opacity-70">({sale.havale_bank_name})</span>}
                        </Badge>
                      )}
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
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSale ? 'Satış Düzenle' : 'Yeni Satış Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Section */}
            <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Müşteri Bilgileri
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setNewCustomer({ ...newCustomer, name: formData.customer_name });
                      setIsCustomerModalOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    + Müşteri Ekle
                  </Button>
                </div>
              </div>
            </div>

            {/* Items Section (Ürün/Paket) */}
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Ürün / Paket Seçimi
                </h3>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => addItem('product')}>
                    <Plus className="h-4 w-4 mr-1" /> Ürün
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addItem('package')}>
                    <Package className="h-4 w-4 mr-1" /> Paket
                  </Button>
                </div>
              </div>

              {formData.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ürün veya paket eklemeden manuel tutar girebilirsiniz
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end bg-white dark:bg-slate-800 p-2 rounded">
                      <div className="col-span-5">
                        <Label className="text-xs">{item.item_type === 'package' ? 'Paket' : 'Ürün'}</Label>
                        <Select
                          value={item.item_id}
                          onValueChange={(val) => updateItem(index, 'item_id', val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.item_type === 'product' 
                              ? products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                              : packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Adet</Label>
                        <Input
                          type="number"
                          min="1"
                          className="h-9"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Birim Fiyat</Label>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-9"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Toplam</Label>
                        <Input
                          type="text"
                          className="h-9 bg-gray-100"
                          value={formatCurrency(item.line_total)}
                          readOnly
                        />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" size="icon" variant="ghost" className="h-9 text-red-500" onClick={() => removeItem(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="bg-white dark:bg-slate-800 p-3 rounded mt-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Ara Toplam</Label>
                        <p className="font-bold">{formatCurrency(formData.calculated_total)}</p>
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <Percent className="h-3 w-3" /> İskonto
                        </Label>
                        <div className="flex gap-1">
                          <Select
                            value={formData.discount_type}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, discount_type: val, discount_percent: '', discount_amount: '' }))}
                          >
                            <SelectTrigger className="w-16 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="amount">₺</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            className="h-8"
                            value={formData.discount_type === 'percent' ? formData.discount_percent : formData.discount_amount}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              [formData.discount_type === 'percent' ? 'discount_percent' : 'discount_amount']: e.target.value
                            }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Net Toplam</Label>
                        <p className="font-bold text-green-600">{formatCurrency(formData.net_total)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Currency & Amount Section */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant={formData.input_currency === 'TRY' ? 'default' : 'outline'} 
                    onClick={() => setFormData(prev => ({ ...prev, input_currency: 'TRY' }))}>₺ TL</Button>
                  <Button type="button" size="sm" variant={formData.input_currency === 'USD' ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, input_currency: 'USD' }))}>$ USD</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kur (1 USD = ? TL)</Label>
                <div className="flex gap-1">
                  <Input type="number" step="0.01" className="h-9" value={formData.exchange_rate} onChange={(e) => handleRateChange(e.target.value)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => handleRateChange(systemExchangeRate.toString())}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Satış Tutarı {formData.input_currency === 'TRY' ? '(TL)' : '(USD)'} *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {formData.input_currency === 'TRY' ? '₺' : '$'}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-7 h-9"
                    value={formData.input_currency === 'TRY' ? formData.sale_amount_tl : formData.sale_amount_usd}
                    onChange={(e) => formData.input_currency === 'TRY' 
                      ? handleTlInput('sale_amount_tl', e.target.value)
                      : handleUsdInput('sale_amount_usd', e.target.value)
                    }
                  />
                </div>
                {formData.manual_override && formData.items.length > 0 && (
                  <p className="text-xs text-orange-600">Manuel düzeltme yapıldı</p>
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
                    className="pl-7 h-9"
                    value={formData.input_currency === 'TRY' ? formData.purchase_amount_tl : formData.purchase_amount_usd}
                    onChange={(e) => formData.input_currency === 'TRY'
                      ? handleTlInput('purchase_amount_tl', e.target.value)
                      : handleUsdInput('purchase_amount_usd', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Ödeme Bilgileri</h3>
                {formData.sale_amount_tl && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Toplam: <span className="font-bold">{formatCurrency(parseFloat(formData.sale_amount_tl) || 0)}</span></p>
                  </div>
                )}
              </div>

              {/* Nakit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

                {/* Kart */}
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

                {/* Kart Provider */}
                {parseFloat(formData.kart_tl) > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Kart Çekilen Sistem</Label>
                    <div className="flex gap-1">
                      <Select
                        value={formData.kart_provider_id}
                        onValueChange={(val) => {
                          const provider = cardProviders.find(p => p.id === val);
                          setFormData(prev => ({
                            ...prev,
                            kart_provider_id: val,
                            kart_provider_name: provider?.name || ''
                          }));
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {cardProviders.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="icon" variant="outline" className="h-9" onClick={() => setIsCardProviderModalOpen(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Havale */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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

                {parseFloat(formData.havale_tl) > 0 && (
                  <>
                    {/* Bank Account */}
                    <div className="space-y-2">
                      <Label className="text-sm">Banka Hesabı</Label>
                      <div className="flex gap-1">
                        <Select
                          value={formData.havale_bank_account_id}
                          onValueChange={(val) => {
                            const account = bankAccounts.find(a => a.id === val);
                            setFormData(prev => ({
                              ...prev,
                              havale_bank_account_id: val,
                              havale_bank_name: account?.bank_name || ''
                            }));
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.bank_name} {a.iban && `(${a.iban.slice(-4)})`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" size="icon" variant="outline" className="h-9" onClick={() => setIsBankAccountModalOpen(true)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Havale Currency */}
                    <div className="space-y-2">
                      <Label className="text-sm">Havale Cinsi</Label>
                      <Select
                        value={formData.havale_currency}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, havale_currency: val }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRY">₺ TL</SelectItem>
                          <SelectItem value="USD">$ USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.havale_currency === 'USD' && (
                      <div className="space-y-2">
                        <Label className="text-sm">USD Tutarı</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            className="pl-6 h-9"
                            value={formData.havale_usd_amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, havale_usd_amount: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
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

      {/* Quick Customer Create Modal */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hızlı Müşteri Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad Soyad / Ünvan *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Zorunlu"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>İl</Label>
                <Input
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Opsiyonel"
                />
              </div>
              <div className="space-y-2">
                <Label>İlçe</Label>
                <Input
                  value={newCustomer.district}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="Opsiyonel"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Textarea
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Opsiyonel"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCustomerModalOpen(false)}>İptal</Button>
            <Button onClick={handleQuickCustomerCreate}>Kaydet ve Seç</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Provider Modal */}
      <Dialog open={isCardProviderModalOpen} onOpenChange={setIsCardProviderModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kart Tedarikçisi Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tedarikçi Adı *</Label>
              <Input
                value={newCardProvider.name}
                onChange={(e) => setNewCardProvider(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: PayTR, Endesan"
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={newCardProvider.description}
                onChange={(e) => setNewCardProvider(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCardProviderModalOpen(false)}>İptal</Button>
            <Button onClick={handleAddCardProvider}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Account Modal */}
      <Dialog open={isBankAccountModalOpen} onOpenChange={setIsBankAccountModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Banka Hesabı Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Banka Adı *</Label>
              <Input
                value={newBankAccount.bank_name}
                onChange={(e) => setNewBankAccount(prev => ({ ...prev, bank_name: e.target.value }))}
                placeholder="Örn: Garanti, Ziraat"
              />
            </div>
            <div className="space-y-2">
              <Label>Şube</Label>
              <Input
                value={newBankAccount.bank_branch}
                onChange={(e) => setNewBankAccount(prev => ({ ...prev, bank_branch: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input
                value={newBankAccount.iban}
                onChange={(e) => setNewBankAccount(prev => ({ ...prev, iban: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>
            <div className="space-y-2">
              <Label>Hesap Sahibi / Ünvan</Label>
              <Input
                value={newBankAccount.account_holder}
                onChange={(e) => setNewBankAccount(prev => ({ ...prev, account_holder: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>
            <div className="space-y-2">
              <Label>Para Birimi</Label>
              <Select
                value={newBankAccount.currency}
                onValueChange={(val) => setNewBankAccount(prev => ({ ...prev, currency: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">₺ TL</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsBankAccountModalOpen(false)}>İptal</Button>
            <Button onClick={handleAddBankAccount}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
