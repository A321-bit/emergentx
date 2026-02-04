# Solar Energy Sales Management System - PRD

## Son Güncelleme: 4 Şubat 2026

---

## ✅ TAMAMLANAN ÖZELLİKLER

### 4 Şubat 2026 - 9 Yeni Özellik Güncellemesi ✅
**Kapsamlı Sistem Güncellemesi - Roller, Dashboard, Finans, Puantaj**

#### 1. Roller ve Yetkiler Güncellemesi ✅
- **44 adet yetki** 13 grupta organize edildi
- Yeni gruplar: Paketler, Satış, Muhasebe, İK & Bordro, Raporlar, Ayarlar
- Yeni yetkiler: packages_view/manage, sales_view/manage, accounting_view/manage, attendance_view/manage, reports_view/export, xml_import_manage

#### 2. Paketler Özelliği ✅
- Paketler teklif sayfasında ürün listesinde gösteriliyor
- PDF'de paket adı ve içindeki ürünler alt alta listeleniyor
- `_create_products_table()` metodunda paket desteği eklendi

#### 3. Puantaj Varsayılan Geldi ✅
- Tüm günler varsayılan olarak "geldi" (yeşil tik) olarak işaretli
- Sadece gelmeyenler işaretlenecek şekilde güncellendi
- `getAttendanceForDay()` ve `calculateStats()` fonksiyonları güncellendi

#### 4. Personel Giderleri Entegrasyonu ✅
- Muhasebe > Personel Giderleri sekmesi
- Personel listesi ve maaş tutarları otomatik çekiliyor
- `/api/personnel/salary-expenses` endpoint'i çalışıyor

#### 5. Tekrarlayan Giderlerin Gösterimi ✅
- Tekrarlayan giderler Giderler sekmesinde `is_recurring_generated` ile işaretli gösteriliyor
- Otomatik badge ile "Otomatik" etiketi

#### 6. Dashboard Gerçek Zamanlı Hesaplama ✅
- **Aylık Toplam Gelir** kartı (Satış + Diğer gelirler)
- **Aylık Toplam Gider** kartı (Personel + Giderler)
- **Aylık Net Kar/Zarar** kartı
- `/api/stats/dashboard` endpoint'i güncellendi

#### 7. Finans Sekmesi Yenileme ✅
- **Stok Değeri USD + TL** widget'ları
- **Yıllık Toplam Satış Tutarı**
- **Yıllık Toplam Gider Tutarı**
- **Yıllık Toplam Kar Marjı**
- **Potansiyel Kar Özeti** (USD, TL, Marj %)
- Aylık Satış/Gider Trend grafiği
- Gider Dağılımı pasta grafiği
- `/api/stats/annual-finance` yeni endpoint

#### 8. Kategori Bazlı Kapak Görseli ✅
- Teklif şablonları kategori bazlı kapak seçiyor
- `_get_template_cover()` metodu çalışıyor

#### 9. Perakende/Toptan Farklı PDF Formatı ✅
- `_generate_simple_pdf()` metodu ile 6 sayfalık basit format
- Perakende ve Toptan kategorileri için otomatik seçim
- `_is_simple_sale_category()` kontrolü

#### Test Sonuçları:
- ✅ Backend: 12/12 test geçti (%100)
- ✅ Frontend: 5/5 UI doğrulaması geçti (%100)

---

### 4 Şubat 2026 - PDF 9 Sayfa Yapısı ✅
**P0 Özellik - Teklif PDF'inin Yeni Yapıyla Yeniden Düzenlenmesi**

#### Yeni PDF Yapısı:
1. **Kapak** (Cover Page) - Kategori bazlı veya genel kapak görseli
2. **Neden Biz** (Why Us) - Şirket değer önerisi ve 4 değer kutusu
3. **Proje Verileri** (Project Data) - **YENİ** - Sistem özeti, teknik parametreler, kurulum bilgileri
4. **Sistem Analiz** (System Analysis) - **YENİ** - Üretim tahminleri, tasarruf analizi, çevresel katkı
5. **Ürün Listesi + Fiyatlar** (Products + Pricing) - Fiyat tablosu (banka bilgisi çıkarıldı)
6. **Teklif Şartları** (Terms) - Geçerlilik, teslim, garanti bilgileri
7. **Banka + Taksit** (Bank Info) - **YENİ AYRI SAYFA** - Ödeme seçenekleri
8. **Datasheet'ler** (Datasheets) - Ürün teknik belgeleri (varsa)
9. **Kapanış Kapak** (Closing Cover) - **YENİ** - Teşekkür ve iletişim bilgileri

