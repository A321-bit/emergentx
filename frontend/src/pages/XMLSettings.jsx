import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { 
  Plus, Pencil, Trash2, Save, CloudDownload, RefreshCw, Eye, Play, 
  CheckCircle, XCircle, AlertCircle, Loader2, Link2, Package, FolderTree,
  ArrowRight, Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const XMLSettings = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [xmlCategories, setXmlCategories] = useState([]);
  const [categoryMappings, setCategoryMappings] = useState({});
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(false);

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    xml_url: '',
    prefix: '',
    default_vat_rate: 20,
    default_profit_margin: 30,
    auto_sync_enabled: false,
    sync_interval_hours: 24
  });

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('products_manage');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suppliersRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/api/xml-suppliers`),
        axios.get(`${API_URL}/api/categories`)
      ]);
      setSuppliers(suppliersRes.data);
      setCategories(categoriesRes.data.filter(c => c.is_active));
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSupplierModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({
        name: supplier.name || '',
        xml_url: supplier.xml_url || '',
        prefix: supplier.prefix || '',
        default_vat_rate: supplier.default_vat_rate || 20,
        default_profit_margin: supplier.default_profit_margin || 30,
        auto_sync_enabled: supplier.auto_sync_enabled || false,
        sync_interval_hours: supplier.sync_interval_hours || 24
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({
        name: '',
        xml_url: '',
        prefix: '',
        default_vat_rate: 20,
        default_profit_margin: 30,
        auto_sync_enabled: false,
        sync_interval_hours: 24
      });
    }
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name) {
      toast.error('Tedarikçi adı zorunludur');
      return;
    }

    try {
      if (editingSupplier) {
        await axios.put(`${API_URL}/api/xml-suppliers/${editingSupplier.id}`, supplierForm);
        toast.success('Tedarikçi güncellendi');
      } else {
        await axios.post(`${API_URL}/api/xml-suppliers`, supplierForm);
        toast.success('Tedarikçi eklendi');
      }
      setIsSupplierModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!window.confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/xml-suppliers/${supplierId}`);
      toast.success('Tedarikçi silindi');
      fetchData();
    } catch (error) {
      toast.error('Tedarikçi silinemedi');
    }
  };

  const handleOpenMappingModal = async (supplier) => {
    setSelectedSupplier(supplier);
    setCategoryMappings(supplier.category_mappings || {});
    setIsMappingModalOpen(true);
    
    // Fetch XML categories
    await fetchXmlCategories(supplier.id);
  };

  const fetchXmlCategories = async (supplierId) => {
    setFetchingCategories(true);
    try {
      const response = await axios.post(`${API_URL}/api/xml-suppliers/${supplierId}/fetch-categories`);
      setXmlCategories(response.data.xml_categories || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'XML kategorileri alınamadı');
    } finally {
      setFetchingCategories(false);
    }
  };

  const handleSaveMappings = async () => {
    try {
      await axios.put(`${API_URL}/api/xml-suppliers/${selectedSupplier.id}/category-mappings`, {
        mappings: categoryMappings
      });
      toast.success('Kategori eşleştirmeleri kaydedildi');
      setIsMappingModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Eşleştirmeler kaydedilemedi');
    }
  };

  const handlePreview = async (supplier) => {
    try {
      const response = await axios.post(`${API_URL}/api/xml-suppliers/${supplier.id}/preview`);
      setPreview({ ...response.data, supplierId: supplier.id });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Önizleme hatası');
    }
  };

  const handleImport = async (supplier) => {
    // Check for unmapped categories
    const supplierData = suppliers.find(s => s.id === supplier.id);
    const mappings = supplierData?.category_mappings || {};
    
    if (Object.keys(mappings).length === 0) {
      toast.error('Önce kategori eşleştirmesi yapmalısınız');
      return;
    }
    
    if (!window.confirm('Ürün aktarımı başlatılsın mı?')) return;
    
    setImporting(true);
    try {
      const response = await axios.post(`${API_URL}/api/xml-suppliers/${supplier.id}/import`, {
        skip_without_price: true,
        update_existing: true,
        skip_unmapped: true
      });
      
      const stats = response.data.stats;
      toast.success(
        `Import tamamlandı! ${stats.created} yeni, ${stats.updated} güncelleme, ${stats.skipped_unmapped} eşleştirilmemiş atlandı`,
        { duration: 5000 }
      );
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import hatası');
    } finally {
      setImporting(false);
    }
  };

  const getMappedCount = (supplier) => {
    const mappings = supplier.category_mappings || {};
    return Object.keys(mappings).filter(k => mappings[k]).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="xml-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">XML Ayarları</h1>
          <p className="text-muted-foreground">B2B tedarikçilerden ürün aktarımı</p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenSupplierModal()} data-testid="add-supplier-btn">
            <Plus className="h-4 w-4 mr-2" />
            Tedarikçi Ekle
          </Button>
        )}
      </div>

      {/* Suppliers List */}
      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CloudDownload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Henüz tedarikçi eklenmemiş</h3>
            <p className="text-muted-foreground mb-4">
              XML feed&apos;i olan tedarikçileri ekleyerek ürünleri otomatik aktarabilirsiniz
            </p>
            {canManage && (
              <Button onClick={() => handleOpenSupplierModal()}>
                <Plus className="h-4 w-4 mr-2" />
                İlk Tedarikçiyi Ekle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} data-testid={`supplier-card-${supplier.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {supplier.prefix || 'Prefix yok'}
                        </Badge>
                        {supplier.auto_sync_enabled && (
                          <Badge variant="secondary" className="text-xs">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {supplier.sync_interval_hours}s otomatik
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenSupplierModal(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* XML URL */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  <span className="truncate">{supplier.xml_url || 'URL ayarlanmamış'}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{getMappedCount(supplier)}</div>
                    <div className="text-xs text-muted-foreground">Eşleştirilmiş Kategori</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{supplier.default_vat_rate}%</div>
                    <div className="text-xs text-muted-foreground">KDV Oranı</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{supplier.default_profit_margin}%</div>
                    <div className="text-xs text-muted-foreground">Kar Marjı</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    {supplier.last_sync ? (
                      <>
                        <div className="text-sm font-medium text-green-600">
                          <CheckCircle className="h-4 w-4 inline mr-1" />
                          Senkronize
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(supplier.last_sync).toLocaleDateString('tr-TR')}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        Henüz senkronize edilmedi
                      </div>
                    )}
                  </div>
                </div>

                {/* Last Sync Result */}
                {supplier.last_sync_result?.stats && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
                    <span className="text-green-700 dark:text-green-300">
                      Son aktarım: {supplier.last_sync_result.stats.created} yeni, 
                      {' '}{supplier.last_sync_result.stats.updated} güncelleme
                      {supplier.last_sync_result.stats.skipped_unmapped > 0 && (
                        <>, {supplier.last_sync_result.stats.skipped_unmapped} eşleştirilmemiş atlandı</>
                      )}
                    </span>
                  </div>
                )}

                {/* Actions */}
                {canManage && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenMappingModal(supplier)}
                      data-testid={`mapping-btn-${supplier.id}`}
                    >
                      <FolderTree className="h-4 w-4 mr-2" />
                      Kategori Eşleştir
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePreview(supplier)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Önizleme
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleImport(supplier)}
                      disabled={importing || getMappedCount(supplier) === 0}
                    >
                      {importing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Ürünleri Aktar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Results */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Önizleme: {preview.supplier_name}
              {preview.prefix && <Badge variant="outline">{preview.prefix}-</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{preview.total_products}</div>
                <div className="text-sm text-muted-foreground">Toplam Ürün</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{preview.with_price}</div>
                <div className="text-sm text-muted-foreground">Fiyatlı</div>
              </div>
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <div className="text-3xl font-bold text-amber-600">{preview.without_price}</div>
                <div className="text-sm text-muted-foreground">Fiyatsız</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <div className="text-3xl font-bold text-emerald-600">{preview.in_stock}</div>
                <div className="text-sm text-muted-foreground">Stokta</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <div className="text-3xl font-bold text-red-600">{preview.unmapped_categories}</div>
                <div className="text-sm text-muted-foreground">Eşleştirilmemiş Kategori</div>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-medium mb-3">Kategoriler</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.categories || {}).map(([cat, info]) => (
                  <Badge 
                    key={cat} 
                    variant={info.mapped ? "default" : "destructive"}
                    className="text-sm"
                  >
                    {info.mapped ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {cat}: {info.count}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sample Products */}
            <div>
              <h4 className="font-medium mb-3">Örnek Ürünler</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.sample_products?.map((product, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    {product.images?.[0] && (
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        <Badge variant="outline" className="mr-2 text-xs">
                          {preview.prefix}-{product.product_code}
                        </Badge>
                        {product.name}
                      </div>
                      <div className="text-sm text-muted-foreground">{product.category_name}</div>
                    </div>
                    <div className="text-right">
                      {product.price_usd ? (
                        <div className="font-semibold text-green-600">${product.price_usd.toFixed(2)}</div>
                      ) : (
                        <div className="text-amber-600 text-sm">Fiyat Yok</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" onClick={() => setPreview(null)}>
              Önizlemeyi Kapat
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Supplier Modal */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tedarikçi Adı *</Label>
                <Input
                  id="name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                  placeholder="Mexxsun"
                  data-testid="supplier-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefix">Ürün Kodu Prefix</Label>
                <Input
                  id="prefix"
                  value={supplierForm.prefix}
                  onChange={(e) => setSupplierForm({...supplierForm, prefix: e.target.value.toUpperCase()})}
                  placeholder="MXS"
                  maxLength={5}
                  data-testid="supplier-prefix-input"
                />
                <p className="text-xs text-muted-foreground">Örn: MXS-12345</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="xml_url">XML Feed URL</Label>
              <Input
                id="xml_url"
                value={supplierForm.xml_url}
                onChange={(e) => setSupplierForm({...supplierForm, xml_url: e.target.value})}
                placeholder="https://example.com/api/xml/products"
                data-testid="supplier-url-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Varsayılan KDV (%)</Label>
                <Input
                  type="number"
                  value={supplierForm.default_vat_rate}
                  onChange={(e) => setSupplierForm({...supplierForm, default_vat_rate: parseFloat(e.target.value) || 0})}
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Varsayılan Kar Marjı (%)</Label>
                <Input
                  type="number"
                  value={supplierForm.default_profit_margin}
                  onChange={(e) => setSupplierForm({...supplierForm, default_profit_margin: parseFloat(e.target.value) || 0})}
                  min="0"
                  max="200"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Otomatik Senkronizasyon
                </Label>
                <p className="text-sm text-muted-foreground">
                  Her {supplierForm.sync_interval_hours} saatte bir güncelle
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  className="w-20"
                  value={supplierForm.sync_interval_hours}
                  onChange={(e) => setSupplierForm({...supplierForm, sync_interval_hours: parseInt(e.target.value) || 24})}
                  min="1"
                  max="168"
                />
                <Switch
                  checked={supplierForm.auto_sync_enabled}
                  onCheckedChange={(checked) => setSupplierForm({...supplierForm, auto_sync_enabled: checked})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplierModalOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveSupplier} data-testid="save-supplier-btn">
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Mapping Modal */}
      <Dialog open={isMappingModalOpen} onOpenChange={setIsMappingModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Kategori Eşleştirme: {selectedSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {fetchingCategories ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">XML kategorileri alınıyor...</span>
              </div>
            ) : xmlCategories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>XML kategorileri alınamadı veya XML&apos;de kategori bulunamadı</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => fetchXmlCategories(selectedSupplier?.id)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tekrar Dene
                </Button>
              </div>
            ) : (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                  <p className="text-blue-700 dark:text-blue-300">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    XML&apos;den gelen her kategoriyi kendi sisteminizde bir kategori ile eşleştirin. 
                    Eşleştirilmemiş kategorilerdeki ürünler aktarılmayacaktır.
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">XML Kategorisi</TableHead>
                      <TableHead className="w-[80px]">Ürün</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Sistem Kategorisi</TableHead>
                      <TableHead className="w-[80px]">Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {xmlCategories.map((xmlCat) => {
                      const isMapped = categoryMappings[xmlCat.name] && categoryMappings[xmlCat.name] !== '';
                      return (
                        <TableRow key={xmlCat.name}>
                          <TableCell className="font-medium">{xmlCat.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{xmlCat.product_count}</Badge>
                          </TableCell>
                          <TableCell>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={categoryMappings[xmlCat.name] || ''}
                              onValueChange={(value) => {
                                setCategoryMappings({
                                  ...categoryMappings,
                                  [xmlCat.name]: value
                                });
                              }}
                            >
                              <SelectTrigger data-testid={`mapping-select-${xmlCat.name}`}>
                                <SelectValue placeholder="Kategori seçin..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Eşleştirme yok</SelectItem>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {isMapped ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    {Object.keys(categoryMappings).filter(k => categoryMappings[k]).length} / {xmlCategories.length} kategori eşleştirildi
                  </span>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsMappingModalOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveMappings} disabled={fetchingCategories} data-testid="save-mappings-btn">
              <Save className="h-4 w-4 mr-2" />
              Eşleştirmeleri Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default XMLSettings;
