# Bağlama Duyarlı Düşman AI’si

Durum: **Uygulandı**

## Davranış

- Bilgisayar rakibinin robot seçimi, insan robotunu ve kadrodaki mevcut robotları dışlar; rol ve beceri türü tekrarlarını azaltır. Eşit adaylar sabit seçim girdisiyle deterministik çözülür.
- Silah seçimi mevcut gerçek mermi fiziği simülasyonunu kullanır. Güvenlik, beklenen hasar, kalkan, birden fazla hedef, bitirici fırsatı ve mühimmat durumu birlikte değerlendirilir. Simülatör dışındaki hava saldırısı, mayın ve hareket araçları saldırı havuzunda değildir.
- Beceri seçimi hazır olma ve beklenen faydaya bağlıdır: iyileştirme kayıp canı, savunma tehdit ve dayanıklılığı, saldırı becerileri menzil/hasarı, hareket becerileri konum ve arazi durumunu değerlendirir.
- `nextShot` becerileri silah ateşlenmeden önce uygulanır. Atış hakkı tüketen saldırı modülleri anlamlı etki eşiğini aşmadıkça ateşin yerini almaz.
- Yerel bilgisayar, çok botlu maç ve ağdaki bot devralma mevcut `BotController` yolunu paylaşır. Oyunda takım alanı bulunmadığından diğer canlı oyuncular düşman kabul edilir.

## Doğrulama

`node tests/run.js` AI seçimlerini, beceri kararlarını, deterministik robot kadrosunu ve mevcut tur/atış sözleşmelerini denetler.
