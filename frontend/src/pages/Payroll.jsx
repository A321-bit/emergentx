import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
import { ChevronLeft, ChevronRight, Calculator, Check, Lock, Plus, Trash2, Banknote, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
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

const Payroll = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [calculatedSalary, setCalculatedSalary] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isEditBonusModalOpen, setIsEditBonusModalOpen] = useState(false);
  const [isEditAdvanceModalOpen, setIsEditAdvanceModalOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  
  const [advanceForm, setAdvanceForm] = useState({ employee_id: '', amount: '', description: '' });
  const [bonusForm, setBonusForm] = useState({ employee_id: '', bonus_type: 'sales', amount: '', description: '' });

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('payroll_manage');

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetchData();
  }, [monthStr]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, salRes, advRes, bonRes] = await Promise.all([
        axios.get(`${API_URL}/api/employees`),
        axios.get(`${API_URL}/api/salaries?month=${monthStr}`),
        axios.get(`${API_URL}/api/advances`),
        axios.get(`${API_URL}/api/bonuses?month=${monthStr}`)
      ]);
      setEmployees(empRes.data);
      setSalaries(salRes.data);
      setAdvances(advRes.data);
      setBonuses(bonRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getMonthName = () => {
    return currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  };

  const calculateEmployeeSalary = async (employee) => {
    try {
      const response = await axios.get(`${API_URL}/api/salaries/calculate/${employee.id}/${monthStr}`);
      setCalculatedSalary(response.data);
      setSelectedEmployee(employee);
      setIsDetailModalOpen(true);
    } catch (error) {
      toast.error('Maaş hesaplanamadı');
    }
  };

  const saveSalary = async () => {
    if (!calculatedSalary) return;
    
    try {
      await axios.post(`${API_URL}/api/salaries`, {
        employee_id: calculatedSalary.employee_id,
        employee_name: calculatedSalary.employee_name,
        month: monthStr,
        gross_salary: calculatedSalary.gross_salary,
        working_days: calculatedSalary.working_days,
        present_days: calculatedSalary.present_days,
        absent_days: calculatedSalary.absent_days,
        leave_days: calculatedSalary.leave_days,
        sick_days: calculatedSalary.sick_days,
        absence_deduction: calculatedSalary.absence_deduction,
        advance_deduction: calculatedSalary.advance_deduction,
        total_bonus: calculatedSalary.total_bonus,
        other_deductions: 0,
        net_salary: calculatedSalary.net_salary,
        is_paid: false
      });
      
      toast.success('Bordro kaydedildi');
      setIsDetailModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kaydetme hatası');
    }
  };

  const markAsPaid = async (salaryId) => {
    try {
      await axios.put(`${API_URL}/api/salaries/${salaryId}/pay`);
      toast.success('Ödendi olarak işaretlendi');
      fetchData();
    } catch (error) {
      toast.error('İşlem hatası');
    }
  };

  const lockSalary = async (salaryId) => {
    try {
      await axios.put(`${API_URL}/api/salaries/${salaryId}/lock`);
      toast.success('Bordro kilitlendi');
      fetchData();
    } catch (error) {
      toast.error('İşlem hatası');
    }
  };

  const handleAddAdvance = async (e) => {
    e.preventDefault();
    const employee = employees.find(emp => emp.id === advanceForm.employee_id);
    if (!employee) return;

    try {
      await axios.post(`${API_URL}/api/advances`, {
        employee_id: advanceForm.employee_id,
        employee_name: employee.name,
        amount: parseFloat(advanceForm.amount),
        date: new Date().toISOString().split('T')[0],
        description: advanceForm.description,
        is_deducted: false
      });
      toast.success('Avans eklendi');
      setIsAdvanceModalOpen(false);
      setAdvanceForm({ employee_id: '', amount: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Avans eklenemedi');
    }
  };

  const handleAddBonus = async (e) => {
    e.preventDefault();
    const employee = employees.find(emp => emp.id === bonusForm.employee_id);
    if (!employee) return;

    try {
      await axios.post(`${API_URL}/api/bonuses`, {
        employee_id: bonusForm.employee_id,
        employee_name: employee.name,
        bonus_type: bonusForm.bonus_type,
        amount: parseFloat(bonusForm.amount),
        month: monthStr,
        description: bonusForm.description
      });
      toast.success('Prim eklendi');
      setIsBonusModalOpen(false);
      setBonusForm({ employee_id: '', bonus_type: 'sales', amount: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Prim eklenemedi');
    }
  };

  const deleteAdvance = async (id) => {
    if (!window.confirm('Bu avansı silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/advances/${id}`);
      toast.success('Avans silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme hatası');
    }
  };

  const deleteBonus = async (id) => {
    if (!window.confirm('Bu primi silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/bonuses/${id}`);
      toast.success('Prim silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme hatası');
    }
  };

  // Edit Bonus
  const handleEditBonus = (bonus) => {
    setEditingBonus(bonus);
    setBonusForm({
      employee_id: bonus.employee_id,
      bonus_type: bonus.bonus_type || 'sales',
      amount: bonus.amount.toString(),
      description: bonus.description || ''
    });
    setIsEditBonusModalOpen(true);
  };

  const handleUpdateBonus = async (e) => {
    e.preventDefault();
    if (!editingBonus) return;
    try {
      await axios.put(`${API_URL}/api/bonuses/${editingBonus.id}`, {
        employee_id: bonusForm.employee_id,
        bonus_type: bonusForm.bonus_type,
        amount: parseFloat(bonusForm.amount),
        description: bonusForm.description,
        month: monthStr
      });
      toast.success('Prim güncellendi');
      setIsEditBonusModalOpen(false);
      setEditingBonus(null);
      setBonusForm({ employee_id: '', bonus_type: 'sales', amount: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Güncelleme hatası');
    }
  };

  // Edit Advance
  const handleEditAdvance = (advance) => {
    setEditingAdvance(advance);
    setAdvanceForm({
      employee_id: advance.employee_id,
      amount: advance.amount.toString(),
      description: advance.description || ''
    });
    setIsEditAdvanceModalOpen(true);
  };

  const handleUpdateAdvance = async (e) => {
    e.preventDefault();
    if (!editingAdvance) return;
    try {
      await axios.put(`${API_URL}/api/advances/${editingAdvance.id}`, {
        employee_id: advanceForm.employee_id,
        amount: parseFloat(advanceForm.amount),
        description: advanceForm.description
      });
      toast.success('Avans güncellendi');
      setIsEditAdvanceModalOpen(false);
      setEditingAdvance(null);
      setAdvanceForm({ employee_id: '', amount: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Güncelleme hatası');
    }
  };

  const getSalaryForEmployee = (employeeId) => {
    return salaries.find(s => s.employee_id === employeeId);
  };

  const getPendingAdvances = (employeeId) => {
    return advances.filter(a => a.employee_id === employeeId && !a.is_deducted);
  };

  const getEmployeeBonuses = (employeeId) => {
    return bonuses.filter(b => b.employee_id === employeeId);
  };

  // Stats
  const totalGross = salaries.reduce((sum, s) => sum + (s.gross_salary || 0), 0);
  const totalNet = salaries.reduce((sum, s) => sum + (s.net_salary || 0), 0);
  const totalAdvances = advances.filter(a => !a.is_deducted).reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalBonuses = bonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="payroll-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Bordro Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Aylık maaş hesaplama ve bordro takibi</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setIsAdvanceModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Avans Ekle
              </Button>
              <Button variant="outline" onClick={() => setIsBonusModalOpen(true)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Prim Ekle
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="w-48 text-center font-semibold text-lg capitalize">
          {getMonthName()}
        </div>
        <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Brüt Maaşlar</p>
                <p className="text-xl font-bold">{formatTRY(totalGross)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Net Ödenecek</p>
                <p className="text-xl font-bold">{formatTRY(totalNet)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Bekleyen Avans</p>
                <p className="text-xl font-bold">{formatTRY(totalAdvances)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Toplam Prim</p>
                <p className="text-xl font-bold">{formatTRY(totalBonuses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Personel Bordroları</CardTitle>
          <CardDescription>{getMonthName()} dönemi için bordro durumları</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personel</TableHead>
                <TableHead>Pozisyon</TableHead>
                <TableHead className="text-right">Brüt Maaş</TableHead>
                <TableHead className="text-right">Avans</TableHead>
                <TableHead className="text-right">Prim</TableHead>
                <TableHead className="text-right">Net Maaş</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const salary = getSalaryForEmployee(employee.id);
                const pendingAdvances = getPendingAdvances(employee.id);
                const empBonuses = getEmployeeBonuses(employee.id);
                const totalPendingAdvance = pendingAdvances.reduce((sum, a) => sum + a.amount, 0);
                const totalEmpBonus = empBonuses.reduce((sum, b) => sum + b.amount, 0);
                
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-xs text-muted-foreground">{employee.employee_no}</p>
                      </div>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell className="text-right">{formatTRY(employee.monthly_salary)}</TableCell>
                    <TableCell className="text-right">
                      {totalPendingAdvance > 0 ? (
                        <span className="text-amber-600">{formatTRY(totalPendingAdvance)}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {totalEmpBonus > 0 ? (
                        <span className="text-green-600">+{formatTRY(totalEmpBonus)}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {salary ? formatTRY(salary.net_salary) : '-'}
                    </TableCell>
                    <TableCell>
                      {salary ? (
                        <div className="flex items-center gap-1">
                          {salary.is_locked && (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Kilitli
                            </Badge>
                          )}
                          {salary.is_paid ? (
                            <Badge className="bg-green-500 gap-1">
                              <Check className="h-3 w-3" />
                              Ödendi
                            </Badge>
                          ) : (
                            <Badge variant="outline">Bekliyor</Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Hesaplanmadı</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => calculateEmployeeSalary(employee)}
                        >
                          <Calculator className="h-4 w-4 mr-1" />
                          Hesapla
                        </Button>
                        {salary && !salary.is_paid && canManage && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => markAsPaid(salary.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Salary Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bordro Hesaplama - {calculatedSalary?.employee_name}</DialogTitle>
          </DialogHeader>
          {calculatedSalary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-muted-foreground">Brüt Maaş</p>
                  <p className="text-lg font-bold">{formatTRY(calculatedSalary.gross_salary)}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-muted-foreground">Günlük Ücret</p>
                  <p className="text-lg font-bold">{formatTRY(calculatedSalary.daily_wage)}</p>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold mb-3">Devam Durumu</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Geldi:</span>
                    <span className="font-medium text-green-600">{calculatedSalary.present_days} gün</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gelmedi:</span>
                    <span className="font-medium text-red-600">{calculatedSalary.absent_days} gün</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Yarım Gün:</span>
                    <span className="font-medium text-amber-600">{calculatedSalary.half_days} gün</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">İzin:</span>
                    <span className="font-medium text-blue-600">{calculatedSalary.leave_days} gün</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rapor:</span>
                    <span className="font-medium text-purple-600">{calculatedSalary.sick_days} gün</span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold mb-3">Kesintiler & Eklemeler</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Devamsızlık Kesintisi:</span>
                    <span className="font-medium text-red-600">-{formatTRY(calculatedSalary.absence_deduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avans Kesintisi:</span>
                    <span className="font-medium text-red-600">-{formatTRY(calculatedSalary.advance_deduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toplam Prim:</span>
                    <span className="font-medium text-green-600">+{formatTRY(calculatedSalary.total_bonus)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Net Ödenecek:</span>
                  <span className="text-2xl font-bold text-primary">{formatTRY(calculatedSalary.net_salary)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>İptal</Button>
            {canManage && (
              <Button onClick={saveSalary}>Bordro Kaydet</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Modal */}
      <Dialog open={isAdvanceModalOpen} onOpenChange={setIsAdvanceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avans Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAdvance} className="space-y-4">
            <div className="space-y-2">
              <Label>Personel</Label>
              <Select value={advanceForm.employee_id} onValueChange={(v) => setAdvanceForm({...advanceForm, employee_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tutar (TL)</Label>
              <Input
                type="number"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({...advanceForm, amount: e.target.value})}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={advanceForm.description}
                onChange={(e) => setAdvanceForm({...advanceForm, description: e.target.value})}
                placeholder="Opsiyonel"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdvanceModalOpen(false)}>İptal</Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bonus Modal */}
      <Dialog open={isBonusModalOpen} onOpenChange={setIsBonusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prim Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBonus} className="space-y-4">
            <div className="space-y-2">
              <Label>Personel</Label>
              <Select value={bonusForm.employee_id} onValueChange={(v) => setBonusForm({...bonusForm, employee_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prim Türü</Label>
              <Select value={bonusForm.bonus_type} onValueChange={(v) => setBonusForm({...bonusForm, bonus_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Satış Primi</SelectItem>
                  <SelectItem value="project">Proje Primi</SelectItem>
                  <SelectItem value="performance">Performans Primi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tutar (TL)</Label>
              <Input
                type="number"
                value={bonusForm.amount}
                onChange={(e) => setBonusForm({...bonusForm, amount: e.target.value})}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={bonusForm.description}
                onChange={(e) => setBonusForm({...bonusForm, description: e.target.value})}
                placeholder="Opsiyonel"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBonusModalOpen(false)}>İptal</Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Bonus Modal */}
      <Dialog open={isEditBonusModalOpen} onOpenChange={setIsEditBonusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prim Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBonus} className="space-y-4">
            <div className="space-y-2">
              <Label>Personel</Label>
              <Select value={bonusForm.employee_id} onValueChange={(v) => setBonusForm({...bonusForm, employee_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prim Türü</Label>
              <Select value={bonusForm.bonus_type} onValueChange={(v) => setBonusForm({...bonusForm, bonus_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Satış Primi</SelectItem>
                  <SelectItem value="project">Proje Primi</SelectItem>
                  <SelectItem value="performance">Performans Primi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tutar (TL)</Label>
              <Input
                type="number"
                value={bonusForm.amount}
                onChange={(e) => setBonusForm({...bonusForm, amount: e.target.value})}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={bonusForm.description}
                onChange={(e) => setBonusForm({...bonusForm, description: e.target.value})}
                placeholder="Opsiyonel"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsEditBonusModalOpen(false); setEditingBonus(null); }}>İptal</Button>
              <Button type="submit">Güncelle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Advance Modal */}
      <Dialog open={isEditAdvanceModalOpen} onOpenChange={setIsEditAdvanceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avans Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAdvance} className="space-y-4">
            <div className="space-y-2">
              <Label>Personel</Label>
              <Select value={advanceForm.employee_id} onValueChange={(v) => setAdvanceForm({...advanceForm, employee_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Personel seçin" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tutar (TL)</Label>
              <Input
                type="number"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({...advanceForm, amount: e.target.value})}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={advanceForm.description}
                onChange={(e) => setAdvanceForm({...advanceForm, description: e.target.value})}
                placeholder="Opsiyonel"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsEditAdvanceModalOpen(false); setEditingAdvance(null); }}>İptal</Button>
              <Button type="submit">Güncelle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* İşlemler (Avanslar ve Primler) Kartı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bekleyen Avanslar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Bekleyen Avanslar
            </CardTitle>
            <CardDescription>Maaştan kesilmemiş avanslar</CardDescription>
          </CardHeader>
          <CardContent>
            {advances.filter(a => !a.is_deducted).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personel</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.filter(a => !a.is_deducted).map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{advance.employee_name}</p>
                          {advance.description && <p className="text-xs text-muted-foreground">{advance.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-amber-600">{formatTRY(advance.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditAdvance(advance)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAdvance(advance.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">Bekleyen avans yok</p>
            )}
          </CardContent>
        </Card>

        {/* Bu Ay Primleri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Bu Ay Primleri
            </CardTitle>
            <CardDescription>{getMonthName()} dönemi primleri</CardDescription>
          </CardHeader>
          <CardContent>
            {bonuses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personel</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonuses.map((bonus) => (
                    <TableRow key={bonus.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{bonus.employee_name}</p>
                          {bonus.description && <p className="text-xs text-muted-foreground">{bonus.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {bonus.bonus_type === 'sales' ? 'Satış' : bonus.bonus_type === 'project' ? 'Proje' : 'Performans'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-purple-600">{formatTRY(bonus.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditBonus(bonus)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBonus(bonus.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">Bu ay prim kaydı yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payroll;
