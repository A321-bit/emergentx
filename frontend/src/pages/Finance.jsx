import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { formatCurrency, cn } from '../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  FileText,
  BadgeDollarSign,
  ArrowRightLeft
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
  Line
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Format functions for different currencies
const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatTRY = (value) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const Finance = () => {
  const [stats, setStats] = useState(null);
  const [salesByUser, setSalesByUser] = useState([]);
  const [salesByDealer, setSalesByDealer] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, salesUserRes, salesDealerRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/stats/dashboard`),
        axios.get(`${API_URL}/api/stats/sales-by-user`),
        axios.get(`${API_URL}/api/stats/sales-by-dealer`),
        axios.get(`${API_URL}/api/products`)
      ]);
      
      setStats(statsRes.data);
      setSalesByUser(salesUserRes.data);
      setSalesByDealer(salesDealerRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Finance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfitability = () => {
    let totalPurchase = 0;
    let totalSale = 0;
    
    products.forEach(p => {
      totalPurchase += p.purchase_price * p.stock_quantity;
      totalSale += p.sale_price * p.stock_quantity;
    });
    
    const potentialProfit = totalSale - totalPurchase;
    const profitMargin = totalPurchase > 0 ? ((potentialProfit / totalPurchase) * 100).toFixed(1) : 0;
    
    return { totalPurchase, totalSale, potentialProfit, profitMargin };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  const profitability = calculateProfitability();

  return (
    <div className="space-y-6 animate-fade-in" data-testid="finance-page">
      {/* Header */}
      <div>
        <h1 className="page-title">Finans Paneli</h1>
        <p className="text-muted-foreground mt-1">Satış ve karlılık raporları</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stock Value USD */}
        <Card className="stat-card" data-testid="stat-stock-value-usd">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Stok Değeri (USD)</p>
                <p className="stat-value mt-1 text-xl text-green-600">{formatUSD(stats?.stock_value_usd || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Alış fiyatıyla</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Value TL */}
        <Card className="stat-card" data-testid="stat-stock-value-tl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Stok Değeri (TL)</p>
                <p className="stat-value mt-1 text-xl text-blue-600">{formatTRY(stats?.stock_value_tl || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Kur: {stats?.exchange_rate_usd || 34} TL</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BadgeDollarSign className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Potential Sale Value USD */}
        <Card className="stat-card" data-testid="stat-sale-value-usd">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Satış Değeri (USD)</p>
                <p className="stat-value mt-1 text-xl text-green-600">{formatUSD(stats?.stock_sale_value_usd || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Liste fiyatıyla</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Potential Sale Value TL */}
        <Card className="stat-card" data-testid="stat-sale-value-tl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="data-label">Satış Değeri (TL)</p>
                <p className="stat-value mt-1 text-xl text-blue-600">{formatTRY(stats?.stock_sale_value_tl || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Liste fiyatıyla</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <ArrowRightLeft className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Summary Card */}
      <Card className="bento-card">
        <CardHeader>
          <CardTitle className="section-title">Potansiyel Kar Özeti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Potansiyel Kar (USD)</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatUSD((stats?.stock_sale_value_usd || 0) - (stats?.stock_value_usd || 0))}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Potansiyel Kar (TL)</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatTRY((stats?.stock_sale_value_tl || 0) - (stats?.stock_value_tl || 0))}
              </p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Kar Marjı</p>
              <p className="text-2xl font-bold text-primary mt-2">
                %{stats?.stock_value_usd > 0 
                  ? (((stats?.stock_sale_value_usd - stats?.stock_value_usd) / stats?.stock_value_usd) * 100).toFixed(1)
                  : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by User */}
        <Card className="bento-card" data-testid="sales-by-user-chart">
          <CardHeader>
            <CardTitle className="section-title">Personel Bazlı Satışlar</CardTitle>
          </CardHeader>
          <CardContent>
            {salesByUser.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByUser}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="total_sales" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Henüz satış verisi yok
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales by Dealer */}
        <Card className="bento-card" data-testid="sales-by-dealer-chart">
          <CardHeader>
            <CardTitle className="section-title">Bayi Bazlı Satışlar</CardTitle>
          </CardHeader>
          <CardContent>
            {salesByDealer.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByDealer}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dealer_name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="total_sales" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Henüz bayi satışı yok
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="bento-card" data-testid="top-performers">
          <CardHeader>
            <CardTitle className="section-title">En İyi Satış Performansı</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personel</TableHead>
                  <TableHead className="text-center">Satış Adedi</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByUser.slice(0, 5).map((seller, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0 && "bg-yellow-500/20 text-yellow-600",
                          index === 1 && "bg-slate-300/30 text-slate-600",
                          index === 2 && "bg-orange-400/20 text-orange-600",
                          index > 2 && "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </span>
                        {seller.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{seller.count}</TableCell>
                    <TableCell className="text-right currency font-medium">{formatCurrency(seller.total_sales)}</TableCell>
                  </TableRow>
                ))}
                {salesByUser.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Henüz satış verisi yok
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Product Profitability */}
        <Card className="bento-card" data-testid="product-profitability">
          <CardHeader>
            <CardTitle className="section-title">Ürün Karlılığı</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Maliyet</TableHead>
                  <TableHead className="text-right">Satış</TableHead>
                  <TableHead className="text-right">Kar %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products
                  .map(p => ({
                    ...p,
                    profitMargin: ((p.sale_price - p.purchase_price) / p.purchase_price * 100).toFixed(1)
                  }))
                  .sort((a, b) => parseFloat(b.profitMargin) - parseFloat(a.profitMargin))
                  .slice(0, 5)
                  .map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right currency">{formatCurrency(product.purchase_price)}</TableCell>
                      <TableCell className="text-right currency">{formatCurrency(product.sale_price)}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          parseFloat(product.profitMargin) >= 30 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : parseFloat(product.profitMargin) >= 15
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          %{product.profitMargin}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Finance;
