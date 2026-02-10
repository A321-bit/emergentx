import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Package, Users, FileText, TrendingUp, Building2, DollarSign, 
  CheckCircle, Clock, XCircle, AlertTriangle, Banknote, CreditCard,
  Boxes, BarChart3, PieChart, Calendar, ArrowUpRight, ArrowDownRight,
  FileCheck, Percent, Wallet
} from 'lucide-react';
import axios from 'axios';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Format functions
const formatTRY = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const QUOTE_STATUS_COLORS = {
  taslak: '#94a3b8',
  teklif_gonderildi: '#f59e0b',
  onaylandi: '#22c55e',
  satisa_dondu: '#3b82f6',
  reddedildi: '#ef4444'
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.permissions?.includes('all') || user?.permissions?.includes('finance_view');
  const canViewProfit = user?.permissions?.includes('all') || user?.permissions?.includes('profit_view');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Dashboard stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quote status chart data
  const quoteStatusData = stats ? [
    { name: 'Taslak', value: stats.draft_quotes || 0, color: QUOTE_STATUS_COLORS.taslak },
    { name: 'Gönderildi', value: stats.pending_quotes || 0, color: QUOTE_STATUS_COLORS.teklif_gonderildi },
    { name: 'Onaylandı', value: stats.approved_quotes || 0, color: QUOTE_STATUS_COLORS.onaylandi },
    { name: 'Satışa Döndü', value: stats.converted_quotes || 0, color: QUOTE_STATUS_COLORS.satisa_dondu },
    { name: 'Reddedildi', value: stats.rejected_quotes || 0, color: QUOTE_STATUS_COLORS.reddedildi },
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Panel</h1>
          <p className="text-muted-foreground">Hoş geldiniz, {user?.name || user?.email}</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Kur: 1 USD = {stats?.exchange_rate_usd || 34} TL</p>
        </div>
      </div>

      {/* Top Stats Row - Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Bayiler */}
        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium">Bayiler</p>
                <p className="text-2xl font-bold">{stats?.total_dealers || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ciro: {formatTRY(stats?.dealer_total_revenue)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Müşteriler */}
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Müşteriler</p>
                <p className="text-2xl font-bold">{stats?.total_customers || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teklifler */}
        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Teklifler</p>
                <p className="text-2xl font-bold">{stats?.total_quotes || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.converted_quotes || 0} satışa döndü
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ürünler */}
        <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-900 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 font-medium">Ürünler</p>
                <p className="text-2xl font-bold">{stats?.total_products || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center">
                <Package className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Stats Row */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stok Değeri */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Boxes className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Stok Değeri</p>
                  <p className="text-lg font-bold text-green-600">{formatUSD(stats?.stock_value_usd)}</p>
                  <p className="text-xs text-muted-foreground">{formatTRY(stats?.stock_value_tl)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toplam Ciro */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Toplam Ciro</p>
                  <p className="text-lg font-bold text-blue-600">{formatTRY(stats?.total_sale_revenue_tl)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toplam Maliyet */}
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
                  <p className="text-lg font-bold text-red-600">{formatTRY(stats?.total_sale_cost_tl)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kar & Kar Marjı - SADECE YÖNETİCİ */}
          {canViewProfit && (
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Percent className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Toplam Kar</p>
                    <p className="text-lg font-bold text-emerald-600">{formatTRY(stats?.total_sale_profit_tl)}</p>
                    <p className="text-xs text-emerald-600">Marj: %{stats?.profit_margin || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Monthly Income/Expense Row */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Aylık Toplam Gelir */}
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Aylık Toplam Gelir</p>
                  <p className="text-3xl font-bold mt-1">{formatTRY(stats?.monthly_income_total)}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-emerald-200">
                    <span>Satış: {formatTRY(stats?.monthly_income_sales)}</span>
                    <span>Diğer: {formatTRY(stats?.monthly_income_other)}</span>
                  </div>
                </div>
                <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aylık Toplam Gider */}
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg shadow-red-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Aylık Toplam Gider</p>
                  <p className="text-3xl font-bold mt-1">{formatTRY(stats?.monthly_expense_total)}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-red-200">
                    <span>Personel: {formatTRY(stats?.monthly_personnel_salary)}</span>
                  </div>
                </div>
                <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowDownRight className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aylık Net Kar/Zarar - SADECE YÖNETİCİ */}
          {canViewProfit && (
            <Card className={`border-0 shadow-lg ${stats?.monthly_is_loss 
              ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/20' 
              : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'} text-white`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${stats?.monthly_is_loss ? 'text-orange-100' : 'text-violet-100'}`}>
                      Aylık Net {stats?.monthly_is_loss ? 'Zarar' : 'Kar'}
                    </p>
                    <p className="text-3xl font-bold mt-1">{formatTRY(Math.abs(stats?.monthly_net || 0))}</p>
                    <p className={`text-xs mt-2 ${stats?.monthly_is_loss ? 'text-orange-200' : 'text-violet-200'}`}>
                      Gelir - Gider hesabı
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                    {stats?.monthly_is_loss ? <AlertTriangle className="h-7 w-7" /> : <Wallet className="h-7 w-7" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Daily Revenue & Payment Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Günlük Ciro */}
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Günlük Ciro</p>
                <p className="text-3xl font-bold mt-1">{formatTRY(stats?.daily_revenue_tl)}</p>
                <p className="text-xs opacity-75 mt-2">Bugünkü satışlar</p>
              </div>
              <Calendar className="h-12 w-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        {/* Yaklaşan Ödemeler */}
        <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Yaklaşan Ödemeler</p>
                <p className="text-3xl font-bold mt-1">{formatTRY(stats?.upcoming_payments_total)}</p>
                <p className="text-xs opacity-75 mt-2">Tahsil edilecek</p>
              </div>
              <Banknote className="h-12 w-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        {/* Yaklaşan Tahsilatlar (Çekler) */}
        <Card className={`text-white ${stats?.overdue_checks_total > 0 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-teal-500 to-cyan-600'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Yaklaşan Çekler</p>
                <p className="text-3xl font-bold mt-1">{formatTRY(stats?.upcoming_checks_total)}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                    {stats?.upcoming_checks_count || 0} adet
                  </Badge>
                  {stats?.overdue_checks_count > 0 && (
                    <Badge variant="secondary" className="bg-red-200 text-red-800 text-xs">
                      {stats?.overdue_checks_count} gecikmiş
                    </Badge>
                  )}
                </div>
              </div>
              <FileCheck className="h-12 w-12 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teklif Durumları Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Teklif Durumları
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quoteStatusData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={quoteStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {quoteStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Adet']} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Henüz teklif bulunmuyor
              </div>
            )}
            
            {/* Status Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span>Taslak: {stats?.draft_quotes || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Bekleyen: {stats?.pending_quotes || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Onaylı: {stats?.approved_quotes || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Satış: {stats?.converted_quotes || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Red: {stats?.rejected_quotes || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Finansal Özet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stok Bilgileri */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-3">Stok Değeri</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Maliyet (USD)</p>
                    <p className="text-lg font-bold text-green-600">{formatUSD(stats?.stock_value_usd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Maliyet (TL)</p>
                    <p className="text-lg font-bold text-blue-600">{formatTRY(stats?.stock_value_tl)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Satış Değeri (USD)</p>
                    <p className="text-lg font-bold text-emerald-600">{formatUSD(stats?.stock_sale_value_usd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Satış Değeri (TL)</p>
                    <p className="text-lg font-bold text-emerald-600">{formatTRY(stats?.stock_sale_value_tl)}</p>
                  </div>
                </div>
              </div>

              {/* Ciro/Maliyet/Kar */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <span className="text-sm">Toplam Ciro</span>
                  <span className="font-bold text-blue-600">{formatTRY(stats?.total_sale_revenue_tl)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <span className="text-sm">Toplam Maliyet</span>
                  <span className="font-bold text-red-600">{formatTRY(stats?.total_sale_cost_tl)}</span>
                </div>
                {canViewProfit && (
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <span className="text-sm">Toplam Kar</span>
                    <div className="text-right">
                      <span className="font-bold text-green-600">{formatTRY(stats?.total_sale_profit_tl)}</span>
                      <span className="text-xs text-green-600 ml-2">(%{stats?.profit_margin || 0})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bayi Ciro */}
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Bayilerden Toplam Ciro</p>
                    <p className="text-xs text-muted-foreground">{stats?.dealer_sales_count || 0} satış</p>
                  </div>
                  <p className="text-xl font-bold text-purple-600">{formatTRY(stats?.dealer_total_revenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Bekleyen Teklifler</span>
          </div>
          <p className="text-xl font-bold mt-1">{stats?.pending_quotes || 0}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Onaylanan Teklifler</span>
          </div>
          <p className="text-xl font-bold mt-1">{stats?.approved_quotes || 0}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Satışa Dönen</span>
          </div>
          <p className="text-xl font-bold mt-1">{stats?.converted_quotes || 0}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Reddedilen</span>
          </div>
          <p className="text-xl font-bold mt-1">{stats?.rejected_quotes || 0}</p>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
