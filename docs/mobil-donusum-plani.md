# Out of Warranty (Garanti Dışı) — Mobil Dönüşüm ve Yayın Planı

Bu belge, **Out of Warranty (Garanti Dışı)** oyununun HTML5 Canvas / Masaüstü web tabanlı mimarisini, mobil cihazlara (Android, iOS ve Mobil Web) uyarlamak için gereken teknik adımları, kullanıcı deneyimi kararlarını ve paketleme süreçlerini tanımlar.

---

## 1. Yönetici Özeti ve Temel Hedefler

- **Mevcut Durum:** Oyun saf JavaScript (ES module yok, klasik scriptler), HTML5 Canvas (`960×540`), Web Audio API ve WebRTC ile çalışmaktadır. Sıfır harici derleme/framework bağımlılığı vardır.
- **Hedef Platformlar:**
  1. **Android:** Google Play Store (AAB) ve doğrudan indirilebilir test APK.
  2. **iOS:** Apple App Store (IPA) — Capacitor iOS projesi.
  3. **Mobil Web / PWA:** Telefon tarayıcılarında kurulumsuz doğrudan oynanabilirlik.
- **Hedef Performans:** Düşük ve orta segment cihazlarda sabit 60 FPS, < 30 MB toplam paket boyutu, akıcı dokunmatik tepki süresi (< 16ms girdi gecikmesi).

---

## 2. Mimari Kararlar ve Kapsam

```
┌────────────────────────────────────────────────────────┐
│                   Out of Warranty                      │
│            (Saf Vanilla JS + HTML5 Canvas)            │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌──────────────┐                       ┌──────────────┐
│  Mobil Web   │                       │  Capacitor   │
│ (Safari/     │                       │  (Native     │
│  Chrome PWA) │                       │   Container) │
└──────────────┘                       └───────┬──────┘
                                               │
                               ┌───────────────┴───────────────┐
                               ▼                               ▼
                       ┌───────────────┐               ┌───────────────┐
                       │ Android (.aab)│               │   iOS (.ipa)  │
                       │ Google Play   │               │   App Store   │
                       └───────────────┘               └───────────────┘
```

---

## 3. Faz 1: Dokunmatik Giriş Sistemi (Touch Input Engine)

### 3.1. D-Pad & Zıplama (Sol Alt Panel)
Topçu oyunlarında milimetrik pozisyon alma ve siper arkasına sığınma hayati önem taşır. Bu nedenle serbest analog joystick yerine hassas **D-Pad tuş takımı** kullanılacaktır:
- **Konum:** Sol alt köşe, Canvas üzerinde yarı saydam (`rgba(20, 24, 30, 0.65)`), endüstriyel operasyon konsolu temasına uygun.
- **Tuşlar:**
  - `[ ◄ ]` Sola Hareket: Basılı tutulduğu sürece `input.left = true` tetikler.
  - `[ ► ]` Sağa Hareket: Basılı tutulduğu sürece `input.right = true` tetikler.
  - `[ ▲ ]` Zıplama: Dokunulduğu anda `input.jump = true` tetikler.
- **Çoklu Dokunma (Multi-touch):** Sol başparmak D-Pad üzerinde basılı tutulurken, sağ el aynı anda nişan alabilmeli veya ekranın diğer yerlerine dokunabilmelidir (`e.changedTouches` bazlı bağımsız ID takibi).
- **Minimum Hit Alanı:** Yanlış basmaları önlemek için her tuş en az `52×52px` dokunma alanına sahip olacaktır.

### 3.2. Sapan Tarzı "Çek-Bırak" Nişan & Güç (Slingshot Drag-to-Aim)
Masaüstündeki "fareyle nişan al + tıkla güç doldur" mekanizması mobilde parmak ekranı kapattığı için hedefi görmeyi engeller. Bunun yerine *Wild Ones Mobile* ve *Angry Birds* standardı olan **Slingshot (Çek-Bırak)** mekaniği entegre edilir:

1. **Başlangıç (`touchstart`):**
   * Oyuncu ekranın sağ yarısına (veya aktif robotun etrafına) dokunduğunda başlangıç noktası (`originX, originY`) kaydedilir.
