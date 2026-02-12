import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { AlertCircle, CheckCircle2, Lock, KeyRound } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EmergencyReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [newPassword, setNewPassword] = useState('admin123');
  const [email, setEmail] = useState('admin@solar.com');

  // URL'den gelen key ile otomatik sıfırlama
  useEffect(() => {
    const keyFromUrl = searchParams.get('key');
    if (keyFromUrl === 'AKTURK-SOLAR-2024-RESET') {
      handleReset('AKTURK-SOLAR-2024-RESET');
    }
  }, [searchParams]);

  const handleReset = async (key) => {
    setStatus('loading');
    try {
      const response = await fetch(`${API_URL}/api/auth/emergency-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          new_password: newPassword,
          secret_key: key || secretKey
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Şifre başarıyla sıfırlandı!');
      } else {
        setStatus('error');
        setMessage(data.detail || 'Bir hata oluştu');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Bağlantı hatası: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-orange-500" />
          </div>
          <CardTitle className="text-2xl text-white">Acil Şifre Sıfırlama</CardTitle>
          <CardDescription className="text-slate-400">
            Admin hesabı şifresini sıfırlayın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-green-400 font-medium">{message}</p>
              <div className="bg-slate-700/50 p-4 rounded-lg text-left">
                <p className="text-slate-300 text-sm mb-2">Giriş bilgileriniz:</p>
                <p className="text-white"><strong>Email:</strong> {email}</p>
                <p className="text-white"><strong>Şifre:</strong> {newPassword}</p>
              </div>
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                Giriş Sayfasına Git
              </Button>
            </div>
          ) : status === 'error' ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-400">{message}</p>
              <Button 
                onClick={() => setStatus('idle')} 
                variant="outline"
                className="w-full border-slate-600 text-slate-300"
              >
                Tekrar Dene
              </Button>
            </div>
          ) : status === 'loading' ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">Şifre sıfırlanıyor...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Email</label>
                <Input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Yeni Şifre</label>
                <Input 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Güvenlik Anahtarı</label>
                <Input 
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Güvenlik anahtarını girin"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button 
                onClick={() => handleReset()} 
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={!secretKey}
              >
                <Lock className="w-4 h-4 mr-2" />
                Şifreyi Sıfırla
              </Button>
              <p className="text-xs text-slate-500 text-center">
                Bu sayfa sadece yetkili kişiler içindir.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
