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
- [x] Customer management (Villa, İşletme, Fabrika)
- [x] Quote/Proposal creation with PDF generation
- [x] Multi-currency support (TRY, USD, EUR)
- [x] Dealer management with discount rates
- [x] Financial dashboard and reports
- [x] Dark/Light theme toggle
- [x] Company logo upload

## What's Been Implemented (27 Ocak 2026)

### FAZ 1 - ÇEKİRDEK SİSTEM ✅
- [x] JWT tabanlı kullanıcı girişi ve rol bazlı yetkilendirme
- [x] Admin paneli: Dashboard istatistikleri, grafikler
- [x] Ürün yönetimi: CRUD, kategori filtreleme, arama
- [x] Stok yönetimi: Giriş/çıkış hareketleri, toplam değer hesabı
- [x] Müşteri yönetimi: CRUD, müşteri tipi (villa/işletme/fabrika)
- [x] Teklif sistemi: Ürün seçimi, iskonto, PDF indirme
- [x] Teklif durumu: Gönderildi → Onaylandı → Satışa Döndü / İptal
- [x] Kullanıcı yönetimi: Personel/bayi ekleme, rol atama
- [x] Bayi yönetimi: Bayi ekleme, iskonto oranı tanımlama
- [x] Finans paneli: Ciro, stok değeri, kar marjı, performans raporları
- [x] Ayarlar: Şirket bilgileri, logo yükleme, garanti metni
- [x] Dark/Light tema desteği

### Backend API'ler
- Auth: login, me
- Users: CRUD
- Products: CRUD
- Stock Movements: create, list
- Customers: CRUD
- Quotes: CRUD, status update
- Dealers: CRUD
- Settings: company settings, logo upload
- Stats: dashboard, sales-by-user, sales-by-dealer

## Prioritized Backlog

### P0 (Kritik) - Tamamlandı ✅
- Kullanıcı rolleri ve yetkilendirme
- Ürün & stok yönetimi
- Teklif oluşturma ve PDF çıktı

### P1 (Yüksek Öncelik) - FAZ 2
- [ ] WhatsApp entegrasyonu (teklif gönderimi)
- [ ] Email teklif gönderimi
- [ ] Müşteri onay linki (teklif onaylama butonu)
- [ ] Personel prim hesaplama sistemi

### P2 (Orta Öncelik) - FAZ 3
- [ ] Logo/Mikro ERP entegrasyonu
- [ ] Mobil responsive iyileştirmeler
- [ ] Depo bazlı stok yönetimi
- [ ] API dokümantasyonu

### P3 (Düşük Öncelik)
- [ ] Sipariş yönetimi modülü (bayi siparişleri)
- [ ] Fatura oluşturma
- [ ] Detaylı raporlar ve export

## Next Tasks
1. WhatsApp Business API entegrasyonu
2. Email teklif gönderme özelliği
3. Müşteri portalı (teklif görüntüleme/onaylama)
4. Personel prim raporu

## Default Admin
- Email: admin@solar.com
- Password: admin123