2. **Çekme & Nişan (`touchmove`):**
   * Parmağın çekildiği yön ile origin arasındaki açı tersine çevrilerek **namlu açısı** belirlenir:
     $$\theta = \text{atan2}(originY - touchY, originX - touchX)$$
   * İki nokta arasındaki piksel mesafesi $D = \sqrt{\Delta x^2 + \Delta y^2}$ **atış gücüne** dönüştürülür:
     $$\text{Güç} = \min\left(100\%, \frac{D}{D_{\max}} \times 100\%\right) \quad (D_{\max} \approx 130\text{px})$$
   * Ekranda çekilen mesafeyi gösteren esnek bir yay çizgisi ve hedefe doğru açıyı gösteren dinamik bir yön oku çizilir.
3. **Ateşleme (`touchend`):**
   * Parmak bırakıldığı anda belirlenen açı ve hesaplanan güçle atış fırlatılır (`this.fire()`).
4. **Atış İptali (Safe Cancel):**
   * Eğer parmak başlangıç noktasına geri getirilirse ($D < 15\text{px}$) veya ekranın sağ üstündeki **[ İptal ]** bölgesine sürüklenirse atış fırlatılmaz, güç sıfırlanır.

### 3.3. Aksiyon ve Yuva Butonları
- **Dahili Modül (`Q`):** Alt paneldeki modül kartı dokunulduğunda doğrudan aktifleşir.
- **Silah Seçimi:** Alt paneldeki büyük silah kutusuna dokunulduğunda açılır silah ızgarası açılır; dokunulan silah kuşanılır ve liste kapanır.
- **Işınlanma ve Kanca:** Alt paneldeki kısayol yuvalarına doğrudan dokunarak seçilebilir.

---

## 4. Faz 2: Ekran, Viewport ve Çentik (Safe Area) Uyumu

### 4.1. Ekran Çözünürlüğü ve En-Boy Oranı
- Oyunun iç mantıksal çizim alanı **960×540 (16:9)** sabit kalacaktır.
- Modern telefonlar 19.5:9 veya 20:9 en-boy oranına sahiptir.
- Oyun ekranı dikey olarak tam dolduracak, yatayda ise telefonun ekranına göre ortalanacaktır (`letterbox` veya genişletilmiş fabrika arka planı).

### 4.2. Viewport ve CSS Kuralları
- `index.html` meta etiketine `viewport-fit=cover` eklenecektir:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  ```
- Çentikli ekranlar (iPhone Dynamic Island / Android kamera delikleri) için HUD elemanlarına safe-area tanımlanacaktır:
  ```css
  padding-left: max(12px, env(safe-area-inset-left));
  padding-right: max(12px, env(safe-area-inset-right));
  ```
- **Yatay Mod Kilidi (Landscape Orientation):** Mobil tarayıcılarda oyun yatay modda oynanmalıdır. Dikey tutulduğunda "Lütfen cihazınızı yatay çevirin" uyarısı gösterilecektir.

---

## 5. Faz 3: Ses, Donanım ve Mobil Davranışlar

### 5.1. Web Audio API Mobil Kilit Çözme (Audio Unlock)
Mobil tarayıcılar arka planda istenmeyen sesleri engellemek için ilk kullanıcı dokunuşuna kadar ses motorunu askıya alır (`suspended`).
- Oyundaki ilk ekrana dokunma anında (`touchstart` veya menü butonuna basışta) tek seferlik `audioCtx.resume()` çağrısı güvence altına alınacaktır.

### 5.2. Dokunsal Geri Bildirim (Haptic Feedback)
Oyuncu deneyimini güçlendirmek için tarayıcının `navigator.vibrate` API'si kullanılacaktır:
- Güçlü bir patlamada: `navigator.vibrate(35)` (kısa tok titreşim).
- Atış fırlatıldığında: `navigator.vibrate(15)` (hafif geri tepme hissi).
- Desteklenmeyen veya sessize alınmış cihazlarda sessizce yok sayılacaktır.

### 5.3. Arka Planda Duraklatma (Visibility & Lifecycle)
- Kullanıcıya telefon geldiğinde veya uygulama arka plana atıldığında `document.addEventListener("visibilitychange")` ile oyun döngüsü duraklatılacak ve sesler kısılacaktır.

---

## 6. Faz 4: Prototip ve Doğrulama Adımları

1. **Mobil Giriş Adaptörü:** `js/mobile-input.js` modülü eklenerek dokunmatik D-Pad ve Slingshot nişan mantığı izole bir şekilde yazılacaktır.
2. **Masaüstü/Mobil Ayrımı:** Cihazda dokunmatik ekran olup olmadığı dinamik olarak kontrol edilecek (`'ontouchstart' in window`), masaüstü kullanıcıları klavye ve fare ile oynamaya devam edecektir.
3. **Otomasyon Testleri:** `tests/mobile-input.js` dosyası ile dokunmatik olayların simülasyonu yapılacak (D-Pad basma, çek-bırak güç hesaplama, iptal toleransı).
4. **Canlı Cihaz Doğrulaması:** Yerel ağ üzerinden telefon tarayıcısıyla bağlanıp gecikme, nişan hassasiyeti ve FPS test edilecektir.

---

## 7. Faz 5: Capacitor ile Native Mobil Paketleme (Android & iOS)

Mevcut projeyi bozmadan kök dizine Capacitor entegrasyonu yapılacaktır:

```powershell
# 1. Capacitor kurulumu
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# 2. Capacitor başlatma
npx cap init "Out of Warranty" "com.bahattinercan.outofwarranty" --web-dir "."

