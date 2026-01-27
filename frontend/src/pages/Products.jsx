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
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatCurrency, getCategoryLabel, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Products = () => {
  const { isAdmin, isBayi } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'panel',
    description: '',
    purchase_price: '',
    sale_price: '',
    dealer_price: '',
    stock_quantity: '',
    unit: 'adet'
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      purchase_price: parseFloat(formData.purchase_price),
      sale_price: parseFloat(formData.sale_price),
      dealer_price: parseFloat(formData.dealer_price),
      stock_quantity: parseInt(formData.stock_quantity)
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
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/products/${id}`);
      toast.success('Ürün silindi');
      fetchProducts();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description || '',
      purchase_price: product.purchase_price.toString(),
      sale_price: product.sale_price.toString(),
      dealer_price: product.dealer_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      unit: product.unit
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'panel',
      description: '',
      purchase_price: '',
      sale_price: '',
      dealer_price: '',
      stock_quantity: '',
      unit: 'adet'
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
            <SelectItem value="panel">Panel</SelectItem>
            <SelectItem value="inverter">İnverter</SelectItem>
            <SelectItem value="batarya">Batarya</SelectItem>
            <SelectItem value="aksesuar">Aksesuar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                {!isBayi && <TableHead className="text-right">Alış Fiyatı</TableHead>}
                <TableHead className="text-right">Satış Fiyatı</TableHead>
                {isBayi && <TableHead className="text-right">Bayi Fiyatı</TableHead>}
                {isAdmin && <TableHead className="text-right">İşlemler</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <span className={cn("category-badge", product.category)}>
                      {getCategoryLabel(product.category)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.stock_quantity} {product.unit}
                  </TableCell>
                  {!isBayi && (
                    <TableCell className="text-right currency">
                      {formatCurrency(product.purchase_price)}
                    </TableCell>
                  )}
                  <TableCell className="text-right currency">
                    {formatCurrency(product.sale_price)}
                  </TableCell>
                  {isBayi && (
                    <TableCell className="text-right currency text-primary font-medium">
                      {formatCurrency(product.dealer_price)}
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Ürün bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg" data-testid="product-modal">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="category">Kategori</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger data-testid="product-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="panel">Panel</SelectItem>
                    <SelectItem value="inverter">İnverter</SelectItem>
                    <SelectItem value="batarya">Batarya</SelectItem>
                    <SelectItem value="aksesuar">Aksesuar</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="purchase_price">Alış Fiyatı (₺)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                  required
                  data-testid="product-purchase-price-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price">Satış Fiyatı (₺)</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
                  required
                  data-testid="product-sale-price-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealer_price">Bayi Fiyatı (₺)</Label>
                <Input
                  id="dealer_price"
                  type="number"
                  step="0.01"
                  value={formData.dealer_price}
                  onChange={(e) => setFormData({...formData, dealer_price: e.target.value})}
                  required
                  data-testid="product-dealer-price-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stok Miktarı</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  required
                  data-testid="product-stock-input"
                />
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="product-submit-btn">
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
