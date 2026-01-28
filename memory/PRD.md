# SolarPro - Güneş Enerjisi Satış Yönetim Sistemi

## Problem Statement
Güneş enerjisi (panel, inverter, batarya) satışı için kapsamlı B2B/B2C yönetim platformu. Admin, Personel ve Bayi rolleriyle çoklu kullanıcı desteği. Ürün & stok yönetimi, teklif oluşturma, PDF çıktı, finans raporları.

## User Personas
1. **Admin (Yönetici)**: Tüm sistemi görür, kullanıcı/ürün/bayi yönetimi yapar, raporları alır
2. **Personel (Satış Ekibi)**: Müşteri ekler, teklif hazırlar, kendi satışlarını görür
3. **Bayi**: Kendi iskontolu fiyatlarını görür, müşterilerine teklif verir

## Architecture
- **Backend**: FastAPI + Python
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Database**: MongoDB
- **Authentication**: JWT Token based

## Core Requirements (Static)
- [x] Multi-role authentication (Admin, Personel, Bayi)
- [x] User management with role-based access
- [x] Product management (Panel, Inverter, Batarya, Aksesuar)
- [x] Stock management with entry/exit tracking
- [x] Customer management (Bireysel/Kurumsal)
- [x] Quote/Proposal creation with PDF generation
- [x] Multi-currency support (TRY, USD, EUR)
- [x] Dealer management with discount rates
- [x] Financial dashboard and reports
- [x] Dark/Light theme toggle
- [x] Company logo upload

---

## What's Been Implemented

### FAZ 1 - ÇEKİRDEK SİSTEM ✅ (27 Ocak 2026)
- [x] JWT tabanlı kullanıcı girişi ve rol bazlı yetkilendirme
- [x] Admin paneli: Dashboard istatistikleri, grafikler
- [x] Ürün yönetimi: CRUD, kategori filtreleme, arama
- [x] Stok yönetimi: Giriş/çıkış hareketleri, toplam değer hesabı
- [x] Müşteri yönetimi: CRUD, müşteri tipi
- [x] Teklif sistemi: Ürün seçimi, iskonto, PDF indirme
- [x] Teklif durumu: Gönderildi → Onaylandı → Satışa Döndü / İptal
- [x] Kullanıcı yönetimi: Personel/bayi ekleme, rol atama
- [x] Bayi yönetimi: Bayi ekleme, iskonto oranı tanımlama
- [x] Finans paneli: Ciro, stok değeri, kar marjı, performans raporları
- [x] Ayarlar: Şirket bilgileri, logo yükleme, garanti metni
- [x] Dark/Light tema desteği

### FAZ 2 - GELİŞMİŞ ÖZELLİKLER ✅ (28 Ocak 2026)
- [x] **Dinamik Kategori Yönetimi**: Admin kategori oluşturabilir, her kategoriye varsayılan kar marjı tanımlanabilir
- [x] **Gelişmiş Fiyatlandırma**: Alış fiyatı (KDV hariç) + %20 KDV = Maliyet → + Kar Marjı = Satış Fiyatı
- [x] **Çoklu Para Birimi**: USD, EUR, TRY desteği
- [x] **Bayi Grupları (Tier)**: Silver (%5), Gold (%10), Plus (%15) gibi iskonto grupları
- [x] **Özel Roller ve Yetkiler**: Checkbox bazlı granüler yetki matrisi (22 farklı yetki)
- [x] **Bayi Kullanıcı Hesabı**: Bayi oluştururken otomatik kullanıcı hesabı oluşturma
- [x] **Ürün Medya Yönetimi**: Çoklu resim yükleme (JPEG/PNG) ve PDF datasheet yükleme
- [x] **Gelişmiş Müşteri Yönetimi**: 
  - Bireysel/Kurumsal müşteri ayrımı
  - TC Kimlik (bireysel) / Vergi No & Dairesi (kurumsal)
  - Müşteri kategorileri (On-Grid, Off-Grid, Hibrit, Sulama)
  - Edinme kaynakları (Santral, Referans, Facebook, Instagram, Google Ads)
- [x] **Müşteri Ayarları Sayfası**: Kategori ve kaynak yönetimi için ayrı sayfa
- [x] **Excel Import/Export**: Toplu ürün yükleme ve ürün listesi indirme
- [x] **Gelişmiş PDF Teklif Sistemi**: 
  - Kapak görseli (tam sayfa A4)
  - Müşteri bilgileri (ad, telefon, il/ilçe, adres)
  - Ürün tablosu (ad, miktar, birim, fiyat, toplam)
  - Teklif şartları ve koşulları
  - Banka hesap bilgileri
  - Modern, profesyonel tasarım

---

## Backend API Endpoints
- Auth: `/api/auth/login`, `/api/auth/me`
- Users: `/api/users` (CRUD)
- Roles: `/api/roles` (CRUD), `/api/permissions` (list)
- Products: `/api/products` (CRUD)
- Product Media: `/api/products/{id}/upload-images`, `/api/products/{id}/upload-datasheet`
- Product Excel: `/api/products/export/excel`, `/api/products/export/template`, `/api/products/import/excel`
- Categories: `/api/categories` (CRUD)
- Customer Categories: `/api/customer-categories` (CRUD)
- Customer Sources: `/api/customer-sources` (CRUD)
- Customers: `/api/customers` (CRUD)
- Stock Movements: `/api/stock-movements` (create, list)
- Quotes: `/api/quotes` (CRUD), `/api/quotes/{id}/status`
- Dealers: `/api/dealers` (CRUD with user creation)
- Dealer Groups: `/api/dealer-groups` (CRUD)
- Settings: `/api/settings/company`, `/api/settings/upload-logo`
- Stats: `/api/stats/dashboard`, `/api/stats/sales-by-user`, `/api/stats/sales-by-dealer`
- Init: `/api/init-data`

---

## Prioritized Backlog

### P1 (Yüksek Öncelik) - Sonraki Görevler
- [ ] PDF Teklif Geliştirme: Ürün datasheet'lerini teklife ekleme
- [ ] WhatsApp entegrasyonu (teklif gönderimi)
- [ ] Email teklif gönderimi
- [ ] Müşteri onay linki (teklif onaylama butonu)

### P2 (Orta Öncelik)
- [ ] Logo/Mikro ERP entegrasyonu
- [ ] Mobil responsive iyileştirmeler
- [ ] Depo bazlı stok yönetimi
- [ ] Personel prim hesaplama sistemi

### P3 (Düşük Öncelik)
- [ ] Sipariş yönetimi modülü (bayi siparişleri)
- [ ] Fatura oluşturma
- [ ] Detaylı raporlar ve export
- [ ] API dokümantasyonu

---

## Test Credentials
- **Admin**: admin@solar.com / admin123
- **Bayi (örnek)**: bayi@email.com / bayi123

## Default Data (init-data endpoint ile oluşturulur)
- 3 Rol: Yönetici (tam yetki), Satış Personeli, Bayi
- 3 Bayi Grubu: Silver (%5), Gold (%10), Plus (%15)
- 4 Müşteri Kategorisi: On-Grid, Off-Grid, Hibrit, Sulama
- 6 Edinme Kaynağı: Santral, Referans, Lead, Facebook, Instagram, Google Ads

---

## Files Reference
- Backend: `/app/backend/server.py`
- Frontend Pages: `/app/frontend/src/pages/`
- Design Guidelines: `/app/design_guidelines.json`
- User Guide: `/app/KULLANIM_KILAVUZU.md`
- Test Reports: `/app/test_reports/`
