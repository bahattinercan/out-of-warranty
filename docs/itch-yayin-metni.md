# itch.io yayın metni (kapalı test — v0.6.0)

Bu dosya **kapalı test** sayfasının hazır metnidir: başlık, kısa/uzun açıklama,
etiketler, kontroller ve testçiye verilecek yönerge. Paket: `node tools/build.js`
→ `dist/out-of-warranty-0.6.0.zip` (kökünde `index.html` → itch.io'da
"This file will be played in the browser").

> Sürüm damgası `js/version.js > GAME_VERSION` ile **tek kaynaktan** gelir;
> sürüm değişince bu dosyadaki numarayı da güncelle (`node tests/release.js`
> ikisinin aynı olduğunu denetler).

---

## 1. Sayfa ayarları

| Alan | Değer |
|---|---|
| Başlık | **Out of Warranty — Garanti Dışı** |
| Proje türü | HTML (oynanabilir tarayıcı oyunu) |
| Görünürlük (kapalı test) | **Restricted** + şifre; bağlantıyı yalnız davet ettiğin 20–50 kişiye ver |
| "This file will be played in the browser" | ✅ işaretli |
| Mobilde oynanabilir | ✅ (dokunmatik nişan/ateş test edildi; yatay mod önerilir) |
| Ücret | Ücretsiz (kapalı test) |
| Sürüm notu | `v0.6.0 · kapalı test · geri bildirim formu açıklamada` |
| Etiketler | `artillery`, `turn-based`, `multiplayer`, `local-multiplayer`, `pvp`, `tanks`, `destructible-terrain`, `2d`, `turkish` |

## 2. Kısa açıklama (bir cümle)

**TR:** Sıra tabanlı 2D topçu düellosu: 34 arızalı robot, yıkılabilir arazi,
rüzgâr ve 2–6 oyunculu yerel/çevrimiçi maçlar — hepsi tarayıcıda, kurulumsuz.

**EN:** A turn-based 2D artillery duel: 34 faulty robots, destructible terrain,
wind, and 2–6 player local/online matches — all in the browser, no install.

## 3. Uzun açıklama (TR)

> **GARANTİ DIŞI** (Out of Warranty)
>
> Fabrika kapanmadan önce son bir vardiya: arızalı robotları sahaya sür,
> rüzgârı hesapla, araziyi patlat ve rakip operatörü devre dışı bırak.
>
> **Ne var?**
> - **34 robot** — her biri kendi model koduna (FIX-8, MIK-0, BOM-12 …) ve
>   kendi dahili modülüne sahip.
> - **Yıkılabilir arazi** — kraterler kalıcı; sığındığın tepe bir sonraki tur
>   yok olabilir.
> - **20 silah** — bazuka, misket, mayın, sektiren, füze salvosu, delici…
> - **2–6 oyuncu** — aynı klavyede (hot-seat) veya oda koduyla internet
>   üzerinden. Sunucu yok, doğrudan bağlantı (WebRTC).
> - **Kalıcı ilerleme** — Hurda topla, robotlarını kalibre et, parça tak,
>   cephane deposu kur.
>
> **Kontroller:** `A/D` yürü, fareyle nişan al, basılı tut + bırak = atış,
> `1–9` silah, `Q` modül, `W` zıpla, `M` ses, `F` tam ekran.
>
> **Diller:** Türkçe · English (sağ üstteki 🌐).
>
> **Not:** Kapatmadan önce kısa bir geri bildirim bırak — neyin kafa
> karıştırdığını özellikle yaz. Oyun kaydedilir (tarayıcı `localStorage`);
> sunucuya hiçbir veri gönderilmez.

## 4. Uzun açıklama (EN, kısa)

**GARANTİ DIŞI / Out of Warranty** — a turn-based 2D artillery duel for 2–6
players. 34 faulty robots, destructible terrain, wind and 20 weapons. Play
hot-seat on one keyboard or online with a room code (WebRTC, no server).
Controls: `A/D` move, mouse aim, hold & release to fire, `1–9` weapon,
`Q` module, `W` jump. Languages: Turkish, English.

## 5. Testçiye yönerge (kapalı test mesajı)

```
Merhaba! "Garanti Dışı"nın kapalı testine davetlisin (20–50 kişilik).
Tek yapman gereken: bağlantıyı aç → bir maç oyna (2–3 tur yeter) →
aşağıdaki 5 soruyu bana yaz. Kurulum yok, indirme yok.

1) İlk 30 saniyede ne yapacağını anladın mı? (evet/hayır + takıldığın yer)
2) Nişan/atış kontrolü rahat mı? (1-5)
3) Bir daha oynamak ister misin? (1-5)
4) Bir şey kırıldı/bozuldu mu? (ekran görüntüsü ya da sağ üstteki 🐞 Rapor
   düğmesiyle kopyalanan metni yapıştır)
5) En sinir bozucu tek şey neydi?

Bağlantı: <kapalı test URL'si>   Şifre: <şifre>
Teşekkürler!
```

## 6. Yayın öncesi kontrol listesi

- [ ] `node tools/build.js` → ZIP üretildi, `node tests/release.js` yeşil.
- [ ] ZIP itch.io'ya yüklendi; "played in the browser" işaretli; mobil kutu açık.
- [ ] Sayfa **Restricted + şifre**; bağlantı yalnız davetlilerle paylaşıldı.
- [ ] Menüde sürüm damgası görünüyor (`v0.6.0 · kapali-test`).
- [ ] Bir maç oynanıp sonuç kartı, ödül ve `2×` düğmesi (portal yok → gizli) kontrol edildi.
- [ ] Çevrimiçi oda kodu iki sekmede çalıştı; kopma → bot devralma görüldü.
- [ ] `?rapor=1` ile Rapor düğmesi görünüyor ve panoya metin kopyalıyor.
- [ ] Ekran görüntüleri (3): savaş sahnesi, lobi/koltuklar, atölye.

## 7. Yapılmaması gerekenler (yayın hijyeni)

- Sondaları/probeleri (`_*.html`), `tests/`, `docs/`, `tools/` klasörünü ZIP'e **koyma** — paket üreteci bunları zaten dışlar.
- Yayın ZIP'ini repoya **commit etme** (`dist/` git dışıdır).
- Kapalı test sürümüne yeni özellik ekleme; yalnız hata düzeltmesi + sürüm artışı
  (`0.6.1` gibi) — testçi hangi sürümü gördüğünü karşılaştırabilsin.
