import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
import { Checkbox } from '../components/ui/checkbox';
import { 
  Plus, Search, FileText, Send, CheckCircle, XCircle, Clock, ShoppingCart,
  Eye, Pencil, Trash2, Download, Phone, Calendar, User, Package, Percent,
  DollarSign, Truck, ChevronRight, ChevronLeft, GripVertical, X, Filter,
  AlertCircle, TrendingUp, TrendingDown, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatTRY = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);
const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

const CUSTOMER_STATUS_OPTIONS = [
  { value: 'olumlu', label: 'Olumlu', color: 'bg-green-500', icon: TrendingUp },
  { value: 'bilgi_amacli', label: 'Bilgi Amaçlı', color: 'bg-blue-500', icon: FileText },
  { value: 'yuksek_potansiyel', label: 'Yüksek Potansiyel', color: 'bg-amber-500', icon: TrendingUp },
  { value: 'dusuk_potansiyel', label: 'Düşük Potansiyel', color: 'bg-slate-500', icon: TrendingDown },
];

const QUOTE_STATUS_OPTIONS = [
  { value: 'taslak', label: 'Taslak', color: 'bg-slate-500', icon: FileText },
  { value: 'gonderildi', label: 'Gönderildi', color: 'bg-blue-500', icon: Send },
  { value: 'takipte', label: 'Takipte', color: 'bg-amber-500', icon: Clock },
  { value: 'satisa_dondu', label: 'Satışa Döndü', color: 'bg-green-500', icon: ShoppingCart },
  { value: 'olumsuz', label: 'Olumsuz', color: 'bg-red-500', icon: XCircle },
  { value: 'iptal', label: 'İptal', color: 'bg-gray-500', icon: XCircle },
];

const getStatusInfo = (status) => QUOTE_STATUS_OPTIONS.find(s => s.value === status) || QUOTE_STATUS_OPTIONS[0];
const getCustomerStatusInfo = (status) => CUSTOMER_STATUS_OPTIONS.find(s => s.value === status) || CUSTOMER_STATUS_OPTIONS[1];

const WIZARD_STEPS = [
  { id: 1, title: 'Müşteri Bilgileri', icon: User },
  { id: 2, title: 'Ürün/Paket', icon: Package },
  { id: 3, title: 'Fiyat & İskonto', icon: Percent },
  { id: 4, title: 'Notlar & Takip', icon: Bell },
];

