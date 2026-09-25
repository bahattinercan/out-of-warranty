# Robot Tema Yol Haritası

## Faz 0 — Tasarım kilidi

Amaç: Kod değişmeden önce ortak görsel ve anlatısal dili kesinleştirmek.

Teslimatlar:

- [x] Dünya önermesi ve tasarım sütunları.
- [x] Gövde aileleri.
- [x] İlk beş robotun kısa tasarımı.
- [x] Dokuz fabrika bölgesinin eşlemesi.
- [x] 34 karakterlik geçici dönüşüm matrisi.
- [ ] Oyun adı kararı.
- [ ] İlk beş robot için kaba silüet sayfası.
- [ ] Hurda Sahası için renk anahtarı.

Kabul ölçütü: Beş robot siyah silüet olarak birbirinden ayrılıyor ve özel yetenekleri gövdelerindeki aparattan tahmin edilebiliyor.

## Faz 1 — Dikey tema prototipi

Amaç: Tema yaklaşımını tüm oyuna yaymadan önce bir maçlık uçtan uca deneyim oluşturmak.

Kapsam:

- FIX-8, MIK-0, ZIP, TEK-8 ve PRES-4.
- Hurda Sahası bölgesi.
- Robot seçim kartları.
- Robotlara ait beş yetenek adı ve efekti.
- Temel metal/terminal UI paleti.
- Servo, kalkan ve hidrolik darbe için ilk ses geçişi.

Önerilen uygulama sırası:

1. Veri alanlarını `characters.js` içine geriye uyumlu ekle.
2. Modüler robot çiziciyi oluştur.
3. Maç içi Entity çizimini `visualKind` kontrollü eski/yeni çift yoluyla bağla.
4. Seçim kartını aynı çiziciye bağla.
5. `BIOMES.meadow` paletini Hurda Sahası olarak dönüştür; FIX-8 haritasını dikey prototip kabul rotası olarak kullan.
6. Beş yetenek efektini robotlaştır.
7. UI metinlerini yalnız prototip akışı için güncelle.
8. Otomatik ve manuel doğrulama yap.

Kabul ölçütleri:

- Beş prototip robot maçta eksiksiz oynanabiliyor.
- Eski hayvan çizim parçaları bu beş robotta görünmüyor.
- Kalan 29 karakter eski çiziciyle hatasız çalışıyor.
- Silüetler 48×48 önizlemede ayrışıyor.
- Yetenek davranışı ve sayısal denge değişmiyor.
- Hurda Sahası kraterlerle doğru aşınıyor.
- Tüm otomatik testler geçiyor.

Karar kapısı: Faz 1 sonunda görsel yön onaylanmadan 34 karaktere yayılım yapılmaz.

## Faz 2 — Tam karakter kadrosu

Amaç: Kalan 29 karakteri modüler üretim sistemiyle dönüştürmek.

Çalışma paketleri:

- Ağır iş ve yakın dövüş robotları.
- Alan etkili ve rezonans robotları.
- Tekerlekli/yaylı hareket robotları.
- Savunma ve bakım robotları.
- Dahili mermi kullanan deneysel robotlar.

Her paket için:

1. Silüet ve palet kontrolü.
2. Veri alanlarının eklenmesi.
3. Aparat ve yüz çizimi.
4. Yetenek adı, açıklaması ve efekti.
5. Seçim kartı taşma kontrolü.
6. En az bir gerçek maç testi.

Kabul ölçütleri:

- 34 robotun görünen adları benzersiz.
- Aynı gövde ailesindeki robotlar aparat ve hareket sistemiyle ayırt ediliyor.
- Hiçbir seçim kartında hayvan adı veya hayvana özgü ikon kalmıyor.
- Tüm `kind` türleri en az bir manuel testte kullanılıyor.

## Faz 3 — Fabrika dünyasının tamamlanması

Amaç: Dokuz biyomu aynı evrene ait fabrika bölgelerine dönüştürmek.

Teslimatlar:

