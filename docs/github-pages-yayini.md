# GitHub Pages Yayın Kılavuzu

Bu belge, Out of Warranty dokümantasyonunun ve gizlilik politikasının GitHub Pages üzerinden `/docs` klasöründen yayınlanma adımlarını içerir.

## Yayın Adımları

1. **Depo görünürlüğü:** Deponun herkese açık (public) olduğundan emin olun (`bahattinercan/out-of-warranty`). GitHub Pages ücretsiz hesaplarda herkese açık depolarda çalışır.
2. **Ayarlar sekmesi:** GitHub deposunda **Settings** sekmesini açın ve sol menüden **Pages** bölümüne gidin.
3. **Kaynak seçimi:** **Build and deployment > Source** alanında **Deploy from a branch** seçeneğini belirleyin.
4. **Dal ve klasör ayarı:** **Branch** açılır menüsünden `main` dalını, klasör açılır menüsünden `/docs` klasörünü seçin ve **Save** düğmesine tıklayın.
5. **İlk derleme:** Yapılandırma kaydedildikten sonra ilk derleme yaklaşık bir dakika sürer; derleme süreci **Actions** sekmesindeki `pages-build-deployment` iş akışından izlenebilir.
6. **Yayınlanan adresler:** Derleme tamamlandığında sayfalar şu adreslerde erişilebilir hale gelir:
   - `https://bahattinercan.github.io/out-of-warranty/index.html`
   - `https://bahattinercan.github.io/out-of-warranty/gizlilik-ve-veri.html`
   - `https://bahattinercan.github.io/out-of-warranty/privacy-en.html`
7. **Değişiklik sonrası yeniden kontrol:** Herhangi bir dokümanda değişiklik yapıldığında dosyayı düzenleyip depoya commit göndermeniz yeterlidir; GitHub Pages otomatik olarak yeniden derlenir ve güncel sürüm yayına alınır.
8. **Erişim ve karakter doğrulama:** Sayfalar ancak yukarıdaki ayar etkinleştirilip ilk derleme bittikten sonra erişilebilir; ayar tamamlanana kadar bu adresler HTTP 404 döndürür. Yayından sonra tarayıcıda URL'yi açıp Türkçe karakterlerin (ç, ğ, ı, ö, ş, ü) bozulmadan doğru işlendiğini doğrulayın.
