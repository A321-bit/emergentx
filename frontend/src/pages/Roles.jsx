import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
import { Checkbox } from '../components/ui/checkbox';
import { Plus, Pencil, Trash2, Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatDate, cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        axios.get(`${API_URL}/api/roles`),
        axios.get(`${API_URL}/api/permissions`)
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingRole) {
        await axios.put(`${API_URL}/api/roles/${editingRole.id}`, formData);
        toast.success('Rol güncellendi');
      } else {
        await axios.post(`${API_URL}/api/roles`, formData);
        toast.success('Rol eklendi');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu rolü silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/roles/${id}`);
      toast.success('Rol silindi');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Silme başarısız');
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || []
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: []
    });
  };

  const togglePermission = (permKey) => {
    const current = formData.permissions;
    if (current.includes(permKey)) {
      setFormData({...formData, permissions: current.filter(p => p !== permKey)});
    } else {
      setFormData({...formData, permissions: [...current, permKey]});
    }
  };

  const toggleAllPermissions = () => {
    if (formData.permissions.length === permissions.length) {
      setFormData({...formData, permissions: []});
    } else {
      setFormData({...formData, permissions: permissions.map(p => p.key)});
    }
  };

  // Group permissions by category
  const permissionGroups = {
    'Genel': ['dashboard_view'],
    'Kullanıcı Yönetimi': ['users_view', 'users_manage', 'roles_manage'],
    'Ürün & Kategori': ['categories_view', 'categories_manage', 'products_view', 'products_manage', 'products_prices_view'],
    'Paketler': ['packages_view', 'packages_manage'],
    'Stok': ['stock_view', 'stock_manage'],
    'Müşteri': ['customers_view', 'customers_manage', 'customer_categories_manage', 'customer_sources_manage'],
    'Teklifler': ['quotes_view', 'quotes_manage', 'quotes_approve', 'quotes_pdf'],
    'Satış': ['sales_view', 'sales_manage'],
    'Bayi Yönetimi': ['dealers_view', 'dealers_manage', 'dealer_groups_manage'],
    'Finans & Raporlar': ['finance_view', 'reports_view', 'reports_export'],
    'Muhasebe & Bütçe': ['accounting_view', 'accounting_manage'],
    'Giderler': ['expenses_view', 'expenses_manage'],
    'Gelirler': ['incomes_view', 'incomes_manage'],
    'İK & Bordro': ['hr_view', 'hr_manage', 'payroll_view', 'payroll_manage', 'attendance_view', 'attendance_manage'],
    'Ayarlar': ['settings_manage', 'xml_import_manage']
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="roles-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Roller & Yetkiler</h1>
          <p className="text-muted-foreground mt-1">Kullanıcı rollerini ve yetkilerini yönetin</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} data-testid="add-role-btn">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Rol
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className={cn("hover:shadow-md transition-shadow", role.is_system && "border-primary/30")} data-testid={`role-card-${role.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className={cn("h-5 w-5", role.is_system ? "text-primary" : "text-muted-foreground")} />
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  {role.is_system && <Lock className="h-3 w-3 text-muted-foreground" />}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(role)}
                    data-testid={`edit-role-${role.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!role.is_system && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(role.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`delete-role-${role.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {role.description || 'Açıklama yok'}
              </p>
              <div className="flex flex-wrap gap-1">
                {role.permissions?.includes('all') ? (
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    Tam Yetki
                  </span>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {role.permissions?.length || 0} yetki
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="role-modal">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Rol Düzenle' : 'Yeni Rol Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rol Adı</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Örn: Muhasebe, Teknik Ekip"
                  required
                  disabled={editingRole?.is_system}
                  data-testid="role-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Rol açıklaması"
                  data-testid="role-description-input"
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Yetkiler</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllPermissions}
                >
                  {formData.permissions.length === permissions.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(permissionGroups).map(([groupName, permKeys]) => (
                  <Card key={groupName} className="bg-muted/30">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-medium">{groupName}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-4 space-y-2">
                      {permKeys.map((permKey) => {
                        const perm = permissions.find(p => p.key === permKey);
                        if (!perm) return null;
                        return (
                          <div key={permKey} className="flex items-center space-x-2">
                            <Checkbox
                              id={permKey}
                              checked={formData.permissions.includes(permKey)}
                              onCheckedChange={() => togglePermission(permKey)}
                              data-testid={`perm-${permKey}`}
                            />
                            <label
                              htmlFor={permKey}
                              className="text-sm cursor-pointer"
                            >
                              {perm.label}
                            </label>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" data-testid="role-submit-btn">
                {editingRole ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Roles;
