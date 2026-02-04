import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Boxes,
  BadgeDollarSign,
  ArrowRightLeft,
  Wallet,
  PiggyBank,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  AlertTriangle,
  CircleDollarSign,
  Receipt,
  ShoppingCart,
  Percent,
  Building,
  Users,
  FileText,
  TrendingUp as TrendUp
} from 'lucide-react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Format functions
const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const formatTRY = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const Finance = () => {
  const { user } = useAuth();
  const [financeData, setFinanceData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/stats/annual-finance`, {
        params: { year: selectedYear }
      });
      setFinanceData(response.data);
    } catch (error) {
      console.error('Finance data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  // Pie chart data for expense distribution
  const expenseChartData = financeData?.expense_by_category 
    ? Object.entries(financeData.expense_by_category).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="finance-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Finans Paneli
          </h1>
          <p className="text-muted-foreground mt-1">Yıllık finansal özet ve raporlar</p>
        </div>
        
        {/* Year Selector */}
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stock Value Cards - USD & TL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stok Değeri USD */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium">Stok Değeri (USD)</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{formatUSD(financeData?.stock_value_usd)}</p>
                <p className="text-xs text-muted-foreground mt-1">Alış fiyatıyla</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stok Değeri TL */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Stok Değeri (TL)</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{formatTRY(financeData?.stock_value_tl)}</p>
                <p className="text-xs text-muted-foreground mt-1">Kur: {financeData?.exchange_rate_usd || 34} TL</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <BadgeDollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Satış Değeri USD */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium">Satış Değeri (USD)</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{formatUSD(financeData?.stock_sale_value_usd)}</p>
                <p className="text-xs text-muted-foreground mt-1">Liste fiyatıyla</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Satış Değeri TL */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium">Satış Değeri (TL)</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">{formatTRY(financeData?.stock_sale_value_tl)}</p>
                <p className="text-xs text-muted-foreground mt-1">{financeData?.total_stock_count || 0} ürün</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                <Boxes className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Annual Sales, Expenses, Profit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Yıllık Toplam Satış */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Yıllık Toplam Satış</p>
                <p className="text-3xl font-bold mt-2">{formatTRY(financeData?.annual_sales_total)}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-emerald-200">
                  <span>Direkt: {formatTRY(financeData?.annual_sales_revenue)}</span>
                  <span>Teklif: {formatTRY(financeData?.annual_quote_revenue)}</span>
                </div>
              </div>
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                <ShoppingCart className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Yıllık Toplam Gider */}
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg shadow-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Yıllık Toplam Gider</p>
                <p className="text-3xl font-bold mt-2">{formatTRY(financeData?.annual_expenses)}</p>
                <p className="text-xs text-red-200 mt-3">
                  {Object.keys(financeData?.expense_by_category || {}).length} farklı kategori
                </p>
              </div>
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                <Receipt className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Yıllık Kar Marjı */}
        <Card className={`border-0 shadow-lg ${financeData?.is_loss 
          ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/20' 
          : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'} text-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${financeData?.is_loss ? 'text-orange-100' : 'text-violet-100'}`}>
                  Yıllık Kar Marjı
                  {financeData?.is_loss && <Badge className="ml-2 bg-red-600 text-white text-xs">ZARAR</Badge>}
                </p>
                <p className="text-3xl font-bold mt-2">{formatTRY(Math.abs(financeData?.annual_profit || 0))}</p>
                <p className={`text-xs mt-3 ${financeData?.is_loss ? 'text-orange-200' : 'text-violet-200'}`}>
                  Marj: %{financeData?.profit_margin || 0}
                </p>
              </div>
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                {financeData?.is_loss ? <AlertTriangle className="h-7 w-7" /> : <Target className="h-7 w-7" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Potential Profit Summary */}
      <Card className="border-2 border-dashed border-green-300 dark:border-green-700 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-green-600" />
            Potansiyel Kar Özeti
          </CardTitle>
          <CardDescription>Stok satıldığında elde edilecek tahmini kar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
              <p className="text-sm text-muted-foreground">Potansiyel Kar (USD)</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatUSD(financeData?.potential_profit_usd)}
              </p>
            </div>
            <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
              <p className="text-sm text-muted-foreground">Potansiyel Kar (TL)</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatTRY(financeData?.potential_profit_tl)}
              </p>
            </div>
            <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
              <p className="text-sm text-muted-foreground">Tahmini Kar Marjı</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                %{financeData?.stock_value_usd > 0 
                  ? ((financeData?.potential_profit_usd / financeData?.stock_value_usd) * 100).toFixed(1)
                  : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Sales/Expense Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Aylık Satış ve Gider Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financeData?.monthly_data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value) => formatTRY(value)} 
                    labelFormatter={(label) => `${label} ${selectedYear}`}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Satış" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Gider" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" name="Kar" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              Gider Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseChartData.length > 0 ? (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatTRY(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {expenseChartData.slice(0, 6).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate max-w-[80px]">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex items-center justify-center text-muted-foreground">
                Bu yıl gider kaydı yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Toplam Satış Adedi */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam Satış</p>
                <p className="text-lg font-bold">{financeData?.total_sales_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Satışa Dönen Teklifler */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Teklif Satışları</p>
                <p className="text-lg font-bold">{financeData?.total_quotes_sold || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Satış Maliyeti */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Satış Maliyeti</p>
                <p className="text-lg font-bold text-amber-600">{formatTRY(financeData?.annual_sales_cost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Satış Kar */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Satış Karı</p>
                <p className="text-lg font-bold text-purple-600">{formatTRY(financeData?.annual_sales_profit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Profit Trend Line */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendUp className="h-4 w-4 text-muted-foreground" />
            Aylık Kar Trendi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financeData?.monthly_data || []}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month_name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => formatTRY(value)} />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  name="Kar" 
                  stroke="#8B5CF6" 
                  fill="url(#colorProfit)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;
