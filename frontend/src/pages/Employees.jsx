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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Plus, Pencil, Trash2, Search, Users, MoreVertical, UserCircle, Calendar, Banknote, Clock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatTRY = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
  } catch {
    return dateStr;
  }
};

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    employee_no: '',
    position: '',
    employment_type: 'monthly',
    monthly_salary: '',
    daily_wage: '',
    start_date: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('hr_manage');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/employees`);
      setEmployees(response.data);
    } catch (error) {
      toast.error('Personel listesi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.employee_no || !formData.position) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    const submitData = {
      ...formData,
      monthly_salary: parseFloat(formData.monthly_salary) || 0,
      daily_wage: parseFloat(formData.daily_wage) || 0
    };

    try {
      if (editingEmployee) {
        await axios.put(`${API_URL}/api/employees/${editingEmployee.id}`, submitData);
        toast.success('Personel güncellendi');
      } else {
        await axios.post(`${API_URL}/api/employees`, submitData);
        toast.success('Personel eklendi');
      }
      setIsModalOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || '',
      employee_no: employee.employee_no || '',
      position: employee.position || '',
      employment_type: employee.employment_type || 'monthly',
      monthly_salary: employee.monthly_salary?.toString() || '',
      daily_wage: employee.daily_wage?.toString() || '',
      start_date: employee.start_date || '',
      phone: employee.phone || '',
      email: employee.email || '',
      address: employee.address || '',
      notes: employee.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu personeli silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/employees/${id}`);
      toast.success('Personel silindi');
      fetchEmployees();
    } catch (error) {
      toast.error('Personel silinemedi');
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      employee_no: '',
      position: '',
      employment_type: 'monthly',
      monthly_salary: '',
      daily_wage: '',
      start_date: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'monthly') return matchesSearch && emp.employment_type === 'monthly';
    if (activeTab === 'daily') return matchesSearch && emp.employment_type === 'daily';
    return matchesSearch;
  });

  // Stats
  const totalEmployees = employees.length;
  const monthlyEmployees = employees.filter(e => e.employment_type === 'monthly').length;
  const dailyEmployees = employees.filter(e => e.employment_type === 'daily').length;
  const totalSalary = employees.reduce((sum, e) => sum + (e.monthly_salary || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="employees-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Personel Yönetimi</h1>
          <p className="text-muted-foreground mt-1">{totalEmployees} personel kayıtlı</p>
        </div>
        {canManage && (
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-employee-btn">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Personel
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Toplam Personel</p>
                <p className="text-2xl font-bold">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Aylık Maaşlı</p>
                <p className="text-2xl font-bold">{monthlyEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Günlük Yevmiye</p>
                <p className="text-2xl font-bold">{dailyEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Toplam Maaş</p>
                <p className="text-xl font-bold">{formatTRY(totalSalary)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">Tümü ({totalEmployees})</TabsTrigger>
            <TabsTrigger value="monthly">Aylık ({monthlyEmployees})</TabsTrigger>
            <TabsTrigger value="daily">Günlük ({dailyEmployees})</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Personel ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="employee-search"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personel No</TableHead>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Pozisyon</TableHead>
                <TableHead>Çalışma Tipi</TableHead>
                <TableHead className="text-right">Maaş/Yevmiye</TableHead>
                <TableHead>İşe Giriş</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} data-testid={`employee-${employee.id}`}>
                    <TableCell className="font-mono">{employee.employee_no}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>
                      <Badge variant={employee.employment_type === 'monthly' ? 'default' : 'secondary'}>
                        {employee.employment_type === 'monthly' ? 'Aylık' : 'Günlük'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {employee.employment_type === 'monthly' 
                        ? formatTRY(employee.monthly_salary)
                        : `${formatTRY(employee.daily_wage)}/gün`
                      }
                    </TableCell>
                    <TableCell>{formatDate(employee.start_date)}</TableCell>
                    <TableCell>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(employee.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz personel kaydı yok'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="employee-modal">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Personel Düzenle' : 'Yeni Personel Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_no">Personel No *</Label>
                <Input
                  id="employee_no"
                  value={formData.employee_no}
                  onChange={(e) => setFormData({ ...formData, employee_no: e.target.value })}
                  placeholder="P001"
                  required
                  data-testid="employee-no-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ad Soyad"
                  required
                  data-testid="employee-name-input"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Pozisyon *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Satış Temsilcisi"
                  required
                  data-testid="employee-position-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employment_type">Çalışma Tipi</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
                >
                  <SelectTrigger data-testid="employment-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Aylık Maaşlı</SelectItem>
                    <SelectItem value="daily">Günlük Yevmiye</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_salary">
                  {formData.employment_type === 'monthly' ? 'Aylık Maaş (TL)' : 'Günlük Yevmiye (TL)'}
                </Label>
                <Input
                  id="monthly_salary"
                  type="number"
                  value={formData.employment_type === 'monthly' ? formData.monthly_salary : formData.daily_wage}
                  onChange={(e) => {
                    if (formData.employment_type === 'monthly') {
                      setFormData({ ...formData, monthly_salary: e.target.value });
                    } else {
                      setFormData({ ...formData, daily_wage: e.target.value });
                    }
                  }}
                  placeholder="0"
                  data-testid="salary-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">İşe Giriş Tarihi</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  data-testid="start-date-input"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05xx xxx xx xx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adres"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ek notlar"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="employee-submit-btn">
                {editingEmployee ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
