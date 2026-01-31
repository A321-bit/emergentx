import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
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
import { 
  Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Users, Wallet, PiggyBank, 
  Building, Fuel, Zap, Droplet, Flame, Wifi, Package, Calendar, ChevronLeft, 
  ChevronRight, AlertTriangle, CheckCircle2, Target, RefreshCw, Repeat, FileText,
  ArrowUpRight, ArrowDownRight, Pencil, BarChart3, PieChart as PieChartIcon,
  Banknote, Receipt, TrendingUp as TrendUp, CircleDollarSign, Landmark, Clock,
  Check, CircleOff, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart 
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6'];

const CATEGORY_ICONS = {
  'Personel Maaşları': Users,
  'Dükkan Kirası': Building,
  'Kira': Building,
  'Elektrik': Zap,
  'Su': Droplet,
  'Doğalgaz': Flame,
  'Mazot/Akaryakıt': Fuel,
  'Yakıt': Fuel,
  'İnternet/Telefon': Wifi,
  'İnternet': Wifi,
  'Ofis Malzemeleri': Package,
  'Sigorta': FileText,
};

const MONTHS = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' },
];

const Accounting = () => {
  const { user } = useAuth();
  const now = new Date();
  
  // Period state
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  
  // Form states
  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    amount: '',
    currency: 'TRY',
    exchange_rate: '34.50',
    expense_date: new Date().toISOString().split('T')[0],
    due_date: '',
    description: ''
  });
  
  const [incomeForm, setIncomeForm] = useState({
    source: '',
    amount: '',
    currency: 'TRY',
    exchange_rate: '34.50',
    income_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    expense_type: 'variable',
    is_recurring: false
  });
  
  const [personnelForm, setPersonnelForm] = useState({
    name: '',
    position: '',
    salary: '',
    currency: 'TRY',
    phone: ''
  });
  
  const [recurringForm, setRecurringForm] = useState({
    category_id: '',
    amount: '',
    currency: 'TRY',
    description: '',
    day_of_month: 1,
    is_active_recurring: true
  });
  
  const [budgetForm, setBudgetForm] = useState({
    total_budget: '',
    notes: ''
  });

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('finance_manage');

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const params = useDateRange && dateFrom && dateTo
        ? { date_from: dateFrom, date_to: dateTo }
        : { month: selectedMonth, year: selectedYear };
      
      const [summaryRes, trendRes, expensesRes, incomesRes, categoriesRes, personnelRes, recurringRes, upcomingRes] = await Promise.all([
        axios.get(`${API_URL}/api/accounting/summary`, { params }),
        axios.get(`${API_URL}/api/accounting/trend`),
        axios.get(`${API_URL}/api/expenses`, { params: { month: selectedMonth, year: selectedYear } }),
        axios.get(`${API_URL}/api/incomes`, { params: { month: selectedMonth, year: selectedYear } }),
        axios.get(`${API_URL}/api/expense-categories`),
        axios.get(`${API_URL}/api/personnel`),
        axios.get(`${API_URL}/api/recurring-expenses`),
        axios.get(`${API_URL}/api/expenses/upcoming-payments`)
      ]);
      
      setSummary(summaryRes.data);
      setTrend(trendRes.data);
      setExpenses(expensesRes.data);
      setIncomes(incomesRes.data);
      setCategories(categoriesRes.data);
      setPersonnel(personnelRes.data);
      setRecurringExpenses(recurringRes.data);
      setBudget(summaryRes.data?.budget_status);
      setUpcomingPayments(upcomingRes.data);
    } catch (error) {
      console.error('Veri yüklenemedi:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, useDateRange, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
    setUseDateRange(false);
    setDateFrom('');
    setDateTo('');
  };

  // Handlers
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.category_id || !expenseForm.amount) {
      toast.error('Kategori ve tutar zorunludur');
      return;
    }
    
    try {
      const data = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        exchange_rate: parseFloat(expenseForm.exchange_rate) || 1,
        amount_tl: expenseForm.currency === 'USD' 
          ? parseFloat(expenseForm.amount) * parseFloat(expenseForm.exchange_rate)
          : parseFloat(expenseForm.amount),
        expense_date: new Date(expenseForm.expense_date).toISOString(),
        due_date: expenseForm.due_date ? new Date(expenseForm.due_date).toISOString() : null
      };
      
      await axios.post(`${API_URL}/api/expenses`, data);
      toast.success('Gider eklendi');
      setIsExpenseModalOpen(false);
      setExpenseForm({
        category_id: '',
        amount: '',
        currency: 'TRY',
        exchange_rate: '34.50',
        expense_date: new Date().toISOString().split('T')[0],
        due_date: '',
        description: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    if (!incomeForm.source || !incomeForm.amount) {
      toast.error('Kaynak ve tutar zorunludur');
      return;
    }
    
    try {
      const data = {
        ...incomeForm,
        income_type: 'other',
        amount: parseFloat(incomeForm.amount),
        exchange_rate: parseFloat(incomeForm.exchange_rate) || 1,
        amount_tl: incomeForm.currency === 'USD' 
          ? parseFloat(incomeForm.amount) * parseFloat(incomeForm.exchange_rate)
          : parseFloat(incomeForm.amount),
        income_date: new Date(incomeForm.income_date).toISOString()
      };
      
      await axios.post(`${API_URL}/api/incomes`, data);
      toast.success('Gelir eklendi');
      setIsIncomeModalOpen(false);
      setIncomeForm({
        source: '',
        amount: '',
        currency: 'TRY',
        exchange_rate: '34.50',
        income_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

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
      setCategoryForm({ name: '', description: '', expense_type: 'variable', is_recurring: false });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handlePersonnelSubmit = async (e) => {
    e.preventDefault();
    if (!personnelForm.name || !personnelForm.salary) {
      toast.error('Ad ve maaş zorunludur');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/personnel`, {
        ...personnelForm,
        salary: parseFloat(personnelForm.salary)
      });
      toast.success('Personel eklendi');
      setIsPersonnelModalOpen(false);
      setPersonnelForm({ name: '', position: '', salary: '', currency: 'TRY', phone: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleRecurringSubmit = async (e) => {
    e.preventDefault();
    if (!recurringForm.category_id || !recurringForm.amount) {
      toast.error('Kategori ve tutar zorunludur');
      return;
    }
    
    try {
      if (editingRecurring) {
        await axios.put(`${API_URL}/api/recurring-expenses/${editingRecurring.id}`, recurringForm);
        toast.success('Tekrarlayan gider güncellendi');
      } else {
        await axios.post(`${API_URL}/api/recurring-expenses`, recurringForm);
        toast.success('Tekrarlayan gider eklendi');
      }
      setIsRecurringModalOpen(false);
      setEditingRecurring(null);
      setRecurringForm({
        category_id: '',
        amount: '',
        currency: 'TRY',
        description: '',
        day_of_month: 1,
        is_active_recurring: true
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    if (!budgetForm.total_budget) {
      toast.error('Bütçe tutarı zorunludur');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/budgets`, {
        year: selectedYear,
        month: selectedMonth,
        total_budget: parseFloat(budgetForm.total_budget),
        notes: budgetForm.notes
      });
      toast.success('Bütçe kaydedildi');
      setIsBudgetModalOpen(false);
      setBudgetForm({ total_budget: '', notes: '' });
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

  const handleDeleteIncome = async (id) => {
    if (!window.confirm('Bu geliri silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/incomes/${id}`);
      toast.success('Gelir silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
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

  const handleDeleteRecurring = async (id) => {
    if (!window.confirm('Bu tekrarlayan gideri silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/recurring-expenses/${id}`);
      toast.success('Tekrarlayan gider silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  // Gideri ödendi olarak işaretle
  const handleMarkPaid = async (id) => {
    try {
      await axios.put(`${API_URL}/api/expenses/${id}/pay`);
      toast.success('Gider ödendi olarak işaretlendi');
      fetchData();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  // Gideri ödenmedi olarak işaretle
  const handleMarkUnpaid = async (id) => {
    try {
      await axios.put(`${API_URL}/api/expenses/${id}/unpay`);
      toast.success('Gider ödenmedi olarak işaretlendi');
      fetchData();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleGenerateRecurring = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/recurring-expenses/generate`, null, {
        params: { month: selectedMonth, year: selectedYear }
      });
      if (res.data.generated_count > 0) {
        toast.success(`${res.data.generated_count} tekrarlayan gider oluşturuldu`);
        fetchData();
      } else {
        toast.info('Oluşturulacak tekrarlayan gider yok');
      }
    } catch (error) {
      toast.error('Tekrarlayan giderler oluşturulamadı');
    }
  };

  const openEditRecurring = (rec) => {
    setEditingRecurring(rec);
    setRecurringForm({
      category_id: rec.category_id,
      amount: rec.amount.toString(),
      currency: rec.currency || 'TRY',
      description: rec.description || '',
      day_of_month: rec.day_of_month || 1,
      is_active_recurring: rec.is_active_recurring !== false
    });
    setIsRecurringModalOpen(true);
  };

  // Format helpers
  const formatCurrency = (value) => {
    return `₺${(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  // Chart data
  const pieData = summary?.expenses_by_category
    ? Object.entries(summary.expenses_by_category).map(([name, value]) => ({ name, value }))
    : [];

  const trendChartData = trend?.data || [];

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
      {/* Header with Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Muhasebe Kontrol Paneli
          </h1>
          <p className="text-muted-foreground mt-1">Gelir, gider ve kâr/zarar takibi</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-28 h-9 bg-white dark:bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24 h-9 bg-white dark:bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
          
          <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="h-9">
            <Calendar className="h-4 w-4 mr-1" />
            Bugün
          </Button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Toplam Gelir */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium">Toplam Gelir</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(summary?.total_income)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-emerald-200">Satış: {formatCurrency(summary?.sales_income)}</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toplam Gider */}
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg shadow-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs font-medium">Toplam Gider</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(summary?.total_expenses)}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-red-200">
                  <span>S: {formatCurrency(summary?.fixed_expenses)}</span>
                  <span>D: {formatCurrency(summary?.variable_expenses)}</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brüt Kar */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg shadow-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium">Brüt Kâr</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(summary?.gross_profit)}</p>
                <p className="text-xs text-blue-200 mt-1">Satış - Maliyet</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <PiggyBank className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Kar */}
        <Card className={`border-0 shadow-lg ${summary?.is_loss 
          ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/20' 
          : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'} text-white`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${summary?.is_loss ? 'text-orange-100' : 'text-violet-100'}`}>
                  Net Kâr {summary?.is_loss && <Badge className="ml-1 bg-red-600 text-white text-[10px]">ZARAR</Badge>}
                </p>
                <p className="text-xl font-bold mt-1">{formatCurrency(summary?.net_profit)}</p>
                <p className={`text-xs mt-1 ${summary?.is_loss ? 'text-orange-200' : 'text-violet-200'}`}>
                  Marj: %{summary?.profit_margin || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                {summary?.is_loss ? <AlertTriangle className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bütçe Durumu */}
        <Card className={`border-0 shadow-lg ${budget?.exceeded 
          ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/20' 
          : 'bg-gradient-to-br from-cyan-500 to-teal-500 shadow-cyan-500/20'} text-white`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-xs font-medium ${budget?.exceeded ? 'text-amber-100' : 'text-cyan-100'}`}>
                  Bütçe {budget?.exceeded && <Badge className="ml-1 bg-red-600 text-white text-[10px]">AŞILDI</Badge>}
                </p>
                {budget ? (
                  <>
                    <p className="text-xl font-bold mt-1">{formatCurrency(budget.remaining)}</p>
                    <div className="mt-2">
                      <Progress 
                        value={Math.min(budget.percentage, 100)} 
                        className="h-1.5 bg-white/30"
                      />
                      <p className="text-xs mt-1 opacity-80">%{budget.percentage?.toFixed(0)} kullanıldı</p>
                    </div>
                  </>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-white hover:bg-white/20"
                    onClick={() => setIsBudgetModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Bütçe Belirle
                  </Button>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Yaklaşan Ödemeler Paneli */}
      {(upcomingPayments?.total_count > 0 || upcomingPayments?.overdue?.count > 0) && (
        <Card className="border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Yaklaşan Ödemeler
                {upcomingPayments?.overdue?.count > 0 && (
                  <Badge className="bg-red-500 text-white animate-pulse">
                    {upcomingPayments.overdue.count} Gecikmiş!
                  </Badge>
                )}
              </CardTitle>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Toplam Bekleyen</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(upcomingPayments?.total_pending)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Gecikmiş */}
              <div className={`p-3 rounded-lg ${upcomingPayments?.overdue?.count > 0 ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`h-4 w-4 ${upcomingPayments?.overdue?.count > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-muted-foreground">GECİKMİŞ</span>
                </div>
                <p className={`text-lg font-bold ${upcomingPayments?.overdue?.count > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {formatCurrency(upcomingPayments?.overdue?.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{upcomingPayments?.overdue?.count || 0} adet</p>
              </div>

              {/* Bugün */}
              <div className={`p-3 rounded-lg ${upcomingPayments?.today?.count > 0 ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Bell className={`h-4 w-4 ${upcomingPayments?.today?.count > 0 ? 'text-orange-600 animate-pulse' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-muted-foreground">BUGÜN</span>
                </div>
                <p className={`text-lg font-bold ${upcomingPayments?.today?.count > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {formatCurrency(upcomingPayments?.today?.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{upcomingPayments?.today?.count || 0} adet</p>
              </div>

              {/* Yarın */}
              <div className={`p-3 rounded-lg ${upcomingPayments?.tomorrow?.count > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className={`h-4 w-4 ${upcomingPayments?.tomorrow?.count > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-muted-foreground">YARIN</span>
                </div>
                <p className={`text-lg font-bold ${upcomingPayments?.tomorrow?.count > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                  {formatCurrency(upcomingPayments?.tomorrow?.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{upcomingPayments?.tomorrow?.count || 0} adet</p>
              </div>

              {/* Bu Hafta */}
              <div className={`p-3 rounded-lg ${upcomingPayments?.this_week?.count > 0 ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className={`h-4 w-4 ${upcomingPayments?.this_week?.count > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-muted-foreground">BU HAFTA</span>
                </div>
                <p className={`text-lg font-bold ${upcomingPayments?.this_week?.count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {formatCurrency(upcomingPayments?.this_week?.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{upcomingPayments?.this_week?.count || 0} adet</p>
              </div>

              {/* Bu Ay */}
              <div className={`p-3 rounded-lg ${upcomingPayments?.this_month?.count > 0 ? 'bg-green-100 dark:bg-green-900/30 border border-green-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className={`h-4 w-4 ${upcomingPayments?.this_month?.count > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-muted-foreground">BU AY</span>
                </div>
                <p className={`text-lg font-bold ${upcomingPayments?.this_month?.count > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {formatCurrency(upcomingPayments?.this_month?.total || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{upcomingPayments?.this_month?.count || 0} adet</p>
              </div>
            </div>

            {/* Gecikmiş ve Bugün ödenecek detay listesi */}
            {(upcomingPayments?.overdue?.count > 0 || upcomingPayments?.today?.count > 0) && (
              <div className="mt-4 pt-4 border-t border-orange-200">
                <p className="text-sm font-medium mb-2 text-orange-700">Acil Ödenecekler:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {[...(upcomingPayments?.overdue?.items || []), ...(upcomingPayments?.today?.items || [])].slice(0, 5).map((exp, idx) => {
                    const IconComponent = CATEGORY_ICONS[exp.category_name] || Package;
                    const isOverdue = exp.days_remaining < 0;
                    return (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded ${isOverdue ? 'bg-red-100 dark:bg-red-900/20' : 'bg-orange-100 dark:bg-orange-900/20'}`}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{exp.category_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {isOverdue 
                                ? <span className="text-red-600 font-medium">{Math.abs(exp.days_remaining)} gün gecikti!</span>
                                : exp.days_remaining === 0 
                                  ? <span className="text-orange-600 font-medium">Bugün son gün!</span>
                                  : `${exp.days_remaining} gün kaldı`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-bold ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                            {formatCurrency(exp.amount_tl || exp.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">{exp.due_date_formatted}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expense Distribution Pie */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              Gider Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {pieData.slice(0, 5).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate max-w-[80px]">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Bu dönemde gider kaydı yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 3 Expenses */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              En Yüksek 3 Gider
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.top_3_expenses?.length > 0 ? (
              <div className="space-y-3">
                {summary.top_3_expenses.map((exp, idx) => {
                  const percentage = summary.total_expenses > 0 
                    ? (exp.amount / summary.total_expenses * 100).toFixed(1) 
                    : 0;
                  const IconComponent = CATEGORY_ICONS[exp.category] || Receipt;
                  
                  return (
                    <div key={idx} className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            idx === 0 ? 'bg-red-100 text-red-600' : 
                            idx === 1 ? 'bg-orange-100 text-orange-600' : 
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{exp.category}</p>
                            <p className="text-xs text-muted-foreground">{exp.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm">{formatCurrency(exp.amount)}</p>
                          <p className="text-xs text-muted-foreground">%{percentage}</p>
                        </div>
                      </div>
                      <Progress value={parseFloat(percentage)} className="h-1" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Bu dönemde gider kaydı yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6 Month Trend */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendUp className="h-4 w-4 text-muted-foreground" />
                6 Aylık Trend
              </CardTitle>
              {trend?.trend_comments?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {trend.expense_change_percent > 0 ? '+' : ''}{trend.expense_change_percent}%
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {trendChartData.length > 0 ? (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Area type="monotone" dataKey="net_profit" stroke="#8B5CF6" fill="url(#colorProfit)" name="Net Kâr" />
                      <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="url(#colorExpense)" name="Gider" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {trend?.trend_comments?.length > 0 && (
                  <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs text-muted-foreground">
                    {trend.trend_comments.map((c, i) => (
                      <p key={i}>• {c}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Trend verisi yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed vs Variable Expenses + Unpaid Warning */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sabit Giderler</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.fixed_expenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">Kira, maaş, sigorta vb.</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Landmark className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Değişken Giderler</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary?.variable_expenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">Elektrik, yakıt, malzeme vb.</p>
              </div>
              <div className="h-14 w-14 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Zap className="h-7 w-7 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ödenmemiş Giderler Uyarısı */}
        <Card className={`border-l-4 ${summary?.unpaid_expenses_count > 0 ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' : 'border-l-green-500 bg-green-50 dark:bg-green-900/10'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {summary?.unpaid_expenses_count > 0 && <Bell className="h-3 w-3 text-red-500 animate-pulse" />}
                  Ödenmemiş Giderler
                </p>
                <p className={`text-2xl font-bold ${summary?.unpaid_expenses_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(summary?.unpaid_expenses)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.unpaid_expenses_count > 0 
                    ? `${summary.unpaid_expenses_count} adet bekliyor`
                    : 'Tüm giderler ödendi ✓'}
                </p>
              </div>
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${
                summary?.unpaid_expenses_count > 0 
                  ? 'bg-red-100 dark:bg-red-900/30' 
                  : 'bg-green-100 dark:bg-green-900/30'
              }`}>
                {summary?.unpaid_expenses_count > 0 
                  ? <AlertTriangle className="h-7 w-7 text-red-600" />
                  : <CheckCircle2 className="h-7 w-7 text-green-600" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="expenses">Giderler</TabsTrigger>
            <TabsTrigger value="incomes">Gelirler</TabsTrigger>
            <TabsTrigger value="recurring">Tekrarlayan</TabsTrigger>
            <TabsTrigger value="personnel">Personel</TabsTrigger>
            <TabsTrigger value="categories">Kategoriler</TabsTrigger>
          </TabsList>
          
          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setIsExpenseModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Gider
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsIncomeModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Gelir
              </Button>
            </div>
          )}
        </div>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Vade</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="text-center">Ödeme</TableHead>
                    {canManage && <TableHead className="text-right">İşlem</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => {
                    const IconComponent = CATEGORY_ICONS[exp.category_name] || Package;
                    // Vade durumu hesapla
                    let dueStatus = null;
                    if (exp.due_date && !exp.is_paid) {
                      const dueDate = new Date(exp.due_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      dueDate.setHours(0, 0, 0, 0);
                      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) dueStatus = 'overdue';
                      else if (diffDays === 0) dueStatus = 'today';
                      else if (diffDays === 1) dueStatus = 'tomorrow';
                      else if (diffDays <= 7) dueStatus = 'week';
                    }
                    
                    return (
                      <TableRow key={exp.id} className={`${!exp.is_paid && dueStatus === 'overdue' ? 'bg-red-100/70 dark:bg-red-900/20' : !exp.is_paid ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                        <TableCell className="text-sm">{formatDate(exp.expense_date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                            <span>{exp.category_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={exp.expense_type === 'fixed' ? 'default' : 'secondary'} className="text-xs">
                            {exp.expense_type === 'fixed' ? 'Sabit' : 'Değişken'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {exp.description || '-'}
                          {exp.is_recurring_generated && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              <Repeat className="h-3 w-3 mr-1" /> Otomatik
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-red-600">
                          {formatCurrency(exp.amount_tl || exp.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {canManage ? (
                            <Button
                              variant={exp.is_paid ? "default" : "outline"}
                              size="sm"
                              className={`h-7 px-2 ${exp.is_paid 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                              onClick={() => exp.is_paid ? handleMarkUnpaid(exp.id) : handleMarkPaid(exp.id)}
                            >
                              {exp.is_paid ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Ödendi
                                </>
                              ) : (
                                <>
                                  <CircleOff className="h-3 w-3 mr-1" />
                                  Bekliyor
                                </>
                              )}
                            </Button>
                          ) : (
                            <Badge variant={exp.is_paid ? 'default' : 'destructive'} className="text-xs">
                              {exp.is_paid ? 'Ödendi' : 'Bekliyor'}
                            </Badge>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)} className="text-destructive h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Bu dönemde gider kaydı bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incomes Tab */}
        <TabsContent value="incomes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CircleDollarSign className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Satış Geliri</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(summary?.sales_income)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Banknote className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Satış Dışı Gelir</p>
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(summary?.other_income)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Satış Dışı Gelirler</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    {canManage && <TableHead className="text-right">İşlem</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomes.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell className="text-sm">{formatDate(inc.income_date)}</TableCell>
                      <TableCell className="font-medium">{inc.source}</TableCell>
                      <TableCell className="text-muted-foreground">{inc.description || '-'}</TableCell>
                      <TableCell className="text-right font-mono font-medium text-green-600">
                        {formatCurrency(inc.amount_tl || inc.amount)}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteIncome(inc.id)} className="text-destructive h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {incomes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Bu dönemde satış dışı gelir kaydı bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recurring Tab */}
        <TabsContent value="recurring" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Tekrarlayan Giderler</h3>
              <p className="text-sm text-muted-foreground">Her ay otomatik oluşturulur</p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerateRecurring}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Bu Ay İçin Oluştur
                </Button>
                <Button size="sm" onClick={() => {
                  setEditingRecurring(null);
                  setRecurringForm({
                    category_id: '',
                    amount: '',
                    currency: 'TRY',
                    description: '',
                    day_of_month: 1,
                    is_active_recurring: true
                  });
                  setIsRecurringModalOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Ekle
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurringExpenses.map((rec) => {
              const IconComponent = CATEGORY_ICONS[rec.category_name] || Package;
              return (
                <Card key={rec.id} className={`${!rec.is_active_recurring ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{rec.category_name}</p>
                          <p className="text-xs text-muted-foreground">Her ayın {rec.day_of_month}. günü</p>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRecurring(rec)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRecurring(rec.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{rec.description || 'Açıklama yok'}</span>
                      <span className="font-mono font-bold text-red-600">{formatCurrency(rec.amount)}</span>
                    </div>
                    {!rec.is_active_recurring && (
                      <Badge variant="secondary" className="mt-2">Pasif</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {recurringExpenses.length === 0 && (
              <Card className="col-span-full p-8 text-center text-muted-foreground">
                Tekrarlayan gider tanımlı değil
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Personnel Tab */}
        <TabsContent value="personnel" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Personel Listesi</h3>
              <p className="text-sm text-muted-foreground">Toplam Maaş: {formatCurrency(totalPersonnelSalary)}</p>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsPersonnelModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Personel Ekle
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
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePersonnel(person.id)} className="text-destructive h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Maaş</span>
                    <span className="font-mono font-bold">{formatCurrency(person.salary)}</span>
                  </div>
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Gider Kategorileri</h3>
            {canManage && (
              <Button size="sm" onClick={() => setIsCategoryModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Kategori Ekle
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
                        {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cat.expense_type === 'fixed' ? 'default' : 'secondary'} className="text-xs">
                        {cat.expense_type === 'fixed' ? 'Sabit' : 'Değişken'}
                      </Badge>
                      {canManage && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)} className="text-destructive h-8 w-8">
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
      </Tabs>

      {/* Add Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
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
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} ({cat.expense_type === 'fixed' ? 'Sabit' : 'Değişken'})
                    </SelectItem>
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
                    <SelectItem value="TRY">₺ TRY</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {expenseForm.currency === 'USD' && (
              <div className="space-y-2">
                <Label>Döviz Kuru</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.exchange_rate}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, exchange_rate: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Tarih *</Label>
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

      {/* Add Income Modal */}
      <Dialog open={isIncomeModalOpen} onOpenChange={setIsIncomeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Satış Dışı Gelir Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Gelir Kaynağı *</Label>
              <Input
                value={incomeForm.source}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, source: e.target.value }))}
                placeholder="Örn: Kira geliri, Faiz geliri"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tutar *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Select value={incomeForm.currency} onValueChange={(val) => setIncomeForm(prev => ({ ...prev, currency: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">₺ TRY</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tarih *</Label>
              <Input
                type="date"
                value={incomeForm.income_date}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, income_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={incomeForm.description}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsIncomeModalOpen(false)}>İptal</Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
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
              <Label>Gider Türü *</Label>
              <Select value={categoryForm.expense_type} onValueChange={(val) => setCategoryForm(prev => ({ ...prev, expense_type: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Sabit Gider (Kira, Maaş vb.)</SelectItem>
                  <SelectItem value="variable">Değişken Gider (Elektrik, Yakıt vb.)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>İptal</Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Personnel Modal */}
      <Dialog open={isPersonnelModalOpen} onOpenChange={setIsPersonnelModalOpen}>
        <DialogContent className="sm:max-w-md">
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
                    <SelectItem value="TRY">₺ TRY</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
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

      {/* Recurring Expense Modal */}
      <Dialog open={isRecurringModalOpen} onOpenChange={setIsRecurringModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecurring ? 'Tekrarlayan Gider Düzenle' : 'Tekrarlayan Gider Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecurringSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori *</Label>
              <Select value={recurringForm.category_id} onValueChange={(val) => setRecurringForm(prev => ({ ...prev, category_id: val }))}>
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
                  value={recurringForm.amount}
                  onChange={(e) => setRecurringForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Her Ayın Günü</Label>
                <Select value={recurringForm.day_of_month.toString()} onValueChange={(val) => setRecurringForm(prev => ({ ...prev, day_of_month: parseInt(val) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={recurringForm.description}
                onChange={(e) => setRecurringForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_recurring"
                checked={recurringForm.is_active_recurring}
                onChange={(e) => setRecurringForm(prev => ({ ...prev, is_active_recurring: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is_active_recurring" className="cursor-pointer">Aktif (her ay oluşturulsun)</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRecurringModalOpen(false)}>İptal</Button>
              <Button type="submit">{editingRecurring ? 'Güncelle' : 'Ekle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Budget Modal */}
      <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear} Bütçesi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBudgetSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Toplam Gider Bütçesi *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₺</span>
                <Input
                  type="number"
                  step="0.01"
                  className="pl-7"
                  value={budgetForm.total_budget}
                  onChange={(e) => setBudgetForm(prev => ({ ...prev, total_budget: e.target.value }))}
                  placeholder="Örn: 50000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea
                value={budgetForm.notes}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Opsiyonel"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBudgetModalOpen(false)}>İptal</Button>
              <Button type="submit">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounting;
