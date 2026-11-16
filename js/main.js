/* Giriş noktası: oyunu başlat ve "Tekrar Oyna" butonunu bağla. */
window.addEventListener("DOMContentLoaded", () => {
  // Font ön yükleme: ilk menü karesi fallback (Segoe UI) ile çizilmesin diye
  // arayüzde kullanılan font kesimlerini tarayıcıya önceden bildirir.
  // Oyun her kareyi yeniden çizdiği için yüklenince ekran kendiliğinden güncellenir.
  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 16px "Chakra Petch"');
    document.fonts.load('600 16px "Chakra Petch"');
  }

  const canvas = document.getElementById("game");

  // Raster sanat varlıkları (varsa): yükleme arka planda başlar, hazır olana kadar
  // çiziciler prosedürel yedeği kullanır (assets.js > assetImage).
  if (typeof assetPreload === "function") assetPreload();
  const game = new Game(canvas);
  if (typeof GameSettings !== "undefined") GameSettings.init(game);

  /* Portal (F5): SDK varsa tembel yüklenir ve başlatılır; yoksa oyun hiç
   * etkilenmez. Portal kendi tam ekranını yönettiği için tarayıcı tam ekran
   * düğmesi gizlenir ve portalın `muteAudio` ayarı oyun sesine uygulanır. */
  if (typeof PORTAL !== "undefined") {
    PORTAL.init().then(() => {
      if (PORTAL.hideFullscreen()) {
        const fsBtn = document.getElementById("fullscreen-btn");
        if (fsBtn) fsBtn.classList.add("hidden");
      }
      game.setMuted(PORTAL.muted());
    });
    PORTAL.onSettingsChange((s) => game.setMuted(!!s.muteAudio));
  }

  /* Tanılama (F6): pencere hatalarını toplar; kapalı testte "Rapor" düğmesi
   * tek dokünüşla panoya kopyalar. Ağa hiçbir şey gönderilmez. */
  if (typeof DIAG !== "undefined") {
    DIAG.install({ game });
    const reportBtn = document.getElementById("report-btn");
    if (reportBtn) {
      reportBtn.addEventListener("click", () => {
        const ok = DIAG.copyReport();
        reportBtn.classList.toggle("copied", ok);
        const label = reportBtn.querySelector("span");
        const original = label ? label.textContent : "";
        if (label) {
          label.textContent = ok
            ? t("hud.report.copied", "Kopyalandı")
            : t("hud.report.failed", "Kopyalanamadı");
          setTimeout(() => {
            label.textContent = original;
            reportBtn.classList.remove("copied");
          }, 2000);
        }
      });
    }
  }

  const rewardAdBtn = document.getElementById("reward-ad-btn");
  if (rewardAdBtn) rewardAdBtn.addEventListener("click", () => game.watchRewardAd());

  document.getElementById("restart-btn").addEventListener("click", () => {
    game.replay();
  });

  // Oyundan çık → karakter seçim menüsüne dön (HUD butonu + oyun sonu menü butonu)
  document.getElementById("quit-btn").addEventListener("click", () => {
    game.quitToMenu();
  });
  document.getElementById("menu-btn").addEventListener("click", () => {
    game.quitToMenu();
  });

  // Maç sonu ödülünden doğrudan atölyeye geç (overlay kapanır).
  document.getElementById("workshop-btn").addEventListener("click", () => {
    game.openWorkshop();
  });

  const app = document.getElementById("app");
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      app.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
  document.getElementById("fullscreen-btn").addEventListener("click", toggleFullscreen);
  window.addEventListener("keydown", (e) => {
    if ((e.key === "f" || e.key === "F") && !e.repeat) toggleFullscreen();
    if ((e.key === "o" || e.key === "O") && !e.repeat) {
      if (typeof GameSettings !== "undefined" && !e.target.matches?.("input, select, textarea")) {
        GameSettings.toggle();
      }
    }
  });

  // Ses aç/kapat butonu — etiketi kayıtlı tercihe göre başlat
  document.getElementById("mute-btn").addEventListener("click", () => game.toggleMute());
  document.getElementById("volume-slider").addEventListener("input", (e) => {
    SFX.setVolume(Number(e.target.value) / 100);
    game.updateMuteButton();
  });
  const musicMuteBtn = document.getElementById("music-mute-btn");
  if (musicMuteBtn) {
    musicMuteBtn.addEventListener("click", () => game.toggleMusicMute());
  }
  const musicSlider = document.getElementById("music-volume-slider");
  if (musicSlider) {
    musicSlider.addEventListener("input", (e) => {
      SFX.setMusicVolume(Number(e.target.value) / 100);
      game.updateMuteButton();
    });
  }
  // Ses ayarına geçerken önceki güç doldurma/yürüme girdisini bırak.
  const audioControl = document.getElementById("audio-control");
  const clearGameInput = () => {
    game.cancelCharge();
    game.input.left = false;
    game.input.right = false;
  };
  audioControl.addEventListener("pointerdown", clearGameInput);
  audioControl.addEventListener("focusin", clearGameInput);
  game.updateMuteButton();

  // Dil değişimi: DOM metinleri i18n.js içinde uygulanır; oyunun kendi
  // metinleri (sıra şeridi, rüzgar, yuva adları) bir sonraki kareyi
  // beklememeli — menü ekranlarında çizim döngüsü metni yenilemez.
  document.addEventListener("localechange", () => {
    game.updateHud();
    game.updateMuteButton();
  });
});
