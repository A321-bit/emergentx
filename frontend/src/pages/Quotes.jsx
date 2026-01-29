import React, { useState, useEffect } from 'react';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, Eye, Search, FileText, Download, Send,
  CheckCircle, XCircle, Clock, DollarSign,
  Trash2, Pencil, ShoppingCart, Save, Percent,
  Calendar, CreditCard, Shield, Package
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatTRY = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(value || 0);
};

const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR');
  } catch {
    return dateStr;
  }
};

const STATUS_OPTIONS = [
  { value: 'taslak', label: 'Taslak', color: 'bg-slate-500', icon: FileText },
  { value: 'teklif_gonderildi', label: 'Gönderildi', color: 'bg-blue-500', icon: Send },
  { value: 'onaylandi', label: 'Onaylandı', color: 'bg-green-500', icon: CheckCircle },
  { value: 'reddedildi', label: 'Reddedildi', color: 'bg-red-500', icon: XCircle },
  { value: 'satisa_dondu', label: 'Satışa Döndü', color: 'bg-purple-500', icon: ShoppingCart },
];

const getStatusInfo = (status) => {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
};

const Quotes = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [companySettings, setCompanySettings] = useState({});
  const [exchangeRate, setExchangeRate] = useState(34.0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [viewingQuote, setViewingQuote] = useState(null);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    items: [],
    discount_type: 'percent',
    discount_rate: 0,
    discount_amount: 0,
    vat_rate: 20,
    currency: 'TRY',
    validity_days: 15,
    notes: '',
    delivery_time: '',
    payment_terms: '',
    warranty_info: ''
  });
  
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('quotes_manage');
  const canApprove = user?.permissions?.includes('all') || user?.permissions?.includes('quotes_approve');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [quotesRes, customersRes, productsRes, packagesRes, settingsRes, exchangeRes] = await Promise.all([
        axios.get(`${API_URL}/api/quotes`),
        axios.get(`${API_URL}/api/customers`),
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/packages`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/settings/company`).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/api/settings/exchange-rates`).catch(() => ({ data: { usd_to_try: 34.0 } }))
      ]);
      setQuotes(quotesRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
      setPackages(packagesRes.data);
      setCompanySettings(settingsRes.data || {});
      setExchangeRate(exchangeRes.data?.usd_to_try || 34.0);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingQuote(null);
    setFormData({
      customer_id: '',
      items: [],
      discount_type: 'percent',
      discount_rate: 0,
      discount_amount: 0,
      vat_rate: 20,
      currency: 'TRY',
      validity_days: 15,
      notes: '',
      delivery_time: '',
      payment_terms: '',
      warranty_info: ''
    });
    setProductSearch('');
    setSelectedProduct('');
    setSelectedQuantity(1);
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error('Lütfen bir ürün seçin');
      return;
    }
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    // Stock check
    if (product.stock_quantity < selectedQuantity) {
      toast.error(`Yetersiz stok! Mevcut: ${product.stock_quantity}`);
      return;
    }
    
    const existingIndex = formData.items.findIndex(item => item.product_id === selectedProduct);
    
    // Ürün fiyatını USD ve TL olarak hesapla
    const productCurrency = product.currency || 'USD';
    let unit_price_usd = 0;
    let unit_price_tl = 0;
    
    if (productCurrency === 'USD') {
      unit_price_usd = product.sale_price || 0;
      unit_price_tl = unit_price_usd * exchangeRate;
    } else if (productCurrency === 'EUR') {
      const eurRate = exchangeRate * 1.09; // Yaklaşık EUR/USD oranı
      unit_price_usd = (product.sale_price || 0) / 1.09;
      unit_price_tl = (product.sale_price || 0) * eurRate / exchangeRate;
    } else { // TRY
      unit_price_tl = product.sale_price || 0;
      unit_price_usd = unit_price_tl / exchangeRate;
    }
    
    if (existingIndex >= 0) {
      const updatedItems = [...formData.items];
      updatedItems[existingIndex].quantity += selectedQuantity;
      updatedItems[existingIndex].total_price_usd = updatedItems[existingIndex].unit_price_usd * updatedItems[existingIndex].quantity;
      updatedItems[existingIndex].total_price_tl = updatedItems[existingIndex].unit_price_tl * updatedItems[existingIndex].quantity;
      updatedItems[existingIndex].total_price = updatedItems[existingIndex].total_price_tl;
      setFormData({ ...formData, items: updatedItems });
    } else {
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: selectedQuantity,
        unit_price_usd: unit_price_usd,
        unit_price_tl: unit_price_tl,
        unit_price: unit_price_tl, // Legacy - TL
        total_price_usd: unit_price_usd * selectedQuantity,
        total_price_tl: unit_price_tl * selectedQuantity,
        total_price: unit_price_tl * selectedQuantity, // Legacy - TL
        unit: product.unit || 'adet',
        stock: product.stock_quantity,
        currency: productCurrency
      };
      setFormData({ ...formData, items: [...formData.items, newItem] });
    }
    
    setSelectedProduct('');
    setSelectedQuantity(1);
    setProductSearch('');
  };

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const handleUpdateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total_price = updatedItems[index].unit_price * newQuantity;
    setFormData({ ...formData, items: updatedItems });
  };

  const handleUpdateItemPrice = (index, newPrice) => {
    const updatedItems = [...formData.items];
    updatedItems[index].unit_price = parseFloat(newPrice) || 0;
    updatedItems[index].total_price = updatedItems[index].unit_price * updatedItems[index].quantity;
    setFormData({ ...formData, items: updatedItems });
  };

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmount = formData.discount_type === 'percent' 
    ? subtotal * (formData.discount_rate / 100)
    : formData.discount_amount;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const vatAmount = subtotalAfterDiscount * (formData.vat_rate / 100);
  const grandTotal = subtotalAfterDiscount + vatAmount;

  const handleSubmit = async (status = 'taslak') => {
    if (!formData.customer_id) {
      toast.error('Lütfen müşteri seçin');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin');
      return;
    }

    const submitData = {
      ...formData,
      status
    };

    try {
      if (editingQuote) {
        await axios.put(`${API_URL}/api/quotes/${editingQuote.id}`, submitData);
        toast.success('Teklif güncellendi');
      } else {
        await axios.post(`${API_URL}/api/quotes`, submitData);
        toast.success(status === 'taslak' ? 'Taslak kaydedildi' : 'Teklif oluşturuldu');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleEdit = (quote) => {
    setEditingQuote(quote);
    setFormData({
      customer_id: quote.customer_id,
      items: quote.items || [],
      discount_type: quote.discount_type || 'percent',
      discount_rate: quote.discount_rate || 0,
      discount_amount: quote.discount_amount || 0,
      vat_rate: quote.vat_rate || 20,
      currency: quote.currency || 'TRY',
      validity_days: quote.validity_days || 15,
      notes: quote.notes || '',
      delivery_time: quote.delivery_time || '',
      payment_terms: quote.payment_terms || '',
      warranty_info: quote.warranty_info || ''
    });
    setIsModalOpen(true);
  };

  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/quotes/${quoteId}/status`, { status: newStatus });
      toast.success('Durum güncellendi');
      fetchData();
    } catch (error) {
      toast.error('Durum güncellenemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu teklifi silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/quotes/${id}`);
      toast.success('Teklif silindi');
      fetchData();
    } catch (error) {
      toast.error('Teklif silinemedi');
    }
  };

  const generatePDF = (quote) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(companySettings?.company_name || 'SolarPro', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Teklif No: ${quote.quote_number}`, 14, 30);
    doc.text(`Tarih: ${formatDate(quote.created_at)}`, 14, 36);
    doc.text(`Geçerlilik: ${formatDate(quote.valid_until)}`, 14, 42);
    
    // Customer
    doc.setFontSize(12);
    doc.text('Müşteri:', 14, 55);
    doc.setFontSize(10);
    doc.text(quote.customer_name, 14, 62);
    
    // Items table
    const tableData = quote.items.map(item => [
      item.product_name,
      item.quantity,
      item.unit || 'adet',
      formatTRY(item.unit_price),
      formatTRY(item.total_price)
    ]);
    
    autoTable(doc, {
      startY: 70,
      head: [['Ürün', 'Miktar', 'Birim', 'Birim Fiyat', 'Toplam']],
      body: tableData,
      theme: 'striped'
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Totals
    doc.text(`Ara Toplam: ${formatTRY(quote.subtotal)}`, 140, finalY);
    if (quote.discount_amount > 0) {
      doc.text(`İndirim: -${formatTRY(quote.discount_amount)}`, 140, finalY + 6);
    }
    if (quote.vat_amount > 0) {
      doc.text(`KDV (%${quote.vat_rate}): ${formatTRY(quote.vat_amount)}`, 140, finalY + 12);
    }
    doc.setFontSize(12);
    doc.text(`Genel Toplam: ${formatTRY(quote.total)}`, 140, finalY + 22);
    
    // Notes
    if (quote.notes || quote.delivery_time || quote.payment_terms || quote.warranty_info) {
      doc.setFontSize(10);
      let noteY = finalY + 35;
      if (quote.delivery_time) {
        doc.text(`Teslim Süresi: ${quote.delivery_time}`, 14, noteY);
        noteY += 6;
      }
      if (quote.payment_terms) {
        doc.text(`Ödeme Şartları: ${quote.payment_terms}`, 14, noteY);
        noteY += 6;
      }
      if (quote.warranty_info) {
        doc.text(`Garanti: ${quote.warranty_info}`, 14, noteY);
        noteY += 6;
      }
      if (quote.notes) {
        doc.text(`Not: ${quote.notes}`, 14, noteY);
      }
    }
    
    doc.save(`Teklif_${quote.quote_number}.pdf`);
    toast.success('PDF oluşturuldu');
  };

  // Filter quotes
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    const matchesDate = !dateFilter || quote.created_at?.startsWith(dateFilter);
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Filtered products for search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Stats
  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'taslak').length,
    sent: quotes.filter(q => q.status === 'teklif_gonderildi').length,
    approved: quotes.filter(q => q.status === 'onaylandi').length,
    rejected: quotes.filter(q => q.status === 'reddedildi').length,
    converted: quotes.filter(q => q.status === 'satisa_dondu').length,
  };

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
          <p className="text-muted-foreground mt-1">{quotes.length} teklif kayıtlı</p>
        </div>
        {canManage && (
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="new-quote-btn">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Teklif
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {STATUS_OPTIONS.map(status => {
          const count = status.value === 'taslak' ? stats.draft :
            status.value === 'teklif_gonderildi' ? stats.sent :
            status.value === 'onaylandi' ? stats.approved :
            status.value === 'reddedildi' ? stats.rejected :
            stats.converted;
          const Icon = status.icon;
          return (
            <Card 
              key={status.value} 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                statusFilter === status.value && "ring-2 ring-primary"
              )}
              onClick={() => setStatusFilter(statusFilter === status.value ? 'all' : status.value)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-2 rounded-full", status.color)}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{status.label}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="cursor-pointer" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-slate-200">
                <FileText className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Müşteri veya teklif no ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Input
          type="month"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-40"
          placeholder="Tarih"
        />
      </div>

      {/* Quotes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teklif No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Oluşturan</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((quote) => {
                  const statusInfo = getStatusInfo(quote.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <TableRow key={quote.id}>
                      <TableCell className="font-mono font-medium">{quote.quote_number}</TableCell>
                      <TableCell>{quote.customer_name}</TableCell>
                      <TableCell>{formatDate(quote.created_at)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatTRY(quote.total)}</TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", statusInfo.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{quote.created_by_name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setViewingQuote(quote); setIsViewModalOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => generatePDF(quote)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canManage && quote.status === 'taslak' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(quote)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canApprove && quote.status === 'teklif_gonderildi' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600"
                                onClick={() => handleStatusChange(quote.id, 'onaylandi')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleStatusChange(quote.id, 'reddedildi')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canApprove && quote.status === 'onaylandi' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-purple-600"
                              onClick={() => handleStatusChange(quote.id, 'satisa_dondu')}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Teklif bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New/Edit Quote Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto" data-testid="quote-modal">
          <DialogHeader>
            <DialogTitle>{editingQuote ? 'Teklifi Düzenle' : 'Yeni Teklif Oluştur'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Customer Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Müşteri *</Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Geçerlilik (Gün)</Label>
                <Input
                  type="number"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({...formData, validity_days: parseInt(e.target.value) || 15})}
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-3">
              <Label>Ürün Ekle</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ürün ara..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                  {productSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredProducts.slice(0, 10).map(product => (
                        <div
                          key={product.id}
                          className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
                          onClick={() => {
                            setSelectedProduct(product.id);
                            setProductSearch(product.name);
                          }}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatTRY(product.sale_price)} • Stok: {product.stock_quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  type="number"
                  min="1"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                  className="w-20"
                  placeholder="Adet"
                />
                <Button type="button" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Items Table */}
            {formData.items.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead className="w-24 text-center">Miktar</TableHead>
                      <TableHead className="w-32">Birim Fiyat</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">Stok: {item.stock}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateItemQuantity(index, item.quantity - 1)}
                            >-</Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUpdateItemQuantity(index, item.quantity + 1)}
                            >+</Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItemPrice(index, e.target.value)}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatTRY(item.total_price)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>İndirim Tipi</Label>
                    <Select 
                      value={formData.discount_type} 
                      onValueChange={(v) => setFormData({...formData, discount_type: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Yüzde (%)</SelectItem>
                        <SelectItem value="amount">Tutar (TL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{formData.discount_type === 'percent' ? 'İndirim (%)' : 'İndirim (TL)'}</Label>
                    <Input
                      type="number"
                      value={formData.discount_type === 'percent' ? formData.discount_rate : formData.discount_amount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (formData.discount_type === 'percent') {
                          setFormData({...formData, discount_rate: val});
                        } else {
                          setFormData({...formData, discount_amount: val});
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>KDV Oranı (%)</Label>
                  <Select 
                    value={formData.vat_rate.toString()} 
                    onValueChange={(v) => setFormData({...formData, vat_rate: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">%0 (KDV Yok)</SelectItem>
                      <SelectItem value="1">%1</SelectItem>
                      <SelectItem value="10">%10</SelectItem>
                      <SelectItem value="20">%20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Totals Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ara Toplam:</span>
                  <span>{formatTRY(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>İndirim:</span>
                    <span>-{formatTRY(discountAmount)}</span>
                  </div>
                )}
                {vatAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>KDV (%{formData.vat_rate}):</span>
                    <span>{formatTRY(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Genel Toplam:</span>
                  <span className="text-primary">{formatTRY(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Teslim Süresi
                </Label>
                <Input
                  value={formData.delivery_time}
                  onChange={(e) => setFormData({...formData, delivery_time: e.target.value})}
                  placeholder="Örn: 7-10 iş günü"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Ödeme Şartları
                </Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                  placeholder="Örn: %50 peşin, %50 teslimde"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Garanti Bilgisi
                </Label>
                <Input
                  value={formData.warranty_info}
                  onChange={(e) => setFormData({...formData, warranty_info: e.target.value})}
                  placeholder="Örn: 2 yıl üretici garantisi"
                />
              </div>
              <div className="space-y-2">
                <Label>Teklif Notu</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Ek notlar..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              İptal
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleSubmit('taslak')}>
              <Save className="h-4 w-4 mr-2" />
              Taslak Kaydet
            </Button>
            <Button type="button" onClick={() => handleSubmit('teklif_gonderildi')}>
              <Send className="h-4 w-4 mr-2" />
              Teklifi Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Quote Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Teklif Detayı - {viewingQuote?.quote_number}</DialogTitle>
          </DialogHeader>
          {viewingQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Müşteri</p>
                  <p className="font-medium">{viewingQuote.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tarih</p>
                  <p className="font-medium">{formatDate(viewingQuote.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Geçerlilik</p>
                  <p className="font-medium">{formatDate(viewingQuote.valid_until)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Durum</p>
                  <Badge className={getStatusInfo(viewingQuote.status).color}>
                    {getStatusInfo(viewingQuote.status).label}
                  </Badge>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead className="text-center">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingQuote.items?.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatTRY(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatTRY(item.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ara Toplam:</span>
                  <span>{formatTRY(viewingQuote.subtotal)}</span>
                </div>
                {viewingQuote.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>İndirim:</span>
                    <span>-{formatTRY(viewingQuote.discount_amount)}</span>
                  </div>
                )}
                {viewingQuote.vat_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>KDV (%{viewingQuote.vat_rate}):</span>
                    <span>{formatTRY(viewingQuote.vat_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Genel Toplam:</span>
                  <span className="text-primary">{formatTRY(viewingQuote.total)}</span>
                </div>
              </div>

              {(viewingQuote.delivery_time || viewingQuote.payment_terms || viewingQuote.warranty_info || viewingQuote.notes) && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {viewingQuote.delivery_time && (
                    <div>
                      <p className="text-muted-foreground">Teslim Süresi</p>
                      <p>{viewingQuote.delivery_time}</p>
                    </div>
                  )}
                  {viewingQuote.payment_terms && (
                    <div>
                      <p className="text-muted-foreground">Ödeme Şartları</p>
                      <p>{viewingQuote.payment_terms}</p>
                    </div>
                  )}
                  {viewingQuote.warranty_info && (
                    <div>
                      <p className="text-muted-foreground">Garanti</p>
                      <p>{viewingQuote.warranty_info}</p>
                    </div>
                  )}
                  {viewingQuote.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Not</p>
                      <p>{viewingQuote.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Kapat</Button>
            <Button onClick={() => generatePDF(viewingQuote)}>
              <Download className="h-4 w-4 mr-2" />
              PDF İndir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Quotes;
