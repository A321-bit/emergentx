import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, Eye, Search, FileText, Download, 
  CheckCircle, XCircle, Clock, DollarSign,
  Trash2, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, getStatusLabel, getStatusClass, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Quotes = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [companySettings, setCompanySettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState(null);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    items: [],
    discount_rate: 0,
    currency: 'TRY',
    validity_days: 15,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [quotesRes, customersRes, productsRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/quotes`),
        axios.get(`${API_URL}/api/customers`),
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/settings/company`)
      ]);
      setQuotes(quotesRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
      setCompanySettings(settingsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1 }]
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    let subtotal = 0;
    formData.items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        subtotal += product.sale_price * item.quantity;
      }
    });
    const discount = subtotal * (formData.discount_rate / 100);
    return { subtotal, discount, total: subtotal - discount };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      toast.error('En az bir ürün eklemelisiniz');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/quotes`, formData);
      toast.success('Teklif oluşturuldu');
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/quotes/${quoteId}/status`, { status: newStatus });
      toast.success('Durum güncellendi');
      fetchData();
    } catch (error) {
      toast.error('Güncelleme başarısız');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu teklifi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/quotes/${id}`);
      toast.success('Teklif silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Image load error:', e);
      return null;
    }
  };

  const generatePDF = async (quote) => {
    try {
      toast.info('PDF olusturuluyor...');
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      
      const primaryColor = [245, 158, 11];
      const darkColor = [51, 51, 51];

      // PAGE 1: COVER
      if (companySettings.quote_cover_image) {
        const coverUrl = `${API_URL}${companySettings.quote_cover_image}`;
        const coverBase64 = await loadImageAsBase64(coverUrl);
        if (coverBase64) {
          doc.addImage(coverBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
          doc.addPage();
        }
      }

      // PAGE 2: QUOTE
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      let textStartX = margin;
      
      // Logo
      if (companySettings.logo_url) {
        const logoUrl = `${API_URL}${companySettings.logo_url}`;
        const logoBase64 = await loadImageAsBase64(logoUrl);
        if (logoBase64) {
          doc.addImage(logoBase64, 'JPEG', margin, 5, 25, 25);
          textStartX = margin + 30;
        }
      }
      
      // Company Info
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(companySettings.company_name || 'Sirket', textStartX, 14);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      if (companySettings.phone) doc.text('Tel: ' + companySettings.phone, textStartX, 20);
      if (companySettings.email) doc.text(companySettings.email, textStartX, 25);
      
      // Quote Box
      doc.setFillColor(255, 255, 255);
      doc.rect(pageWidth - 50, 5, 40, 25, 'F');
      doc.setTextColor(...darkColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('TEKLIF', pageWidth - 30, 12, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(quote.quote_number, pageWidth - 30, 18, { align: 'center' });
      doc.text(formatDate(quote.created_at), pageWidth - 30, 23, { align: 'center' });
      doc.text('Gecerli: ' + formatDate(quote.valid_until), pageWidth - 30, 28, { align: 'center' });

      // Customer Box
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, 42, pageWidth - (margin * 2), 22, 'F');
      
      doc.setTextColor(...darkColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MUSTERI', margin + 3, 49);
      doc.setFontSize(10);
      doc.text(quote.customer_name || '-', margin + 3, 56);
      
      const customer = customers.find(c => c.id === quote.customer_id);
      if (customer) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        let custInfo = '';
        if (customer.phone) custInfo += 'Tel: ' + customer.phone + '  ';
        if (customer.city) custInfo += 'Il: ' + customer.city + '  ';
        if (customer.district) custInfo += 'Ilce: ' + customer.district;
        doc.text(custInfo, margin + 3, 61);
      }

      // Products Table
      doc.setTextColor(...darkColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('URUNLER', margin, 72);
      
      const tableBody = quote.items.map(item => {
        const prod = products.find(p => p.id === item.product_id);
        return [
          (item.product_name || '-').substring(0, 40),
          String(item.quantity),
          prod?.unit || 'adet',
          formatCurrency(item.unit_price, quote.currency),
          formatCurrency(item.total_price, quote.currency)
        ];
      });
      
      autoTable(doc, {
        startY: 75,
        head: [['Urun', 'Adet', 'Birim', 'B.Fiyat', 'Toplam']],
        body: tableBody,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 65 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        tableWidth: 160
      });
      
      // Totals
      const tblEnd = doc.lastAutoTable?.finalY || 120;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(pageWidth - 75, tblEnd + 5, 60, 30, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkColor);
      doc.text('Ara Toplam:', pageWidth - 72, tblEnd + 13);
      doc.text(formatCurrency(quote.subtotal, quote.currency), pageWidth - 18, tblEnd + 13, { align: 'right' });
      
      if (quote.discount_rate > 0) {
        doc.text('Iskonto %' + quote.discount_rate + ':', pageWidth - 72, tblEnd + 20);
        doc.text('-' + formatCurrency(quote.discount_amount, quote.currency), pageWidth - 18, tblEnd + 20, { align: 'right' });
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TOPLAM:', pageWidth - 72, tblEnd + 30);
      doc.setTextColor(...primaryColor);
      doc.text(formatCurrency(quote.total, quote.currency), pageWidth - 18, tblEnd + 30, { align: 'right' });

      // PAGE 3: TERMS & BANK
      if (companySettings.quote_terms || companySettings.bank_iban) {
        doc.addPage();
        
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('SARTLAR VE ODEME BILGILERI', pageWidth / 2, 12, { align: 'center' });
        
        let y = 30;
        
        if (companySettings.quote_terms) {
          doc.setTextColor(...darkColor);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Teklif Sartlari:', margin, y);
          y += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          companySettings.quote_terms.split('\n').forEach(line => {
            doc.text(line.substring(0, 100), margin, y);
            y += 4;
          });
          y += 8;
        }
        
        if (companySettings.bank_iban) {
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, y, pageWidth - (margin * 2), 35, 'F');
          
          doc.setTextColor(...darkColor);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Banka Bilgileri', margin + 3, y + 8);
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          let by = y + 15;
          if (companySettings.bank_name) {
            doc.text('Banka: ' + companySettings.bank_name + (companySettings.bank_branch ? ' / ' + companySettings.bank_branch : ''), margin + 3, by);
            by += 5;
          }
          if (companySettings.bank_account_holder) {
            doc.text('Hesap Sahibi: ' + companySettings.bank_account_holder, margin + 3, by);
            by += 5;
          }
          doc.setFont('helvetica', 'bold');
          doc.text('IBAN: ' + companySettings.bank_iban, margin + 3, by);
        }
        
        if (companySettings.warranty_text) {
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          doc.text(companySettings.warranty_text, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      }

      doc.save('Teklif_' + quote.quote_number + '.pdf');
      toast.success('PDF indirildi');
      
    } catch (error) {
      console.error('PDF hatasi:', error);
      toast.error('PDF olusturulamadi: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      items: [],
      discount_rate: 0,
      currency: 'TRY',
      validity_days: 15,
      notes: ''
    });
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { subtotal, discount, total } = calculateTotal();

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
          <p className="text-muted-foreground mt-1">{quotes.length} teklif listeleniyor</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-quote-btn">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Teklif
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Teklif no veya müşteri ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="quote-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="status-filter">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="teklif_gonderildi">Teklif Gönderildi</SelectItem>
            <SelectItem value="onaylandi">Onaylandı</SelectItem>
            <SelectItem value="satisa_dondu">Satışa Döndü</SelectItem>
            <SelectItem value="iptal">İptal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teklif No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Oluşturan</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => (
                <TableRow key={quote.id} data-testid={`quote-row-${quote.id}`}>
                  <TableCell className="font-medium">{quote.quote_number}</TableCell>
                  <TableCell>{quote.customer_name}</TableCell>
                  <TableCell>{quote.created_by_name}</TableCell>
                  <TableCell className="text-right currency font-medium">
                    {formatCurrency(quote.total, quote.currency)}
                  </TableCell>
                  <TableCell>
                    <span className={cn("status-badge", getStatusClass(quote.status))}>
                      {getStatusLabel(quote.status)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(quote.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingQuote(quote)}
                        data-testid={`view-quote-${quote.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => generatePDF(quote)}
                        data-testid={`download-quote-${quote.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(quote.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`delete-quote-${quote.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredQuotes.length === 0 && (
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

      {/* Create Quote Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="quote-modal">
          <DialogHeader>
            <DialogTitle>Yeni Teklif Oluştur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Müşteri</Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})}>
                  <SelectTrigger data-testid="quote-customer-select">
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                  <SelectTrigger data-testid="quote-currency-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                    <SelectItem value="USD">Dolar ($)</SelectItem>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>İskonto (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_rate}
                  onChange={(e) => setFormData({...formData, discount_rate: parseFloat(e.target.value) || 0})}
                  data-testid="quote-discount-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Geçerlilik (gün)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({...formData, validity_days: parseInt(e.target.value) || 15})}
                  data-testid="quote-validity-input"
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ürünler</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} data-testid="add-item-btn">
                  <Plus className="h-4 w-4 mr-1" /> Ürün Ekle
                </Button>
              </div>
              
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select 
                      value={item.product_id} 
                      onValueChange={(v) => handleItemChange(index, 'product_id', v)}
                    >
                      <SelectTrigger className="flex-1" data-testid={`item-product-${index}`}>
                        <SelectValue placeholder="Ürün seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.sale_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-20"
                      data-testid={`item-quantity-${index}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formData.items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz ürün eklenmedi
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Teklif notları..."
                rows={2}
                data-testid="quote-notes-input"
              />
            </div>

            {/* Totals */}
            {formData.items.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Ara Toplam:</span>
                  <span className="currency">{formatCurrency(subtotal, formData.currency)}</span>
                </div>
                {formData.discount_rate > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>İskonto (%{formData.discount_rate}):</span>
                    <span className="currency">-{formatCurrency(discount, formData.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-border">
                  <span>Toplam:</span>
                  <span className="currency">{formatCurrency(total, formData.currency)}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={!formData.customer_id || formData.items.length === 0} data-testid="quote-submit-btn">
                Teklif Oluştur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Quote Modal */}
      <Dialog open={!!viewingQuote} onOpenChange={() => setViewingQuote(null)}>
        <DialogContent className="max-w-2xl" data-testid="view-quote-modal">
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
                  <p className="text-muted-foreground">Oluşturan</p>
                  <p className="font-medium">{viewingQuote.created_by_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tarih</p>
                  <p className="font-medium">{formatDate(viewingQuote.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Geçerlilik</p>
                  <p className="font-medium">{formatDate(viewingQuote.valid_until)}</p>
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
                  {viewingQuote.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right currency">{formatCurrency(item.unit_price, viewingQuote.currency)}</TableCell>
                      <TableCell className="text-right currency">{formatCurrency(item.total_price, viewingQuote.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Ara Toplam:</span>
                  <span className="currency">{formatCurrency(viewingQuote.subtotal, viewingQuote.currency)}</span>
                </div>
                {viewingQuote.discount_rate > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>İskonto (%{viewingQuote.discount_rate}):</span>
                    <span className="currency">-{formatCurrency(viewingQuote.discount_amount, viewingQuote.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-border">
                  <span>Toplam:</span>
                  <span className="currency">{formatCurrency(viewingQuote.total, viewingQuote.currency)}</span>
                </div>
              </div>

              {viewingQuote.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notlar</p>
                  <p className="text-sm">{viewingQuote.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Durum:</span>
                  <span className={cn("status-badge", getStatusClass(viewingQuote.status))}>
                    {getStatusLabel(viewingQuote.status)}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  {viewingQuote.status === 'teklif_gonderildi' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { handleStatusChange(viewingQuote.id, 'onaylandi'); setViewingQuote(null); }}
                        data-testid="approve-quote-btn"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { handleStatusChange(viewingQuote.id, 'iptal'); setViewingQuote(null); }}
                        className="text-destructive"
                        data-testid="cancel-quote-btn"
                      >
                        <XCircle className="h-4 w-4 mr-1" /> İptal
                      </Button>
                    </>
                  )}
                  {viewingQuote.status === 'onaylandi' && (
                    <Button
                      size="sm"
                      onClick={() => { handleStatusChange(viewingQuote.id, 'satisa_dondu'); setViewingQuote(null); }}
                      data-testid="convert-quote-btn"
                    >
                      <DollarSign className="h-4 w-4 mr-1" /> Satışa Dönüştür
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generatePDF(viewingQuote)}
                    data-testid="pdf-quote-btn"
                  >
                    <Download className="h-4 w-4 mr-1" /> PDF İndir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Quotes;
