import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Upload, Save, Building2, Loader2, FileText, CreditCard, Image, DollarSign, RefreshCw, Plus, Trash2, Zap, Fuel, Wallet, CloudDownload, Package, Eye, Play, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Empty bank account template
const emptyBankAccount = {
  bank_name: '',
  bank_branch: '',
  account_holder: '',
  iban: '',
  swift: ''
};

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
    why_us_image: null,
    quote_terms: '',
    contract_terms: '',
    bank_accounts: [],
    payment_notes: []
  });
  const [exchangeRates, setExchangeRates] = useState({
    usd_to_try: 34.0,
    eur_to_try: 37.0,
    last_updated: null
  });
  const [energyPrices, setEnergyPrices] = useState({
    electricity_rates: [],
    diesel_price_per_liter: 45.0,
    diesel_consumption_per_kwh: 0.35
  });
  const [cardProviders, setCardProviders] = useState([]);
  const [epdk_types, setEpdkTypes] = useState([]);
  const [xmlSettings, setXmlSettings] = useState({
    xml_url: 'https://mexxsun.entra.net/api/xml/products/77148822',
    auto_sync_enabled: false,
    sync_interval_hours: 24,
    supplier_name: 'Mexxsun',
    default_vat_rate: 20,
    default_profit_margin: 30,
    last_sync: null,
    last_sync_result: null
  });
  const [xmlPreview, setXmlPreview] = useState(null);
  const [xmlImporting, setXmlImporting] = useState(false);
  const [xmlPreviewing, setXmlPreviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [savingEnergy, setSavingEnergy] = useState(false);
  const [savingCardProvider, setSavingCardProvider] = useState(false);
  const [newCardProviderName, setNewCardProviderName] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const hasPermission = user?.permissions?.includes('all') || user?.permissions?.includes('settings_manage');

  useEffect(() => {
    fetchSettings();
    fetchExchangeRates();
    fetchEnergyPrices();
    fetchEpdkTypes();
    fetchCardProviders();
    fetchXmlSettings();
  }, []);

  const fetchCardProviders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/card-providers`);
      setCardProviders(response.data || []);
    } catch (error) {
      console.error('Kart tedarikçileri yüklenemedi');
    }
  };

  const fetchXmlSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/xml-import`);
      setXmlSettings(response.data);
    } catch (error) {
      console.error('XML ayarları yüklenemedi');
    }
  };

  const handleSaveXmlSettings = async () => {
    try {
      await axios.put(`${API_URL}/api/settings/xml-import`, xmlSettings);
      toast.success('XML ayarları kaydedildi');
    } catch (error) {
      toast.error('XML ayarları kaydedilemedi');
    }
  };

  const handleXmlPreview = async () => {
    setXmlPreviewing(true);
    setXmlPreview(null);
    try {
      const response = await axios.post(`${API_URL}/api/xml-import/preview`);
      setXmlPreview(response.data);
      toast.success('XML verisi başarıyla alındı');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'XML önizleme hatası');
    } finally {
      setXmlPreviewing(false);
    }
  };

  const handleXmlImport = async () => {
    if (!window.confirm('XML\'den ürün aktarımı başlatılsın mı? Bu işlem mevcut ürünleri güncelleyebilir veya yeni ürünler ekleyebilir.')) {
      return;
    }
    
    setXmlImporting(true);
    try {
      const response = await axios.post(`${API_URL}/api/xml-import/execute`, {
        skip_without_price: true,
        update_existing: true
      });
      
      const stats = response.data.stats;
      toast.success(
        `Import tamamlandı! ${stats.created} yeni ürün eklendi, ${stats.updated} ürün güncellendi.`,
        { duration: 5000 }
      );
      
      // Refresh settings to get last sync info
      fetchXmlSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import hatası');
    } finally {
      setXmlImporting(false);
    }
  };

  const handleAddCardProvider = async () => {
    if (!newCardProviderName.trim()) {
      toast.error('Tedarikçi adı zorunludur');
      return;
    }
    
    setSavingCardProvider(true);
    try {
      const response = await axios.post(`${API_URL}/api/settings/card-providers`, {
        name: newCardProviderName.trim()
      });
      setCardProviders(prev => [...prev, response.data]);
      setNewCardProviderName('');
      toast.success('Kart tedarikçisi eklendi');
    } catch (error) {
      toast.error('Tedarikçi eklenemedi');
    } finally {
      setSavingCardProvider(false);
    }
  };

  const handleDeleteCardProvider = async (providerId) => {
    if (!window.confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/settings/card-providers/${providerId}`);
      setCardProviders(prev => prev.filter(p => p.id !== providerId));
      toast.success('Tedarikçi silindi');
    } catch (error) {
      toast.error('Tedarikçi silinemedi');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/company`);
      // Ensure bank_accounts is always an array
      const data = response.data;
      if (!data.bank_accounts || !Array.isArray(data.bank_accounts)) {
        // Migrate old single bank format to array
        if (data.bank_name || data.bank_iban) {
          data.bank_accounts = [{
            bank_name: data.bank_name || '',
            bank_branch: data.bank_branch || '',
            account_holder: data.bank_account_holder || '',
            iban: data.bank_iban || '',
            swift: data.bank_swift || ''
          }];
        } else {
          data.bank_accounts = [];
        }
      }
      setSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      toast.error('Ayarlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/exchange-rates`);
      setExchangeRates(response.data);
    } catch (error) {
      console.error('Kur ayarları yüklenemedi');
    }
  };

  const fetchEpdkTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/epdk-subscription-types`);
      setEpdkTypes(response.data);
    } catch (error) {
      console.error('EPDK abonelik türleri yüklenemedi');
    }
  };

  const fetchEnergyPrices = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/energy-prices`);
      setEnergyPrices(response.data);
    } catch (error) {
      console.error('Enerji fiyatları yüklenemedi');
    }
  };

  const handleSaveEnergyPrices = async (e) => {
    e.preventDefault();
    setSavingEnergy(true);
    
    try {
      const response = await axios.put(`${API_URL}/api/settings/energy-prices`, energyPrices);
      setEnergyPrices(response.data);
      toast.success('Enerji fiyatları kaydedildi');
    } catch (error) {
      toast.error('Enerji fiyatları kaydedilemedi');
    } finally {
      setSavingEnergy(false);
    }
  };

  const updateElectricityRate = (typeCode, newPrice) => {
    setEnergyPrices(prev => ({
      ...prev,
      electricity_rates: prev.electricity_rates.map(rate => 
        rate.type_code === typeCode 
          ? { ...rate, price_per_kwh: parseFloat(newPrice) || 0 }
          : rate
      )
    }));
  };

  const handleSaveExchangeRates = async (e) => {
    e.preventDefault();
    setSavingRates(true);
    
    try {
      const formData = new FormData();
      formData.append('usd_to_try', exchangeRates.usd_to_try);
      formData.append('eur_to_try', exchangeRates.eur_to_try);
      
      const response = await axios.put(`${API_URL}/api/settings/exchange-rates`, formData);
      setExchangeRates(response.data);
      toast.success('Kur ayarları kaydedildi');
    } catch (error) {
      toast.error('Kur ayarları kaydedilemedi');
    } finally {
      setSavingRates(false);
    }
  };

  // Bank account management functions
  const addBankAccount = () => {
    setSettings(prev => ({
      ...prev,
      bank_accounts: [...(prev.bank_accounts || []), { ...emptyBankAccount }]
    }));
  };

  const removeBankAccount = (index) => {
    setSettings(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter((_, i) => i !== index)
    }));
  };

  const updateBankAccount = (index, field, value) => {
    setSettings(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.map((account, i) => 
        i === index ? { ...account, [field]: value } : account
      )
    }));
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
        <TabsList className="flex-wrap">
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
          <TabsTrigger value="currency" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Kur Ayarları
          </TabsTrigger>
          <TabsTrigger value="energy" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Enerji Fiyatları
          </TabsTrigger>
          <TabsTrigger value="cardproviders" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Kart Tedarikçileri
          </TabsTrigger>
          <TabsTrigger value="xmlimport" className="flex items-center gap-2">
            <CloudDownload className="h-4 w-4" />
            XML Ürün Aktarımı
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

          {/* Why Us Page Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Neden Biz Sayfa Tasarımı (2. Sayfa)</CardTitle>
              <CardDescription>PDF teklifin 2. sayfasında tam sayfa görüntülenecek "Neden Biz" tanıtım görseli</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-48 h-64 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                  {settings.why_us_image ? (
                    <img 
                      src={`${API_URL}${settings.why_us_image}`} 
                      alt="Neden Biz" 
                      className="w-full h-full object-cover"
                      data-testid="why-us-image"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Image className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Neden Biz Görseli</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const formData = new FormData();
                      formData.append('file', file);
                      
                      try {
                        const response = await fetch(`${API_URL}/api/settings/upload-why-us-image`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                          body: formData
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          setSettings(prev => ({ ...prev, why_us_image: data.why_us_image }));
                          toast.success('Neden Biz görseli yüklendi');
                        } else {
                          toast.error('Görsel yüklenemedi');
                        }
                      } catch (error) {
                        toast.error('Yükleme hatası');
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="why-us-input"
                    data-testid="why-us-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('why-us-input')?.click()}
                    data-testid="upload-why-us-btn"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Neden Biz Görseli Yükle
                  </Button>
                  {settings.why_us_image && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-500"
                      onClick={async () => {
                        try {
                          await fetch(`${API_URL}/api/settings/why-us-image`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                          });
                          setSettings(prev => ({ ...prev, why_us_image: null }));
                          toast.success('Görsel silindi');
                        } catch (error) {
                          toast.error('Silme hatası');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Görseli Sil
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Önerilen boyut: 2480x3508 piksel (A4 300 DPI)<br />
                    Bu görsel yüklendiğinde PDF 2. sayfada tam sayfa gösterilir
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Teklif Şartları</CardTitle>
              <CardDescription>PDF teklifin ürünler sayfasından sonra görüntülenecek şartlar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quote_terms">Şartlar ve Koşullar</Label>
                  <Textarea
                    id="quote_terms"
                    value={settings.quote_terms || ''}
                    onChange={(e) => setSettings({...settings, quote_terms: e.target.value})}
                    rows={6}
                    placeholder={`1. Teklif geçerlilik süresi belirtilen tarihe kadardır.
2. Fiyatlara KDV dahildir.
3. Teslimat süresi sipariş onayından itibaren 7-14 iş günüdür.`}
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

          {/* Contract Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Sözleşme Metni</CardTitle>
              <CardDescription>PDF teklifin sonunda ayrı sayfa olarak görüntülenecek sözleşme metni</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_terms">Sözleşme Koşulları</Label>
                  <Textarea
                    id="contract_terms"
                    value={settings.contract_terms || ''}
                    onChange={(e) => setSettings({...settings, contract_terms: e.target.value})}
                    rows={15}
                    placeholder={`SATIŞ SÖZLEŞMESİ

MADDE 1 - TARAFLAR
Satıcı: [Şirket Adı]
Alıcı: [Müşteri Adı]

MADDE 2 - SÖZLEŞMENİN KONUSU
Bu sözleşme, satıcı tarafından alıcıya satılacak olan güneş enerjisi sistemi ve ekipmanlarının teslimat koşullarını düzenler.

MADDE 3 - FİYAT VE ÖDEME
3.1 Toplam bedel teklifte belirtilen tutardır.
3.2 Ödeme koşulları: %50 sipariş onayında, %50 teslimat öncesi.

MADDE 4 - TESLİMAT
4.1 Teslimat süresi sipariş onayından itibaren 7-14 iş günüdür.
4.2 Teslimat adresi alıcının belirttiği adrestir.

MADDE 5 - GARANTİ
5.1 Tüm ürünler 2 yıl üretici garantisi kapsamındadır.
5.2 Kullanım hatalarından kaynaklanan arızalar garanti kapsamı dışındadır.

MADDE 6 - GENEL HÜKÜMLER
6.1 Bu sözleşme Türkiye Cumhuriyeti kanunlarına tabidir.
6.2 Uyuşmazlıklarda İstanbul Mahkemeleri yetkilidir.`}
                    data-testid="contract-terms-input"
                    className="font-mono text-sm"
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
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="section-title">Banka Hesap Bilgileri</CardTitle>
                  <CardDescription>PDF tekliflerde görüntülenecek ödeme bilgileri (birden fazla hesap ekleyebilirsiniz)</CardDescription>
                </div>
                <Button type="button" onClick={addBankAccount} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Hesap Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                {(!settings.bank_accounts || settings.bank_accounts.length === 0) ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-3">Henüz banka hesabı eklenmemiş</p>
                    <Button type="button" onClick={addBankAccount} variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      İlk Hesabı Ekle
                    </Button>
                  </div>
                ) : (
                  settings.bank_accounts.map((account, index) => (
                    <div key={index} className="relative border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm text-muted-foreground">
                          Banka Hesabı #{index + 1}
                        </span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeBankAccount(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Banka Adı</Label>
                          <Input
                            value={account.bank_name || ''}
                            onChange={(e) => updateBankAccount(index, 'bank_name', e.target.value)}
                            placeholder="Örn: Ziraat Bankası"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Şube</Label>
                          <Input
                            value={account.bank_branch || ''}
                            onChange={(e) => updateBankAccount(index, 'bank_branch', e.target.value)}
                            placeholder="Örn: Kadıköy Şubesi"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label>Hesap Sahibi</Label>
                          <Input
                            value={account.account_holder || ''}
                            onChange={(e) => updateBankAccount(index, 'account_holder', e.target.value)}
                            placeholder="Örn: Solar Enerji A.Ş."
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label>IBAN</Label>
                          <Input
                            value={account.iban || ''}
                            onChange={(e) => updateBankAccount(index, 'iban', e.target.value)}
                            placeholder="TR00 0000 0000 0000 0000 0000 00"
                            className="font-mono"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>SWIFT Kodu (Opsiyonel)</Label>
                          <Input
                            value={account.swift || ''}
                            onChange={(e) => updateBankAccount(index, 'swift', e.target.value)}
                            placeholder="Örn: TCZBTR2A"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {settings.bank_accounts && settings.bank_accounts.length > 0 && (
                  <div className="flex gap-2">
                    <Button type="button" onClick={addBankAccount} variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Başka Hesap Ekle
                    </Button>
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
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Payment Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title">PDF Ödeme Notları</CardTitle>
              <CardDescription>
                Teklif PDF'inde "Önemli Notlar" bölümünde görüntülenecek maddeler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                {(!settings.payment_notes || settings.payment_notes.length === 0) ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="mb-4">Henüz ödeme notu eklenmemiş</p>
                    <Button 
                      type="button" 
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        payment_notes: ['']
                      }))}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      İlk Notu Ekle
                    </Button>
                  </div>
                ) : (
                  settings.payment_notes.map((note, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-muted-foreground">Madde {index + 1}</span>
                        </div>
                        <Input
                          value={note}
                          onChange={(e) => {
                            const newNotes = [...settings.payment_notes];
                            newNotes[index] = e.target.value;
                            setSettings(prev => ({ ...prev, payment_notes: newNotes }));
                          }}
                          placeholder="Ödeme notu girin..."
                          data-testid={`payment-note-${index}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-6"
                        onClick={() => {
                          const newNotes = settings.payment_notes.filter((_, i) => i !== index);
                          setSettings(prev => ({ ...prev, payment_notes: newNotes }));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}

                {settings.payment_notes && settings.payment_notes.length > 0 && (
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="button" 
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        payment_notes: [...(prev.payment_notes || []), '']
                      }))}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Yeni Madde Ekle
                    </Button>
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
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currency/Exchange Rate Tab */}
        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Döviz Kuru Ayarları</CardTitle>
              <CardDescription>
                Stok değeri ve finans hesaplamalarında kullanılacak güncel döviz kurları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveExchangeRates} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* USD/TRY */}
                  <div className="space-y-3">
                    <Label htmlFor="usd_to_try" className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">$</span>
                      USD / TRY Kuru
                    </Label>
                    <div className="relative">
                      <Input
                        id="usd_to_try"
                        type="number"
                        step="0.01"
                        min="0"
                        value={exchangeRates.usd_to_try}
                        onChange={(e) => setExchangeRates({...exchangeRates, usd_to_try: parseFloat(e.target.value) || 0})}
                        className="text-lg font-semibold pl-4 pr-12"
                        data-testid="usd-rate-input"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">TL</span>
                    </div>
                    <p className="text-xs text-muted-foreground">1 USD = {exchangeRates.usd_to_try} TL</p>
                  </div>

                  {/* EUR/TRY */}
                  <div className="space-y-3">
                    <Label htmlFor="eur_to_try" className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">€</span>
                      EUR / TRY Kuru
                    </Label>
                    <div className="relative">
                      <Input
                        id="eur_to_try"
                        type="number"
                        step="0.01"
                        min="0"
                        value={exchangeRates.eur_to_try}
                        onChange={(e) => setExchangeRates({...exchangeRates, eur_to_try: parseFloat(e.target.value) || 0})}
                        className="text-lg font-semibold pl-4 pr-12"
                        data-testid="eur-rate-input"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">TL</span>
                    </div>
                    <p className="text-xs text-muted-foreground">1 EUR = {exchangeRates.eur_to_try} TL</p>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <RefreshCw className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">Kur Hesaplamaları</p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        Bu kurlar Dashboard ve Finans panellerinde stok değeri hesaplamalarında kullanılır. 
                        USD cinsinden kayıtlı ürünler bu kurla TL'ye çevrilir.
                      </p>
                    </div>
                  </div>
                </div>

                {exchangeRates.last_updated && (
                  <p className="text-xs text-muted-foreground">
                    Son güncelleme: {new Date(exchangeRates.last_updated).toLocaleString('tr-TR')}
                  </p>
                )}

                <Button type="submit" disabled={savingRates} data-testid="save-rates-btn">
                  {savingRates ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Kurları Kaydet
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Örnek Hesaplama</CardTitle>
              <CardDescription>Mevcut kurlarla örnek dönüşüm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">100 USD</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {(100 * exchangeRates.usd_to_try).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">1.000 USD</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {(1000 * exchangeRates.usd_to_try).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">10.000 USD</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {(10000 * exchangeRates.usd_to_try).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Energy Prices Tab */}
        <TabsContent value="energy" className="space-y-6">
          {/* Electricity Rates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700">
                  ⚡
                </span>
                Elektrik Birim Fiyatları (EPDK)
              </CardTitle>
              <CardDescription>
                Abonelik türüne göre elektrik birim fiyatlarını girin. Bu fiyatlar On-Grid sistem tasarruf hesaplamalarında kullanılır.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEnergyPrices} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {energyPrices.electricity_rates.map((rate) => (
                    <div key={rate.type_code} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <Label className="font-medium text-sm">{rate.type_name}</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rate.price_per_kwh}
                          onChange={(e) => updateElectricityRate(rate.type_code, e.target.value)}
                          className="pr-16"
                          data-testid={`rate-${rate.type_code}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          TL/kWh
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <span className="text-blue-600 flex-shrink-0 text-lg">ℹ️</span>
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-200">EPDK Tarifeleri Hakkında</p>
                      <p className="text-blue-700 dark:text-blue-300 mt-1">
                        Elektrik birim fiyatları EPDK (Enerji Piyasası Düzenleme Kurumu) tarafından belirlenir. 
                        Güncel fiyatları <a href="https://www.epdk.gov.tr" target="_blank" rel="noopener noreferrer" className="underline font-medium">epdk.gov.tr</a> adresinden kontrol edebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Diesel/Generator Costs Card */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700">
                  ⛽
                </span>
                Jeneratör / Mazot Maliyetleri
              </CardTitle>
              <CardDescription>
                Off-Grid sistemlerde jeneratör alternatifi ile karşılaştırma hesabı için mazot fiyatı ve tüketim değerlerini girin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEnergyPrices} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Diesel Price */}
                  <div className="space-y-3">
                    <Label htmlFor="diesel_price" className="font-medium">
                      Mazot Litre Fiyatı
                    </Label>
                    <div className="relative">
                      <Input
                        id="diesel_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={energyPrices.diesel_price_per_liter}
                        onChange={(e) => setEnergyPrices({
                          ...energyPrices, 
                          diesel_price_per_liter: parseFloat(e.target.value) || 0
                        })}
                        className="text-lg font-semibold pr-12"
                        data-testid="diesel-price-input"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">TL/L</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Güncel mazot (motorin) litre fiyatı</p>
                  </div>

                  {/* Diesel Consumption */}
                  <div className="space-y-3">
                    <Label htmlFor="diesel_consumption" className="font-medium">
                      Jeneratör Tüketimi
                    </Label>
                    <div className="relative">
                      <Input
                        id="diesel_consumption"
                        type="number"
                        step="0.01"
                        min="0"
                        value={energyPrices.diesel_consumption_per_kwh}
                        onChange={(e) => setEnergyPrices({
                          ...energyPrices, 
                          diesel_consumption_per_kwh: parseFloat(e.target.value) || 0
                        })}
                        className="text-lg font-semibold pr-16"
                        data-testid="diesel-consumption-input"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">L/kWh</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Ortalama jeneratör: 0.30 - 0.40 L/kWh</p>
                  </div>
                </div>

                {/* Calculated Cost Display */}
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <span className="text-orange-600 flex-shrink-0 text-lg">🔢</span>
                    <div className="text-sm">
                      <p className="font-medium text-orange-800 dark:text-orange-200">Hesaplanan Jeneratör Maliyeti</p>
                      <p className="text-orange-700 dark:text-orange-300 mt-1">
                        <span className="font-bold text-lg">
                          {(energyPrices.diesel_price_per_liter * energyPrices.diesel_consumption_per_kwh).toFixed(2)} TL/kWh
                        </span>
                        <span className="ml-2">
                          ({energyPrices.diesel_consumption_per_kwh} L × {energyPrices.diesel_price_per_liter} TL)
                        </span>
                      </p>
                      <p className="text-orange-600 dark:text-orange-400 mt-2 text-xs">
                        Bu değer Off-Grid sistem tekliflerindeki tasarruf hesaplamalarında kullanılır.
                      </p>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={savingEnergy} data-testid="save-energy-btn">
                  {savingEnergy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enerji Fiyatlarını Kaydet
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Örnek Tasarruf Karşılaştırması</CardTitle>
              <CardDescription>10.000 kWh yıllık üretim için tahmini tasarruf</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">On-Grid (Mesken Tarife)</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {((energyPrices.electricity_rates.find(r => r.type_code === 'mesken')?.price_per_kwh || 3) * 10000).toLocaleString('tr-TR')} TL/yıl
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Elektrik faturası tasarrufu</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Off-Grid (Jeneratör)</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {(energyPrices.diesel_price_per_liter * energyPrices.diesel_consumption_per_kwh * 10000).toLocaleString('tr-TR')} TL/yıl
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Mazot tasarrufu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Card Providers Tab */}
        <TabsContent value="cardproviders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="section-title">Kart Çekilen Sistem / Tedarikçiler</CardTitle>
              <CardDescription>
                Satış ekranında kart ödemesi girildiğinde seçilebilecek tedarikçileri yönetin (PayTR, Endesan vb.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new provider */}
              <div className="flex gap-2">
                <Input
                  placeholder="Yeni tedarikçi adı (örn: PayTR)"
                  value={newCardProviderName}
                  onChange={(e) => setNewCardProviderName(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCardProvider()}
                />
                <Button onClick={handleAddCardProvider} disabled={savingCardProvider}>
                  {savingCardProvider ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Ekle
                    </>
                  )}
                </Button>
              </div>

              {/* List providers */}
              {cardProviders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Henüz kart tedarikçisi eklenmemiş
                </p>
              ) : (
                <div className="space-y-2">
                  {cardProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">{provider.name}</span>
                        {provider.description && (
                          <span className="text-sm text-muted-foreground">({provider.description})</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCardProvider(provider.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* XML Import Tab */}
        <TabsContent value="xmlimport" className="space-y-6">
          {/* XML Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="section-title flex items-center gap-2">
                <CloudDownload className="h-5 w-5" />
                XML B2B Ürün Aktarımı
              </CardTitle>
              <CardDescription>
                Tedarikçi XML feed'inden ürünleri otomatik olarak içe aktarın ve güncelleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* XML URL */}
              <div className="space-y-3">
                <Label htmlFor="xml_url">XML Feed URL</Label>
                <Input
                  id="xml_url"
                  value={xmlSettings.xml_url || ''}
                  onChange={(e) => setXmlSettings({...xmlSettings, xml_url: e.target.value})}
                  placeholder="https://example.com/api/xml/products"
                  data-testid="xml-url-input"
                />
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tedarikçi Adı</Label>
                  <Input
                    value={xmlSettings.supplier_name || ''}
                    onChange={(e) => setXmlSettings({...xmlSettings, supplier_name: e.target.value})}
                    placeholder="Mexxsun"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Varsayılan KDV Oranı (%)</Label>
                  <Input
                    type="number"
                    value={xmlSettings.default_vat_rate || 20}
                    onChange={(e) => setXmlSettings({...xmlSettings, default_vat_rate: parseFloat(e.target.value) || 20})}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Varsayılan Kar Marjı (%)</Label>
                  <Input
                    type="number"
                    value={xmlSettings.default_profit_margin || 30}
                    onChange={(e) => setXmlSettings({...xmlSettings, default_profit_margin: parseFloat(e.target.value) || 30})}
                    min="0"
                    max="200"
                  />
                </div>
              </div>

              {/* Auto Sync Settings */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Otomatik Senkronizasyon
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Her {xmlSettings.sync_interval_hours || 24} saatte bir otomatik güncelle
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    className="w-20"
                    value={xmlSettings.sync_interval_hours || 24}
                    onChange={(e) => setXmlSettings({...xmlSettings, sync_interval_hours: parseInt(e.target.value) || 24})}
                    min="1"
                    max="168"
                  />
                  <span className="text-sm text-muted-foreground">saat</span>
                  <Switch
                    checked={xmlSettings.auto_sync_enabled || false}
                    onCheckedChange={(checked) => setXmlSettings({...xmlSettings, auto_sync_enabled: checked})}
                  />
                </div>
              </div>

              {/* Last Sync Info */}
              {xmlSettings.last_sync && (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Son Senkronizasyon:</span>
                    <span>{new Date(xmlSettings.last_sync).toLocaleString('tr-TR')}</span>
                  </div>
                  {xmlSettings.last_sync_result?.stats && (
                    <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                      {xmlSettings.last_sync_result.stats.created} yeni ürün, 
                      {' '}{xmlSettings.last_sync_result.stats.updated} güncelleme, 
                      {' '}{xmlSettings.last_sync_result.stats.skipped_no_price} fiyatsız atlandı
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleSaveXmlSettings} variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Ayarları Kaydet
                </Button>
                <Button onClick={handleXmlPreview} disabled={xmlPreviewing} variant="outline">
                  {xmlPreviewing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Önizleme
                </Button>
                <Button onClick={handleXmlImport} disabled={xmlImporting}>
                  {xmlImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Aktarımı Başlat
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* XML Preview Results */}
          {xmlPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="section-title">XML Önizleme Sonuçları</CardTitle>
                <CardDescription>
                  Aktarılacak ürünlerin özeti
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{xmlPreview.total_products}</div>
                    <div className="text-sm text-muted-foreground">Toplam Ürün</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{xmlPreview.with_price}</div>
                    <div className="text-sm text-muted-foreground">Fiyatlı</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <div className="text-3xl font-bold text-amber-600">{xmlPreview.without_price}</div>
                    <div className="text-sm text-muted-foreground">Fiyatsız</div>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                    <div className="text-3xl font-bold text-emerald-600">{xmlPreview.in_stock}</div>
                    <div className="text-sm text-muted-foreground">Stokta Var</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <div className="text-3xl font-bold text-red-600">{xmlPreview.out_of_stock}</div>
                    <div className="text-sm text-muted-foreground">Stokta Yok</div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="font-medium mb-3">Kategoriler</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(xmlPreview.categories || {}).map(([cat, count]) => (
                      <Badge key={cat} variant="outline" className="text-sm">
                        {cat}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Sample Products */}
                <div>
                  <h4 className="font-medium mb-3">Örnek Ürünler (İlk 10)</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {xmlPreview.sample_products?.map((product, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        {product.images?.[0] && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.category_name}</div>
                        </div>
                        <div className="text-right">
                          {product.price_usd ? (
                            <div className="font-semibold text-green-600">${product.price_usd.toFixed(2)}</div>
                          ) : (
                            <div className="text-amber-600 text-sm">Fiyat Yok</div>
                          )}
                          <Badge variant={product.in_stock ? "default" : "secondary"} className="text-xs">
                            {product.in_stock ? "Stokta" : "Tükendi"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Aktarım Bilgisi</p>
                      <ul className="mt-1 list-disc list-inside">
                        <li>Fiyatsız ürünler (Fiyat Sorunuz) atlanacak</li>
                        <li>Mevcut ürünler (aynı ürün kodu ile) güncellenecek</li>
                        <li>Yeni kategoriler otomatik oluşturulacak</li>
                        <li>Fiyatlar USD + KDV olarak kaydedilecek</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