# 3. Android platformunu ekleme
npx cap add android

# 4. Projeyi derleme ve Android Studio'yu açma
npx cap copy
npx cap open android
```

### 7.1. Capacitor Yapılandırması (`capacitor.config.json`)
- Tam ekran (Immersive Fullscreen) modu etkinleştirilecek.
- Ekran yönü yalnızca `landscape` olarak kilitlenecektir.
- Android donanımsal geri tuşu (`backButton`) oyun içi `Esc` (Geri) fonksiyonuna bağlanacaktır.

---

## 8. Faz 6: Monetization ve Mağaza Yayını

1. **Ödüllü Reklam Entegrasyonu:**
   * Projede halihazırda bulunan `js/portal.js` köprüsü, Capacitor AdMob eklentisi (`@capacitor-community/admob`) ile bağlanacaktır.
   * Maç sonu kartındaki "Hurdayı 2× yap" ödüllü reklam butonu native AdMob reklamını tetikleyecektir.
2. **Mağaza Varlıkları:**
   * `art/marketing/` klasöründeki mevcut yüksek çözünürlüklü görseller (ikonlar, afişler, dikey ve yatay ekran görüntüleri) kullanılarak Google Play ve App Store mağaza sayfaları hazırlanacaktır.

---

## 9. Zaman Çizelgesi ve Öncelik Sıralaması

| Aşama | Görev | Tahmini Çaba | Durum |
|---|---|:---:|:---:|
| **Aşama 1** | D-Pad & Dokunmatik kontroller (Sol/Sağ/Zıpla) | 1 Gün | 🟡 Planlandı |
| **Aşama 2** | Çek-Bırak (Slingshot) nişan & güç atış mekaniği | 1 Gün | 🟡 Planlandı |
| **Aşama 3** | Responsive Safe-Area, çentik ve yatay ekran kilidi | Yarım Gün | 🟡 Planlandı |
| **Aşama 4** | Mobil dokunmatik testleri (`tests/mobile-input.js`) | Yarım Gün | 🟡 Planlandı |
| **Aşama 5** | Capacitor kurulumu, Android Studio APK üretimi | 1 Gün | 🟡 Planlandı |
| **Aşama 6** | Fiziksel telefonda oynanış & dokunmatik hassasiyet ayarı | 1 Gün | 🟡 Planlandı |
| **Aşama 7** | Google Play Store / App Store hazırlığı & yayın | 1 Gün | 🟡 Planlandı |
