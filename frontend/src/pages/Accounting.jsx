import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Users, Wallet, PiggyBank, Building, Fuel, Zap, Droplet, Flame, Wifi, Package } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const CATEGORY_ICONS = {
  'Personel Maaşları': Users,
  'Dükkan Kirası': Building,
  'Elektrik': Zap,
  'Su': Droplet,
  'Doğalgaz': Flame,
  'Mazot/Akaryakıt': Fuel,
  'İnternet/Telefon': Wifi,
  'Ofis Malzemeleri': Package,
};

const Accounting = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expenseStats, setExpenseStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    amount: '',
    currency: 'TRY',
    exchange_rate: '34.50',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    personnel_id: ''
  });
  
  const [personnelForm, setPersonnelForm] = useState({
    name: '',
    position: '',
    salary: '',
    currency: 'TRY',
    phone: ''
  });
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    is_recurring: false
  });

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('finance_manage');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesRes, categoriesRes, personnelRes, summaryRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/expenses`),
        axios.get(`${API_URL}/api/expense-categories`),
        axios.get(`${API_URL}/api/personnel`),
        axios.get(`${API_URL}/api/accounting/summary`),
        axios.get(`${API_URL}/api/expenses/stats`)
      ]);
      setExpenses(expensesRes.data);
      setCategories(categoriesRes.data);
      setPersonnel(personnelRes.data);
      setSummary(summaryRes.data);
      setExpenseStats(statsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Expense handlers
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    
    if (!expenseForm.category_id || !expenseForm.amount) {
      toast.error('Kategori ve tutar zorunludur');
      return;
    }
    
    const data = {
      ...expenseForm,
      amount: parseFloat(expenseForm.amount),
      exchange_rate: parseFloat(expenseForm.exchange_rate) || 1,
      amount_tl: expenseForm.currency === 'USD' 
        ? parseFloat(expenseForm.amount) * parseFloat(expenseForm.exchange_rate)
        : parseFloat(expenseForm.amount),
      expense_date: new Date(expenseForm.expense_date).toISOString()
    };
    
    try {
      await axios.post(`${API_URL}/api/expenses`, data);
      toast.success('Gider eklendi');
      setIsExpenseModalOpen(false);
      resetExpenseForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Bu gideri silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/expenses/${id}`);
      toast.success('Gider silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      category_id: '',
      amount: '',
      currency: 'TRY',
      exchange_rate: '34.50',
      expense_date: new Date().toISOString().split('T')[0],
      description: '',
      personnel_id: ''
    });
  };

  // Personnel handlers
  const handlePersonnelSubmit = async (e) => {
    e.preventDefault();
    
    if (!personnelForm.name || !personnelForm.salary) {
      toast.error('Ad ve maaş zorunludur');
      return;
    }
    
    const data = {
      ...personnelForm,
      salary: parseFloat(personnelForm.salary)
    };
    
    try {
      await axios.post(`${API_URL}/api/personnel`, data);
      toast.success('Personel eklendi');
      setIsPersonnelModalOpen(false);
      setPersonnelForm({ name: '', position: '', salary: '', currency: 'TRY', phone: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleDeletePersonnel = async (id) => {
    if (!window.confirm('Bu personeli silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/personnel/${id}`);
      toast.success('Personel silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  // Category handlers
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    
    if (!categoryForm.name) {
      toast.error('Kategori adı zorunludur');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/expense-categories`, categoryForm);
      toast.success('Kategori eklendi');
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', description: '', is_recurring: false });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/expense-categories/${id}`);
      toast.success('Kategori silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const formatCurrency = (value) => {
    return `₺${(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  // Chart data
  const pieData = expenseStats?.by_category 
    ? Object.entries(expenseStats.by_category).map(([name, value]) => ({ name, value }))
    : [];

  const totalPersonnelSalary = personnel.reduce((sum, p) => sum + (p.salary || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="accounting-page">
      {/* Header */}
      <div>
        <h1 className="page-title">Muhasebe</h1>
        <p className="text-muted-foreground mt-1">Gelir, gider ve kar/zarar takibi</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Aylık Gelir</p>
                <p className="text-sm sm:text-xl font-bold text-green-600 truncate">{formatCurrency(summary?.total_income)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Aylık Gider</p>
                <p className="text-sm sm:text-xl font-bold text-red-600 truncate">{formatCurrency(summary?.total_expenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Brüt Kar</p>
                <p className="text-sm sm:text-xl font-bold text-blue-600 truncate">{formatCurrency(summary?.gross_profit)}</p>
              </div>
              <PiggyBank className="h-8 w-8 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-gradient-to-br ${(summary?.net_profit || 0) >= 0 ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800' : 'from-orange-500/10 to-orange-500/5 border-orange-200 dark:border-orange-800'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Net Kar</p>
                <p className={`text-sm sm:text-xl font-bold truncate ${(summary?.net_profit || 0) >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {formatCurrency(summary?.net_profit)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-emerald-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="expenses">Giderler</TabsTrigger>
          <TabsTrigger value="personnel">Personel</TabsTrigger>
          <TabsTrigger value="categories">Kategoriler</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="section-title">Gider Listesi</h2>
            {canManage && (
              <Button onClick={() => { resetExpenseForm(); setIsExpenseModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Gider Ekle
              </Button>
            )}
          </div>

          {/* Expenses Table - Desktop */}
          <Card className="hidden sm:block">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    {canManage && <TableHead className="text-right">İşlem</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => {
                    const IconComponent = CATEGORY_ICONS[exp.category_name] || Package;
                    return (
                      <TableRow key={exp.id}>
                        <TableCell>{formatDate(exp.expense_date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                            <span>{exp.category_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{exp.description || '-'}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatCurrency(exp.amount_tl || exp.amount)}</TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Gider kaydı bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expenses Cards - Mobile */}
          <div className="sm:hidden space-y-3">
            {expenses.map((exp) => {
              const IconComponent = CATEGORY_ICONS[exp.category_name] || Package;
              return (
                <Card key={exp.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{exp.category_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(exp.expense_date)}</p>
                      </div>
                    </div>
                    <p className="font-mono font-bold text-red-600">{formatCurrency(exp.amount_tl || exp.amount)}</p>
                  </div>
                  {exp.description && (
                    <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                  )}
                  {canManage && (
                    <div className="flex justify-end mt-3 pt-3 border-t">
                      <Button variant="outline" size="sm" onClick={() => handleDeleteExpense(exp.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Personnel Tab */}
        <TabsContent value="personnel" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="section-title">Personel Listesi</h2>
              <p className="text-sm text-muted-foreground">Toplam Maaş: {formatCurrency(totalPersonnelSalary)}</p>
            </div>
            {canManage && (
              <Button onClick={() => setIsPersonnelModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Personel Ekle
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personnel.map((person) => (
              <Card key={person.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.position || 'Pozisyon belirtilmedi'}</p>
                      </div>
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePersonnel(person.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Maaş</span>
                    <span className="font-mono font-bold">{formatCurrency(person.salary)}</span>
                  </div>
                  {person.phone && (
                    <p className="text-xs text-muted-foreground mt-2">Tel: {person.phone}</p>
                  )}
                </CardContent>
              </Card>
            ))}
            {personnel.length === 0 && (
              <Card className="col-span-full p-8 text-center text-muted-foreground">
                Personel kaydı bulunamadı
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="section-title">Gider Kategorileri</h2>
            {canManage && (
              <Button onClick={() => setIsCategoryModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Kategori Ekle
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat.name] || Package;
              return (
                <Card key={cat.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {cat.is_recurring && (
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">Sabit</span>
                      )}
                      {canManage && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <h2 className="section-title">Gider Dağılımı</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kategorilere Göre (Bu Ay)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${(value / 1000).toFixed(0)}K`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Özet ({summary?.month})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm">Toplam Gelir (Satışlar)</span>
                  <span className="font-mono font-bold text-green-600">{formatCurrency(summary?.total_income)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-sm">Toplam Gider</span>
                  <span className="font-mono font-bold text-red-600">{formatCurrency(summary?.total_expenses)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm">Brüt Kar (Satış Karı)</span>
                  <span className="font-mono font-bold text-blue-600">{formatCurrency(summary?.gross_profit)}</span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-lg ${(summary?.net_profit || 0) >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                  <span className="text-sm font-medium">Net Kar/Zarar</span>
                  <span className={`font-mono font-bold ${(summary?.net_profit || 0) >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {formatCurrency(summary?.net_profit)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gider Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori *</Label>
              <Select value={expenseForm.category_id} onValueChange={(val) => setExpenseForm(prev => ({ ...prev, category_id: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tutar *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Select value={expenseForm.currency} onValueChange={(val) => setExpenseForm(prev => ({ ...prev, currency: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {expenseForm.currency === 'USD' && (
              <div className="space-y-2">
                <Label>Döviz Kuru (USD/TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.exchange_rate}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, exchange_rate: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Tarih</Label>
              <Input
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>İptal</Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Personnel Modal */}
      <Dialog open={isPersonnelModalOpen} onOpenChange={setIsPersonnelModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Personel Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePersonnelSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Ad Soyad *</Label>
              <Input
                value={personnelForm.name}
                onChange={(e) => setPersonnelForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Pozisyon</Label>
              <Input
                value={personnelForm.position}
                onChange={(e) => setPersonnelForm(prev => ({ ...prev, position: e.target.value }))}
                placeholder="Örn: Satış Temsilcisi"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Maaş *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={personnelForm.salary}
                  onChange={(e) => setPersonnelForm(prev => ({ ...prev, salary: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Select value={personnelForm.currency} onValueChange={(val) => setPersonnelForm(prev => ({ ...prev, currency: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={personnelForm.phone}
                onChange={(e) => setPersonnelForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPersonnelModalOpen(false)}>İptal</Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gider Kategorisi Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori Adı *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: Sigorta"
              />
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_recurring"
                checked={categoryForm.is_recurring}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, is_recurring: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is_recurring" className="cursor-pointer">Sabit/Tekrarlayan Gider</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>İptal</Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounting;
