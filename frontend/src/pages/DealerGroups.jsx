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
import { Plus, Pencil, Trash2, Users, Percent } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatDate, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DealerGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_rate: ''
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dealer-groups`);
      setGroups(response.data);
    } catch (error) {
      toast.error('Bayi grupları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      discount_rate: parseFloat(formData.discount_rate) || 0
    };

    try {
      if (editingGroup) {
        await axios.put(`${API_URL}/api/dealer-groups/${editingGroup.id}`, data);
        toast.success('Bayi grubu güncellendi');
      } else {
        await axios.post(`${API_URL}/api/dealer-groups`, data);
        toast.success('Bayi grubu eklendi');
      }
      setIsModalOpen(false);
      resetForm();
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu bayi grubunu silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/dealer-groups/${id}`);
      toast.success('Bayi grubu silindi');
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Silme başarısız');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      discount_rate: group.discount_rate?.toString() || '0'
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      discount_rate: ''
    });
  };

  const getGroupColor = (name) => {
    const colors = {
      'Silver': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      'Gold': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Plus': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'Platinum': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    };
    return colors[name] || 'bg-primary/10 text-primary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dealer-groups-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Bayi Grupları</h1>
          <p className="text-muted-foreground mt-1">Bayi iskonto gruplarını yönetin</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-dealer-group-btn">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Grup
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>İskonto Oranı:</strong> Her bayi grubuna iskonto oranı belirleyin. 
            Bayi fiyatı = Maliyet (KDV dahil alış) × (1 + İskonto Oranı / 100) formülü ile hesaplanır.
            <br />
            <strong>Örnek:</strong> Maliyet $100, İskonto %10 → Bayi Fiyatı = $100 × 1.10 = $110
          </p>
        </CardContent>
      </Card>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card key={group.id} className="hover:shadow-md transition-shadow" data-testid={`dealer-group-card-${group.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">
                    <span className={cn("px-2 py-1 rounded-md text-sm font-bold", getGroupColor(group.name))}>
                      {group.name}
                    </span>
                  </CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(group)}
                    data-testid={`edit-dealer-group-${group.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(group.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`delete-dealer-group-${group.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {group.description || 'Açıklama yok'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">İskonto Oranı:</span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-lg font-bold">
                  <Percent className="h-4 w-4" />
                  {group.discount_rate}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {groups.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              Henüz bayi grubu eklenmedi. Bayi eklemeden önce en az bir grup oluşturun.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" data-testid="dealer-group-modal">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Bayi Grubu Düzenle' : 'Yeni Bayi Grubu Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Grup Adı</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Örn: Silver, Gold, Plus, Platinum"
                required
                data-testid="dealer-group-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Grup açıklaması"
                data-testid="dealer-group-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_rate">İskonto Oranı (%)</Label>
              <div className="relative">
                <Input
                  id="discount_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount_rate}
                  onChange={(e) => setFormData({...formData, discount_rate: e.target.value})}
                  placeholder="10"
                  data-testid="dealer-group-discount-input"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu gruptaki bayilerin maliyet üzerine alacağı iskonto yüzdesi.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="dealer-group-submit-btn">
                {editingGroup ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerGroups;
