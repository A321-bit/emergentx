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
import { Plus, ArrowUp, ArrowDown, Search, Package, Boxes, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatDateTime, formatCurrency, getCategoryLabel, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Stock = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'giris',
    quantity: '',
    note: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, movementsRes] = await Promise.all([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/stock-movements`)
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setMovements(movementsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      quantity: parseInt(formData.quantity)
    };

    try {
      await axios.post(`${API_URL}/api/stock-movements`, data);
      toast.success(data.movement_type === 'giris' ? 'Stok girişi yapıldı' : 'Stok çıkışı yapıldı');
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      movement_type: 'giris',
      quantity: '',
      note: ''
    });
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Bilinmeyen Ürün';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate stock by dynamic categories
  const categoryStats = categories.map(category => {
    const categoryProducts = products.filter(p => p.category_id === category.id);
    const totalQuantity = categoryProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
    return {
      id: category.id,
      name: category.name,
      productCount: categoryProducts.length,
      totalQuantity: totalQuantity
    };
  }).filter(stat => stat.productCount > 0);

  const totalStockValue = products.reduce(
    (sum, p) => sum + (p.purchase_price * p.stock_quantity), 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="stock-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Stok Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Toplam Stok Değeri: <span className="font-semibold text-foreground">{formatCurrency(totalStockValue)}</span>
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-stock-btn">
          <Plus className="h-4 w-4 mr-2" />
          Stok Hareketi
        </Button>
      </div>

      {/* Category Stats - Dynamic */}
      {categoryStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categoryStats.map((stat, index) => {
            const colors = [
              { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-200' },
              { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-200' },
              { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-200' },
              { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-200' },
              { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-200' },
              { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-200' },
            ];
            const colorSet = colors[index % colors.length];
            
            return (
              <Card 
                key={stat.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  categoryFilter === stat.id ? `border-2 ${colorSet.border} bg-primary/5` : ""
                )}
                onClick={() => setCategoryFilter(stat.id)}
                data-testid={`category-stat-${stat.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className={cn("h-4 w-4", colorSet.text)} />
                        <p className="text-xs font-medium text-muted-foreground truncate">
                          {stat.name}
                        </p>
                      </div>
                      <p className="text-2xl font-bold">{stat.totalQuantity}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Boxes className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {stat.productCount} ürün çeşidi
                        </p>
                      </div>
                    </div>
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", colorSet.bg)}>
                      <Package className={cn("h-5 w-5", colorSet.text)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {categoryFilter !== 'all' && (
            <Card 
              className="cursor-pointer transition-all hover:shadow-md border-dashed"
              onClick={() => setCategoryFilter('all')}
              data-testid="clear-category-filter"
            >
              <CardContent className="p-4 flex items-center justify-center h-full">
                <div className="text-center">
                  <X className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Filtreyi Temizle</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Products Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="section-title">Ürün Stokları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-md"
              data-testid="stock-search"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Mevcut Stok</TableHead>
                <TableHead className="text-right">Birim Maliyet</TableHead>
                <TableHead className="text-right">Toplam Değer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} data-testid={`stock-row-${product.id}`}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <span className={cn("category-badge", product.category)}>
                      {getCategoryLabel(product.category)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {product.stock_quantity} {product.unit}
                  </TableCell>
                  <TableCell className="text-right currency">
                    {formatCurrency(product.purchase_price)}
                  </TableCell>
                  <TableCell className="text-right currency font-medium">
                    {formatCurrency(product.purchase_price * product.stock_quantity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="section-title">Son Stok Hareketleri</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Hareket</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.slice(0, 10).map((movement) => (
                <TableRow key={movement.id} data-testid={`movement-row-${movement.id}`}>
                  <TableCell>{formatDateTime(movement.created_at)}</TableCell>
                  <TableCell className="font-medium">{getProductName(movement.product_id)}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                      movement.movement_type === 'giris'
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {movement.movement_type === 'giris' ? (
                        <><ArrowUp className="h-3 w-3" /> Giriş</>
                      ) : (
                        <><ArrowDown className="h-3 w-3" /> Çıkış</>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{movement.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">{movement.note || '-'}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Henüz stok hareketi yok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" data-testid="stock-modal">
          <DialogHeader>
            <DialogTitle>Stok Hareketi Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product_id">Ürün</Label>
              <Select value={formData.product_id} onValueChange={(v) => setFormData({...formData, product_id: v})}>
                <SelectTrigger data-testid="stock-product-select">
                  <SelectValue placeholder="Ürün seçin" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.stock_quantity} {product.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="movement_type">Hareket Tipi</Label>
              <Select value={formData.movement_type} onValueChange={(v) => setFormData({...formData, movement_type: v})}>
                <SelectTrigger data-testid="stock-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="giris">Stok Girişi</SelectItem>
                  <SelectItem value="cikis">Stok Çıkışı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Miktar</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                required
                data-testid="stock-quantity-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Not (Opsiyonel)</Label>
              <Input
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                placeholder="Hareket açıklaması"
                data-testid="stock-note-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="stock-submit-btn">
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stock;
