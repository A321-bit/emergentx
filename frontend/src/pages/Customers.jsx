import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
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
import { Textarea } from '../components/ui/textarea';
import { Plus, Pencil, Trash2, Search, User, Building2, Tags, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatDate, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Customers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customer_type: 'bireysel',
    name: '',
    phone: '',
    email: '',
    tc_kimlik: '',
    company_name: '',
    tax_number: '',
    tax_office: '',
    city: '',
    district: '',
    address: '',
    customer_category_id: '',
    customer_source_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, catRes, srcRes] = await Promise.all([
        axios.get(`${API_URL}/api/customers`),
        axios.get(`${API_URL}/api/customer-categories`),
        axios.get(`${API_URL}/api/customer-sources`)
      ]);
      setCustomers(customersRes.data);
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
    
    const data = { ...formData };
    // Clean empty strings
    Object.keys(data).forEach(key => {
      if (data[key] === '') data[key] = null;
    });

    try {
      if (editingCustomer) {
        await axios.put(`${API_URL}/api/customers/${editingCustomer.id}`, data);
        toast.success('Müşteri güncellendi');
      } else {
        await axios.post(`${API_URL}/api/customers`, data);
        toast.success('Müşteri eklendi');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/customers/${id}`);
      toast.success('Müşteri silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_type: customer.customer_type || 'bireysel',
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      tc_kimlik: customer.tc_kimlik || '',
      company_name: customer.company_name || '',
      tax_number: customer.tax_number || '',
      tax_office: customer.tax_office || '',
      city: customer.city || '',
      district: customer.district || '',
      address: customer.address || '',
      customer_category_id: customer.customer_category_id || '',
      customer_source_id: customer.customer_source_id || '',
      notes: customer.notes || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      customer_type: 'bireysel',
      name: '',
      phone: '',
      email: '',
      tc_kimlik: '',
      company_name: '',
      tax_number: '',
      tax_office: '',
      city: '',
      district: '',
      address: '',
      customer_category_id: '',
      customer_source_id: '',
      notes: ''
    });
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm);
    const matchesType = typeFilter === 'all' || customer.customer_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="customers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Müşteriler</h1>
          <p className="text-muted-foreground mt-1">{customers.length} müşteri listeleniyor</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-customer-btn">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Müşteri
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ad veya telefon ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="customer-search"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="type-filter">
            <SelectValue placeholder="Müşteri Tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Tipler</SelectItem>
            <SelectItem value="bireysel">Bireysel</SelectItem>
            <SelectItem value="kurumsal">Kurumsal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tip</TableHead>
                <TableHead>Ad / Firma</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>İl / İlçe</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead>Kayıt</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id} data-testid={`customer-row-${customer.id}`}>
                  <TableCell>
                    {customer.customer_type === 'bireysel' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium">
                        <User className="h-3 w-3" />
                        Bireysel
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-medium">
                        <Building2 className="h-3 w-3" />
                        Kurumsal
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {customer.customer_type === 'kurumsal' && customer.company_name 
                      ? customer.company_name 
                      : customer.name}
                  </TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    {customer.city && customer.district 
                      ? `${customer.city} / ${customer.district}`
                      : customer.city || '-'}
                  </TableCell>
                  <TableCell>
                    {customer.category_name ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Tags className="h-3 w-3" />
                        {customer.category_name}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {customer.source_name ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {customer.source_name}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{formatDate(customer.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(customer)}
                        data-testid={`edit-customer-${customer.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(customer.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`delete-customer-${customer.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Müşteri bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="customer-modal">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Type */}
            <div className="space-y-2">
              <Label>Müşteri Tipi</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.customer_type === 'bireysel' ? 'default' : 'outline'}
                  onClick={() => setFormData({...formData, customer_type: 'bireysel'})}
                  className="flex-1"
                  data-testid="type-bireysel"
                >
                  <User className="h-4 w-4 mr-2" />
                  Bireysel
                </Button>
                <Button
                  type="button"
                  variant={formData.customer_type === 'kurumsal' ? 'default' : 'outline'}
                  onClick={() => setFormData({...formData, customer_type: 'kurumsal'})}
                  className="flex-1"
                  data-testid="type-kurumsal"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Kurumsal
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Common Fields */}
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="customer-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  data-testid="customer-phone-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  data-testid="customer-email-input"
                />
              </div>

              {/* Bireysel Fields */}
              {formData.customer_type === 'bireysel' && (
                <div className="space-y-2">
                  <Label htmlFor="tc_kimlik">T.C. Kimlik No</Label>
                  <Input
                    id="tc_kimlik"
                    value={formData.tc_kimlik}
                    onChange={(e) => setFormData({...formData, tc_kimlik: e.target.value})}
                    maxLength={11}
                    data-testid="customer-tc-input"
                  />
                </div>
              )}

              {/* Kurumsal Fields */}
              {formData.customer_type === 'kurumsal' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Firma Adı</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      data-testid="customer-company-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_number">Vergi No</Label>
                    <Input
                      id="tax_number"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({...formData, tax_number: e.target.value})}
                      data-testid="customer-taxno-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_office">Vergi Dairesi</Label>
                    <Input
                      id="tax_office"
                      value={formData.tax_office}
                      onChange={(e) => setFormData({...formData, tax_office: e.target.value})}
                      data-testid="customer-taxoffice-input"
                    />
                  </div>
                </>
              )}

              {/* Address Fields */}
              <div className="space-y-2">
                <Label htmlFor="city">İl</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="İstanbul"
                  data-testid="customer-city-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">İlçe</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  placeholder="Kadıköy"
                  data-testid="customer-district-input"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Açık Adres</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={2}
                  data-testid="customer-address-input"
                />
              </div>

              {/* Category & Source */}
              <div className="space-y-2">
                <Label htmlFor="customer_category_id">Müşteri Kategorisi</Label>
                <Select value={formData.customer_category_id || 'none'} onValueChange={(v) => setFormData({...formData, customer_category_id: v === 'none' ? '' : v})}>
                  <SelectTrigger data-testid="customer-category-select">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_source_id">Edinme Kaynağı</Label>
                <Select value={formData.customer_source_id || 'none'} onValueChange={(v) => setFormData({...formData, customer_source_id: v === 'none' ? '' : v})}>
                  <SelectTrigger data-testid="customer-source-select">
                    <SelectValue placeholder="Kaynak seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {sources.map((src) => (
                      <SelectItem key={src.id} value={src.id}>{src.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  data-testid="customer-notes-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="customer-submit-btn">
                {editingCustomer ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
