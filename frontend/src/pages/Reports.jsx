import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  ShoppingCart,
  Package,
  Calendar,
  Download,
  Filter,
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  BarChart3,
  PieChart,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Format helpers
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

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
  } catch {
    return dateStr;
  }
};

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  
  // Quote analysis state
  const [quoteAnalysis, setQuoteAnalysis] = useState(null);
  const [quoteAnalysisLoading, setQuoteAnalysisLoading] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchQuoteAnalysis();
  }, []);

  const fetchReports = async (filterStart = null, filterEnd = null) => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/reports/comprehensive`;
      const params = new URLSearchParams();
      
      if (filterStart || startDate) params.append('start_date', filterStart || startDate);
      if (filterEnd || endDate) params.append('end_date', filterEnd || endDate);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url);
      setData(response.data);
    } catch (error) {
      console.error('Report error:', error);
      toast.error('Raporlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuoteAnalysis = async () => {
    try {
      setQuoteAnalysisLoading(true);
      const params = {};
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;
      
      const response = await axios.get(`${API_URL}/api/reports/quote-analysis`, { params });
      setQuoteAnalysis(response.data);
    } catch (error) {
      console.error('Quote analysis error:', error);
    } finally {
      setQuoteAnalysisLoading(false);
    }
  };

  const handleFilter = () => {
    fetchReports(startDate, endDate);
    fetchQuoteAnalysis();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    fetchReports('', '');
    fetchQuoteAnalysis();
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      let url = `${API_URL}/api/reports/export-sales`;
      const params = new URLSearchParams();
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `satis_raporu_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Excel raporu indirildi');
    } catch (error) {
      toast.error('Excel raporu indirilemedi');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">Raporlar</h1>
          <p className="text-muted-foreground mt-1">Detaylı finansal raporlar ve analizler</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
              data-testid="start-date"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
              data-testid="end-date"
            />
          </div>
          <Button onClick={handleFilter} variant="default" data-testid="filter-btn">
            <Filter className="h-4 w-4 mr-2" />
            Filtrele
          </Button>
          <Button onClick={handleClearFilter} variant="outline" data-testid="clear-filter-btn">
            <RefreshCw className="h-4 w-4 mr-2" />
            Temizle
          </Button>
          <Button onClick={handleExportExcel} variant="outline" disabled={exporting} data-testid="export-btn">
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'İndiriliyor...' : 'Excel İndir'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 w-full">
          <TabsTrigger value="overview" data-testid="tab-overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="quote-analysis" data-testid="tab-quote-analysis">Teklif Analizi</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Cirolar</TabsTrigger>
          <TabsTrigger value="collections" data-testid="tab-collections">Tahsilatlar</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">Giderler</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales">Satış Detayları</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Toplam Müşteri</p>
                    <p className="text-2xl font-bold">{data?.total_customers || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Toplam Satış</p>
                    <p className="text-2xl font-bold">{data?.total_sales || 0}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Toplam Teklif</p>
                    <p className="text-2xl font-bold">{data?.quotes?.total || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-amber-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Kar Marjı</p>
                    <p className="text-2xl font-bold">%{data?.profit_margin || 0}</p>
                  </div>
                  <Percent className="h-8 w-8 text-emerald-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock & Finance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stock Value */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Stok Değeri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Maliyet Değeri (USD)</span>
                  <span className="font-semibold">{formatUSD(data?.stock?.cost_usd)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Maliyet Değeri (TL)</span>
                  <span className="font-semibold">{formatTRY(data?.stock?.cost_tl)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Satış Değeri (TL)</span>
                  <span className="font-semibold text-green-600">{formatTRY(data?.stock?.sale_value_tl)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Potansiyel Kar</span>
                  <span className="font-semibold text-emerald-600">{formatTRY(data?.stock?.potential_profit_tl)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5" />
                  En Çok Ciro Yapan Personel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.top_performers?.length > 0 ? (
                  <div className="space-y-2">
                    {data.top_performers.slice(0, 5).map((performer, index) => (
                      <div key={index} className={cn(
                        "flex justify-between items-center p-3 rounded-lg",
                        index === 0 ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-slate-50 dark:bg-slate-800/50"
                      )}>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            index === 0 ? "bg-yellow-500 text-white" :
                            index === 1 ? "bg-slate-400 text-white" :
                            index === 2 ? "bg-amber-600 text-white" :
                            "bg-slate-200 text-slate-600"
                          )}>
                            {index + 1}
                          </span>
                          <span className="font-medium">{performer.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatTRY(performer.total_revenue)}</p>
                          <p className="text-xs text-muted-foreground">{performer.sale_count} satış</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Henüz satış verisi yok</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Collections Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tahsil Edilen</p>
                    <p className="text-xl font-bold text-green-600">{formatTRY(data?.collections?.total_paid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tahsil Edilmemiş</p>
                    <p className="text-xl font-bold text-amber-600">{formatTRY(data?.collections?.total_remaining)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Yaklaşan Çekler</p>
                    <p className="text-xl font-bold text-blue-600">{formatTRY(data?.collections?.upcoming_checks_total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vadesi Geçmiş Çekler</p>
                    <p className="text-xl font-bold text-red-600">{formatTRY(data?.collections?.overdue_checks_total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* REVENUE TAB */}
        <TabsContent value="revenue" className="space-y-6">
          {/* Period Revenue Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-green-600 font-medium mb-1">Günlük Ciro</p>
                <p className="text-2xl font-bold">{formatTRY(data?.revenue?.daily)}</p>
                <p className="text-xs text-muted-foreground mt-1">Bugün</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-blue-600 font-medium mb-1">Haftalık Ciro</p>
                <p className="text-2xl font-bold">{formatTRY(data?.revenue?.weekly)}</p>
                <p className="text-xs text-muted-foreground mt-1">Bu hafta</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-purple-600 font-medium mb-1">Aylık Ciro</p>
                <p className="text-2xl font-bold">{formatTRY(data?.revenue?.monthly)}</p>
                <p className="text-xs text-muted-foreground mt-1">Bu ay</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-amber-600 font-medium mb-1">Yıllık Ciro</p>
                <p className="text-2xl font-bold">{formatTRY(data?.revenue?.yearly)}</p>
                <p className="text-xs text-muted-foreground mt-1">Bu yıl</p>
              </CardContent>
            </Card>
          </div>

          {/* Quote Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Teklif İstatistikleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold">{data?.quotes?.daily || 0}</p>
                  <p className="text-xs text-muted-foreground">Günlük</p>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold">{data?.quotes?.weekly || 0}</p>
                  <p className="text-xs text-muted-foreground">Haftalık</p>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold">{data?.quotes?.monthly || 0}</p>
                  <p className="text-xs text-muted-foreground">Aylık</p>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold">{data?.quotes?.yearly || 0}</p>
                  <p className="text-xs text-muted-foreground">Yıllık</p>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{data?.quotes?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Toplam</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtered Results */}
          {(startDate || endDate) && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Filtrelenmiş Sonuçlar</CardTitle>
                <CardDescription>
                  {startDate && `${formatDate(startDate)}`} - {endDate && `${formatDate(endDate)}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Filtrelenmiş Ciro</p>
                    <p className="text-2xl font-bold text-blue-600">{formatTRY(data?.revenue?.filtered)}</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Filtrelenmiş Maliyet</p>
                    <p className="text-2xl font-bold text-red-600">{formatTRY(data?.revenue?.filtered_cost)}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Filtrelenmiş Kar</p>
                    <p className="text-2xl font-bold text-green-600">{formatTRY(data?.revenue?.filtered_profit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* COLLECTIONS TAB */}
        <TabsContent value="collections" className="space-y-6">
          {/* Upcoming Collections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Yaklaşan Tahsilatlar
              </CardTitle>
              <CardDescription>Henüz tahsil edilmemiş ödemeler</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.collections?.upcoming_list?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Satış Tarihi</TableHead>
                      <TableHead className="text-right">Kalan Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.collections.upcoming_list.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.customer_name}</TableCell>
                        <TableCell>{item.description || '-'}</TableCell>
                        <TableCell>{formatDate(item.sale_date)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">
                          {formatTRY(item.amount_tl)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Bekleyen tahsilat yok</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Yaklaşan Çekler
                <Badge variant="outline" className="ml-2">{formatTRY(data?.collections?.upcoming_checks_total)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.collections?.upcoming_checks?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Çek No</TableHead>
                      <TableHead>Banka</TableHead>
                      <TableHead>Vade Tarihi</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.collections.upcoming_checks.map((check, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{check.customer_name}</TableCell>
                        <TableCell>{check.check_number || '-'}</TableCell>
                        <TableCell>{check.bank_name || '-'}</TableCell>
                        <TableCell>{formatDate(check.due_date)}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatTRY(check.amount_tl)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Yaklaşan çek yok</p>
              )}
            </CardContent>
          </Card>

          {/* Overdue Checks */}
          {data?.collections?.overdue_checks?.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Vadesi Geçmiş Çekler
                  <Badge variant="destructive" className="ml-2">{formatTRY(data?.collections?.overdue_checks_total)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Çek No</TableHead>
                      <TableHead>Banka</TableHead>
                      <TableHead>Vade Tarihi</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.collections.overdue_checks.map((check, index) => (
                      <TableRow key={index} className="bg-red-50 dark:bg-red-900/10">
                        <TableCell className="font-medium">{check.customer_name}</TableCell>
                        <TableCell>{check.check_number || '-'}</TableCell>
                        <TableCell>{check.bank_name || '-'}</TableCell>
                        <TableCell className="text-red-600">{formatDate(check.due_date)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatTRY(check.amount_tl)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-red-600 font-medium mb-1">Günlük Gider</p>
                <p className="text-2xl font-bold">{formatTRY(data?.expenses?.daily)}</p>
                <p className="text-xs text-muted-foreground mt-1">Bugün</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-orange-600 font-medium mb-1">Haftalık Gider</p>
                <p className="text-2xl font-bold">{formatTRY(data?.expenses?.weekly)}</p>
                <p className="text-xs text-muted-foreground mt-1">Bu hafta</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-rose-600 font-medium mb-1">Aylık Gider</p>
                <p className="text-2xl font-bold">{formatTRY(data?.expenses?.monthly)}</p>
                <p className="text-xs text-muted-foreground mt-1">Bu ay</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-slate-900">
              <CardContent className="p-4">
                <p className="text-xs text-pink-600 font-medium mb-1">Yıllık Gider</p>
                <p className="text-2xl font-bold">{formatTRY(data?.expenses?.yearly)}</p>
                <p className="text-xs text-muted-foreground mt-1">Bu yıl</p>
              </CardContent>
            </Card>
          </div>

          {/* Profit Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Kar Özeti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Toplam Ciro</p>
                  <p className="text-2xl font-bold text-blue-600">{formatTRY(data?.revenue?.yearly)}</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Toplam Gider</p>
                  <p className="text-2xl font-bold text-red-600">{formatTRY(data?.expenses?.yearly)}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Net Kar</p>
                  <p className="text-2xl font-bold text-green-600">{formatTRY(data?.total_profit)}</p>
                  <p className="text-xs text-muted-foreground">Marj: %{data?.profit_margin}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALES DETAILS TAB */}
        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Satış Detayları
                </CardTitle>
                <Button onClick={handleExportExcel} variant="outline" size="sm" disabled={exporting}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel İndir
                </Button>
              </div>
              <CardDescription>
                {data?.sales_details?.length || 0} satış kaydı
                {(startDate || endDate) && ` (${formatDate(startDate)} - ${formatDate(endDate)})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.sales_details?.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead className="text-right">Satış (TL)</TableHead>
                        <TableHead className="text-right">Maliyet (TL)</TableHead>
                        <TableHead className="text-right">Kar (TL)</TableHead>
                        <TableHead className="text-right">Tahsilat</TableHead>
                        <TableHead className="text-right">Kalan</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Satışı Yapan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales_details.map((sale, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(sale.date)}</TableCell>
                          <TableCell className="font-medium">{sale.customer_name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{sale.description || '-'}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatTRY(sale.sale_amount_tl)}</TableCell>
                          <TableCell className="text-right tabular-nums text-red-600">{formatTRY(sale.purchase_amount_tl)}</TableCell>
                          <TableCell className="text-right tabular-nums text-green-600">{formatTRY(sale.profit_tl)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatTRY(sale.paid_amount_tl)}</TableCell>
                          <TableCell className="text-right tabular-nums text-amber-600">{formatTRY(sale.remaining_amount_tl)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              sale.payment_status === 'odendi' ? 'default' :
                              sale.payment_status === 'kismi_odendi' ? 'secondary' : 'outline'
                            }>
                              {sale.payment_status === 'odendi' ? 'Ödendi' :
                               sale.payment_status === 'kismi_odendi' ? 'Kısmi' : 'Bekliyor'}
                            </Badge>
                          </TableCell>
                          <TableCell>{sale.created_by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Satış kaydı bulunamadı</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
