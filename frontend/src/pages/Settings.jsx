import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Upload, Save, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Settings = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState({
    company_name: '',
    phone: '',
    email: '',
    address: '',
    tax_id: '',
    warranty_text: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/company`);
      setSettings(response.data);
    } catch (error) {
      toast.error('Ayarlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await axios.put(`${API_URL}/api/settings/company`, settings);
      toast.success('Ayarlar kaydedildi');
    } catch (error) {
      toast.error('Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyası yüklenebilir');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API_URL}/api/settings/upload-logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings({ ...settings, logo_url: response.data.logo_url });
      toast.success('Logo yüklendi');
    } catch (error) {
      toast.error('Logo yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="page-title">Ayarlar</h1>
        <p className="text-muted-foreground mt-1">Şirket bilgileri ve sistem ayarları</p>
      </div>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="section-title">Şirket Logosu</CardTitle>
          <CardDescription>PDF tekliflerde kullanılacak logo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
              {settings.logo_url ? (
                <img 
                  src={`${API_URL}${settings.logo_url}`} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  data-testid="company-logo"
                />
              ) : (
                <Building2 className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                data-testid="logo-input"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-testid="upload-logo-btn"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Logo Yükle
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">PNG, JPG veya SVG. Maks 2MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="section-title">Şirket Bilgileri</CardTitle>
          <CardDescription>Tekliflerde görüntülenecek bilgiler</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="company_name">Şirket Adı</Label>
                <Input
                  id="company_name"
                  value={settings.company_name}
                  onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                  data-testid="company-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({...settings, phone: e.target.value})}
                  data-testid="company-phone-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({...settings, email: e.target.value})}
                  data-testid="company-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_id">Vergi Numarası</Label>
                <Input
                  id="tax_id"
                  value={settings.tax_id || ''}
                  onChange={(e) => setSettings({...settings, tax_id: e.target.value})}
                  data-testid="company-tax-input"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  rows={2}
                  data-testid="company-address-input"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="warranty_text">Garanti Metni</Label>
                <Textarea
                  id="warranty_text"
                  value={settings.warranty_text || ''}
                  onChange={(e) => setSettings({...settings, warranty_text: e.target.value})}
                  rows={2}
                  placeholder="PDF teklifin altında görüntülenecek garanti bilgisi"
                  data-testid="company-warranty-input"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} data-testid="save-settings-btn">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
