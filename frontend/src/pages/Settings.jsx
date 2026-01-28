import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Upload, Save, Building2, Loader2, FileText, CreditCard, Image } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    company_name: '',
    phone: '',
    email: '',
    address: '',
    tax_id: '',
    warranty_text: '',
    logo_url: null,
    quote_cover_image: null,
    quote_terms: '',
    bank_name: '',
    bank_branch: '',
    bank_account_holder: '',
    bank_iban: '',
    bank_swift: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const hasPermission = user?.permissions?.includes('all') || user?.permissions?.includes('settings_manage');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/company`);
      setSettings(prev => ({ ...prev, ...response.data }));
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
      const dataToSave = { ...settings };
      delete dataToSave.logo_url;
      delete dataToSave.quote_cover_image;
      
      await axios.put(`${API_URL}/api/settings/company`, dataToSave);
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
    
    setUploadingLogo(true);
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
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyası yüklenebilir');
      return;
    }
    
    setUploadingCover(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API_URL}/api/settings/upload-quote-cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSettings({ ...settings, quote_cover_image: response.data.quote_cover_image });
      toast.success('Kapak görseli yüklendi');
    } catch (error) {
      toast.error('Kapak görseli yüklenemedi');
    } finally {
      setUploadingCover(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="page-title">Ayarlar</h1>
        <p className="text-muted-foreground mt-1">Şirket bilgileri ve teklif ayarları</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Şirket Bilgileri
          </TabsTrigger>
          <TabsTrigger value="quote" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Teklif Ayarları
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Banka Bilgileri
          </TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-6">
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
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    data-testid="logo-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    data-testid="upload-logo-btn"
                  >
                    {uploadingLogo ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
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

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="address">Adres</Label>
                    <Textarea
                      id="address"
                      value={settings.address || ''}
                      onChange={(e) => setSettings({...settings, address: e.target.value})}
                      rows={2}
                      data-testid="company-address-input"
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
        </TabsContent>

        {/* Quote Settings Tab */}
        <TabsContent value="quote" className="space-y-6">
          {/* Cover Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Teklif Kapak Görseli</CardTitle>
              <CardDescription>PDF teklifin ilk sayfasında tam sayfa görüntülenecek tanıtım görseli (A4 boyutu önerilir: 2480x3508 px)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-48 h-64 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                  {settings.quote_cover_image ? (
                    <img 
                      src={`${API_URL}${settings.quote_cover_image}`} 
                      alt="Kapak" 
                      className="w-full h-full object-cover"
                      data-testid="quote-cover-image"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Image className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">A4 Kapak Görseli</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                    data-testid="cover-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    data-testid="upload-cover-btn"
                  >
                    {uploadingCover ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Kapak Görseli Yükle
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Önerilen boyut: 2480x3508 piksel (A4 300 DPI)<br />
                    Desteklenen formatlar: PNG, JPG, JPEG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Teklif Şartları</CardTitle>
              <CardDescription>PDF teklifin son sayfasında görüntülenecek şartlar ve koşullar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quote_terms">Şartlar ve Koşullar</Label>
                  <Textarea
                    id="quote_terms"
                    value={settings.quote_terms || ''}
                    onChange={(e) => setSettings({...settings, quote_terms: e.target.value})}
                    rows={8}
                    placeholder={`1. Teklif geçerlilik süresi belirtilen tarihe kadardır.
2. Fiyatlara KDV dahildir.
3. Teslimat süresi sipariş onayından itibaren 7-14 iş günüdür.
4. Montaj hizmeti fiyata dahil değildir.
5. Ödeme koşulları: %50 sipariş onayında, %50 teslimat öncesi.
6. Garanti süresi 2 yıldır.`}
                    data-testid="quote-terms-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warranty_text">Garanti Metni</Label>
                  <Textarea
                    id="warranty_text"
                    value={settings.warranty_text || ''}
                    onChange={(e) => setSettings({...settings, warranty_text: e.target.value})}
                    rows={2}
                    placeholder="Tüm ürünlerimiz 2 yıl garanti kapsamındadır."
                    data-testid="warranty-text-input"
                  />
                </div>

                <Button type="submit" disabled={saving}>
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
        </TabsContent>

        {/* Bank Info Tab */}
        <TabsContent value="bank" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Banka Hesap Bilgileri</CardTitle>
              <CardDescription>PDF tekliflerde görüntülenecek ödeme bilgileri</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Banka Adı</Label>
                    <Input
                      id="bank_name"
                      value={settings.bank_name || ''}
                      onChange={(e) => setSettings({...settings, bank_name: e.target.value})}
                      placeholder="Örn: Ziraat Bankası"
                      data-testid="bank-name-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_branch">Şube</Label>
                    <Input
                      id="bank_branch"
                      value={settings.bank_branch || ''}
                      onChange={(e) => setSettings({...settings, bank_branch: e.target.value})}
                      placeholder="Örn: Kadıköy Şubesi"
                      data-testid="bank-branch-input"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="bank_account_holder">Hesap Sahibi</Label>
                    <Input
                      id="bank_account_holder"
                      value={settings.bank_account_holder || ''}
                      onChange={(e) => setSettings({...settings, bank_account_holder: e.target.value})}
                      placeholder="Örn: Solar Enerji A.Ş."
                      data-testid="bank-holder-input"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="bank_iban">IBAN</Label>
                    <Input
                      id="bank_iban"
                      value={settings.bank_iban || ''}
                      onChange={(e) => setSettings({...settings, bank_iban: e.target.value})}
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      data-testid="bank-iban-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_swift">SWIFT Kodu (Opsiyonel)</Label>
                    <Input
                      id="bank_swift"
                      value={settings.bank_swift || ''}
                      onChange={(e) => setSettings({...settings, bank_swift: e.target.value})}
                      placeholder="Örn: TCZBTR2A"
                      data-testid="bank-swift-input"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
