import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/utils';
import {
  Package,
  Users,
  FileText,
  TrendingUp,
  Building2,
  DollarSign,
  CheckCircle,
  Clock,
  Boxes
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = ['hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(160, 84%, 39%)', 'hsl(350, 89%, 60%)'];

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [salesByUser, setSalesByUser] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, salesRes] = await Promise.all([
        axios.get(`${API_URL}/api/stats/dashboard`),
        isAdmin ? axios.get(`${API_URL}/api/stats/sales-by-user`) : Promise.resolve({ data: [] })
      ]);
      
      setStats(statsRes.data);
      setSalesByUser(salesRes.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  const quoteStatusData = [
    { name: 'Bekleyen', value: stats?.pending_quotes || 0 },
    { name: 'Onaylanan', value: stats?.approved_quotes || 0 },
    { name: 'Satışa Dönen', value: stats?.converted_quotes || 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="page-title">Hoş Geldiniz, {user?.name}</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'Sistem genel durumu' : 'Satış performansınız'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isAdmin && (
          <>
            <Card className="stat-card" data-testid="stat-users">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Kullanıcılar</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{stats?.total_users || 0}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card" data-testid="stat-dealers">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Bayiler</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{stats?.total_dealers || 0}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card" data-testid="stat-stock-value">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Stok Değeri</p>
                    <p className="text-sm sm:text-lg font-bold mt-1 truncate">{formatCurrency(stats?.stock_value || 0)}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 ml-2">
                    <Boxes className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="stat-card" data-testid="stat-products">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Ürünler</p>
                <p className="text-lg sm:text-2xl font-bold mt-1">{stats?.total_products || 0}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-customers">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Müşteriler</p>
                <p className="text-lg sm:text-2xl font-bold mt-1">{stats?.total_customers || 0}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-quotes">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Teklifler</p>
                <p className="text-lg sm:text-2xl font-bold mt-1">{stats?.total_quotes || 0}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="stat-revenue">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Toplam Ciro</p>
                <p className="text-sm sm:text-lg font-bold mt-1 truncate">{formatCurrency(stats?.total_revenue || 0)}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 ml-2">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Quote Status Chart */}
        <Card className="bento-card" data-testid="quote-status-chart">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="section-title">Teklif Durumları</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quoteStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                  >
                    {quoteStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-xs sm:text-sm">Bekleyen: {stats?.pending_quotes || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span className="text-xs sm:text-sm">Onaylanan: {stats?.approved_quotes || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-xs sm:text-sm">Satış: {stats?.converted_quotes || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales by User (Admin only) */}
        {isAdmin && salesByUser.length > 0 && (
          <Card className="bento-card" data-testid="sales-by-user-chart">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="section-title">Personel Satışları</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByUser}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
