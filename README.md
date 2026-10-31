# CoachWallet

Türk lirası bazlı kişisel finans ve yatırım takip uygulaması. Gelir ve giderlerini kaydet,
harcamalarını grafiklerle izle, Borsa İstanbul hisselerinden oluşan portföyünün değerini ve
kâr/zararını takip et.

> 🤖 **Bu proje yapay zekâ destekli geliştirildi.** Ayrıntılar aşağıdaki
> "Yapay zekâ ile geliştirme" bölümünde.

## Özellikler

**Gelir ve gider**
- Kategorili gelir/gider kaydı; varsayılan kategoriler ve kişiye özel kategoriler
- Dashboard: dönem seçimi (hafta, ay, yıl, özel aralık), özet kartlar, kategori dağılımı,
  aylık karşılaştırma ve net değişim grafikleri
- Tüm işlemler ekranı: arama, filtreleme ve gün gün gruplanmış sonsuz liste
- 5 saniye içinde geri alınabilir silme

**Yatırım**
- BIST hisseleri için alım/satım kaydı ve sembol arama
- Ağırlıklı ortalama maliyet, gerçekleşmiş ve gerçekleşmemiş kâr/zarar, günlük değişim
- Portföy dağılım grafiği ve hisse bazında işlem geçmişi
- Canlı fiyat güncellemesi (Realtime) ve bağlantı durumu göstergesi
- Eldekinden fazla satış sunucu tarafında engellenir

**Genel**
- Çevrimdışı çalışma: bağlantı yokken yapılan değişiklikler, uygulama kapatılsa bile
  saklanır ve bağlantı gelince gönderilir
- Açık/koyu/sistem teması, büyük yazı boyutu ve ekran okuyucu desteği
- Şifre sıfırlama (e-posta kodu) ve uygulama içinden hesap silme

## Teknoloji

| Alan | Kullanılan |
|---|---|
| Mobil | Expo SDK 58, React Native, Expo Router, TypeScript (strict) |
| Arayüz | NativeWind, react-native-gifted-charts, FlashList |
| Veri | TanStack Query (optimistic update, kalıcı çevrimdışı kuyruk), Zod |
| Sunucu | Appwrite Cloud (Auth, TablesDB, Functions, Realtime) |
| Test | Vitest; gerçek Appwrite üzerinde izolasyon ve iş kuralı test script'leri |
| Derleme | EAS Build |

## Mimari notlar

- **Para kuruş cinsinden tam sayı olarak tutulur.** Kayan noktalı sayılar yalnızca
  fiyat sağlayıcısından gelen verinin girişinde kullanılır; tüm hesaplar tam sayı ve
  gerektiğinde `BigInt` ile yapılır. Yüzde dağılımları her zaman tam %100'e tamamlanır.
- **Yatırım hesap motoru saf TypeScript'tir** ve hem uygulamada hem sunucuda aynı kodla
  çalışır. Pozisyonlar saklanmaz; her seferinde işlem geçmişinden hesaplanır.
- **Veri izolasyonu satır izinleriyle sağlanır.** Bir kullanıcının verisini başka bir
  kullanıcının göremediği ve yatırım işlemlerinin sunucu kuralları atlanarak yazılamadığı
  otomatik testlerle doğrulanır.
- **Fiyat servisi** zamanlanmış bir Function'dır: seans saatlerinde tüm BIST fiyatlarını
  tek istekte çeker, seans dışında sağlayıcıya istek atmaz, sağlayıcı hata verirse son
  geçerli fiyatı korur. API anahtarları yalnızca sunucuda tutulur.

## Yapay zekâ ile geliştirme

Bu proje, Anthropic'in yapay zekâ asistanı **Claude** ile adım adım birlikte geliştirildi.

**Yapay zekânın katkısı:** Mimari önerileri, kodun büyük bölümü, birim testleri, test
script'leri, hata ayıklama sırasında kök neden analizi ve dokümantasyon.

**Geliştiricinin katkısı:**
- Geliştirme ortamının, Appwrite projesinin ve derleme altyapısının kurulması
- Her adımın gerçek bir Android cihazda test edilmesi; hataların, performans sorunlarının
  ve arayüz taşmalarının bulunup ekran görüntüleri ve loglarla raporlanması
- Ürün ve mimari kararları: fiyat sağlayıcısının seçimi, profil sekmesi gibi özellikler,
  oturum süresi gibi güvenlik tercihleri
- Kodun okunması, sürüm kontrolü ve yayın süreci

**Çalışma yöntemi:** Proje küçük adımlara bölündü. Her adımda değişiklik yapıldı,
otomatik testler ve gerçek cihazda manuel testler geçmeden bir sonraki adıma
geçilmedi. Bilinen riskler `docs/RISKS.md`'de, güvenlik kontrolleri `docs/SECURITY.md`'de,
kalite kontrol listesi `docs/QA.md`'de kayıt altında.

Yapay zekâ destekli geliştirme, kodun otomatik olarak doğru olduğu anlamına gelmiyor:
bu projedeki birçok hata, ancak gerçek cihazda yapılan testlerle ortaya çıktı ve
birlikte düzeltildi.

## Önemli notlar

- **Yatırım tavsiyesi değildir.** Uygulama yalnızca kayıt ve takip aracıdır; kâr/zarar
  hesapları vergi ve diğer kesintileri içermez.
- **Fiyat verisi** [Bürküt](https://burkutportfoy.com) üzerinden alınır, yaklaşık 15 dakika
  gecikmelidir ve saatlik güncellenir. Kaynak kişisel/hobi kullanımı içindir; uygulama
  herkese açık olarak yayınlanacaksa Borsa İstanbul verisi için lisanslı bir dağıtıcı
  gerekir.
- Proje kişisel kullanım ve öğrenme amacıyla geliştirilmiştir.

## Kurulum

1. Bağımlılıkları kur: `npm install`
2. `.env.example` dosyasını `.env.local` olarak kopyala ve Appwrite bilgilerini doldur.
3. Appwrite şemasını kur: `npm run appwrite:setup` (`.env.setup` gerekir)
4. Geliştirme sunucusunu başlat: `npx expo start`
5. Testleri çalıştır: `npm test`
