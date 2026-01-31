# Solar Energy Sales Management System - PRD

## Son Güncelleme: 31 Ocak 2026

---

## ✅ TAMAMLANAN ÖZELLİKLER

### 31 Ocak 2026 - Muhasebe Modülü Tam Yenileme 🎉
**Kapsamlı Gelir/Gider Yönetimi ve Raporlama Sistemi**

#### Ana Özellikler:
- **Dönem Bazlı Filtreleme:** Ay/Yıl seçici, tarih aralığı desteği, "Bugün" butonu
- **5 KPI Kartı:** Toplam Gelir, Toplam Gider (Sabit/Değişken ayrımı), Brüt Kâr, Net Kâr (Zarar uyarısı), Bütçe Durumu
- **Sabit/Değişken Gider Ayrımı:** Kategorilere expense_type eklendi, otomatik sınıflandırma
- **Gelir Türleri:** Satış Geliri (satışlardan otomatik) vs Satış Dışı Gelir (manuel)
- **Net Kâr Hesaplama:** Brüt Kâr - Toplam Gider, Kâr Marjı %, Zarar durumunda kırmızı uyarı
- **Ödeme Takibi:** Giderlerde "Ödendi/Bekliyor" durumu, ödenmemiş giderler uyarı kartı

#### Görsel Raporlama:
- **Gider Dağılımı:** Kategori bazlı pasta grafik
- **En Yüksek 3 Gider:** Yüzde ile progress bar gösterimi
- **6 Aylık Trend:** Alan grafik ile gelir/gider/kâr karşılaştırması
- **Trend Yorumu:** "Geçen aya göre %X artış/azalış" otomatik yorumlar

#### Tekrarlayan Gider Sistemi:
- Kategori, tutar, ayın günü seçimi
- "Bu Ay İçin Oluştur" butonu ile otomatik gider oluşturma
- Aktif/Pasif durumu, düzenleme ve silme

#### Bütçe Takibi:
- Aylık toplam bütçe tanımlama
- Gerçekleşen/Bütçe karşılaştırması
- Progress bar ile kullanım yüzdesi
- Bütçe aşımı durumunda uyarı

#### Yeni Backend Endpoint'leri:
- `GET/POST /api/incomes` - Satış dışı gelirler
- `GET/POST /api/budgets` - Bütçe yönetimi
- `GET/POST/PUT/DELETE /api/recurring-expenses` - Tekrarlayan giderler
- `POST /api/recurring-expenses/generate` - Otomatik gider oluşturma
- `PUT /api/expenses/{id}/pay` - Gideri ödendi işaretle
- `PUT /api/expenses/{id}/unpay` - Gideri ödenmedi işaretle
- `GET /api/accounting/trend` - 6 aylık trend verisi
- Güncellenmiş `GET /api/accounting/summary` - Kapsamlı özet (unpaid_expenses dahil)

### 31 Ocak 2026 - Satış Listesinde Teklif PDF İndirme
- Tekliften oluşturulmuş satışlar için PDF indirme butonu eklendi
- Satış listesinde teklif numarası gösteren satışlarda mavi Download ikonu
- Tıklandığında orijinal teklif PDF'i indirilir

### 31 Ocak 2026 - Sidebar Alt Menü Düzeltmesi
- Alt menüler artık varsayılan olarak kapalı geliyor
- Sadece tıklandığında açılıyor

### 31 Ocak 2026 - Yeni Satış Ekranı Geliştirmesi
- **Hızlı Müşteri Ekleme:** "+ Müşteri Ekle" butonu ile satış ekranından direkt müşteri oluşturma
- **Ürün/Paket Seçimi:** Satışa ürün veya paket ekleme, adet ve birim fiyat girişi
- **İskonto Sistemi:** % veya TL bazlı iskonto, otomatik net toplam hesaplama
- **Kart Tedarikçi Seçimi:** Kart ödemelerinde hangi sistemden çekildiği (PayTR, Endesan vb.)
- **Ayarlar > Kart Tedarikçileri:** Yeni tab ile tedarikçi CRUD yönetimi
- **Banka Hesabı Seçimi:** Havale ödemelerinde hangi bankaya geldiği
- **Havale Para Birimi:** TL veya USD seçimi ve USD tutarı girişi
- **Raporlama:** Tüm ödeme detayları (tedarikçi, banka, para birimi) kaydediliyor

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