#### Teknik Değişiklikler:
- `pdf_generator.py` tamamen yeniden yapılandırıldı
- Yeni arka plan şablonu: `pdf_background_template.png`
- Yeni metodlar: `_create_project_data_page()`, `_create_bank_info_page()`, `_create_closing_page()`
- `_create_analysis_page()` tamamen yeniden yazıldı (artık gerçek sistem analizi)
- Banka bilgileri fiyat sayfasından ayrı sayfaya taşındı
- Eski `_create_products_showcase_page()` ve `_create_contract_page()` kaldırıldı

#### Test Sonuçları:
- ✅ PDF başarıyla 8 sayfa oluşturuluyor (datasheet yoksa)
- ✅ Yeni arka plan şablonu tüm sayfalarda uygulanıyor
- ✅ Banka bilgileri ayrı sayfada görüntüleniyor

---

### 3 Şubat 2026 - XML Ayarları ve Kategori Eşleştirme ✅
**P0 Özellik - Çoklu Tedarikçi ve Kategori Eşleştirme Desteği**

#### Özellikler:
1. **Yeni Sayfa: Ayarlar > XML Ayarları** (`/settings/xml`)
2. **Çoklu Tedarikçi Desteği:** Mexxsun, Tommatech, Solinved, Enerji Pazar vb.
3. **Ürün Kodu Prefix:** Her tedarikçi için ayrı prefix (MXS-, TMT-, vb.)
4. **Kategori Eşleştirme:** XML kategorilerini sistem kategorileriyle eşleştirme UI
5. **Ürün Kodu Alanı:** Ürünler sayfasına manuel ürün kodu ekleme desteği

#### Kategori Eşleştirme:
- XML'den gelen 18 kategori otomatik tespit
- Her XML kategorisi için sistem kategorisi seçimi (dropdown)
- Eşleştirilmemiş kategoriler import sırasında atlanır
- Eşleştirme sayısı tedarikçi kartında görüntülenir

#### Yeni Backend Endpoint'leri:
- `GET /api/xml-suppliers` - Tedarikçi listesi
- `POST /api/xml-suppliers` - Tedarikçi ekle
- `PUT /api/xml-suppliers/{id}` - Tedarikçi güncelle
- `DELETE /api/xml-suppliers/{id}` - Tedarikçi sil
- `POST /api/xml-suppliers/{id}/fetch-categories` - XML kategorilerini çek
- `PUT /api/xml-suppliers/{id}/category-mappings` - Eşleştirmeleri kaydet
- `POST /api/xml-suppliers/{id}/preview` - Önizleme
- `POST /api/xml-suppliers/{id}/import` - Ürünleri aktar

#### Frontend UI:
- **Tedarikçi Kartları:** İsim, prefix, URL, KDV, kar marjı, senkronizasyon durumu
- **Kategori Eşleştirme Modalı:** Tablo görünümünde XML → Sistem kategori eşleştirme
- **Ürünler Tablosu:** Yeni "Ürün Kodu" sütunu
- **Ürün Formu:** Yeni "Ürün Kodu" input alanı

#### Test Sonuçları:
- ✅ Backend: 15/15 test geçti (%100)
- ✅ Frontend: Tüm UI elementleri çalışıyor
- ✅ Mexxsun tedarikçisi MXS prefix ile yapılandırıldı

---

### 3 Şubat 2026 - XML B2B Ürün Entegrasyonu ✅
**P0 Özellik - Tedarikçi XML Feed'inden Otomatik Ürün Aktarımı**

#### Özellikler:
1. **XML Feed Entegrasyonu:** Mexxsun tedarikçi XML'inden ürün çekme
2. **Ürün Bilgileri:** Ad, fiyat (USD KDV hariç), görseller, stok durumu, kategori
3. **Otomatik Fiyatlandırma:** KDV ve kar marjı otomatik uygulanır
4. **Manuel + Otomatik Senkronizasyon:** İstenildiğinde veya periyodik olarak güncelleme
5. **Önizleme:** Import öncesi ürün sayısı, kategoriler ve örnek ürünlerin görüntülenmesi

