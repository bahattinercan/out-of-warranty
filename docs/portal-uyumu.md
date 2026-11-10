# Portal uyumu (F5)

Tarih: 16 Ekim 2026 · Durum: **kod tamam** (CrazyGames + Poki adaptörleri), gerçek
portal oturumunda doğrulanmadı. Yayın sırası: itch.io kapalı test →
**CrazyGames Basic** → ölçüm → Full Launch + SDK reklamları → Poki başvurusu
(`docs/web-lansman-plani.md` §7).

## 1. Ne yapıldı

`js/portal.js` — portalları oyundan **soyutlayan tek köprü**. Oyunda başka yerde
SDK çağrısı yoktur; `Game`/`OnlineLobby` yalnız `PORTAL` cephesini kullanır.

| Konu | Davranış |
|---|---|
| Sağlayıcı seçimi | `?portal=crazygames` / `?portal=poki` (ya da portal sayfasının `window.__PORTAL_PROVIDER__` değişkeni). Hiçbiri yoksa **portal yok** — `file://` ve düz http açılışında oyun aynı kalır. |
| SDK yükleme | Tembel: yalnız seçilen sağlayıcının betiği (`sdk.crazygames.com/crazygames-sdk-v3.js` / `game-cdn.poki.com/scripts/v2/poki-sdk.js`). 12 sn zaman aşımı; yüklenemezse oyun çevrimdışı devam eder, hiçbir düğme kaybolmaz. |
| Hata disiplini | Portal yokken tüm metotlar `{ ok:false }` döner, **istisna atmaz**; oyun kodunda `try/catch` yok. |
| Ölçüm olayları | `loadingStart/Stop`, `gameplayStart/Stop` (aynı durum iki kez gönderilmez), `happytime` (yalnız insan kazanınca, yalnız CrazyGames). Poki'de `loadingStop` → `gameLoadingFinished`. |
| Ödüllü reklam | Maç sonu kartında **"Reklam izle · Hurdayı 2× yap"**. Ödül yalnız reklam TAM izlenince verilir (`doubleMatchScrap`: Hurda 2×, XP çarpılmaz — reklam güç vermez, `§8`). Maç başına 1 kez. |
| Maç arası reklam | Yalnız maç sonu kartından **ayrılırken** (menü/tekrar). İstemci tarafında **3 dakika** aralık; CrazyGames `adCooldown` hatası ayrıca yakalanır. Banner/interstitial yok. |
| Çok oyunculu | Host oda bilgisini bildirir: `updateRoom({ roomId, isJoinable, inviteParams:{oda} })`; lobide boş koltuk varsa `isJoinable:true`, oda dolunca/maç başlayınca `false`, ayrılınca `leftRoom()`. Davet: `inviteLink({oda})` → panoya; gelen oyuncunun kodu `inviteParam("oda")` ile hazır doldurulur. |
| Uyum | Portal içinde tarayıcı **tam ekran düğmesi gizlenir**; `game.settings.muteAudio` oyun sesini kapatır (portal ayarı oyun içi tercihi ezer); adblock/gizli sekme durumunda oyun normal çalışır. |

**Sınır (bilinçli):** "elenince geri dön" (ödüllü canlandırma) bu dilimde
**yapılmadı**. Canlandırma maç akışını (tur sırası, mermi iadesi, sonuç kartı)
değiştirdiği için ayrı dilim olarak F5b'ye bırakıldı; şu an yalnız iki reklam
yerleşimi var: ödüllü 2× ve maç arası.

## 2. Yerel deneme

```powershell
# Varsayılan: portallar KAPALI (hiçbir SDK yüklenmez)
start index.html

# Sahte SDK ile akış provası (ödül, düğme, olay sırası)
start _portal_probe.html                 # reklam tamamlanır → 2×
start "_portal_probe.html?noClick=1"      # yalnız düğme karesi
```

`_portal_probe.html` gerçek `css/style.css`, gerçek `js/portal.js` ve gerçek
`showOverlay`/`renderOverlayReward` yolunu kullanır; SDK'sı sahtedir. Headless
doğrulama (konsol):

```
PROBE OK init=ok provider=crazygames · buttonVisible=true · ad=ok rewardScrap=80
persisted=240 · calls=init,loadingStart,loadingStop,gameplayStart,requestAd:rewarded,gameplayStop
```

Gerçek portaldan önce yapılacaklar: portal geliştirici panelinde oyun kaydı,
`?portal=` parametresinin portal tarafından eklenmesi (ya da SDK globalinin
otomatik algılanması — kod ikisini de destekler), iframe içinde 16:9 ölçekleme
ve tam ekran düğmesinin gizlendiğinin gözle doğrulanması.

## 3. Testler

```
node tests/portal.js      # 46 assert: sağlayıcı seçimi, no-op, CG/Poki sözleşmesi,
                          #   reklam callback'leri, 3 dk kuralı, oda/davet, muteAudio
node tests/reward-ad.js   # 19 assert: düğme görünürlüğü, 2× Hurda, reklam hatası,
                          #   çevrimiçi kartta gizleme, portal muteAudio
```

Her ikisi de **sahte SDK** kullanır: gerçek portal SDK'sı/ödeme paneli burada
sınanmaz (ağ ve hesap gerektirir). Portal içi gerçek doğrulama yayın adımıdır.