- Dokuz bölge paleti.
- Mevcut 34 arena, bu dokuz palet altında gruplanmış olarak korunur.
- Bölge başına en az üç ayırt edici prop.
- Yeni uzak silüetler ve yüzey bantları.
- Harita kartlarında bölge kodu ve arketip etiketi.
- Gökyüzü efektlerinin fabrika karşılıkları: kıvılcım, buhar, kül, sızıntı damlası.

Kabul ölçütleri:

- Her bölge küçük önizlemesinden tanınabiliyor.
- Dekor spawn noktalarını kapatmıyor.
- Arazi yüksekliği ve arketip davranışı önceki sürümle uyumlu.
- Arka plan, karakter ve mermi okunabilirliğini düşürmüyor.

## Faz 4 — Silah, ses ve arayüz bütünlüğü

Amaç: Robot karakterlerin yabancı göründüğü eski sunum kalıntılarını temizlemek.

Teslimatlar:

- Silah adları ve açıklamalarında ortak endüstriyel dil.
- Teknik ikon seti veya tutarlı geçici ikonlar.
- Servo, elektrik, basınç, metal darbe ve alarm ses aileleri.
- Menü, HUD, maç sonu ve yardım metinlerinin tam geçişi.
- Yeni isim ve logo uygulaması.

Kabul ölçütleri:

- Oyuncuya görünen hiçbir ana metin eski hayvan temasına referans vermiyor.
- Efekt sesleri birbirini ve temel atış geri bildirimini bastırmıyor.
- Klavye/fare kontrolleri ve erişilebilir etiketler doğru.

## Faz 5 — İç kimlik temizliği ve dokümantasyon

Amaç: Prototip uyumluluğu için korunan eski terimleri teknik borç bırakmadan temizlemek.

Teslimatlar:

- Onaylanmış yeni ASCII robot `id` değerleri.
- Gerekirse eski → yeni kimlik eşleme tablosu.
- `drawExtra` uyumluluk alanının kaldırılması.
- `README.md`, yorumlar ve test adlarının güncellenmesi.
- Kullanılmayan hayvan çizim dallarının kaldırılması.

Kabul ölçütleri:

- `rg` ile hayvan terimleri arandığında yalnız tarihsel plan veya açık uyumluluk eşlemeleri bulunuyor.
- Testler yeni kimliklerle geçiyor.
- Script sırası ve `file://` çalıştırma desteği korunuyor.

## Risk kaydı

| Risk | Etki | Önlem |
|---|---|---|
| 34 robot birbirine benzer | Karakter seçimi anlamsızlaşır | Önce silüet, sonra renk; gövde ailesi matrisi kullan |
| Tema değişirken denge de değiştirilir | Regresyonun kaynağı belirsizleşir | İstatistikleri tema fazında dondur |
| Çizim kodu büyür ve karmaşıklaşır | Bakım ve performans sorunu | Katmanlı modüler çizici, ortak önizleme yolu |
| Eski `id` değerleri erken değiştirilir | Harita ve test eşlemeleri kırılır | İki katmanlı göç ve açık uyumluluk haritası |
| Fabrika arka planları fazla detaylı olur | Mermi/karakter okunmaz | Düşük doygunluk, değer kontrastı testi |
| Harici asset ihtiyacı doğar | `file://` desteği kırılabilir | İlk sürümde Canvas ve Web Audio ile prosedürel üretim |
| Emoji ikonları görsel dili bozar | Platformlar arası tutarsızlık | Faz 4'te Canvas teknik ikonlarına geçiş |
| Eski kurgu metinleri kalır | Tema yamalı görünür | Son fazda metin envanteri ve `rg` taraması |

## Geri alma stratejisi

- Her faz bağımsız ve çalışır durumda tamamlanmalı.
- Veri sözleşmesi değişiklikleri ile görsel değişiklikler mümkün olduğunca ayrı tutulmalı.
- Dikey prototip sırasında eski çizici kısa süreli bir uyumluluk yolu olarak tutulabilir.
- Yeni çizici başarısız olursa karakter istatistiklerine veya yetenek davranışına dokunmadan eski görsele dönülebilmeli.
