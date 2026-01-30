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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { Plus, Pencil, Trash2, Folder, Sun, Battery, Zap, Home, Factory } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ICON_OPTIONS = [
  { value: 'sun', label: 'Güneş', icon: Sun },
  { value: 'battery', label: 'Batarya', icon: Battery },
  { value: 'zap', label: 'Enerji', icon: Zap },
  { value: 'home', label: 'Ev', icon: Home },
  { value: 'factory', label: 'Fabrika', icon: Factory },
  { value: 'folder', label: 'Klasör', icon: Folder },
];

const COLOR_OPTIONS = [
  { value: '#F59E0B', label: 'Turuncu' },
  { value: '#10B981', label: 'Yeşil' },
  { value: '#3B82F6', label: 'Mavi' },
  { value: '#8B5CF6', label: 'Mor' },
  { value: '#EF4444', label: 'Kırmızı' },
  { value: '#EC4899', label: 'Pembe' },
  { value: '#06B6D4', label: 'Turkuaz' },
  { value: '#84CC16', label: 'Lime' },
];

const getIconComponent = (iconName) => {
  const found = ICON_OPTIONS.find(i => i.value === iconName);
  return found ? found.icon : Folder;
};

const PackageCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'sun',
    color: '#F59E0B'
  });

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('products_manage');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/package-categories`);
      setCategories(res.data);
    } catch (error) {
      toast.error('Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      icon: 'sun',
      color: '#F59E0B'
    });
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'sun',
      color: category.color || '#F59E0B'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Kategori adı zorunludur');
      return;
    }

    try {
      if (editingCategory) {
        await axios.put(`${API_URL}/api/package-categories/${editingCategory.id}`, formData);
        toast.success('Kategori güncellendi');
      } else {
        await axios.post(`${API_URL}/api/package-categories`, formData);
        toast.success('Kategori oluşturuldu');
      }
      setIsModalOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/package-categories/${id}`);
      toast.success('Kategori silindi');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Silme işlemi başarısız');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="package-categories-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Paket Kategorileri</h1>
          <p className="text-muted-foreground mt-1">
            Solar paket türlerini buradan yönetin
          </p>
        </div>
        {canManage && (
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="new-category-btn">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Kategori
          </Button>
        )}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          return (
            <Card 
              key={category.id} 
              className="cursor-pointer hover:shadow-lg transition-all group"
              onClick={() => handleEdit(category)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${category.color || '#F59E0B'}20` }}
                  >
                    <IconComponent 
                      className="h-6 w-6" 
                      style={{ color: category.color || '#F59E0B' }}
                    />
                  </div>
                  {canManage && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleEdit(category); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={(e) => { e.stopPropagation(); handleDelete(category.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold mt-3">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {category.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        
        {categories.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              Henüz kategori eklenmemiş. İlk kategorinizi oluşturun.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Paket Kategorisi'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori Adı *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: On-Grid, Off-Grid, Hibrit..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Kategori hakkında kısa açıklama"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>İkon</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`p-2 rounded-lg border-2 transition-all ${
                          formData.icon === opt.value 
                            ? 'border-primary bg-primary/10' 
                            : 'border-transparent hover:bg-accent'
                        }`}
                        onClick={() => setFormData({ ...formData, icon: opt.value })}
                        title={opt.label}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Renk</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === opt.value 
                          ? 'border-foreground scale-110' 
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: opt.value }}
                      onClick={() => setFormData({ ...formData, color: opt.value })}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Preview */}
            <div className="p-4 bg-accent/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Önizleme:</p>
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${formData.color}20` }}
                >
                  {(() => {
                    const PreviewIcon = getIconComponent(formData.icon);
                    return <PreviewIcon className="h-5 w-5" style={{ color: formData.color }} />;
                  })()}
                </div>
                <span className="font-medium">{formData.name || 'Kategori Adı'}</span>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit">
                {editingCategory ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackageCategories;
