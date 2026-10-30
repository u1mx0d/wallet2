# Kalite kontrol listesi

Yayından önce ve büyük değişikliklerden sonra uygula. Her madde için: ✅ geçti / ❌ sorun (not ekle).

## A. Yükleniyor, boş ve hata durumları

Her ekranda üç durumu kontrol et. **Hata durumu için:** ekrandayken uçak modunu aç ve ekranı
yenile (sekmeye dönerek veya uygulamayı arka plana alıp açarak).

| Ekran                           | Yükleniyor (iskelet görünüyor) | Boş (açıklayıcı mesaj + eylem) | Hata (mesaj + "Tekrar dene") |
| ------------------------------- | ------------------------------ | ------------------------------ | ---------------------------- |
| Ana sayfa (dashboard)           |                                |                                |                              |
| İşlemler (liste, arama, filtre) |                                |                                |                              |
| Yatırımlar                      |                                |                                |                              |
| Hisse detayı                    |                                |                                |                              |
| İşlem düzenleme                 |                                |                                |                              |
| Kategoriler                     |                                |                                |                              |
| Profil                          |                                | —                              |                              |

Ayrıca: Hiçbir ekranda boş beyaz/siyah sayfa, sonsuz dönen gösterge veya çökme olmamalı.

## B. Çevrimdışı

- [ ] Uygulama açıkken uçak modu: üst şerit "Çevrimdışısın" diyor.
- [ ] Çevrimdışı gider ekleme/düzenleme/silme anında görünüyor; bağlantı gelince kaydediliyor.
- [ ] Çevrimdışı kayıt, uygulama kapatılıp açılınca kaybolmuyor (ADIM 10b).
- [ ] Uçak modunda uygulamayı açma: "Bağlanılamadı" ekranı ve "Tekrar dene" çalışıyor.
- [ ] Yatırımlar'da Realtime durumu "koptu" → bağlantı gelince "Canlı".

## C. Erişilebilirlik

**C1. Büyük yazı:** Telefon ayarlarından yazı boyutunu en büyüğe al.

- [ ] Hiçbir metin kesilmiyor veya üst üste binmiyor (özellikle tutarlar, kartlar, sekme etiketleri).
- [ ] Butonlar ve alanlar büyüyor, dokunulabilir kalıyor.

**C2. Ekran okuyucu (TalkBack):**

- [ ] Her buton adını ve "düğme" bilgisini okuyor.
- [ ] Form alanları etiketlerini okuyor; hata mesajları okunuyor.
- [ ] İşlem satırları tutar, kategori, tarih ve tür okuyor.
- [ ] Grafikler tek bir özet cümle okuyor (dilim dilim değil).
- [ ] İşlem silme "Sil" eylemiyle yapılabiliyor ve "İşlem silindi" duyuruluyor.

**C3. Dokunma alanları:** Tüm butonlar, sekmeler, kategori çipleri ve satırlar parmakla
rahatça dokunulabilir (en az ~1 cm).

**C4. Renk:** Gelir/gider ve kâr/zarar renkleri hem açık hem koyu temada okunabiliyor;
renk dışında işaret (+/−) de var.

## D. Performans

- [ ] 100+ işlemle İşlemler listesi kaydırırken takılmıyor.
- [ ] Dashboard'da dönem değiştirmek 1-2 saniyeden kısa sürede tamamlanıyor.
- [ ] Sekmeler arası geçiş anında.
- [ ] Yatırımlar'da fiyat güncellemesi (prices:set) ekranı takılmadan yansıyor.

**C5. Android üç tuşlu gezinme:** Ayarlardan "3 düğmeli gezinme" seçiliyken alt sekmeler,
form butonları, liste sonları ve "Geri al" çubuğu sistem tuşlarının üstünde. ✅

## Bulunan sorunlar

| #   | Ekran                    | Sorun                                                       | Ekran görüntüsü | Durum                 |
| --- | ------------------------ | ----------------------------------------------------------- | --------------- | --------------------- |
| 1   | Yatırımlar, Hisse detayı | En büyük yazı boyutunda kâr/zarar değeri ekrandan taşıyordu | —               | Düzeltildi (ValueRow) |
