import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Sun, Moon, Eye, EyeOff, Loader2, KeyRound, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  
  // Şifremi Unuttum states
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: code, 3: new password
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleInitData = async () => {
    setInitializing(true);
    try {
      const response = await axios.post(`${API_URL}/api/init-data`);
      toast.success('Veriler oluşturuldu!', {
        description: `Admin: ${response.data.admin_email} / ${response.data.admin_password}`
      });
    } catch (error) {
      toast.error('Hata', { description: error.response?.data?.detail || 'Veriler oluşturulamadı' });
    } finally {
      setInitializing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Giriş başarılı!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Giriş başarısız', {
        description: error.response?.data?.detail || 'Email veya şifre hatalı'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast.error('Lütfen e-posta adresinizi girin');
      return;
    }
    
    setForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email: forgotEmail });
      toast.success('Kod gönderildi!', { description: response.data.hint || 'E-postanızı kontrol edin' });
      setForgotStep(2);
    } catch (error) {
      toast.error('Hata', { description: error.response?.data?.detail || 'İşlem başarısız' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || resetCode.length !== 6) {
      toast.error('Lütfen 6 haneli kodu girin');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    
    setForgotLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        email: forgotEmail,
        code: resetCode,
        new_password: newPassword
      });
      toast.success('Şifreniz başarıyla değiştirildi!');
      setForgotPasswordOpen(false);
      resetForgotForm();
    } catch (error) {
      toast.error('Hata', { description: error.response?.data?.detail || 'Şifre değiştirilemedi' });
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotForm = () => {
    setForgotStep(1);
    setForgotEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1669155985309-cf569561c159?crop=entropy&cs=srgb&fm=jpg&q=85')`
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* Theme toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-10"
        data-testid="login-theme-toggle"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>

      <Card className="w-full max-w-md relative z-10 shadow-2xl" data-testid="login-card">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Sun className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-outfit">SolarPro</CardTitle>
          <CardDescription>Güneş Enerjisi Satış Yönetim Sistemi</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>

          {/* Şifremi Unuttum Link */}
          <div className="text-center mt-4">
            <Button 
              variant="link" 
              className="text-sm text-muted-foreground hover:text-primary"
              onClick={() => { setForgotPasswordOpen(true); resetForgotForm(); }}
            >
              <KeyRound className="h-3 w-3 mr-1" />
              Şifremi Unuttum
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleInitData}
              disabled={initializing}
              data-testid="init-data-btn"
            >
              {initializing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                'Demo Verileri Oluştur'
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              İlk kullanım için demo verilerini oluşturun
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