// Sürükle-bırak için Sortable Item Bileşeni
const SortableItem = ({ item, index, formatTRY, onQuantityUpdate, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.product_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "bg-accent shadow-lg")}
    >
      <TableCell>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-accent"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{item.product_name}</TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onQuantityUpdate(index, item.quantity - 1)}
          >
            -
          </Button>
          <span className="w-8 text-center">{item.quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onQuantityUpdate(index, item.quantity + 1)}
          >
            +
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-right">{formatTRY(item.unit_price_tl)}</TableCell>
      <TableCell className="text-right font-semibold">{formatTRY(item.total_price_tl)}</TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-500"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const Quotes = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerCategories, setCustomerCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(34.0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerStatusFilter, setCustomerStatusFilter] = useState('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [showUpcomingCallbacks, setShowUpcomingCallbacks] = useState(false);
  
  // Wizard customer filter
  const [wizardCategoryFilter, setWizardCategoryFilter] = useState('all');
  const [wizardCustomerSearch, setWizardCustomerSearch] = useState('');
  
  // Modal states
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingQuote, setEditingQuote] = useState(null);
  const [viewingQuote, setViewingQuote] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_status: 'bilgi_amacli',
    validity_days: 15,
    items: [],
    shipping_cost: 0,
    discount_type: 'percent',
    discount_rate: 0,
    discount_amount: 0,
    vat_rate: 20,
    customer_notes: '',
    internal_notes: '',
    callback_required: false,
    callback_date: '',
    callback_time: '',
    status: 'taslak',
    electricity_subscription_type: '',  // EPDK abonelik tipi (On-Grid/Hibrit için)
    include_segment_options: false  // Off-Grid için 3 farklı segment seçeneği
  });
  
  // Product selection
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  // EPDK subscription modal
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [epdkSubscriptionTypes, setEpdkSubscriptionTypes] = useState([]);
  const [savedEnergyPrices, setSavedEnergyPrices] = useState({ electricity_rates: [] });  // Ayarlardan kaydedilen fiyatlar
  const [pendingCustomerId, setPendingCustomerId] = useState(null);
  
  // Off-Grid segment options modal
  const [isSegmentOptionsModalOpen, setIsSegmentOptionsModalOpen] = useState(false);

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('quotes_manage');
  const isAdmin = user?.permissions?.includes('all');

  useEffect(() => {
    fetchData();
  }, []);

  // URL'den müşteri parametresini kontrol et ve otomatik wizard aç
  useEffect(() => {
    const customerId = searchParams.get('customer');
    if (customerId && customers.length > 0 && !loading) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setFormData(prev => ({
          ...prev,
          customer_id: customerId
        }));
        setIsWizardOpen(true);
        // URL'den parametreyi temizle
        setSearchParams({});
      }
    }
  }, [searchParams, customers, loading]);

  const fetchData = async () => {
    try {
      const [quotesRes, customersRes, productsRes, packagesRes, exchangeRes, categoriesRes, epdkRes, energyPricesRes] = await Promise.all([
        axios.get(`${API_URL}/api/quotes`),
        axios.get(`${API_URL}/api/customers`),
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/packages`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/settings/exchange-rates`).catch(() => ({ data: { usd_to_try: 34.0 } })),
        axios.get(`${API_URL}/api/customer-categories`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/settings/epdk-subscription-types`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/settings/energy-prices`).catch(() => ({ data: { electricity_rates: [] } }))
      ]);
      setQuotes(quotesRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
      setPackages(packagesRes.data);
      setExchangeRate(exchangeRes.data?.usd_to_try || 34.0);
      setCustomerCategories(categoriesRes.data || []);
      setEpdkSubscriptionTypes(epdkRes.data || []);
      setSavedEnergyPrices(energyPricesRes.data || { electricity_rates: [] });
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Filtered customers for wizard (by category and search)
  const filteredCustomersForWizard = useMemo(() => {
    return customers.filter(c => {
      const matchCategory = wizardCategoryFilter === 'all' || c.customer_category_id === wizardCategoryFilter;
      const matchSearch = !wizardCustomerSearch || 
        c.name?.toLowerCase().includes(wizardCustomerSearch.toLowerCase()) ||
        c.phone?.includes(wizardCustomerSearch) ||
        c.city?.toLowerCase().includes(wizardCustomerSearch.toLowerCase());
      return matchCategory && matchSearch && c.is_active;
    });
  }, [customers, wizardCategoryFilter, wizardCustomerSearch]);

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      const matchSearch = q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.quote_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || q.status === statusFilter;
      const matchCustomerStatus = customerStatusFilter === 'all' || q.customer_status === customerStatusFilter;
      const matchMine = !showOnlyMine || q.created_by === user?.id;
      const matchCallback = !showUpcomingCallbacks || (q.callback_required && q.callback_date);
      return matchSearch && matchStatus && matchCustomerStatus && matchMine && matchCallback;
    });
  }, [quotes, searchTerm, statusFilter, customerStatusFilter, showOnlyMine, showUpcomingCallbacks, user]);

  // Reset form
  const resetForm = () => {
    setFormData({
      customer_id: '',
      customer_status: 'bilgi_amacli',
      validity_days: 15,
      items: [],
      shipping_cost: 0,
      discount_type: 'percent',
      discount_rate: 0,
      discount_amount: 0,
      vat_rate: 20,
      customer_notes: '',
      internal_notes: '',
      callback_required: false,
      callback_date: '',
      callback_time: '',
      status: 'taslak',
      electricity_subscription_type: ''
    });
    setWizardStep(1);
    setEditingQuote(null);
    setProductSearch('');
    setSelectedProduct('');
    setSelectedQuantity(1);
    setWizardCategoryFilter('all');
    setWizardCustomerSearch('');
    setPendingCustomerId(null);
  };

  // Handle customer selection - check if needs subscription type
  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Get category name
    const category = customerCategories.find(cat => cat.id === customer.customer_category_id);
    const categoryName = category?.name?.toLowerCase() || '';
    
    // Check if On-Grid or Hibrit - needs electricity subscription type
    const needsSubscription = categoryName.includes('on') || categoryName.includes('hibrit') || categoryName.includes('hybrid');
    
    // Check if Off-Grid - offer 3 segment options
    const isOffGrid = categoryName.includes('off');
    
    if (needsSubscription && !editingQuote) {
      // Store pending customer and open subscription modal
      setPendingCustomerId(customerId);
      setIsSubscriptionModalOpen(true);
    } else if (isOffGrid && !editingQuote) {
      // Off-Grid - ask about 3 segment options
      setPendingCustomerId(customerId);
      setIsSegmentOptionsModalOpen(true);
    } else {
      // Other categories - select directly
      setFormData(prev => ({ ...prev, customer_id: customerId, electricity_subscription_type: '', include_segment_options: false }));
    }
  };

  // Confirm subscription selection
  const handleSubscriptionConfirm = (subscriptionType) => {
    if (pendingCustomerId) {
      setFormData(prev => ({
        ...prev,
        customer_id: pendingCustomerId,
        electricity_subscription_type: subscriptionType
      }));
      setPendingCustomerId(null);
    }
    setIsSubscriptionModalOpen(false);
  };

  // Confirm segment options selection (Off-Grid)
  const handleSegmentOptionsConfirm = (includeOptions) => {
    if (pendingCustomerId) {
      setFormData(prev => ({
        ...prev,
        customer_id: pendingCustomerId,
        include_segment_options: includeOptions,
        electricity_subscription_type: ''
      }));
      setPendingCustomerId(null);
    }
    setIsSegmentOptionsModalOpen(false);
  };

  // Open wizard for new quote
  const openNewQuote = () => {
    resetForm();
    setIsWizardOpen(true);
  };

  // Open wizard for edit
  const openEditQuote = (quote) => {
    setEditingQuote(quote);
    setFormData({
      customer_id: quote.customer_id,
      customer_status: quote.customer_status || 'bilgi_amacli',
      validity_days: quote.validity_days || 15,
      items: quote.items || [],
      shipping_cost: quote.shipping_cost || 0,
      discount_type: quote.discount_type || 'percent',
      discount_rate: quote.discount_rate || 0,
      discount_amount: quote.discount_amount_tl || 0,
      vat_rate: quote.vat_rate || 20,
      customer_notes: quote.customer_notes || '',
      internal_notes: quote.internal_notes || '',
      callback_required: quote.callback_required || false,
      callback_date: quote.callback_date || '',
      callback_time: quote.callback_time || '',
      status: quote.status || 'taslak',
      electricity_subscription_type: quote.electricity_subscription_type || ''
    });
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  // Add product to items
  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast.error('Lütfen ürün seçin');
      return;
    }
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    const existingIndex = formData.items.findIndex(item => item.product_id === selectedProduct);
    
    const productCurrency = product.currency || 'USD';
    let unit_price_tl = product.sale_price || 0;
    let unit_price_usd = productCurrency === 'USD' ? product.sale_price : product.sale_price / exchangeRate;
    
    if (productCurrency === 'USD') {
      unit_price_tl = product.sale_price * exchangeRate;
      unit_price_usd = product.sale_price;
    }
    
    if (existingIndex >= 0) {
      const updatedItems = [...formData.items];
      updatedItems[existingIndex].quantity += selectedQuantity;
      updatedItems[existingIndex].total_price_tl = updatedItems[existingIndex].unit_price_tl * updatedItems[existingIndex].quantity;
      updatedItems[existingIndex].total_price_usd = updatedItems[existingIndex].unit_price_usd * updatedItems[existingIndex].quantity;
      setFormData({ ...formData, items: updatedItems });
    } else {
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: selectedQuantity,
        unit_price_usd: unit_price_usd,
        unit_price_tl: unit_price_tl,
        total_price_usd: unit_price_usd * selectedQuantity,
        total_price_tl: unit_price_tl * selectedQuantity,
        unit: product.unit || 'adet',
        datasheet_url: product.datasheet_url,
        currency: productCurrency,
        sort_order: formData.items.length,
        power_watt: product.power_watt || null,
        category_name: product.category_name || ''
      };
      setFormData({ ...formData, items: [...formData.items, newItem] });
    }
    
    setSelectedProduct('');
    setProductSearch('');
    setSelectedQuantity(1);
    toast.success('Ürün eklendi');
  };

  // Remove item
  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  // Update item quantity
  const handleUpdateQuantity = (index, qty) => {
    if (qty < 1) return;
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = qty;
    updatedItems[index].total_price_tl = updatedItems[index].unit_price_tl * qty;
    updatedItems[index].total_price_usd = updatedItems[index].unit_price_usd * qty;
    setFormData({ ...formData, items: updatedItems });
  };

  // Drag and Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle Drag End
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = formData.items.findIndex(item => item.product_id === active.id);
    const newIndex = formData.items.findIndex(item => item.product_id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(formData.items, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        sort_order: idx
      }));
      setFormData({ ...formData, items: newItems });
      toast.success('Ürün sırası güncellendi');
    }
  };

  // Calculate totals
  const subtotalTL = formData.items.reduce((sum, item) => sum + (item.total_price_tl || 0), 0);
  const subtotalUSD = formData.items.reduce((sum, item) => sum + (item.total_price_usd || 0), 0);
  const shippingCost = parseFloat(formData.shipping_cost) || 0;
  const shippingWithoutVat = shippingCost / (1 + formData.vat_rate / 100);
  const discountTL = formData.discount_type === 'percent' 
    ? subtotalTL * (formData.discount_rate / 100)
    : parseFloat(formData.discount_amount) || 0;
  const vatTL = (subtotalTL - discountTL) * (formData.vat_rate / 100) + (shippingCost - shippingWithoutVat);
  const totalTL = subtotalTL - discountTL + vatTL + shippingWithoutVat;
  const totalUSD = totalTL / exchangeRate;

  // Submit quote
  const handleSubmit = async () => {
    if (!formData.customer_id) {
      toast.error('Lütfen müşteri seçin');
      setWizardStep(1);
      return;
    }
    if (formData.items.length === 0) {
      toast.error('En az bir ürün ekleyin');
      setWizardStep(2);
      return;
    }

    try {
      const submitData = {
        ...formData,
        items: formData.items.map((item, idx) => ({
          ...item,
          sort_order: idx
        }))
      };

      if (editingQuote) {
        await axios.put(`${API_URL}/api/quotes/${editingQuote.id}`, submitData);
        toast.success('Teklif güncellendi');
      } else {
        await axios.post(`${API_URL}/api/quotes`, submitData);
        toast.success('Teklif oluşturuldu');
      }
      
      setIsWizardOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  // Status change
  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/quotes/${quoteId}/status`, { status: newStatus });
      toast.success('Durum güncellendi');
      fetchData();
    } catch (error) {
      toast.error('Durum güncellenemedi');
    }
  };

  // Convert to sale
  const handleConvertToSale = async (quoteId) => {
    if (!window.confirm('Bu teklifi satışa dönüştürmek istiyor musunuz?')) return;
    try {
      await axios.post(`${API_URL}/api/quotes/${quoteId}/convert-to-sale`);
      toast.success('Teklif satışa dönüştürüldü');
      fetchData();
    } catch (error) {
      toast.error('Dönüştürme başarısız');
    }
  };

  // Delete quote
  const handleDelete = async (quoteId) => {
    if (!window.confirm('Bu teklifi silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/quotes/${quoteId}`);
      toast.success('Teklif silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme işlemi başarısız');
    }
  };

  // Download PDF
  const handleDownloadPDF = async (quoteId, quoteNumber) => {
    try {
      toast.loading('PDF oluşturuluyor...', { id: 'pdf-loading' });
      
      const response = await axios.get(`${API_URL}/api/quotes/${quoteId}/pdf`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Teklif_${quoteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF indirildi', { id: 'pdf-loading' });
    } catch (error) {
      toast.error('PDF oluşturulamadı', { id: 'pdf-loading' });
      console.error('PDF download error:', error);
    }
  };

  // Filtered products for search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="quotes-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Teklifler</h1>
          <p className="text-muted-foreground mt-1">
            {filteredQuotes.length} teklif
          </p>
        </div>
        {canManage && (
          <Button onClick={openNewQuote} data-testid="new-quote-btn">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Teklif
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUOTE_STATUS_OPTIONS.slice(0, 4).map(status => {
          const count = quotes.filter(q => q.status === status.value).length;
          const Icon = status.icon;
          return (
            <Card key={status.value} className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter(status.value)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", status.color, "bg-opacity-20")}>
                  <Icon className={cn("h-5 w-5", status.color.replace('bg-', 'text-'))} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{status.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Teklif no veya müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {QUOTE_STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={customerStatusFilter} onValueChange={setCustomerStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Müşteri Durumu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Müşteriler</SelectItem>
                {CUSTOMER_STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={showOnlyMine} onCheckedChange={setShowOnlyMine} />
                <span>Sadece Benim</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={showUpcomingCallbacks} onCheckedChange={setShowUpcomingCallbacks} />
                <span>Aranacaklar</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teklif No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>M. Durumu</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Toplam (TL)</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Sorumlu</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((quote) => {
                  const statusInfo = getStatusInfo(quote.status);
                  const customerStatusInfo = getCustomerStatusInfo(quote.customer_status);
                  const StatusIcon = statusInfo.icon;
                  const CustomerStatusIcon = customerStatusInfo.icon;
                  
                  return (
                    <TableRow key={quote.id} className={cn(
                      quote.callback_required && quote.callback_date && "bg-amber-50 dark:bg-amber-950/20"
                    )}>
                      <TableCell className="font-mono font-medium">{quote.quote_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{quote.customer_name}</p>
                          {quote.callback_required && quote.callback_date && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {quote.callback_date} {quote.callback_time}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1 text-xs", customerStatusInfo.color)}>
                          <CustomerStatusIcon className="h-3 w-3" />
                          {customerStatusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(quote.created_at)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatTRY(quote.total_tl)}</TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", statusInfo.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{quote.created_by_name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setViewingQuote(quote); setIsViewModalOpen(true); }} title="Görüntüle">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDownloadPDF(quote.id, quote.quote_number)} 
                            title="PDF İndir"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canManage && !['satisa_dondu', 'iptal'].includes(quote.status) && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openEditQuote(quote)} title="Düzenle">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {quote.status !== 'olumsuz' && (
                                <Select value={quote.status} onValueChange={(v) => handleStatusChange(quote.id, v)}>
                                  <SelectTrigger className="w-8 h-8 p-0 border-0 focus:ring-0" title="Durum Değiştir">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", statusInfo.color)}>
                                      <StatusIcon className="h-3 w-3 text-white" />
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent align="end" side="left" className="min-w-[140px]">
                                    {QUOTE_STATUS_OPTIONS.map(opt => {
                                      const OptIcon = opt.icon;
                                      return (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          <div className="flex items-center gap-2">
                                            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center", opt.color)}>
                                              <OptIcon className="h-2.5 w-2.5 text-white" />
                                            </div>
                                            <span>{opt.label}</span>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              )}
                            </>
                          )}
                          {canManage && quote.status === 'gonderildi' && (
                            <Button variant="ghost" size="icon" className="text-green-600" onClick={() => handleConvertToSale(quote.id)} title="Satışa Dönüştür">
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          {canManage && !['satisa_dondu'].includes(quote.status) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50" 
                              onClick={() => handleDelete(quote.id)} 
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Teklif bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Wizard Modal */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuote ? 'Teklifi Düzenle' : 'Yeni Teklif Oluştur'}</DialogTitle>
            
            {/* Steps indicator */}
            <div className="flex items-center justify-between mt-4">
              {WIZARD_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = wizardStep === step.id;
                const isCompleted = wizardStep > step.id;
                
                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => setWizardStep(step.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                        isActive && "bg-primary text-primary-foreground",
                        isCompleted && "text-green-600",
                        !isActive && !isCompleted && "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2",
                        isActive && "border-primary-foreground bg-primary-foreground/20",
                        isCompleted && "border-green-500 bg-green-500/20",
                        !isActive && !isCompleted && "border-muted"
                      )}>
                        {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <span className="text-xs font-medium">{step.title}</span>
                    </button>
                    {idx < WIZARD_STEPS.length - 1 && (
                      <div className={cn(
                        "flex-1 h-0.5 mx-2",
                        isCompleted ? "bg-green-500" : "bg-muted"
                      )} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </DialogHeader>
          
          <div className="py-4">
            {/* Step 1: Customer & Sales Info */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                {/* Customer Category Filter & Search */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-accent/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Kategori Filtresi</Label>
                    <Select value={wizardCategoryFilter} onValueChange={setWizardCategoryFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Tüm Kategoriler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Kategoriler</SelectItem>
                        {customerCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Müşteri Ara (isim, telefon, şehir)</Label>
                    <Input
                      placeholder="Ara..."
                      value={wizardCustomerSearch}
                      onChange={(e) => setWizardCustomerSearch(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Müşteri * <span className="text-xs text-muted-foreground">({filteredCustomersForWizard.length} sonuç)</span></Label>
                    <Select value={formData.customer_id} onValueChange={handleCustomerSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Müşteri seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCustomersForWizard.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <span>{c.name}</span>
                              {c.category_name && (
                                <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">{c.category_name}</span>
                              )}
                              {c.city && <span className="text-xs text-muted-foreground">• {c.city}</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Show selected subscription type if any */}
                    {formData.electricity_subscription_type && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-md border border-yellow-200 dark:border-yellow-800">
                        <span className="text-yellow-600">⚡</span>
                        <span className="text-sm">
                          Abonelik: <strong>
                            {(savedEnergyPrices.electricity_rates?.find(t => t.type_code === formData.electricity_subscription_type) 
                              || epdkSubscriptionTypes.find(t => t.type_code === formData.electricity_subscription_type)
                            )?.type_name || formData.electricity_subscription_type}
                          </strong>
                          {' '}
                          <span className="text-muted-foreground">
                            ({(savedEnergyPrices.electricity_rates?.find(t => t.type_code === formData.electricity_subscription_type)?.price_per_kwh 
                              || epdkSubscriptionTypes.find(t => t.type_code === formData.electricity_subscription_type)?.default_price
                            )?.toFixed(2)} TL/kWh)
                          </span>
                        </span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="ml-auto h-6 px-2"
                          onClick={() => setIsSubscriptionModalOpen(true)}
                        >
                          Değiştir
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Müşteri Durumu *</Label>
                    <Select value={formData.customer_status} onValueChange={(v) => setFormData({...formData, customer_status: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOMER_STATUS_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Geçerlilik Süresi (Gün)</Label>
                    <Input
                      type="number"
                      value={formData.validity_days}
                      onChange={(e) => setFormData({...formData, validity_days: parseInt(e.target.value) || 15})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Satış Sorumlusu</Label>
                    <Input value={user?.name || ''} disabled className="bg-muted" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 2: Products */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                {/* Add Product */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-accent/30 rounded-lg">
                  <div className="space-y-2">
                    <Label>Listeden Seç</Label>
                    <Select value={selectedProduct} onValueChange={(v) => { setSelectedProduct(v); setProductSearch(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ürün seçin..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatTRY(product.sale_price * (product.currency === 'USD' ? exchangeRate : 1))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 relative">
                    <Label>Yazarak Ara</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Ürün adı..."
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); if (!e.target.value) setSelectedProduct(''); }}
                        className="pl-9"
                      />
                    </div>
                    {productSearch && !selectedProduct && filteredProducts.length > 0 && (
                      <div className="border rounded-lg max-h-40 overflow-y-auto bg-background shadow-lg absolute z-50 left-0 right-0 top-full mt-1">
                        {filteredProducts.slice(0, 8).map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => { setSelectedProduct(product.id); setProductSearch(product.name); }}
                            className="w-full px-3 py-2 text-left hover:bg-accent flex justify-between items-center border-b last:border-b-0"
                          >
                            <span className="text-sm">{product.name}</span>
                            <span className="text-xs text-muted-foreground">{formatTRY(product.sale_price * (product.currency === 'USD' ? exchangeRate : 1))}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedProduct && (
                  <div className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{products.find(p => p.id === selectedProduct)?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Adet:</Label>
                      <Input type="number" min="1" value={selectedQuantity} onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)} className="w-20" />
                    </div>
                    <Button type="button" onClick={handleAddProduct}><Plus className="h-4 w-4 mr-1" />Ekle</Button>
                  </div>
                )}
                
                {/* Items Table */}
                {formData.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <p className="text-xs text-muted-foreground px-3 py-2 bg-accent/50 border-b flex items-center gap-1">
                      <GripVertical className="h-3 w-3" />
                      Ürünleri sürükleyerek sıralarını değiştirebilirsiniz
                    </p>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Ürün</TableHead>
                            <TableHead className="w-24 text-center">Adet</TableHead>
                            <TableHead className="text-right">Birim Fiyat</TableHead>
                            <TableHead className="text-right">Toplam</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <SortableContext
                            items={formData.items.map(item => item.product_id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {formData.items.map((item, index) => (
                              <SortableItem
                                key={item.product_id}
                                item={item}
                                index={index}
                                formatTRY={formatTRY}
                                onQuantityUpdate={handleUpdateQuantity}
                                onRemove={handleRemoveItem}
                              />
                            ))}
                          </SortableContext>
                        </TableBody>
                      </Table>
                    </DndContext>
                  </div>
                )}
                
                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    Henüz ürün eklenmedi
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Price & Discount */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                {/* Shipping */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Nakliye & Montaj (KDV Dahil)
                    </Label>
                    <Input
                      type="number"
                      value={formData.shipping_cost}
                      onChange={(e) => setFormData({...formData, shipping_cost: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>KDV Oranı (%)</Label>
                    <Input
                      type="number"
                      value={formData.vat_rate}
                      onChange={(e) => setFormData({...formData, vat_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                
                {/* Discount */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>İskonto Türü</Label>
                    <Select value={formData.discount_type} onValueChange={(v) => setFormData({...formData, discount_type: v, discount_rate: 0, discount_amount: 0})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Yüzde (%)</SelectItem>
                        <SelectItem value="amount">Sabit Tutar (TL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.discount_type === 'percent' ? (
                    <div className="space-y-2">
                      <Label>İskonto (%)</Label>
                      <Input
                        type="number"
                        value={formData.discount_rate}
                        onChange={(e) => setFormData({...formData, discount_rate: parseFloat(e.target.value) || 0})}
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>İskonto Tutarı (TL)</Label>
                      <Input
                        type="number"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
                
                {/* Totals */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between"><span>Ara Toplam:</span><span>{formatTRY(subtotalTL)}</span></div>
                  {shippingCost > 0 && <div className="flex justify-between"><span>Nakliye & Montaj:</span><span>{formatTRY(shippingCost)}</span></div>}
                  {discountTL > 0 && <div className="flex justify-between text-red-600"><span>İskonto:</span><span>-{formatTRY(discountTL)}</span></div>}
                  <div className="flex justify-between"><span>KDV (%{formData.vat_rate}):</span><span>{formatTRY(vatTL)}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Genel Toplam:</span>
                    <span className="text-primary">{formatTRY(totalTL)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>USD Karşılığı:</span>
                    <span>{formatUSD(totalUSD)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 4: Notes & Follow-up */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Müşteri Notları (Teklifte Görünür)</Label>
                  <Textarea
                    value={formData.customer_notes}
                    onChange={(e) => setFormData({...formData, customer_notes: e.target.value})}
                    placeholder="Müşteriye iletilecek notlar..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>İç Not (Sadece Personel Görür)</Label>
                  <Textarea
                    value={formData.internal_notes}
                    onChange={(e) => setFormData({...formData, internal_notes: e.target.value})}
                    placeholder="Dahili notlar..."
                    rows={3}
                  />
                </div>
                
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="callback"
                      checked={formData.callback_required}
                      onCheckedChange={(v) => setFormData({...formData, callback_required: v})}
                    />
                    <Label htmlFor="callback" className="cursor-pointer">Tekrar Aranacak</Label>
                  </div>
                  
                  {formData.callback_required && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label>Arama Tarihi</Label>
                        <Input
                          type="date"
                          value={formData.callback_date}
                          onChange={(e) => setFormData({...formData, callback_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Arama Saati</Label>
                        <Input
                          type="time"
                          value={formData.callback_time}
                          onChange={(e) => setFormData({...formData, callback_time: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Teklif Durumu</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUOTE_STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between">
            <div>
              {wizardStep > 1 && (
                <Button type="button" variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Geri
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsWizardOpen(false)}>
                İptal
              </Button>
              {wizardStep < 4 ? (
                <Button type="button" onClick={() => setWizardStep(wizardStep + 1)}>
                  İleri
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit}>
                  {editingQuote ? 'Güncelle' : 'Teklif Oluştur'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Teklif Detayı - {viewingQuote?.quote_number}</DialogTitle>
          </DialogHeader>
          {viewingQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Müşteri</p>
                  <p className="font-medium">{viewingQuote.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tarih</p>
                  <p className="font-medium">{formatDate(viewingQuote.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durum</p>
                  <Badge className={getStatusInfo(viewingQuote.status).color}>
                    {getStatusInfo(viewingQuote.status).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sorumlu</p>
                  <p className="font-medium">{viewingQuote.created_by_name}</p>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead className="text-center">Adet</TableHead>
                      <TableHead className="text-right">Birim</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingQuote.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatTRY(item.unit_price_tl)}</TableCell>
                        <TableCell className="text-right">{formatTRY(item.total_price_tl)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-1">
                <div className="flex justify-between"><span>Ara Toplam:</span><span>{formatTRY(viewingQuote.subtotal_tl)}</span></div>
                {viewingQuote.shipping_cost > 0 && <div className="flex justify-between"><span>Nakliye & Montaj:</span><span>{formatTRY(viewingQuote.shipping_cost)}</span></div>}
                {viewingQuote.discount_amount_tl > 0 && <div className="flex justify-between text-red-600"><span>İskonto:</span><span>-{formatTRY(viewingQuote.discount_amount_tl)}</span></div>}
                <div className="flex justify-between"><span>KDV:</span><span>{formatTRY(viewingQuote.vat_amount_tl)}</span></div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Toplam:</span>
                  <span>{formatTRY(viewingQuote.total_tl)}</span>
                </div>
              </div>
              
              {viewingQuote.customer_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Müşteri Notları</p>
                  <p className="text-sm bg-accent/50 p-2 rounded">{viewingQuote.customer_notes}</p>
                </div>
              )}
              
              {viewingQuote.internal_notes && isAdmin && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">İç Notlar</p>
                  <p className="text-sm bg-amber-100 dark:bg-amber-900/20 p-2 rounded">{viewingQuote.internal_notes}</p>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => handleDownloadPDF(viewingQuote.id, viewingQuote.quote_number)}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF Olarak İndir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EPDK Subscription Type Selection Modal */}
      <Dialog open={isSubscriptionModalOpen} onOpenChange={(open) => {
        if (!open && pendingCustomerId) {
          // User cancelled - reset pending customer
          setPendingCustomerId(null);
        }
        setIsSubscriptionModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-yellow-500">⚡</span>
              Elektrik Abonelik Türü Seçin
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              On-Grid ve Hibrit sistemlerde tasarruf hesaplamaları için elektrik abonelik türü seçmeniz gerekmektedir.
              Bu bilgi PDF teklifindeki tahmini tasarruf hesaplamalarında kullanılacaktır.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {/* Ayarlardan kaydedilen fiyatları kullan, yoksa varsayılanları kullan */}
              {(savedEnergyPrices.electricity_rates?.length > 0 
                ? savedEnergyPrices.electricity_rates 
                : epdkSubscriptionTypes
              ).map((type) => (
                <button
                  key={type.type_code}
                  type="button"
                  onClick={() => handleSubscriptionConfirm(type.type_code)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-2 text-left transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    formData.electricity_subscription_type === type.type_code 
                      ? "border-primary bg-primary/10" 
                      : "border-border"
                  )}
                  data-testid={`subscription-${type.type_code}`}
                >
                  <div>
                    <p className="font-medium">{type.type_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">
                      {(type.price_per_kwh ?? type.default_price)?.toFixed(2)} ₺
                    </span>
                    <p className="text-xs text-muted-foreground">/kWh</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              * Fiyatlar Ayarlar &gt; Enerji Fiyatları bölümünden güncellenebilir.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setPendingCustomerId(null);
                setIsSubscriptionModalOpen(false);
              }}
            >
              İptal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Quotes;
