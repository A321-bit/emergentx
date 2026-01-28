# SolarPro - Kullanım Kılavuzu

## 🔐 1. Giriş Yapma

1. Tarayıcınızda sistemi açın
2. **Email:** `admin@solar.com`
3. **Şifre:** `admin123`
4. "Giriş Yap" butonuna tıklayın

---

## 📊 2. İlk Kurulum Adımları

### Adım 1: Kategori Oluşturma
Ürün eklemeden önce kategori oluşturmanız gerekiyor.

1. Sol menüden **"Kategoriler"** tıklayın
2. **"Yeni Kategori"** butonuna tıklayın
3. Doldurun:
   - **Ad:** örn. "Güneş Paneli", "İnvertör", "Akü"
   - **Kar Marjı (%):** örn. 30 (otomatik fiyat hesaplaması için)
4. **"Ekle"** butonuna tıklayın

### Adım 2: Ürün Ekleme
1. Sol menüden **"Ürünler"** tıklayın
2. **"Yeni Ürün"** butonuna tıklayın
3. Doldurun:
   - **Ürün Adı:** örn. "Jinko Solar 540W Panel"
   - **Kategori:** Listeden seçin
   - **Para Birimi:** USD, EUR veya TRY
   - **Alış Fiyatı (KDV Hariç):** örn. 100
   - **KDV Oranı:** %20
   - **Kar Marjı:** (boş bırakırsanız kategori marjı kullanılır)
   - **Stok Miktarı:** örn. 50
4. **"Ekle"** butonuna tıklayın
5. Açılan pencereden ürün fotoğrafları ve PDF datasheet yükleyebilirsiniz

### Adım 3: Müşteri Ayarları (Opsiyonel)
1. Sol menüden **"Müşteri Ayarları"** tıklayın
2. **"Müşteri Kategorileri"** sekmesinde:
   - Yeni kategori ekleyin: "On-Grid", "Off-Grid", "Sulama" vb.
3. **"Edinme Kaynakları"** sekmesinde:
   - Kaynak ekleyin: "Facebook", "Referans", "Google Ads" vb.

---

## 👥 3. Müşteri Ekleme

1. Sol menüden **"Müşteriler"** tıklayın
2. **"Yeni Müşteri"** butonuna tıklayın
3. **Müşteri Tipi** seçin:
   - **Bireysel:** Ad, telefon, TC Kimlik, adres
   - **Kurumsal:** Firma adı, vergi no, vergi dairesi
4. Kategori ve kaynak seçin (opsiyonel)
5. **"Ekle"** butonuna tıklayın

---

## 📝 4. Teklif Oluşturma

1. Sol menüden **"Teklifler"** tıklayın
2. **"Yeni Teklif"** butonuna tıklayın
3. **Müşteri** seçin
4. **Ürün ekleyin:**
   - Ürün seçin
   - Miktar girin
   - "Ekle" tıklayın
5. **İskonto** oranı girin (opsiyonel)
6. **Geçerlilik süresi** belirleyin
7. **"Teklif Oluştur"** butonuna tıklayın

---

## 🏪 5. Bayi Yönetimi

### Bayi Grubu Oluşturma (İskonto Oranları)
1. Sol menüden **"Bayi Grupları"** tıklayın
2. **"Yeni Grup"** butonuna tıklayın
3. Doldurun:
   - **Grup Adı:** örn. "Gold"
   - **İskonto Oranı:** örn. 10 (yüzde olarak)
4. **"Ekle"** butonuna tıklayın

### Bayi Ekleme
1. Sol menüden **"Bayiler"** tıklayın
2. **"Yeni Bayi"** butonuna tıklayın
3. Doldurun:
   - **Bayi Adı:** Firma adı
   - **Yetkili Kişi:** İsim
   - **Telefon ve Email**
   - **Bayi Grubu:** İskonto için grup seçin
4. **"Bayi için kullanıcı hesabı oluştur"** kutusunu işaretleyin
5. Bayi için email ve şifre girin
6. **"Ekle"** butonuna tıklayın

Artık bayi kendi hesabıyla giriş yapıp sistem kullanabilir.

---

## 👤 6. Personel Ekleme

1. Sol menüden **"Kullanıcılar"** tıklayın
2. **"Yeni Kullanıcı"** butonuna tıklayın
3. Doldurun:
   - **Ad Soyad**
   - **Email**
   - **Şifre**
   - **Rol:** "Satış Personeli" veya özel rol
4. **"Ekle"** butonuna tıklayın

### Özel Rol Oluşturma
1. Sol menüden **"Roller & Yetkiler"** tıklayın
2. **"Yeni Rol"** butonuna tıklayın
3. İsim ve açıklama girin
4. **İstediğiniz yetkileri işaretleyin:**
   - Ürün görüntüleme/düzenleme
   - Müşteri yönetimi
   - Teklif oluşturma
   - Finans raporları vb.
5. **"Ekle"** butonuna tıklayın

---

## 📦 7. Stok Yönetimi

1. Sol menüden **"Stok"** tıklayın
2. Ürün seçin
3. **Stok Giriş** veya **Stok Çıkış** yapın
4. Miktar ve not ekleyin
5. Kaydedin

---

## 💰 8. Fiyat Hesaplama Mantığı

Sistem otomatik fiyat hesaplar:

```
Maliyet = Alış Fiyatı × (1 + KDV Oranı%)
Satış Fiyatı = Maliyet × (1 + Kar Marjı%)
```

**Örnek:**
- Alış: $100 (KDV hariç)
- KDV: %20
- Kar Marjı: %30

Maliyet = 100 × 1.20 = $120
Satış = 120 × 1.30 = **$156**

---

## ❓ Sıkça Sorulan Sorular

**S: Bayi nasıl giriş yapar?**
C: Bayi için oluşturduğunuz email ve şifre ile normal giriş yapar.

**S: Ürün fotoğrafı nasıl eklerim?**
C: Ürünler sayfasında ürünün fotoğraf ikonuna tıklayın, açılan pencereden yükleyin.

**S: Teklif PDF'i nasıl oluşturulur?**
C: Teklif detay sayfasında "PDF İndir" butonu bulunur.

---

## 📞 Destek

Sorularınız için sistem yöneticinize başvurun.

---

*SolarPro - Güneş Enerjisi Satış Yönetim Sistemi*