#### Teknik Detaylar:
- **XML URL:** `https://mexxsun.entra.net/api/xml/products/77148822`
- **142 toplam ürün:** 138 fiyatlı, 4 fiyatsız (Fiyat Sorunuz olanlar atlanır)
- **18 yeni kategori** otomatik oluşturuldu
- **Fiyat Formülü:** `Alış (KDV Hariç) → + %20 KDV → + %30 Kar Marjı = Satış Fiyatı`

#### Yeni Backend Endpoint'leri:
- `GET /api/settings/xml-import` - XML import ayarlarını getir
- `PUT /api/settings/xml-import` - XML import ayarlarını güncelle
- `POST /api/xml-import/preview` - XML verisini önizle (istatistikler)
- `POST /api/xml-import/execute` - Ürünleri veritabanına aktar
- `GET /api/products/xml-imported` - XML'den aktarılan ürünleri listele

#### Frontend UI:
- **Ayarlar > XML Ürün Aktarımı** sekmesi
- XML URL, tedarikçi adı, KDV oranı, kar marjı ayarları
- Otomatik senkronizasyon aralığı (saat)
- Son senkronizasyon bilgisi ve istatistikler
- Önizleme kartları: Toplam, Fiyatlı, Fiyatsız, Stokta, Stokta Yok
- Kategori badge'leri ve örnek ürün listesi

#### Test Sonuçları:
- ✅ Backend: 7/7 test geçti (%100)
- ✅ Frontend: Tüm UI elementleri çalışıyor
- ✅ 138 ürün başarıyla aktarıldı
- ✅ Son senkronizasyon bilgisi gösteriliyor

---

### 2 Şubat 2026 - Satış Hesaplama Hatası Düzeltildi ✅
**P0 Bug Fix - Satış modülünde KDV ve Nakliye dahil genel toplam hesaplama**

#### Sorunlar:
1. Ürün miktarı veya iskonto değiştirildiğinde `Satış Tutarı (TL)` alanı güncellenmiyordu
2. KDV ve Nakliye tutarları hesaplamaya dahil edilmiyordu

#### Çözüm (3 aşamalı):
1. **Miktat/Ürün Değişikliği:** `updateItem` ve `removeItem` fonksiyonlarında `manual_override: false` eklendi
2. **İskonto Değişikliği:** İskonto değeri ve tipi değiştirildiğinde `manual_override: false` eklendi
3. **KDV ve Nakliye Entegrasyonu:** 
   - Backend `SaleBase` modeline `subtotal_tl`, `vat_rate`, `vat_amount_tl`, `shipping_cost`, `total_tl` alanları eklendi
   - Frontend hesaplama formülü güncellendi: `Genel Toplam = (Ara Toplam - İskonto) + KDV + Nakliye`
   - Düzenleme modal'ına KDV oranı ve Nakliye alanları eklendi

#### Değişen Dosyalar:
- `/app/backend/server.py`: `SaleBase` modeline KDV ve nakliye alanları eklendi
- `/app/frontend/src/pages/Sales.jsx`:
  - `formData` state'e KDV/nakliye alanları eklendi
  - `useEffect` hesaplama mantığı güncellendi (KDV ve nakliye dahil)
  - `handleEdit` fonksiyonu güncellendi
  - `handleSubmit` fonksiyonu güncellendi
  - Modal UI'a KDV oranı ve nakliye input alanları eklendi

#### Hesaplama Formülü:
```
Ara Toplam = Σ (Miktar × Birim Fiyat)
İskonto Sonrası = Ara Toplam - İskonto
KDV Tutarı = İskonto Sonrası × KDV Oranı
Genel Toplam = İskonto Sonrası + KDV Tutarı + Nakliye
```

#### Test Sonuçları:
- ✅ Miktar değişikliğinde tüm toplamlar (Ara, İskonto Sonrası, KDV, Genel) güncelleniyor
- ✅ İskonto değişikliğinde KDV ve Genel Toplam yeniden hesaplanıyor
- ✅ KDV oranı değiştirildiğinde Genel Toplam güncelleniyor
- ✅ Nakliye tutarı değiştirildiğinde Genel Toplam güncelleniyor
- ✅ Satış Tutarı (TL) = Genel Toplam otomatik eşitleniyor

---

