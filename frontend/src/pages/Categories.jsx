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
import { Plus, Pencil, Trash2, Folder, Percent } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatDate } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_profit_margin: '30'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/categories`);
      setCategories(response.data);
    } catch (error) {
      toast.error('Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      default_profit_margin: parseFloat(formData.default_profit_margin) || 30
    };

    try {
      if (editingCategory) {
        await axios.put(`${API_URL}/api/categories/${editingCategory.id}`, data);
        toast.success('Kategori güncellendi');
      } else {
        await axios.post(`${API_URL}/api/categories`, data);
        toast.success('Kategori eklendi');
      }
      setIsModalOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/categories/${id}`);
      toast.success('Kategori silindi');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Silme başarısız');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      default_profit_margin: category.default_profit_margin?.toString() || '30'
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      default_profit_margin: '30'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="categories-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Kategoriler</h1>
          <p className="text-muted-foreground mt-1">Ürün kategorilerini yönetin</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-category-btn">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kategori
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Kar Marjı:</strong> Her kategoriye varsayılan kar marjı belirleyebilirsiniz. 
            Ürün eklerken bu marj otomatik olarak uygulanır. Ürün bazında farklı marj da belirleyebilirsiniz.
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori Adı</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-center">Varsayılan Kar Marjı</TableHead>
                <TableHead>Oluşturulma</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id} data-testid={`category-row-${category.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-primary" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      <Percent className="h-3 w-3" />
                      {category.default_profit_margin}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(category.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                        data-testid={`edit-category-${category.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`delete-category-${category.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Henüz kategori eklenmedi. Ürün eklemeden önce en az bir kategori oluşturun.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" data-testid="category-modal">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Kategori Adı</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Örn: Panel, İnverter, Batarya"
                required
                data-testid="category-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Kategori açıklaması"
                data-testid="category-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_profit_margin">Varsayılan Kar Marjı (%)</Label>
              <div className="relative">
                <Input
                  id="default_profit_margin"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.default_profit_margin}
                  onChange={(e) => setFormData({...formData, default_profit_margin: e.target.value})}
                  placeholder="30"
                  data-testid="category-margin-input"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu kategorideki ürünler için varsayılan kar marjı. Örn: 35 girerseniz, maliyet 1.35 ile çarpılır.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="category-submit-btn">
                {editingCategory ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
