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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Plus, Pencil, Trash2, Search, Upload, Image, FileText, X, Loader2, Download, FileSpreadsheet, Package } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatCurrency, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const imageInputRef = useRef(null);
  const datasheetInputRef = useRef(null);
  const excelInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    short_description: '',  // PDF için kısa açıklama
    benefits: ['', '', ''],  // PDF için 3 fayda maddesi
    currency: 'USD',
    purchase_price_without_vat: '',
    vat_rate: '20',
    profit_margin: '',
    stock_quantity: '0',
    unit: 'adet',
    power_watt: '',
    price_segment: '',
    matching_group: ''
  });

  const [priceSegments, setPriceSegments] = useState([]);
  const [matchingGroups, setMatchingGroups] = useState([]);

  const [preview, setPreview] = useState({
    purchaseWithVat: 0,
    salePrice: 0,
    profitMargin: 30
  });

  // Check permissions
  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('products_manage');
  const canViewPrices = user?.permissions?.includes('all') || user?.permissions?.includes('products_prices_view');
  const isDealer = !!user?.dealer_id;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculatePreview();
  }, [formData.purchase_price_without_vat, formData.vat_rate, formData.profit_margin, formData.category_id, categories]);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, segmentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/products/price-segments`).catch(() => ({ data: [] }))
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setPriceSegments(segmentsRes.data || []);
      
      // Extract unique matching groups from products
      const groups = [...new Set(productsRes.data.filter(p => p.matching_group).map(p => p.matching_group))];
      setMatchingGroups(groups);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = () => {
    const purchaseWithoutVat = parseFloat(formData.purchase_price_without_vat) || 0;
    const vatRate = parseFloat(formData.vat_rate) || 20;
    const purchaseWithVat = purchaseWithoutVat * (1 + vatRate / 100);
    
    let profitMargin = parseFloat(formData.profit_margin);
    if (isNaN(profitMargin) || formData.profit_margin === '') {
      const selectedCategory = categories.find(c => c.id === formData.category_id);
      profitMargin = selectedCategory?.default_profit_margin || 30;
    }
    
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
      unit: formData.unit,
      power_watt: formData.power_watt ? parseFloat(formData.power_watt) : null,
      price_segment: formData.price_segment || null,
      matching_group: formData.matching_group || null
    };

    try {
      if (editingProduct) {
        await axios.put(`${API_URL}/api/products/${editingProduct.id}`, data);
        toast.success('Ürün güncellendi');
      } else {
        const response = await axios.post(`${API_URL}/api/products`, data);
        toast.success('Ürün eklendi');
        // Open media modal for new product
        setSelectedProduct(response.data);
        setIsMediaModalOpen(true);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0 || !selectedProduct) return;
    
    setUploading(true);
    const formDataUpload = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} desteklenmeyen format`);
        continue;
      }
      formDataUpload.append('files', file);
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/products/${selectedProduct.id}/upload-images`,
        formDataUpload,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Fotoğraflar yüklendi');
      setSelectedProduct({...selectedProduct, images: response.data.images});
      fetchData();
    } catch (error) {
      toast.error('Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handleDatasheetUpload = async (file) => {
    if (!file || !selectedProduct) return;
    
    if (file.type !== 'application/pdf') {
      toast.error('Sadece PDF dosyası yüklenebilir');
      return;
    }

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/api/products/${selectedProduct.id}/upload-datasheet`,
        formDataUpload,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Datasheet yüklendi');
      setSelectedProduct({...selectedProduct, datasheet_url: response.data.datasheet_url});
      fetchData();
    } catch (error) {
      toast.error('Datasheet yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageIndex) => {
    if (!selectedProduct) return;
    
    try {
      const response = await axios.delete(`${API_URL}/api/products/${selectedProduct.id}/images/${imageIndex}`);
      toast.success('Fotoğraf silindi');
      setSelectedProduct({...selectedProduct, images: response.data.images});
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
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
      unit: product.unit || 'adet',
      power_watt: product.power_watt?.toString() || '',
      price_segment: product.price_segment || '',
      matching_group: product.matching_group || ''
    });
    setIsModalOpen(true);
  };

  const openMediaModal = (product) => {
    setSelectedProduct(product);
    setIsMediaModalOpen(true);
  };

  // Excel functions
  const handleExportExcel = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products/export/excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `urunler_${new Date().toISOString().slice(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel dosyası indirildi');
    } catch (error) {
      toast.error('Excel indirilemedi');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products/export/template`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'urun_sablonu.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Şablon indirildi');
    } catch (error) {
      toast.error('Şablon indirilemedi');
    }
  };

  const handleExcelImport = async (file) => {
    if (!file) return;
    
    setImporting(true);
    setImportResult(null);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/products/import/excel`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(response.data);
      if (response.data.imported > 0) {
        toast.success(`${response.data.imported} ürün eklendi`);
        fetchData();
      }
      if (response.data.errors?.length > 0) {
        toast.warning(`${response.data.total_errors} hata oluştu`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import başarısız');
      setImportResult({ imported: 0, errors: [error.response?.data?.detail || 'Bilinmeyen hata'], total_errors: 1 });
    } finally {
      setImporting(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
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
      unit: 'adet',
      power_watt: '',
      price_segment: '',
      matching_group: ''
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
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
      {/* Hidden file input for Excel */}
      <input
        type="file"
        ref={excelInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleExcelImport(e.target.files[0]);
          }
        }}
        accept=".xlsx,.xls"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Ürünler</h1>
          <p className="text-muted-foreground mt-1">{products.length} ürün listeleniyor</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" data-testid="excel-menu-btn">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportExcel} data-testid="export-excel-btn">
                    <Download className="h-4 w-4 mr-2" />
                    Ürün Listesi İndir
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDownloadTemplate} data-testid="download-template-btn">
                    <FileText className="h-4 w-4 mr-2" />
                    Şablon İndir
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => excelInputRef.current?.click()} data-testid="import-excel-btn">
                    <Upload className="h-4 w-4 mr-2" />
                    Excel'den Yükle
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-product-btn">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Ürün
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Import Result Alert */}
      {importResult && (
        <Card className={cn(
          "border",
          importResult.imported > 0 && importResult.total_errors === 0 
            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            : importResult.total_errors > 0 
              ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
              : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
        )}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">
                  {importResult.imported > 0 ? `✅ ${importResult.imported} ürün başarıyla eklendi` : '❌ Hiç ürün eklenemedi'}
                </p>
                {importResult.errors?.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">Hatalar ({importResult.total_errors}):</p>
                    <ul className="list-disc list-inside mt-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setImportResult(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning if no categories */}
      {categories.length === 0 && canManage && (
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

      {/* Table - Desktop */}
      <Card className="hidden sm:block">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medya</TableHead>
                <TableHead>Ürün Adı</TableHead>
                <TableHead className="hidden md:table-cell">Kategori</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Para Birimi</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                {canViewPrices && <TableHead className="text-right hidden xl:table-cell">Alış (KDV Hariç)</TableHead>}
                {canViewPrices && <TableHead className="text-right hidden lg:table-cell">Maliyet</TableHead>}
                <TableHead className="text-right">Satış Fiyatı</TableHead>
                {isDealer && <TableHead className="text-right">Bayi Fiyatı</TableHead>}
                {canManage && <TableHead className="text-right">İşlemler</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                  <TableCell>
                    <button
                      onClick={() => openMediaModal(product)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden hover:ring-2 ring-primary transition-all"
                    >
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={`${API_URL}${product.images[0]}`} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{product.name}</span>
                        {product.price_segment && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-medium",
                            product.price_segment === 'ekonomik' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                            product.price_segment === 'standart' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                            product.price_segment === 'premium' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          )}>
                            {product.price_segment === 'ekonomik' ? '🟢 Eko' : 
                             product.price_segment === 'standart' ? '🟡 Std' : 
                             product.price_segment === 'premium' ? '🔵 Prm' : ''}
                          </span>
                        )}
                      </div>
                      {product.matching_group && (
                        <span className="text-xs text-muted-foreground">Grup: {product.matching_group}</span>
                      )}
                      {product.datasheet_url && (
                        <a 
                          href={`${API_URL}${product.datasheet_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center text-xs text-primary hover:underline"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          PDF
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      {product.category_name || 'Bilinmiyor'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-bold">
                      {product.currency || 'USD'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.stock_quantity} {product.unit}
                  </TableCell>
                  {canViewPrices && (
                    <TableCell className="text-right currency text-muted-foreground hidden xl:table-cell">
                      {product.purchase_price_without_vat != null 
                        ? formatCurrency(product.purchase_price_without_vat, product.currency || 'USD')
                        : '-'}
                    </TableCell>
                  )}
                  {canViewPrices && (
                    <TableCell className="text-right currency hidden lg:table-cell">
                      {product.purchase_price != null 
                        ? formatCurrency(product.purchase_price, product.currency || 'USD')
                        : '-'}
                    </TableCell>
                  )}
                  <TableCell className="text-right currency font-medium text-sm">
                    {formatCurrency(product.sale_price || 0, product.currency || 'USD')}
                  </TableCell>
                  {isDealer && (
                    <TableCell className="text-right currency text-primary font-medium">
                      {formatCurrency(product.dealer_price || 0, product.currency || 'USD')}
                    </TableCell>
                  )}
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openMediaModal(product)}
                          data-testid={`media-product-${product.id}`}
                        >
                          <Image className="h-4 w-4" />
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
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    {categories.length === 0 ? 'Önce kategori oluşturun' : 'Ürün bulunamadı'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="p-4" data-testid={`product-card-${product.id}`}>
            <div className="flex gap-3">
              <button
                onClick={() => openMediaModal(product)}
                className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0"
              >
                {product.images && product.images.length > 0 ? (
                  <img 
                    src={`${API_URL}${product.images[0]}`} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{product.name}</h3>
                <p className="text-xs text-muted-foreground">{product.category_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded">{product.currency}</span>
                  <span className="text-xs text-muted-foreground">Stok: {product.stock_quantity}</span>
                </div>
                <p className="text-sm font-bold text-primary mt-1">
                  {formatCurrency(product.sale_price || 0, product.currency || 'USD')}
                </p>
              </div>
            </div>
            {canManage && (
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => openMediaModal(product)}>
                  <Image className="h-4 w-4 mr-1" />
                  Medya
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Düzenle
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(product.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        ))}
        {filteredProducts.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            {categories.length === 0 ? 'Önce kategori oluşturun' : 'Ürün bulunamadı'}
          </Card>
        )}
      </div>

      {/* Product Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-modal">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="profit_margin">Kar Marjı (%)</Label>
                <Input
                  id="profit_margin"
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={formData.profit_margin}
                  onChange={(e) => setFormData({...formData, profit_margin: e.target.value})}
                  placeholder={`Kategori: %${categories.find(c => c.id === formData.category_id)?.default_profit_margin || 30}`}
                  data-testid="product-profit-margin-input"
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="power_watt">
                  Güç (W)
                  <span className="text-xs text-muted-foreground ml-1">(Panel/İnverter/Batarya için)</span>
                </Label>
                <Input
                  id="power_watt"
                  type="number"
                  min="0"
                  placeholder="Örn: 600"
                  value={formData.power_watt}
                  onChange={(e) => setFormData({...formData, power_watt: e.target.value})}
                  data-testid="product-power-input"
                />
              </div>

              {/* Segment ve Eşleştirme - Sadece Panel/İnverter/Batarya için */}
              <div className="space-y-2">
                <Label htmlFor="price_segment">
                  Fiyat Segmenti
                  <span className="text-xs text-muted-foreground ml-1">(Off-Grid için)</span>
                </Label>
                <Select
                  value={formData.price_segment}
                  onValueChange={(v) => setFormData({...formData, price_segment: v === '_none' ? '' : v})}
                >
                  <SelectTrigger id="price_segment" data-testid="product-segment-select">
                    <SelectValue placeholder="Segment seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Seçilmedi</SelectItem>
                    {priceSegments.map(seg => (
                      <SelectItem key={seg.value} value={seg.value}>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            seg.color === 'green' && "bg-green-500",
                            seg.color === 'yellow' && "bg-yellow-500",
                            seg.color === 'blue' && "bg-blue-500"
                          )} />
                          {seg.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="matching_group">
                  Eşleştirme Grubu
                  <span className="text-xs text-muted-foreground ml-1">(Aynı güçteki ürünleri grupla)</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.matching_group || '_none'}
                    onValueChange={(v) => setFormData({...formData, matching_group: v === '_none' ? '' : v})}
                  >
                    <SelectTrigger id="matching_group" className="flex-1" data-testid="product-matching-select">
                      <SelectValue placeholder="Grup seçin veya yeni oluşturun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Yok</SelectItem>
                      {matchingGroups.map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Yeni grup adı"
                    className="w-32"
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setFormData({...formData, matching_group: e.target.value.trim()});
                        if (!matchingGroups.includes(e.target.value.trim())) {
                          setMatchingGroups([...matchingGroups, e.target.value.trim()]);
                        }
                        e.target.value = '';
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        e.preventDefault();
                        setFormData({...formData, matching_group: e.target.value.trim()});
                        if (!matchingGroups.includes(e.target.value.trim())) {
                          setMatchingGroups([...matchingGroups, e.target.value.trim()]);
                        }
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Açıklama</Label>
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
                      <p className="text-xs text-muted-foreground">Kar: %{preview.profitMargin}</p>
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

      {/* Media Modal */}
      <Dialog open={isMediaModalOpen} onOpenChange={setIsMediaModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="media-modal">
          <DialogHeader>
            <DialogTitle>Ürün Medyası - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Images Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Fotoğraflar</Label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="upload-images-btn"
                >
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Fotoğraf Ekle
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {selectedProduct?.images?.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={`${API_URL}${img}`}
                      alt={`Ürün ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => handleDeleteImage(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(!selectedProduct?.images || selectedProduct.images.length === 0) && (
                  <div className="col-span-4 text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    Henüz fotoğraf yüklenmedi
                  </div>
                )}
              </div>
            </div>

            {/* Datasheet Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">PDF Datasheet</Label>
                <input
                  ref={datasheetInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleDatasheetUpload(e.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => datasheetInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="upload-datasheet-btn"
                >
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  PDF Yükle
                </Button>
              </div>
              
              {selectedProduct?.datasheet_url ? (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-8 w-8 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium">Datasheet.pdf</p>
                    <a 
                      href={`${API_URL}${selectedProduct.datasheet_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Görüntüle / İndir
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Henüz datasheet yüklenmedi</p>
                  <p className="text-xs">Teklif PDF'inde ürün detaylarıyla birlikte gösterilecek</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMediaModalOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
