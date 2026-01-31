import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Upload, Loader2, Image, Trash2, Sun, Battery, Zap, Droplets, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Category icons mapping
const categoryIcons = {
  on_grid: Sun,
  off_grid: Battery,
  hybrid: Zap,
  solar_irrigation: Droplets
};

// Category colors
const categoryColors = {
  on_grid: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  off_grid: 'bg-green-100 text-green-700 border-green-300',
  hybrid: 'bg-blue-100 text-blue-700 border-blue-300',
  solar_irrigation: 'bg-cyan-100 text-cyan-700 border-cyan-300'
};

const QuoteTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCategory, setUploadingCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('on_grid');
  const fileInputRefs = useRef({});

  const hasPermission = user?.permissions?.includes('all') || user?.permissions?.includes('settings_manage');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/quote-templates`);
      setTemplates(response.data);
    } catch (error) {
      toast.error('Şablonlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCover = async (categoryId, file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyası yüklenebilir');
      return;
    }

    setUploadingCategory(categoryId);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/api/settings/quote-templates/${categoryId}/upload-cover`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.category_id === categoryId 
          ? { ...t, cover_image: response.data.cover_image }
          : t
      ));
      
      toast.success('Kapak görseli yüklendi');
    } catch (error) {
      toast.error('Kapak görseli yüklenemedi');
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleDeleteCover = async (categoryId) => {
    if (!window.confirm('Bu kapak görselini silmek istediğinize emin misiniz?')) return;

    try {
      await axios.delete(`${API_URL}/api/settings/quote-templates/${categoryId}/cover`);
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.category_id === categoryId 
          ? { ...t, cover_image: null }
          : t
      ));
      
      toast.success('Kapak görseli silindi');
    } catch (error) {
      toast.error('Kapak görseli silinemedi');
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
    <div className="space-y-6 animate-fade-in" data-testid="quote-templates-page">
      {/* Header */}
      <div>
        <h1 className="page-title">Teklif Şablonları</h1>
        <p className="text-muted-foreground mt-1">
          Her kategori için ayrı kapak görseli yükleyerek PDF tekliflerinizi özelleştirin
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">Nasıl Çalışır?</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Teklif oluştururken seçtiğiniz müşteri kategorisine (On-Grid, Off-Grid vb.) göre 
                PDF'in kapak sayfası otomatik olarak ilgili şablondaki görsel ile oluşturulur.
                <br />
                <span className="font-medium">Önerilen boyut:</span> 2480x3508 piksel (A4 300 DPI)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-auto p-1">
          {templates.map((template) => {
            const Icon = categoryIcons[template.category_id] || Sun;
            const hasImage = !!template.cover_image;
            
            return (
              <TabsTrigger 
                key={template.category_id}
                value={template.category_id}
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:shadow-md relative"
                data-testid={`tab-${template.category_id}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{template.category_name.replace(' Teklif', '').replace(' Teklifi', '')}</span>
                <span className="sm:hidden">{template.category_name.split(' ')[0]}</span>
                {hasImage && (
                  <Check className="h-3 w-3 text-green-500 absolute top-1 right-1" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {templates.map((template) => {
          const Icon = categoryIcons[template.category_id] || Sun;
          const colorClass = categoryColors[template.category_id] || categoryColors.on_grid;
          const isUploading = uploadingCategory === template.category_id;
          
          return (
            <TabsContent key={template.category_id} value={template.category_id}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg border ${colorClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{template.category_name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cover Image Section */}
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Preview */}
                    <div 
                      className="w-full md:w-64 h-80 border-2 border-dashed border-border rounded-xl flex items-center justify-center bg-muted/30 overflow-hidden relative group"
                      data-testid={`cover-preview-${template.category_id}`}
                    >
                      {template.cover_image ? (
                        <>
                          <img 
                            src={`${API_URL}${template.cover_image}`} 
                            alt={`${template.category_name} Kapak`}
                            className="w-full h-full object-cover"
                          />
                          {/* Overlay with delete button */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCover(template.category_id)}
                              data-testid={`delete-cover-${template.category_id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Görseli Sil
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6">
                          <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-sm text-muted-foreground font-medium">Kapak Görseli Yok</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            A4 boyutunda görsel yükleyin
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Upload Area */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">Kapak Görseli Yükle</h3>
                        <p className="text-sm text-muted-foreground">
                          Bu kategorideki tüm tekliflerin PDF kapak sayfasında bu görsel kullanılacaktır.
                        </p>
                      </div>

                      <input
                        ref={el => fileInputRefs.current[template.category_id] = el}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadCover(template.category_id, e.target.files?.[0])}
                        className="hidden"
                        data-testid={`file-input-${template.category_id}`}
                      />

                      <div 
                        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                        onClick={() => fileInputRefs.current[template.category_id]?.click()}
                      >
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">Yükleniyor...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm font-medium">
                              Görsel yüklemek için tıklayın veya sürükleyin
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG veya JPEG • Maks 5MB • Önerilen: 2480x3508 px
                            </p>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => fileInputRefs.current[template.category_id]?.click()}
                        disabled={isUploading}
                        className="w-full md:w-auto"
                        data-testid={`upload-btn-${template.category_id}`}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Yükleniyor...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {template.cover_image ? 'Görseli Değiştir' : 'Görsel Yükle'}
                          </>
                        )}
                      </Button>

                      {/* Tips */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <p className="text-sm font-medium">İpuçları:</p>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Yüksek çözünürlüklü görsel kullanın (en az 300 DPI)</li>
                          <li>A4 dikey format önerilir (210mm x 297mm)</li>
                          <li>Şirket logosu ve iletişim bilgileri görsele dahil edilebilir</li>
                          <li>Ürün görselleri ve referans projeler eklenebilir</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    {template.cover_image ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="h-3 w-3" />
                        Kapak görseli yüklendi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Image className="h-3 w-3" />
                        Henüz görsel yüklenmedi
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Şablon Durumu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {templates.map((template) => {
              const Icon = categoryIcons[template.category_id] || Sun;
              const colorClass = categoryColors[template.category_id] || categoryColors.on_grid;
              
              return (
                <div 
                  key={template.category_id}
                  className={`p-4 rounded-lg border ${template.cover_image ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-muted/30 border-border'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${template.cover_image ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">{template.category_name.split(' ')[0]}</span>
                  </div>
                  <p className={`text-xs ${template.cover_image ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {template.cover_image ? '✓ Hazır' : '○ Bekleniyor'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteTemplates;
