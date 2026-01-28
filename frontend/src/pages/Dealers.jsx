import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
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
import { Plus, Pencil, Trash2, Search, Percent, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatDate, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dealers = () => {
  const [dealers, setDealers] = useState([]);
  const [dealerGroups, setDealerGroups] = useState([]);
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
    dealer_group_id: '',
    create_user: false,
    user_email: '',
    user_password: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dealersRes, groupsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dealers`),
        axios.get(`${API_URL}/api/dealer-groups`)
      ]);
      setDealers(dealersRes.data);
      setDealerGroups(groupsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      contact_person: formData.contact_person,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address || null,
      dealer_group_id: formData.dealer_group_id || null,
      create_user: formData.create_user,
      user_email: formData.create_user ? formData.user_email : null,
      user_password: formData.create_user ? formData.user_password : null
    };

    try {
      if (editingDealer) {
        // For update, don't send user creation fields
        const updateData = {
          name: formData.name,
          contact_person: formData.contact_person,
          phone: formData.phone,
          email: formData.email || null,
          address: formData.address || null,
          dealer_group_id: formData.dealer_group_id || null
        };
        await axios.put(`${API_URL}/api/dealers/${editingDealer.id}`, updateData);
        toast.success('Bayi güncellendi');
      } else {
        await axios.post(`${API_URL}/api/dealers`, data);
        toast.success(data.create_user ? 'Bayi ve kullanıcı hesabı oluşturuldu' : 'Bayi eklendi');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu bayiyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/dealers/${id}`);
      toast.success('Bayi silindi');
      fetchData();
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
      dealer_group_id: dealer.dealer_group_id || '',
      create_user: false,
      user_email: '',
      user_password: ''
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
      dealer_group_id: '',
      create_user: false,
      user_email: '',
      user_password: ''
    });
  };

  const getGroupInfo = (groupId) => {
    return dealerGroups.find(g => g.id === groupId);
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

      {/* Warning if no groups */}
      {dealerGroups.length === 0 && (
        <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Henüz bayi grubu eklenmedi. Bayilere iskonto uygulayabilmek için <strong>Bayi Grupları</strong> sayfasından grup oluşturun.
            </p>
          </CardContent>
        </Card>
      )}

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
                <TableHead className="text-center">Bayi Grubu</TableHead>
                <TableHead className="text-center">İskonto</TableHead>
                <TableHead className="text-center">Hesap</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDealers.map((dealer) => {
                const group = getGroupInfo(dealer.dealer_group_id);
                return (
                  <TableRow key={dealer.id} data-testid={`dealer-row-${dealer.id}`}>
                    <TableCell className="font-medium">{dealer.name}</TableCell>
                    <TableCell>{dealer.contact_person}</TableCell>
                    <TableCell>{dealer.phone}</TableCell>
                    <TableCell>{dealer.email || '-'}</TableCell>
                    <TableCell className="text-center">
                      {group ? (
                        <span className={cn("px-2 py-1 rounded-md text-xs font-bold", getGroupColor(group.name))}>
                          {group.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Atanmadı</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {dealer.discount_rate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm font-bold">
                          <Percent className="h-3 w-3" />
                          {dealer.discount_rate}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {dealer.user_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                          <UserPlus className="h-3 w-3" />
                          Var
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Yok</span>
                      )}
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
                );
              })}
              {filteredDealers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                <Label htmlFor="dealer_group_id">Bayi Grubu</Label>
                <Select value={formData.dealer_group_id || 'none'} onValueChange={(v) => setFormData({...formData, dealer_group_id: v === 'none' ? '' : v})}>
                  <SelectTrigger data-testid="dealer-group-select">
                    <SelectValue placeholder="Grup seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {dealerGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <span className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {group.name} (%{group.discount_rate} iskonto)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* User Account Section - Only for new dealers */}
            {!editingDealer && (
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="create_user"
                      checked={formData.create_user}
                      onCheckedChange={(checked) => setFormData({...formData, create_user: checked})}
                      data-testid="create-user-checkbox"
                    />
                    <label htmlFor="create_user" className="text-sm font-medium cursor-pointer">
                      Bayi için kullanıcı hesabı oluştur
                    </label>
                  </div>

                  {formData.create_user && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="user_email">Kullanıcı Email</Label>
                        <Input
                          id="user_email"
                          type="email"
                          value={formData.user_email}
                          onChange={(e) => setFormData({...formData, user_email: e.target.value})}
                          required={formData.create_user}
                          placeholder="bayi@email.com"
                          data-testid="dealer-user-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user_password">Şifre</Label>
                        <Input
                          id="user_password"
                          type="password"
                          value={formData.user_password}
                          onChange={(e) => setFormData({...formData, user_password: e.target.value})}
                          required={formData.create_user}
                          placeholder="••••••••"
                          data-testid="dealer-user-password"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