### 31 Ocak 2026 - PREMİUM PDF TEKLİF ŞABLONU 🆕🎨
**Dünya standartlarında, profesyonel 7+ sayfalık PDF teklif sistemi**

#### Yeni Sayfa Yapısı:
| Sayfa | İçerik | Açıklama |
|-------|--------|----------|
| **1** | KAPAK | Kategori bazlı görsel (On-Grid/Off-Grid/Hibrit/Sulama) veya otomatik |
| **2** | NEDEN BİZ? | Değer önerisi, 4 ikonlu vurgu kutusu, ❌ FİYAT YOK |
| **3** | SİSTEM ANALİZİ | Kurulu güç, üretim, tasarruf, CO₂ (formüller KORUNDU) |
| **4** | KULLANILAN ÜRÜNLER | 2 sütunlu grid, ürün kartları, ❌ FİYAT YOK |
| **5** | FİYAT TEKLİFİ | Mevcut tablo AYNEN, hesaplamalar KORUNDU |
| **6** | TEKLİF ŞARTLARI | Kısa koşullar, ikonlu kutular |
| **7+** | EKLER | Sözleşme + Datasheetler |

#### Tasarım Özellikleri:
- Premium renk paleti (Deep Navy + Warm Amber + Emerald)
- Beyaz zemin, büyük rakamlar, bol boşluk
- Kapak: Geometrik desenli arka plan, altın aksan çubuğu
- Değer Sayfası: 4 ikonlu değer kartı (Kalite, Verimlilik, Kurulum, Destek)
- Sistem Analizi: Renkli kapasite kartları + tasarruf büyük rakamlar
- Ürün Kartları: Sabit yükseklik, taşma önleme, max 2 satır isim

#### Teknik Detaylar:
- `pdf_generator.py` tamamen yeniden yazıldı (`PremiumQuotePDFGenerator` class)
- Kategori bazlı kapak seçimi (`quote_templates` collection)
- 4 kategori destekleniyor: on_grid, off_grid, hybrid, solar_irrigation
- Mevcut hesaplama formülleri ve fiyat tablosu mantığı AYNEN KORUNDU

### 31 Ocak 2026 - Kategori Bazlı PDF Teklif Şablonları
**Her sistem türü için ayrı kapak görseli desteği**

#### Ana Özellikler:
- **Yeni Sayfa:** Ayarlar > Teklif Şablonları (`/settings/quote-templates`)
- **4 Şablon Kategorisi:**
  - On Grid Teklif - Şebekeye bağlı sistemler
  - Off Grid Teklif - Şebekeden bağımsız sistemler
  - Hibrit Sistem Teklifi - Şebeke + batarya destekli
  - Solar Sulama Sistem Teklifi - Tarımsal sulama sistemleri
- **Her Kategori İçin:**
  - Ayrı kapak görseli yükleme alanı
  - A4 boyut önerisi (2480x3508 px, 300 DPI)
  - Görsel önizleme ve silme
  - Drag & drop veya tıklayarak yükleme
- **Sidebar Alt Menü:** Ayarlar artık genişletilebilir alt menü (Genel Ayarlar, Teklif Şablonları)
- **Şablon Durumu Özeti:** Hangi kategorilerin hazır olduğunu gösteren özet kart

#### Yeni Backend Endpoint'leri:
- `GET /api/settings/quote-templates` - Tüm şablonları listele
- `GET /api/settings/quote-templates/{category_id}` - Tek şablon detay
- `POST /api/settings/quote-templates/{category_id}/upload-cover` - Kapak yükle
- `DELETE /api/settings/quote-templates/{category_id}/cover` - Kapak sil
- `PUT /api/settings/quote-templates/{category_id}` - Şablon ayarları güncelle

#### Yeni Veritabanı Koleksiyonu:
- `quote_templates` - Kategori bazlı şablon ayarları

---

### 31 Ocak 2026 - Muhasebe Modülü Tam Yenileme 🎉
**Kapsamlı Gelir/Gider Yönetimi ve Raporlama Sistemi**

