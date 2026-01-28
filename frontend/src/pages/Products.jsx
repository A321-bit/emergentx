import React, { useState, useEffect, useRef } from 'react';
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
import { Plus, Pencil, Trash2, Search, Upload, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatCurrency, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Products = () => {
  const { isAdmin, isBayi } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    currency: 'USD',
    purchase_price_without_vat: '',
    vat_rate: '20',
    profit_margin: '',
    stock_quantity: '0',
    unit: 'adet'
  });

  // Calculated preview values
  const [preview, setPreview] = useState({
    purchaseWithVat: 0,
    salePrice: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculatePreview();
  }, [formData.purchase_price_without_vat, formData.vat_rate, formData.profit_margin, formData.category_id]);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/categories`)
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = () => {
    const purchaseWithoutVat = parseFloat(formData.purchase_price_without_vat) || 0;
    const vatRate = parseFloat(formData.vat_rate) || 20;
    
    // Calculate purchase price with VAT (maliyet)
    const purchaseWithVat = purchaseWithoutVat * (1 + vatRate / 100);
    
    // Get profit margin (product-specific or category default)
    let profitMargin = parseFloat(formData.profit_margin);
    if (isNaN(profitMargin) || formData.profit_margin === '') {
      const selectedCategory = categories.find(c => c.id === formData.category_id);
      profitMargin = selectedCategory?.default_profit_margin || 30;
    }
    
    // Calculate sale price
    const salePrice = purchaseWithVat * (1 + profitMargin / 100);
    
    setPreview({
      purchaseWithVat: purchaseWithVat.toFixed(2),
      salePrice: salePrice.toFixed(2),
      profitMargin
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category_id) {
      toast.error('Lütfen bir kategori seçin');
      return;
    }

    const data = {
      name: formData.name,
      category_id: formData.category_id,
      description: formData.description || null,
      currency: formData.currency,
      purchase_price_without_vat: parseFloat(formData.purchase_price_without_vat),
      vat_rate: parseFloat(formData.vat_rate) || 20,
      profit_margin: formData.profit_margin ? parseFloat(formData.profit_margin) : null,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      unit: formData.unit
    };

    try {
      if (editingProduct) {
        await axios.put(`${API_URL}/api/products/${editingProduct.id}`, data);
        toast.success('Ürün güncellendi');
      } else {
        await axios.post(`${API_URL}/api/products`, data);
        toast.success('Ürün eklendi');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleImageUpload = async (productId, file) => {
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Sadece JPEG, PNG, GIF veya WebP formatları desteklenir');
      return;
    }

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      await axios.post(`${API_URL}/api/products/${productId}/upload-image`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Fotoğraf yüklendi');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/products/${id}`);
      toast.success('Ürün silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || '',
      description: product.description || '',
      currency: product.currency || 'USD',
      purchase_price_without_vat: product.purchase_price_without_vat?.toString() || '',
      vat_rate: product.vat_rate?.toString() || '20',
      profit_margin: product.profit_margin?.toString() || '',
      stock_quantity: product.stock_quantity?.toString() || '0',
      unit: product.unit || 'adet'
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: '',
      description: '',
      currency: 'USD',
      purchase_price_without_vat: '',
      vat_rate: '20',
      profit_margin: '',
      stock_quantity: '0',
      unit: 'adet'
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', TRY: '₺' };
    return symbols[currency] || '$';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="products-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Ürünler</h1>
          <p className="text-muted-foreground mt-1">{products.length} ürün listeleniyor</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-product-btn">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Ürün
          </Button>
        )}
      </div>

      {/* Warning if no categories */}
      {categories.length === 0 && isAdmin && (
        <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Henüz kategori eklenmedi. Ürün eklemeden önce <strong>Kategoriler</strong> sayfasından en az bir kategori oluşturun.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="product-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="category-filter">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fotoğraf</TableHead>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-center">Para Birimi</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                {!isBayi && <TableHead className="text-right">Alış (KDV Hariç)</TableHead>}
                {!isBayi && <TableHead className="text-right">Maliyet (KDV Dahil)</TableHead>}
                <TableHead className="text-right">Satış Fiyatı</TableHead>
                {isBayi && <TableHead className="text-right">Bayi Fiyatı</TableHead>}
                {isAdmin && <TableHead className="text-right">İşlemler</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                  <TableCell>
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={`${API_URL}${product.image_url}`} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      {product.category_name || 'Bilinmiyor'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-bold">
                      {product.currency || 'USD'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.stock_quantity} {product.unit}
                  </TableCell>
                  {!isBayi && (
                    <TableCell className="text-right currency text-muted-foreground">
                      {formatCurrency(product.purchase_price_without_vat || 0, product.currency || 'USD')}
                    </TableCell>
                  )}
                  {!isBayi && (
                    <TableCell className="text-right currency">
                      {formatCurrency(product.purchase_price || 0, product.currency || 'USD')}
                    </TableCell>
                  )}
                  <TableCell className="text-right currency font-medium">
                    {formatCurrency(product.sale_price || 0, product.currency || 'USD')}
                  </TableCell>
                  {isBayi && (
                    <TableCell className="text-right currency text-primary font-medium">
                      {formatCurrency(product.dealer_price || 0, product.currency || 'USD')}
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          id={`upload-${product.id}`}
                          onChange={(e) => handleImageUpload(product.id, e.target.files?.[0])}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => document.getElementById(`upload-${product.id}`).click()}
                          disabled={uploading}
                          data-testid={`upload-image-${product.id}`}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                          data-testid={`edit-product-${product.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`delete-product-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {categories.length === 0 ? 'Önce kategori oluşturun' : 'Ürün bulunamadı'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-modal">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Ürün Adı</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="product-name-input"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category_id">Kategori</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({...formData, category_id: v})}>
                  <SelectTrigger data-testid="product-category-select">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} (Kar: %{cat.default_profit_margin})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Para Birimi</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                  <SelectTrigger data-testid="product-currency-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">Dolar ($)</SelectItem>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Purchase Price (without VAT) */}
              <div className="space-y-2">
                <Label htmlFor="purchase_price_without_vat">
                  Alış Fiyatı (KDV Hariç) {getCurrencySymbol(formData.currency)}
                </Label>
                <Input
                  id="purchase_price_without_vat"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchase_price_without_vat}
                  onChange={(e) => setFormData({...formData, purchase_price_without_vat: e.target.value})}
                  required
                  data-testid="product-purchase-price-input"
                />
              </div>

              {/* VAT Rate */}
              <div className="space-y-2">
                <Label htmlFor="vat_rate">KDV Oranı (%)</Label>
                <Select value={formData.vat_rate} onValueChange={(v) => setFormData({...formData, vat_rate: v})}>
                  <SelectTrigger data-testid="product-vat-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">%20</SelectItem>
                    <SelectItem value="18">%18</SelectItem>
                    <SelectItem value="10">%10</SelectItem>
                    <SelectItem value="8">%8</SelectItem>
                    <SelectItem value="1">%1</SelectItem>
                    <SelectItem value="0">%0</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Profit Margin */}
              <div className="space-y-2">
                <Label htmlFor="profit_margin">
                  Kar Marjı (%) 
                  <span className="text-muted-foreground text-xs ml-1">
                    (Boş bırakılırsa kategori varsayılanı kullanılır)
                  </span>
                </Label>
                <Input
                  id="profit_margin"
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={formData.profit_margin}
                  onChange={(e) => setFormData({...formData, profit_margin: e.target.value})}
                  placeholder={`Kategori varsayılanı: %${categories.find(c => c.id === formData.category_id)?.default_profit_margin || 30}`}
                  data-testid="product-profit-margin-input"
                />
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <Label htmlFor="unit">Birim</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({...formData, unit: v})}>
                  <SelectTrigger data-testid="product-unit-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adet">Adet</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="metre">Metre</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stock */}
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stok Miktarı</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  data-testid="product-stock-input"
                />
              </div>

              {/* Description */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  data-testid="product-description-input"
                />
              </div>
            </div>

            {/* Price Preview */}
            {formData.purchase_price_without_vat && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3">Fiyat Hesaplama Önizleme</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Alış (KDV Hariç)</p>
                      <p className="font-semibold">
                        {getCurrencySymbol(formData.currency)}{parseFloat(formData.purchase_price_without_vat || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Maliyet (KDV Dahil)</p>
                      <p className="font-semibold text-orange-600">
                        {getCurrencySymbol(formData.currency)}{preview.purchaseWithVat}
                      </p>
                      <p className="text-xs text-muted-foreground">+%{formData.vat_rate} KDV</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Satış Fiyatı</p>
                      <p className="font-semibold text-primary text-lg">
                        {getCurrencySymbol(formData.currency)}{preview.salePrice}
                      </p>
                      <p className="text-xs text-muted-foreground">Kar Marjı: %{preview.profitMargin}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={categories.length === 0} data-testid="product-submit-btn">
                {editingProduct ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
