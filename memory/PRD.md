# Solar Energy Sales Management System - PRD

## Son Güncelleme: 31 Ocak 2026

---

## ✅ TAMAMLANAN ÖZELLİKLER

### 31 Ocak 2026 - Güvenlik Düzeltmesi (Deployment Readiness)
- JWT_SECRET hardcoded fallback değeri kaldırıldı
- Güçlü rastgele JWT_SECRET oluşturuldu ve .env dosyasına eklendi
- JWT_SECRET artık zorunlu environment variable (güvenlik açığı kapatıldı)

### 30 Ocak 2026 - Off-Grid 3 Segment Sistemi (Temel)
- Ürünlere "Fiyat Segmenti" (Ekonomik/Standart/Premium) ve "Eşleştirme Grubu" alanları eklendi
- Off-Grid müşteri seçildiğinde "3 Farklı Seçenek Sunulsun mu?" modalı
- PDF'te 3 farklı fiyat tablosu desteği (temel altyapı hazır)
- *İleride geliştirilecek*

### 30 Ocak 2026 - Enerji Fiyatları Ayarları
- EPDK Elektrik Abonelik Türleri (6 tür) - fiyatlar ayarlardan yönetiliyor
- Jeneratör/Mazot maliyetleri (Off-Grid için)
- On-Grid/Hibrit tekliflerde abonelik tipi seçimi
- PDF'te dinamik tarife gösterimi

### 30 Ocak 2026 - Güç Hesaplama Modülü
- On-Grid, Off-Grid, Sulama teklifleri için otomatik güç hesaplama sayfası
- Panel/İnverter/Batarya sınıflandırması
- Tahmini üretim, tasarruf ve çevresel etki hesaplamaları
- Bilgilendirici açıklamalar

### Önceki Oturumlar
- Profesyonel PDF Teklif Motoru (kapak, detay, sözleşme, datasheet)
- Sürükle-bırak ürün sıralaması
- Çoklu banka hesabı yönetimi
- Müşteri kategorileri ve filtreleme
- Paketler modülü

---

## 📋 GELECEKTEKİ GELİŞTİRMELER (BACKLOG)

### P1 - Yakın Vadeli
- Off-Grid 3 Segment PDF çıktısı geliştirmeleri
- Personel & Bordro Modülü (Avans, Prim, PDF)
- XML B2B Entegrasyonu

### P2 - Orta Vadeli
- WhatsApp üzerinden teklif gönderimi
- PayTR entegrasyonu
- Muhasebe modülü detaylandırma

---

## 🔧 TEKNİK NOTLAR

**Backend:** FastAPI + MongoDB + ReportLab (PDF)
**Frontend:** React + Shadcn/UI + @dnd-kit
**Kimlik Doğrulama:** JWT

**Test Hesabı:**
- Email: admin@solar.com
- Password: admin123

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
