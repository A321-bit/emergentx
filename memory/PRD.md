# Solar Energy Sales Management System - PRD

## Son Güncelleme: 30 Ocak 2026

### SON EKLENEN ÖZELLİKLER

#### 30 Ocak 2026 - Enerji Fiyatları Ayarları
- **Enerji Fiyatları Sekmesi:** Ayarlar sayfasına yeni bir sekme eklendi
  - EPDK Elektrik Abonelik Türleri (6 tür):
    - Mesken (Konut)
    - Ticarethane
    - Sanayi (Tek Zamanlı)
    - Sanayi (Çok Zamanlı)
    - Tarımsal Sulama
    - Genel Aydınlatma
  - Her tür için birim fiyat (TL/kWh) ayarı
  - Jeneratör / Mazot Maliyetleri:
    - Mazot litre fiyatı (TL/L)
    - Jeneratör tüketimi (L/kWh)
    - Hesaplanan maliyet gösterimi
  - Örnek tasarruf karşılaştırması (10.000 kWh için)
- **PDF Entegrasyonu:** PDF'teki tasarruf hesaplamaları artık ayarlardan çekilen değerleri kullanıyor
- **Teklif Oluşturma Entegrasyonu:**
  - On-Grid veya Hibrit müşteri seçildiğinde EPDK abonelik tipi seçim penceresi açılıyor
  - Seçilen abonelik tipi teklife kaydediliyor (`electricity_subscription_type`)
  - PDF'te "Sanayi (Tek Zamanlı) tarifesine göre (2.80 TL/kWh) yapılmıştır" şeklinde gösteriliyor

#### 30 Ocak 2026 - Güç Hesaplama Modülü Düzeltmesi
- **Güç Hesaplama Sayfası:** On-Grid, Off-Grid ve Sulama teklifleri için PDF'e otomatik güç hesaplama sayfası ekleniyor
  - Panel gücü (kW)
  - İnverter kapasitesi (kW)
  - Batarya kapasitesi (kWh)
  - Tahmini üretim değerleri (günlük, aylık, yıllık kWh)
  - Tahmini tasarruf hesaplaması (₺)
  - Çevresel etki (CO₂ tasarrufu, ağaç eşdeğeri)
  - Sistem açıklaması (otomatik oluşturulan metin)
  - **Her bölümün altında bilgilendirici açıklamalar:**
    - Üretim: "Şehir bazlı ortalama güneşlenme verilerine göre hesaplanmıştır"
    - Tasarruf: "Güncel elektrik tarifelerine göre yapılmıştır"
    - Çevresel: "Türkiye şebeke emisyon faktörüne göre hesaplanmıştır"
- **Hata Düzeltmesi:** Türkçe karakter sorunu (İ/i) ve ürün sınıflandırma mantığı düzeltildi

#### 30 Ocak 2026 - PDF Teklif Motoru
- **Teklif Modülü - Sürükle-Bırak:** Ürünlerin sırasını değiştirmek için drag & drop özelliği (@dnd-kit)
- **PDF Teklif Motoru:**
  - A4 formatında profesyonel PDF oluşturma (210mm x 297mm)
  - Kapak sayfası (yüklenen resim veya otomatik)
  - Detay sayfası (firma logosu, müşteri bilgileri, ürün tablosu)
  - Güç hesaplama sayfası (On-Grid/Off-Grid/Sulama için)
  - Sözleşme sayfası (ayarlardan düzenlenebilir)
  - Otomatik sayfa taşması
  - Datasheet entegrasyonu (ürün PDF'leri eklenir)
  - İndirme butonları (liste ve modal'da)

---

## UYGULAMA GENEL BAKIŞ

### Proje Amacı
Solar enerji satış yönetim sistemi - müşteri, ürün, teklif, satış, personel ve muhasebe modüllerini içeren kapsamlı bir ERP çözümü.

### Kullanılan Teknolojiler
- **Backend:** FastAPI, Python 3.11, MongoDB
- **Frontend:** React, Tailwind CSS, shadcn/ui
- **PDF:** ReportLab, PyPDF2
- **Drag & Drop:** @dnd-kit

### Kullanıcı Bilgileri
- **Admin:** admin@solar.com / admin123

---

## MODÜL DURUMU

### ✅ Tamamlanan Modüller
1. **Kullanıcı Yönetimi** - Tam CRUD, rol ve yetki sistemi
2. **Ürün Yönetimi** - Tam CRUD, kategori, resim, datasheet
3. **Müşteri Yönetimi** - Tam CRUD, kategori, kaynak
4. **Stok Yönetimi** - Giriş/çıkış, izleme
5. **Teklif Yönetimi** - 4 adımlı wizard, PDF çıktı, sürükle-bırak
6. **Satış Yönetimi** - Tekliften satışa dönüştürme
7. **Bayi Yönetimi** - Tam CRUD, gruplar, iskontolar
8. **Paket Yönetimi** - Kategori sistemi, ürün içerik
9. **Raporlama** - Satış, müşteri, ürün raporları

### 🔄 Devam Eden Modüller
1. **Personel & Bordro** - Devam yönetimi var, avans/prim/PDF bordro bekliyor
2. **Muhasebe** - Gider/gelir girişi var, detaylı muhasebe bekliyor

### ❌ Planlanmış Modüller
1. XML B2B Entegrasyonu
2. WhatsApp Teklif Gönderimi
3. PayTR Taksit Entegrasyonu

---

## API ENDPOINT'LERI

### Ana Endpoint'ler
- `POST /api/auth/login` - Giriş
- `GET /api/quotes` - Teklif listesi
- `POST /api/quotes` - Yeni teklif
- `GET /api/quotes/{id}/pdf` - PDF indir
- `GET /api/products` - Ürün listesi
- `GET /api/customers` - Müşteri listesi
- `GET /api/settings/company` - Şirket ayarları

---

## DOSYA YAPISI

```
/app/
├── backend/
│   ├── server.py          # Ana API dosyası (~4700 satır)
│   ├── pdf_generator.py   # PDF oluşturma modülü
│   └── uploads/           # Yüklenen dosyalar
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Quotes.jsx # Teklif yönetimi
│       │   ├── Packages.jsx
│       │   └── ...
│       └── components/
└── memory/
    └── PRD.md
```
