/* Giriş noktası: oyunu başlat ve "Tekrar Oyna" butonunu bağla. */
window.addEventListener("DOMContentLoaded", () => {
  // Font ön yükleme: ilk menü karesi fallback (Segoe UI) ile çizilmesin diye
  // oyun fontlarını tarayıcıya önceden bildirir (ui-theme-plan.md §2.4).
  // Oyun her kareyi yeniden çizdiği için yüklenince ekran kendiliğinden güncellenir.
  if (document.fonts && document.fonts.load) {
    document.fonts.load('16px "Russo One"');
    // Gövde varsayılanı SemiBold (600) — 400 kesimi artık UI'da kullanılmıyor
    // (bkz. uiTextFont); ön yükleme de yalnız kullanılan kesimleri ister.
    document.fonts.load('600 16px "Chakra Petch"');
    document.fonts.load('bold 16px "Chakra Petch"');
  }

  const canvas = document.getElementById("game");
  const game = new Game(canvas);

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
  });

  // Ses aç/kapat butonu — etiketi kayıtlı tercihe göre başlat
  document.getElementById("mute-btn").addEventListener("click", () => game.toggleMute());
  document.getElementById("volume-slider").addEventListener("input", (e) => {
    SFX.setVolume(Number(e.target.value) / 100);
    game.updateMuteButton();
  });
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
