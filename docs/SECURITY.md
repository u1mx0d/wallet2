# Güvenlik kontrol listesi

Yayından önce ve büyük değişikliklerden sonra bu listeyi baştan sona uygula.
Her maddenin yanında beklenen sonuç yazıyor; farklı bir sonuç görürsen yayına çıkma.

## 1. Gizli bilgiler

**1.1 Git geçmişinde anahtar yok.** Tüm geçmişte Appwrite ve Bürküt anahtarı aranır:

```bash
git log -p --all | grep -nE "bk_live_|standard_[0-9a-f]{20,}" | head
```

Beklenen: **hiçbir çıktı yok.** Çıktı varsa anahtarı hemen iptal et ve yenisini oluştur.
Geçmişten silmek tek başına yetmez: anahtar GitHub'a bir kez gittiyse ele geçirilmiş sayılır.

**1.2 Git'te yalnızca örnek env dosyası var:**

```bash
git ls-files | grep -E "(^|/)\.env"
```

Beklenen: yalnızca `.env.example`.

**1.3 Uygulama paketine gizli bilgi girmiyor.** `.env.local` içinde yalnızca `EXPO_PUBLIC_APPWRITE_*`
değişkenleri (endpoint, project ID, database ID, platform) var. Bunlar gizli değildir.
API anahtarı, Bürküt anahtarı veya şifre **asla** `EXPO_PUBLIC_` önekiyle tanımlanmaz.

**1.4 Bürküt anahtarı yalnızca price-sync'in ortam değişkeninde.** Console > Functions >
price-sync > Settings > Environment variables: `BURKUT_API_KEY` var. user-tasks'ta **yok**.

## 2. Appwrite API anahtarları

Console > Overview > API keys:

- **2.1** Yalnızca `setup-script` ve `isolation-test` var. Kullanılmayan anahtar varsa sil.
- **2.2** `setup-script`: yalnızca Database scope'ları.
- **2.3** `isolation-test`: users.read, users.write, sessions.write, rows.read, rows.write.
- **2.4** Son kullanma tarihleri: süresi dolmuş anahtarlarla script'ler 401 verir; gerekiyorsa
  aynı scope'larla yenisini oluştur ve `.env.setup`'ı güncelle.

## 3. Function izinleri

Console > Functions > [Function] > Settings:

| Function   | Execute access | Events           | Scopes                             |
| ---------- | -------------- | ---------------- | ---------------------------------- |
| user-tasks | Users          | `users.*.create` | rows.read, rows.write, users.write |
| price-sync | **(boş)**      | yok              | rows.read, rows.write              |

price-sync'in Execute access'i **boş** olmalı; dolu olursa kullanıcılar Bürküt kotasını tüketebilir.

## 4. Veri izolasyonu

```bash
npm run appwrite:test-isolation
npm run appwrite:test-trades
npm run appwrite:cleanup-orphans
```

Beklenen: izolasyon 12/12, işlem kuralları 16/16, sahipsiz satır 0 (temizlik sonrası).

## 5. Loglarda kişisel veri yok

Console'da user-tasks ve price-sync çalıştırmalarının **Logs** bölümünü incele.
Beklenen: yalnızca kullanıcı ID'si, sembol ve sayılar. E-posta, ad, tutar, not **yok**.

## 6. Auth ayarları

Console > Auth > Security:

- **6.1** Şifre sözlüğü kontrolü (password dictionary): **açık**.
- **6.2** Şifrede kişisel veri kontrolü (personal data check): **açık**.
- **6.3** Oturum süresi (session length): Proje şu an **1 yıl** kullanıyor. Finansal bir uygulama
  için daha kısa bir süre (ör. 30-90 gün) önerilir; bedeli, kullanıcının bu süre sonunda tekrar
  giriş yapması. Karar ve gerekçesi aşağıya not edilir.
- **6.4** Kullanıcı başına oturum sınırı: 10 (makul).

## 7. Bağımlılıklar

```bash
npm audit --omit=dev
```

Beklenen: `high` veya `critical` seviyede bulgu yok. Varsa paket ve açıklama incelenir.
`--omit=dev` uygulama paketine giren bağımlılıklara odaklanır; geliştirme araçlarındaki bulgular
ayrıca değerlendirilir.

## Kararlar

| Tarih | Madde             | Karar | Gerekçe |
| ----- | ----------------- | ----- | ------- |
|       | 6.3 Oturum süresi |       |         |

| Tarih      | Madde                                         | Karar                                  | Gerekçe                                                                                                                                        |
| ---------- | --------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 30.10.2026 | 7. deepmerge (düşük, 5 bulgu)                 | Kabul edildi; Expo yamasıyla kapanacak | Yalnızca Expo geliştirme/derleme araçlarında; uygulama paketine girmiyor. `npm audit fix --force` Expo'yu SDK 54'e düşürdüğü için uygulanmadı. |
| 30.10.2026 | 7. zod — Expo CLI iç kopyası 3.25.76 (yüksek) | Kabul edildi; Expo yamasıyla kapanacak | Yalnızca geliştirme aracında (`@expo/cli`); uygulama paketine girmiyor.                                                                        |
| 30.10.2026 | 7. zod — uygulamanın kendi sürümü             | Etkilenmiyor (4.6.7 ≥ 4.6.6)           | Uygulama sunucu verisini ve formları zod ile doğruluyor; düzeltilmiş sürüm kullanılıyor.                                                       |
| 30.10.2026 | 2.4 isolation-test key                        | Süresi 90 güne uzatılacak              | Test script'leri için; süresiz yapılmadı (kullanıcı oluşturup silebiliyor).                                                                    |
| 30.10.2026 | 6.3 Oturum süresi                             | 6 ay (180 gün)                         | Kullanım kolaylığı ile kaybolan/çalınan cihaz riski arasında denge.                                                                            |
