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
} from '../components/ui/dropdown-menu';
import { Plus, Pencil, Trash2, Search, Package, MoreVertical, X, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Format helpers
const formatTRY = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
};

const formatCurrency = (value, currency) => {
  if (currency === 'TRY') return formatTRY(value);
  return formatUSD(value);
};

const Packages = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: []
  });
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Check permissions
  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('products_manage');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [packagesRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/packages`),
        axios.get(`${API_URL}/api/products`)
      ]);
      setPackages(packagesRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error('Lütfen bir ürün seçin');
      return;
    }
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    // Check if product already in items
    const existingIndex = formData.items.findIndex(item => item.product_id === selectedProduct);
    
    if (existingIndex >= 0) {
      // Update quantity
      const updatedItems = [...formData.items];
      updatedItems[existingIndex].quantity += selectedQuantity;
      updatedItems[existingIndex].total_price = updatedItems[existingIndex].unit_price * updatedItems[existingIndex].quantity;
      setFormData({ ...formData, items: updatedItems });
    } else {
      // Add new item
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: selectedQuantity,
        unit_price: product.sale_price || 0,
        currency: product.currency || 'USD',
        total_price: (product.sale_price || 0) * selectedQuantity
      };
      setFormData({ ...formData, items: [...formData.items, newItem] });
    }
    
    setSelectedProduct('');
    setSelectedQuantity(1);
    setProductSearchTerm('');
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

  const calculateTotalUSD = () => {
    // Simple calculation - assume all prices are in same currency for display
    return formData.items.reduce((sum, item) => sum + item.total_price, 0);
  };

  // Filter products by search term
  const filteredProductsForSelect = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Lütfen paket adı girin');
      return;
    }
    
    if (formData.items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin');
      return;
    }

    try {
      if (editingPackage) {
        await axios.put(`${API_URL}/api/packages/${editingPackage.id}`, formData);
        toast.success('Paket güncellendi');
      } else {
        await axios.post(`${API_URL}/api/packages`, formData);
        toast.success('Paket oluşturuldu');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      items: pkg.items || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu paketi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/packages/${id}`);
      toast.success('Paket silindi');
      fetchData();
    } catch (error) {
      toast.error('Paket silinemedi');
    }
  };

  const resetForm = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      items: []
    });
    setSelectedProduct('');
    setSelectedQuantity(1);
    setProductSearchTerm('');
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="packages-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Paketler</h1>
          <p className="text-muted-foreground mt-1">{packages.length} paket listeleniyor</p>
        </div>
        {canManage && (
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-package-btn">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Paket
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Paket ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="package-search"
        />
      </div>

      {/* Packages Grid */}
      {filteredPackages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => (
            <Card key={pkg.id} className="hover:shadow-md transition-shadow" data-testid={`package-${pkg.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(pkg)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(pkg.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Items list */}
                <div className="space-y-2 mb-4">
                  {pkg.items?.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground truncate flex-1 mr-2">
                        {item.product_name}
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        x{item.quantity}
                      </Badge>
                    </div>
                  ))}
                  {pkg.items?.length > 4 && (
                    <p className="text-xs text-muted-foreground">+{pkg.items.length - 4} ürün daha</p>
                  )}
                </div>
                
                {/* Totals */}
                <div className="pt-3 border-t space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Toplam (USD)</span>
                    <span className="font-semibold">{formatUSD(pkg.total_price_usd)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Toplam (TL)</span>
                    <span className="font-semibold text-primary">{formatTRY(pkg.total_price_tl)}</span>
                  </div>
                </div>
                
                {/* Meta */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    {pkg.items?.length || 0} ürün • Oluşturan: {pkg.created_by_name}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz paket oluşturulmadı'}
            </p>
            {canManage && !searchTerm && (
              <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                İlk Paketi Oluştur
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="package-modal">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Package Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Paket Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Ev Tipi Solar Paketi"
                required
                data-testid="package-name-input"
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Paket açıklaması (opsiyonel)"
                data-testid="package-desc-input"
              />
            </div>
            
            {/* Add Product */}
            <div className="space-y-2">
              <Label>Ürün Ekle</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Ürün adı yazarak arayın..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full"
                    data-testid="product-search-input"
                  />
                  {productSearchTerm && filteredProductsForSelect.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredProductsForSelect.map((product) => (
                        <div
                          key={product.id}
                          className={cn(
                            "px-3 py-2 cursor-pointer hover:bg-accent text-sm",
                            selectedProduct === product.id && "bg-accent"
                          )}
                          onClick={() => {
                            setSelectedProduct(product.id);
                            setProductSearchTerm(product.name);
                          }}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(product.sale_price, product.currency)} • Stok: {product.stock_quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {productSearchTerm && filteredProductsForSelect.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                      Ürün bulunamadı
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
                  data-testid="quantity-input"
                />
                <Button type="button" onClick={handleAddItem} data-testid="add-item-btn">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Items List */}
            {formData.items.length > 0 && (
              <div className="space-y-2">
                <Label>Paket İçeriği ({formData.items.length} ürün)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead className="text-center w-24">Adet</TableHead>
                        <TableHead className="text-right">Birim Fiyat</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateItemQuantity(index, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateItemQuantity(index, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price, item.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total_price, item.currency)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Total */}
                <div className="flex justify-end">
                  <div className="bg-primary/10 px-4 py-2 rounded-lg">
                    <span className="text-sm text-muted-foreground mr-2">Paket Toplamı:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatUSD(calculateTotalUSD())}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="package-submit-btn">
                {editingPackage ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Packages;