#### Ana Özellikler:
- **Dönem Bazlı Filtreleme:** Ay/Yıl seçici, tarih aralığı desteği, "Bugün" butonu
- **5 KPI Kartı:** Toplam Gelir, Toplam Gider (Sabit/Değişken ayrımı), Brüt Kâr, Net Kâr (Zarar uyarısı), Bütçe Durumu
- **Sabit/Değişken Gider Ayrımı:** Kategorilere expense_type eklendi, otomatik sınıflandırma
- **Gelir Türleri:** Satış Geliri (satışlardan otomatik) vs Satış Dışı Gelir (manuel)
- **Net Kâr Hesaplama:** Brüt Kâr - Toplam Gider, Kâr Marjı %, Zarar durumunda kırmızı uyarı
- **Ödeme Takibi:** Giderlerde "Ödendi/Bekliyor" durumu, ödenmemiş giderler uyarı kartı
- **Vade Tarihi Sistemi:** Her gidere son ödeme tarihi, yaklaşan/gecikmiş ödeme takibi

#### Personel Giderleri Sistemi (YENİ):
- **"Personel Giderleri" sekmesi** - Ayrı bir tab ile personel bazlı gider yönetimi
- **Otomatik Maaş Aktarımı:** Personel listesindeki maaşları tek tıkla giderlere aktar
- **Prim Entegrasyonu:** Bordro sistemindeki primler otomatik giderlere eklenir
- **Personel Bazlı Özet:** Her personelin toplam maaş, prim ve gideri
- **Detaylı Ödeme Listesi:** Maaş/Prim türü, açıklama, vade, ödeme durumu
- **Vade Günü Seçimi:** Maaş ödeme günü ayarlanabilir (varsayılan: ayın 5'i)
- **4 KPI Kartı:** Toplam Maaş, Toplam Prim, Toplam Personel Gideri, Personel Sayısı

#### Yaklaşan Ödemeler Paneli:
- **Gecikmiş:** Vade tarihi geçmiş ödenmemiş giderler (kırmızı vurgu)
- **Bugün:** Bugün vadesi dolan giderler (turuncu vurgu)
- **Yarın:** Yarın vadesi dolacak giderler (sarı vurgu)
- **Bu Hafta:** 2-7 gün içinde vadesi dolacak giderler
- **Bu Ay:** 8-30 gün içinde vadesi dolacak giderler
- **Acil Ödenecekler:** Gecikmiş ve bugün vadeli giderlerin detay listesi

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
- `GET /api/expenses/upcoming-payments` - Yaklaşan ödemeler listesi
- `POST /api/personnel/generate-salary-expenses` - Maaşları giderlere aktar
- `GET /api/personnel/salary-expenses` - Personel bazlı gider listesi
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

---

## 💡 İYİLEŞTİRME ÖNERİLERİ (Backlog)

*Gelecekte değerlendirilecek özellikler*

| # | Öneri | Modül | Öncelik |
|---|-------|-------|---------|
| 1 | **Aylık Rapor PDF İndir** - Muhasebe verilerini tek sayfalık PDF'e dönüştürme | Muhasebe | Orta |
| 2 | **Ödenmemiş Gider Hatırlatması** - Ay sonuna yaklaşırken e-posta/bildirim gönderme | Muhasebe | Düşük |
| 3 | **Teklif PDF'i Yeni Sekmede Açma** - Satış detay görünümünde "Orijinal Teklifi Görüntüle" butonu | Satış | Düşük |
| 4 | **Vade Yaklaştı Bildirimi** - Vadesi yaklaşan giderler için otomatik e-posta uyarısı | Muhasebe | Orta |
| 5 | **Takvim Görünümü** - Gider vadelerini takvimde gösterme | Muhasebe | Düşük |
| 6 | **Toplu Ödeme İşaretleme** - Birden fazla gideri tek seferde ödendi yapma | Muhasebe | Düşük |

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
1. ~~XML B2B Entegrasyonu~~ ✅ TAMAMLANDI (3 Şubat 2026)
2. WhatsApp Teklif Gönderimi
3. PayTR Taksit Entegrasyonu
4. Kurumsal Landing Page (Aktürk Enerji)

---

## API ENDPOINT'LERI

### XML Import Endpoint'leri (YENİ)
- `GET /api/settings/xml-import` - XML import ayarları
- `PUT /api/settings/xml-import` - Ayarları güncelle
- `POST /api/xml-import/preview` - Önizleme (ürün sayısı, kategoriler)
- `POST /api/xml-import/execute` - Ürünleri aktar
- `GET /api/products/xml-imported` - XML ürünlerini listele

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
