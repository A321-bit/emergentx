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
import { Plus, Pencil, Trash2, Search, Percent } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatDate, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dealers = () => {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    discount_rate: ''
  });

  useEffect(() => {
    fetchDealers();
  }, []);

  const fetchDealers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dealers`);
      setDealers(response.data);
    } catch (error) {
      toast.error('Bayiler yüklenemedi');
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
      if (editingDealer) {
        await axios.put(`${API_URL}/api/dealers/${editingDealer.id}`, data);
        toast.success('Bayi güncellendi');
      } else {
        await axios.post(`${API_URL}/api/dealers`, data);
        toast.success('Bayi eklendi');
      }
      setIsModalOpen(false);
      resetForm();
      fetchDealers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu bayiyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/dealers/${id}`);
      toast.success('Bayi silindi');
      fetchDealers();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleEdit = (dealer) => {
    setEditingDealer(dealer);
    setFormData({
      name: dealer.name,
      contact_person: dealer.contact_person,
      phone: dealer.phone,
      email: dealer.email || '',
      address: dealer.address || '',
      discount_rate: dealer.discount_rate.toString()
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingDealer(null);
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      discount_rate: ''
    });
  };

  const filteredDealers = dealers.filter(dealer =>
    dealer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dealer.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dealers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Bayiler</h1>
          <p className="text-muted-foreground mt-1">{dealers.length} bayi listeleniyor</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-dealer-btn">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Bayi
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Bayi ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="dealer-search"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bayi Adı</TableHead>
                <TableHead>Yetkili</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">İskonto Oranı</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDealers.map((dealer) => (
                <TableRow key={dealer.id} data-testid={`dealer-row-${dealer.id}`}>
                  <TableCell className="font-medium">{dealer.name}</TableCell>
                  <TableCell>{dealer.contact_person}</TableCell>
                  <TableCell>{dealer.phone}</TableCell>
                  <TableCell>{dealer.email}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium">
                      <Percent className="h-3 w-3" />
                      {dealer.discount_rate}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(dealer.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(dealer)}
                        data-testid={`edit-dealer-${dealer.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(dealer.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`delete-dealer-${dealer.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDealers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Bayi bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg" data-testid="dealer-modal">
          <DialogHeader>
            <DialogTitle>{editingDealer ? 'Bayi Düzenle' : 'Yeni Bayi Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Bayi Adı</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="dealer-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact_person">Yetkili Kişi</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  required
                  data-testid="dealer-contact-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  data-testid="dealer-phone-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  data-testid="dealer-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_rate">İskonto Oranı (%)</Label>
                <Input
                  id="discount_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount_rate}
                  onChange={(e) => setFormData({...formData, discount_rate: e.target.value})}
                  placeholder="0"
                  data-testid="dealer-discount-input"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  data-testid="dealer-address-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="dealer-submit-btn">
                {editingDealer ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dealers;
