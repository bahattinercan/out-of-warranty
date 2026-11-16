/* Oyun Ayarları Yönetimi (Settings Modal & Preferences).
 *
 * Sorumluluklar:
 * - Grafik, Oynanış ve Arayüz tercihlerini saklama (nwo_settings)
 * - Ses ve Müzik kontrollerini SFX API'si ile senkronize yönetme
 * - Dil seçimini i18n sistemiyle senkronize etme
 * - Kontroller rehberini sunma
 * - Profil yedekleme (dışa aktar / içe aktar) ve sıfırlama işlevleri
 *
 * ES module KULLANILMAZ; klasik script olarak global `GameSettings` nesnesini sunar.
 */

const SETTINGS_STORAGE_KEY = "nwo_settings";

const DEFAULT_GAME_SETTINGS = {
  damagePopups: true,
  aimGuide: true,
  showFps: false,
};

const GameSettings = (() => {
  let _settings = Object.assign({}, DEFAULT_GAME_SETTINGS);
  let _gameInstance = null;
  let _resetConfirmTimer = null;
  let _resetConfirming = false;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          _settings = Object.assign({}, DEFAULT_GAME_SETTINGS, parsed);
        }
      }
    } catch (_) {
      _settings = Object.assign({}, DEFAULT_GAME_SETTINGS);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(_settings));
    } catch (_) {}
  }

  function get(key) {
    if (key in _settings) return _settings[key];
    return DEFAULT_GAME_SETTINGS[key];
  }

  function set(key, value) {
    _settings[key] = value;
    saveSettings();
  }

  function isOpen() {
    const modal = document.getElementById("settings-modal");
    return modal ? !modal.classList.contains("hidden") : false;
  }

  function open(tabName) {
    const modal = document.getElementById("settings-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    if (tabName) switchTab(tabName);
    syncUI();
    if (_gameInstance) {
      _gameInstance.cancelCharge?.();
      if (_gameInstance.input) {
        _gameInstance.input.left = false;
        _gameInstance.input.right = false;
      }
    }
  }

  function close() {
    const modal = document.getElementById("settings-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    _resetConfirming = false;
    clearTimeout(_resetConfirmTimer);
    const resetBtn = document.getElementById("st-reset-profile-btn");
    if (resetBtn) {
      resetBtn.textContent = t("settings.profile.resetBtn", "Tüm İlerlemeyi Sıfırla");
      resetBtn.classList.remove("danger-confirm");
    }
  }

  function toggle(tabName) {
    if (isOpen()) close();
    else open(tabName);
  }

  function switchTab(tabId) {
    const modal = document.getElementById("settings-modal");
    if (!modal) return;
    const tabs = modal.querySelectorAll(".settings-tab");
    const panels = modal.querySelectorAll(".settings-panel");
    tabs.forEach((tab) => {
      const match = tab.getAttribute("data-tab") === tabId;
      tab.classList.toggle("active", match);
      tab.setAttribute("aria-selected", match ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === "tab-" + tabId);
    });
  }

  function syncUI() {
    const sfxVol = typeof SFX !== "undefined" ? Math.round(SFX.getVolume() * 100) : 100;
    const sfxMuted = typeof SFX !== "undefined" ? SFX.isMuted() : false;
    const musVol = typeof SFX !== "undefined" ? Math.round(SFX.getMusicVolume() * 100) : 0;
    const musMuted = typeof SFX !== "undefined" ? SFX.isMusicMuted() : true;

    // SFX slider & values
    const sfxSlider = document.getElementById("st-sfx-slider");
    const sfxVal = document.getElementById("st-sfx-val");
    const sfxMuteBtn = document.getElementById("st-sfx-mute-btn");
    if (sfxSlider) sfxSlider.value = sfxVol;
    if (sfxVal) sfxVal.textContent = sfxVol + "%";
    if (sfxMuteBtn) {
      sfxMuteBtn.textContent = sfxMuted
        ? t("settings.audio.unmute", "Sesi Aç")
        : t("settings.audio.mute", "Sesi Kapat");
      sfxMuteBtn.classList.toggle("active-mute", sfxMuted);
    }

    // Music slider & values
    const musSlider = document.getElementById("st-music-slider");
    const musVal = document.getElementById("st-music-val");
    const musMuteBtn = document.getElementById("st-music-mute-btn");
    if (musSlider) musSlider.value = musVol;
    if (musVal) musVal.textContent = musVol + "%";
    if (musMuteBtn) {
      musMuteBtn.textContent = musMuted
        ? t("settings.audio.musicUnmute", "Müziği Aç")
        : t("settings.audio.musicMute", "Müziği Kapat");
      musMuteBtn.classList.toggle("active-mute", musMuted);
    }

    // Graphics toggles
    const chkDamage = document.getElementById("st-chk-damage");
    if (chkDamage) chkDamage.checked = !!get("damagePopups");

    const chkAim = document.getElementById("st-chk-aim");
    if (chkAim) chkAim.checked = !!get("aimGuide");

    const chkFps = document.getElementById("st-chk-fps");
    if (chkFps) chkFps.checked = !!get("showFps");

    // Fullscreen status
    const fsBtn = document.getElementById("st-fullscreen-toggle");
    if (fsBtn) {
      const isFs = !!document.fullscreenElement;
      fsBtn.textContent = isFs
        ? t("settings.graphics.exitFullscreen", "Tam Ekrandan Çık")
        : t("settings.graphics.enterFullscreen", "Tam Ekran Yap");
    }

    // Language selector
    const langSelect = document.getElementById("st-locale-select");
    if (langSelect && typeof getLocale === "function") {
      langSelect.value = getLocale();
    }

    // Profile summary
    syncProfileSummary();
  }

  function syncProfileSummary() {
    const scrapEl = document.getElementById("st-profile-scrap");
    const partsEl = document.getElementById("st-profile-parts");
    let scrap = 0;
    let partsCount = 0;

    if (_gameInstance && _gameInstance.profile) {
      scrap = _gameInstance.profile.scrap || 0;
      partsCount = Array.isArray(_gameInstance.profile.parts) ? _gameInstance.profile.parts.length : 0;
    } else if (typeof loadProfile === "function") {
      const p = loadProfile();
      scrap = p ? (p.scrap || 0) : 0;
      partsCount = p && Array.isArray(p.parts) ? p.parts.length : 0;
    }

    if (scrapEl) scrapEl.textContent = scrap + " " + t("settings.profile.scrapUnit", "Hurda");
    if (partsEl) partsEl.textContent = partsCount + " " + t("settings.profile.partsUnit", "Parça");
  }

  function init(game) {
    _gameInstance = game;
    loadSettings();

    const modal = document.getElementById("settings-modal");
    if (!modal) return;

    // Kapat butonları
    const closeBtn = document.getElementById("settings-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => {
      if (typeof SFX !== "undefined") SFX.uiClick();
      close();
    });

    // Modal dışı tıklama ile kapatma
    modal.addEventListener("pointerdown", (e) => {
      if (e.target === modal) {
        if (typeof SFX !== "undefined") SFX.uiClick();
        close();
      }
    });

    // Sekmeler
    const tabs = modal.querySelectorAll(".settings-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        if (typeof SFX !== "undefined") SFX.uiClick();
        const tabId = tab.getAttribute("data-tab");
        switchTab(tabId);
      });
    });

    // SFX slider
    const sfxSlider = document.getElementById("st-sfx-slider");
    if (sfxSlider) {
      sfxSlider.addEventListener("input", (e) => {
        const val = Number(e.target.value) / 100;
        if (typeof SFX !== "undefined") SFX.setVolume(val);
        syncUI();
        if (_gameInstance) _gameInstance.updateMuteButton?.();
      });
    }

    // SFX mute button
    const sfxMuteBtn = document.getElementById("st-sfx-mute-btn");
    if (sfxMuteBtn) {
      sfxMuteBtn.addEventListener("click", () => {
        if (typeof SFX !== "undefined") {
          SFX.toggleMute();
          SFX.uiClick();
        }
        syncUI();
        if (_gameInstance) _gameInstance.updateMuteButton?.();
      });
    }

    // SFX test button
    const sfxTestBtn = document.getElementById("st-sfx-test-btn");
    if (sfxTestBtn) {
      sfxTestBtn.addEventListener("click", () => {
        if (typeof SFX !== "undefined") {
          SFX.shoot("bazooka");
        }
      });
    }

    // Music slider
    const musSlider = document.getElementById("st-music-slider");
    if (musSlider) {
      musSlider.addEventListener("input", (e) => {
        const val = Number(e.target.value) / 100;
        if (typeof SFX !== "undefined") SFX.setMusicVolume(val);
        syncUI();
        if (_gameInstance) _gameInstance.updateMuteButton?.();
      });
    }

    // Music mute button
    const musMuteBtn = document.getElementById("st-music-mute-btn");
    if (musMuteBtn) {
      musMuteBtn.addEventListener("click", () => {
        if (typeof SFX !== "undefined") {
          SFX.toggleMusicMute();
          SFX.uiClick();
        }
        syncUI();
        if (_gameInstance) _gameInstance.updateMuteButton?.();
      });
    }

    // Graphics: Damage popups
    const chkDamage = document.getElementById("st-chk-damage");
    if (chkDamage) {
      chkDamage.addEventListener("change", (e) => {
        set("damagePopups", e.target.checked);
        if (typeof SFX !== "undefined") SFX.uiClick();
      });
    }

    // Graphics: Aim guide
    const chkAim = document.getElementById("st-chk-aim");
    if (chkAim) {
      chkAim.addEventListener("change", (e) => {
        set("aimGuide", e.target.checked);
        if (typeof SFX !== "undefined") SFX.uiClick();
      });
    }

    // Graphics: FPS counter
    const chkFps = document.getElementById("st-chk-fps");
    if (chkFps) {
      chkFps.addEventListener("change", (e) => {
        set("showFps", e.target.checked);
        if (typeof SFX !== "undefined") SFX.uiClick();
      });
    }

    // Graphics: Fullscreen toggle
    const fsBtn = document.getElementById("st-fullscreen-toggle");
    if (fsBtn) {
      fsBtn.addEventListener("click", () => {
        const app = document.getElementById("app");
        if (!document.fullscreenElement) {
          app?.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
        setTimeout(syncUI, 100);
      });
    }

    // Gameplay: Language select
    const langSelect = document.getElementById("st-locale-select");
    if (langSelect && typeof LANG_ORDER !== "undefined" && typeof LANG_LABELS !== "undefined") {
      langSelect.innerHTML = "";
      for (const loc of LANG_ORDER) {
        const opt = document.createElement("option");
        opt.value = loc;
        opt.textContent = LANG_LABELS[loc] || loc;
        langSelect.appendChild(opt);
      }
      langSelect.addEventListener("change", (e) => {
        if (typeof setLocale === "function") {
          setLocale(e.target.value);
        }
        syncUI();
      });
    }

    // Profile: Export copy button
    const exportBtn = document.getElementById("st-export-btn");
    const exportFeedback = document.getElementById("st-export-feedback");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        let profileStr = "";
        try {
          profileStr = localStorage.getItem(PROFILE_KEY) || "";
        } catch (_) {}
        if (!profileStr && _gameInstance && _gameInstance.profile) {
          profileStr = JSON.stringify(_gameInstance.profile);
        }

        if (profileStr) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(profileStr).then(() => {
              if (exportFeedback) {
                exportFeedback.textContent = t("settings.profile.copied", "Pano kopyalandı!");
                exportFeedback.classList.remove("hidden");
                setTimeout(() => exportFeedback.classList.add("hidden"), 2500);
              }
            }).catch(() => {
              promptFallback(profileStr);
            });
          } else {
            promptFallback(profileStr);
          }
        }
      });
    }

    function promptFallback(str) {
      window.prompt(t("settings.profile.promptCopy", "Profil metnini kopyalayın:"), str);
    }

    // Profile: Import button
    const importBtn = document.getElementById("st-import-btn");
    const importInput = document.getElementById("st-import-input");
    const importFeedback = document.getElementById("st-import-feedback");
    if (importBtn && importInput) {
      importBtn.addEventListener("click", () => {
        const text = importInput.value.trim();
        if (!text) return;
        try {
          const parsed = JSON.parse(text);
          if (typeof sanitizeProfile === "function") {
            const clean = sanitizeProfile(parsed);
            if (typeof saveProfile === "function") {
              saveProfile(clean);
              if (_gameInstance) _gameInstance.profile = clean;
              importFeedback.textContent = t("settings.profile.importSuccess", "Profil başarıyla yüklendi!");
              importFeedback.className = "settings-feedback success";
              syncProfileSummary();
              importInput.value = "";
              setTimeout(() => {
                importFeedback.textContent = "";
              }, 3000);
              return;
            }
          }
        } catch (e) {
          importFeedback.textContent = t("settings.profile.importError", "Geçersiz profil verisi!");
          importFeedback.className = "settings-feedback error";
          setTimeout(() => {
            importFeedback.textContent = "";
          }, 3000);
        }
      });
    }

    // Profile: Reset button
    const resetBtn = document.getElementById("st-reset-profile-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (!_resetConfirming) {
          _resetConfirming = true;
          resetBtn.textContent = t("settings.profile.resetConfirm", "Emin misiniz? Sıfırlamak için tekrar tıklayın");
          resetBtn.classList.add("danger-confirm");
          _resetConfirmTimer = setTimeout(() => {
            _resetConfirming = false;
            resetBtn.textContent = t("settings.profile.resetBtn", "Tüm İlerlemeyi Sıfırla");
            resetBtn.classList.remove("danger-confirm");
          }, 4000);
        } else {
          _resetConfirming = false;
          clearTimeout(_resetConfirmTimer);
          resetBtn.textContent = t("settings.profile.resetBtn", "Tüm İlerlemeyi Sıfırla");
          resetBtn.classList.remove("danger-confirm");

          if (typeof defaultProfile === "function" && typeof saveProfile === "function") {
            const fresh = defaultProfile();
            saveProfile(fresh);
            if (_gameInstance) _gameInstance.profile = fresh;
            syncProfileSummary();
            if (typeof SFX !== "undefined") SFX.uiClick();
            if (exportFeedback) {
              exportFeedback.textContent = t("settings.profile.resetDone", "İlerleme sıfırlandı.");
              exportFeedback.classList.remove("hidden");
              setTimeout(() => exportFeedback.classList.add("hidden"), 2500);
            }
          }
        }
      });
    }

    // Global settings button (HUD'a bağlama)
    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        if (typeof SFX !== "undefined") SFX.uiClick();
        toggle();
      });
    }

    // Dil değişimi dinleyicisi
    document.addEventListener("localechange", () => {
      syncUI();
    });

    // Tam ekran değişimi dinleyicisi
    document.addEventListener("fullscreenchange", () => {
      syncUI();
    });

    syncUI();
  }

  return {
    init,
    get,
    set,
    open,
    close,
    toggle,
    switchTab,
    isOpen,
    syncUI,
  };
})();
