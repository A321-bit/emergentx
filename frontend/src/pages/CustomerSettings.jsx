import React, { useState, useEffect } from 'react';
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
import { Plus, Trash2, Tags, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatDate } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CustomerSettings = () => {
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('category'); // category or source
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, srcRes] = await Promise.all([
        axios.get(`${API_URL}/api/customer-categories`),
        axios.get(`${API_URL}/api/customer-sources`)
      ]);
      setCategories(catRes.data);
      setSources(srcRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const endpoint = modalType === 'category' ? '/api/customer-categories' : '/api/customer-sources';
      await axios.post(`${API_URL}${endpoint}`, formData);
      toast.success(modalType === 'category' ? 'Kategori eklendi' : 'Kaynak eklendi');
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/customer-categories/${id}`);
      toast.success('Kategori silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleDeleteSource = async (id) => {
    if (!window.confirm('Bu kaynağı silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/customer-sources/${id}`);
      toast.success('Kaynak silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="customer-settings-page">
      {/* Header */}
      <div>
        <h1 className="page-title">Müşteri Ayarları</h1>
        <p className="text-muted-foreground mt-1">Müşteri kategorileri ve edinme kaynaklarını yönetin</p>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Müşteri Kategorileri
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Edinme Kaynakları
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="section-title">Müşteri Kategorileri</CardTitle>
                <p className="text-sm text-muted-foreground">On-Grid, Off-Grid, Sulama vb. sistem tipleri</p>
              </div>
              <Button onClick={() => openModal('category')} data-testid="add-customer-category-btn">
                <Plus className="h-4 w-4 mr-2" />
                Kategori Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori Adı</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Tags className="h-4 w-4 text-primary" />
                          {cat.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                      <TableCell>{formatDate(cat.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Henüz kategori eklenmedi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="section-title">Müşteri Edinme Kaynakları</CardTitle>
                <p className="text-sm text-muted-foreground">Santral, Referans, Facebook, Instagram vb.</p>
              </div>
              <Button onClick={() => openModal('source')} data-testid="add-customer-source-btn">
                <Plus className="h-4 w-4 mr-2" />
                Kaynak Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kaynak Adı</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((src) => (
                    <TableRow key={src.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-accent" />
                          {src.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{src.description || '-'}</TableCell>
                      <TableCell>{formatDate(src.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSource(src.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sources.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Henüz kaynak eklenmedi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" data-testid="customer-setting-modal">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'category' ? 'Yeni Müşteri Kategorisi' : 'Yeni Edinme Kaynağı'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ad</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={modalType === 'category' ? 'Örn: On-Grid, Off-Grid' : 'Örn: Facebook, Referans'}
                required
                data-testid="setting-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Açıklama"
                data-testid="setting-description-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="setting-submit-btn">
                Ekle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerSettings;
