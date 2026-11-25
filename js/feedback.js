/* Oyun Geri Bildirim ve Hata Raporlama Sistemi (Feedback Modal & Exporter).
 *
 * Sorumluluklar:
 * - Oyuncudan kategori (hata, oneri, denge, gorsel/ses, genel), puan ve aciklama alma
 * - DIAG teshis raporunu form verisiyle birlestirme
 * - Istege bagli tani verisiyle rapor olusturma, kopyalama veya indirme
 * - Geri bildirim metinlerini kalici depolamama ve otomatik gondermeme
 *
 * ES module KULLANILMAZ; klasik script olarak global `GameFeedback` nesnesini sunar.
 */

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB guvenlik siniri
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

const GameFeedback = (() => {
  let _gameInstance = null;
  let _currentRating = 5;
  let _selectedCategory = "idea";
  let _toastTimer = null;
  let _attachedImage = null; // { dataUrl: string, name: string, sizeStr: string }

  function isOpen() {
    if (typeof document === "undefined" || !document.getElementById) return false;
    const modal = document.getElementById("feedback-modal");
    return modal ? modal.open : false;
  }

  function open(opts) {
    if (typeof document === "undefined" || !document.getElementById) return;
    const modal = document.getElementById("feedback-modal");
    if (!modal) return;

    const o = opts || {};
    if (o.category) {
      setCategory(o.category);
    }
    if (typeof o.rating === "number") {
      setRating(o.rating);
    }

    if (!modal.open) modal.showModal();
    const textarea = document.getElementById("fb-message");
    if (textarea) {
      textarea.focus();
    }

    // Oyun ici girdi durumunu temizle
    if (_gameInstance) {
      _gameInstance.cancelCharge?.();
      if (_gameInstance.input) {
        _gameInstance.input.left = false;
        _gameInstance.input.right = false;
      }
    }
  }

  function close() {
    if (typeof document === "undefined" || !document.getElementById) return;
    const modal = document.getElementById("feedback-modal");
    if (!modal) return;
    if (modal.open) modal.close();
    hideToast();
  }

  function toggle() {
    if (isOpen()) close();
    else open();
  }

  function setCategory(cat) {
    _selectedCategory = cat || "idea";
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    const btns = document.querySelectorAll(".feedback-cat-btn");
    btns.forEach((btn) => {
      const match = btn.getAttribute("data-cat") === _selectedCategory;
      btn.classList.toggle("active", match);
      btn.setAttribute("aria-pressed", match ? "true" : "false");
    });
  }

  function setRating(val) {
    _currentRating = Math.max(1, Math.min(5, Math.round(val || 5)));
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    const stars = document.querySelectorAll(".feedback-star-btn");
    stars.forEach((star) => {
      const starVal = parseInt(star.getAttribute("data-val") || "1", 10);
      star.classList.toggle("active", starVal <= _currentRating);
      star.setAttribute("aria-pressed", starVal === _currentRating ? "true" : "false");
    });
  }

  function getFormData() {
    const textarea = typeof document !== "undefined" ? document.getElementById("fb-message") : null;
    const diagCheck = typeof document !== "undefined" ? document.getElementById("fb-include-diag") : null;
    const message = textarea && textarea.value ? textarea.value.trim() : "";
    const includeDiag = diagCheck ? !!diagCheck.checked : true;

    return {
      category: _selectedCategory,
      rating: _currentRating,
      message,
      includeDiag,
      timestamp: new Date().toISOString(),
    };
  }

  function buildReportText() {
    const data = getFormData();
    const catLabels = {
      bug: typeof t === "function" ? t("feedback.cat.bug", "Hata / Bug") : "Hata / Bug",
      idea: typeof t === "function" ? t("feedback.cat.idea", "Oneri / Fikir") : "Oneri / Fikir",
      balance: typeof t === "function" ? t("feedback.cat.balance", "Denge / Oynanis") : "Denge / Oynanis",
      art: typeof t === "function" ? t("feedback.cat.art", "Gorsel / Ses") : "Gorsel / Ses",
      general: typeof t === "function" ? t("feedback.cat.general", "Genel") : "Genel",
    };
    const catName = catLabels[data.category] || data.category;
    const starsStr = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);

    const lines = [
      "# Garanti Disi (Out of Warranty) — Geri Bildirim Raporu",
      "",
      `- **Kategori:** ${catName}`,
      `- **Derecelendirme:** ${starsStr} (${data.rating}/5)`,
      `- **Zaman:** ${data.timestamp}`,
      "",
      "## Aciklama / Detay:",
      data.message ? data.message : "*(Aciklama belirtilmedi)*",
      "",
    ];

    if (data.includeDiag && typeof DIAG !== "undefined" && typeof DIAG.reportText === "function") {
      lines.push("## Sistem ve Teshis Verileri:");
      lines.push("```text");
      lines.push(DIAG.reportText());
      lines.push("```");
      lines.push("");
    }

    return lines.join("\n");
  }

  function showToast(text, isError) {
    if (typeof document === "undefined" || !document.getElementById) return;
    const toast = document.getElementById("fb-toast");
    if (!toast) return;

    if (_toastTimer) clearTimeout(_toastTimer);
    toast.textContent = text;
    toast.className = "feedback-toast " + (isError ? "error" : "success");
    toast.classList.remove("hidden");

    _toastTimer = setTimeout(() => {
      hideToast();
    }, 3500);
  }

  function hideToast() {
    if (typeof document === "undefined" || !document.getElementById) return;
    const toast = document.getElementById("fb-toast");
    if (!toast) return;
    toast.classList.add("hidden");
  }

  function copyReport() {
    const text = buildReportText();
    const reportResult = (copied) => {
      if (copied) {
        const msg = typeof t === "function" ? t("feedback.toast.copied", "Rapor panoya kopyalandi! Tesekkurler.") : "Rapor panoya kopyalandi! Tesekkurler.";
        showToast(msg, false);
        if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
      } else {
        const errMsg = typeof t === "function" ? t("feedback.toast.copyFailed", "Panoya kopyalanamadi, lutfen dosyayi indirin.") : "Panoya kopyalanamadi.";
        showToast(errMsg, true);
      }
      return copied;
    };

    const legacyCopy = () => {
      if (typeof document === "undefined" || !document.createElement) return false;
      const previousFocus = document.activeElement;
      let textarea;
      try {
        textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
        document.body.append(textarea);
        textarea.select();
        return !!document.execCommand && document.execCommand("copy");
      } catch (error) {
        return false;
      } finally {
        textarea?.remove();
        previousFocus?.focus({ preventScroll: true });
      }
    };

    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        return navigator.clipboard.writeText(text).then(
          () => reportResult(true),
          () => reportResult(legacyCopy())
        );
      } catch (error) {
        return reportResult(legacyCopy());
      }
    }

    return reportResult(legacyCopy());
  }

  function captureGameScreenshot() {
    try {
      const canvas = (_gameInstance && _gameInstance.canvas) || (typeof document !== "undefined" ? document.getElementById("game") : null);
      if (!canvas || !canvas.toDataURL) return false;
      const dataUrl = canvas.toDataURL("image/png");
      setAttachedImage(dataUrl, "oyun-ekran-goruntusu.png", "PNG");
      const msg = typeof t === "function" ? t("feedback.toast.screenshotCaptured", "Ekran görüntüsü alındı.") : "Ekran görüntüsü alındı.";
      showToast(msg, false);
      if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
      return true;
    } catch (_) {
      return false;
    }
  }

  function handleFileUpload(file) {
    if (!file) return;

    // 1. Boyut kontrolü (Maks 3 MB)
    if (file.size > MAX_IMAGE_BYTES) {
      const msg = typeof t === "function" ? t("feedback.toast.fileTooLarge", "Dosya boyutu 3 MB sınırını aşıyor!") : "Dosya boyutu 3 MB sınırını aşıyor!";
      showToast(msg, true);
      return;
    }

    // 2. Uzantı ve MIME kontrolü (Yalnızca PNG, JPG, WebP — SVG ve çalıştırılabilirler KESİNLİKLE yasak)
    const nameLower = (file.name || "").toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
    const hasValidMime = ALLOWED_MIME_TYPES.indexOf(file.type) !== -1;

    if (!hasValidExt || !hasValidMime) {
      const msg = typeof t === "function" ? t("feedback.toast.invalidFile", "Yalnızca PNG, JPG veya WebP resimleri kabul edilir!") : "Yalnızca PNG, JPG veya WebP resimleri kabul edilir!";
      showToast(msg, true);
      return;
    }

    // 3. Canvas ile yeniden kodlama ve sanitizasyon (Anti-Exploit / Zero Malicious Payload)
    if (typeof FileReader === "undefined") return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof Image === "undefined") return;
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1280;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const offscreen = document.createElement("canvas");
          offscreen.width = w;
          offscreen.height = h;
          const ctx = offscreen.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          // Tamamen temizlenmiş, ham piksellerden sıfırdan üretilmiş saf PNG
          const cleanDataUrl = offscreen.toDataURL("image/png");
          const cleanKb = Math.round((cleanDataUrl.length * 0.75) / 1024);
          setAttachedImage(cleanDataUrl, file.name.replace(/[^\w.-]/g, "_"), `${cleanKb} KB`);

          const okMsg = typeof t === "function" ? t("feedback.toast.imageAttached", "Görsel temizlendi ve eklendi.") : "Görsel temizlendi ve eklendi.";
          showToast(okMsg, false);
          if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
        } catch (_) {
          const errMsg = typeof t === "function" ? t("feedback.toast.imageProcessError", "Görsel işlenemedi.") : "Görsel işlenemedi.";
          showToast(errMsg, true);
        }
      };
      img.onerror = () => {
        const errMsg = typeof t === "function" ? t("feedback.toast.invalidFile", "Geçersiz resim dosyası!") : "Geçersiz resim dosyası!";
        showToast(errMsg, true);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function setAttachedImage(dataUrl, name, meta) {
    _attachedImage = { dataUrl, name, meta };
    if (typeof document === "undefined") return;
    const wrap = document.getElementById("fb-preview-wrap");
    const img = document.getElementById("fb-preview-img");
    const metaEl = document.getElementById("fb-preview-meta");
    if (wrap) wrap.classList.remove("hidden");
    if (img) img.src = dataUrl;
    if (metaEl) metaEl.textContent = `${name} (${meta})`;
  }

  function removeAttachedImage() {
    _attachedImage = null;
    if (typeof document === "undefined") return;
    const wrap = document.getElementById("fb-preview-wrap");
    const img = document.getElementById("fb-preview-img");
    const metaEl = document.getElementById("fb-preview-meta");
    const fileInput = document.getElementById("fb-file-input");
    if (wrap) wrap.classList.add("hidden");
    if (img) img.src = "";
    if (metaEl) metaEl.textContent = "";
    if (fileInput) fileInput.value = "";
    if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
  }

  function downloadAttachment() {
    if (!_attachedImage || !_attachedImage.dataUrl) return false;
    try {
      const a = document.createElement("a");
      const d = new Date();
      const dateTag = d.toISOString().slice(0, 10) + "_" + d.getHours() + d.getMinutes();
      a.href = _attachedImage.dataUrl;
      a.download = `garanti-disi-ekran-goruntusu-${dateTag}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      const msg = typeof t === "function" ? t("feedback.toast.imageDownloaded", "Görsel indirildi.") : "Görsel indirildi.";
      showToast(msg, false);
      if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
      return true;
    } catch (_) {
      return false;
    }
  }

  function downloadReport() {
    if (_attachedImage && _attachedImage.dataUrl) {
      return downloadAttachment();
    }
    const text = buildReportText();
    const data = getFormData();
    try {
      if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
        return false;
      }
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const dateTag = d.toISOString().slice(0, 10) + "_" + d.getHours() + d.getMinutes();
      a.href = url;
      a.download = `garanti-disi-feedback-${data.category}-${dateTag}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const msg = typeof t === "function" ? t("feedback.toast.downloaded", "Rapor dosyasi indirildi.") : "Rapor dosyasi indirildi.";
      showToast(msg, false);
      if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
      return true;
    } catch (_) {
      const errMsg = typeof t === "function" ? t("feedback.toast.downloadFailed", "Dosya indirilemedi.") : "Dosya indirilemedi.";
      showToast(errMsg, true);
      return false;
    }
  }

  function init(game) {
    _gameInstance = game || null;
    if (typeof document === "undefined") return;

    // HUD ve buton baglantilari
    const feedbackBtn = document.getElementById("feedback-btn");
    if (feedbackBtn) {
      feedbackBtn.addEventListener("click", () => {
        if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
        toggle();
      });
    }

    const closeBtn = document.getElementById("fb-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
        close();
      });
    }

    // Native dialog Esc davranisini saglar; eski tarayicilarda backdrop tikini destekle.
    const modal = document.getElementById("feedback-modal");
    if (modal) {
      modal.addEventListener("close", hideToast);
      if (typeof HTMLDialogElement === "undefined" || !("closedBy" in HTMLDialogElement.prototype)) {
        const card = modal.querySelector(".feedback-card");
        let pressedOutside = false;
        const outsideCard = (event) => {
          if (!card) return false;
          const rect = card.getBoundingClientRect();
          return event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom;
        };
        modal.addEventListener("pointerdown", (event) => {
          pressedOutside = outsideCard(event);
        });
        modal.addEventListener("pointerup", (event) => {
          if (pressedOutside && outsideCard(event) && modal.open) modal.close();
          pressedOutside = false;
        });
        modal.addEventListener("pointercancel", () => { pressedOutside = false; });
      }
    }

    // Kategori butonlari
    const catBtns = document.querySelectorAll(".feedback-cat-btn");
    catBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const cat = btn.getAttribute("data-cat");
        setCategory(cat);
        if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
      });
    });

    // Yildiz butonlari
    const starBtns = document.querySelectorAll(".feedback-star-btn");
    starBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = parseInt(btn.getAttribute("data-val") || "5", 10);
        setRating(val);
        if (typeof SFX !== "undefined" && SFX.uiClick) SFX.uiClick();
      });
    });

    // Karakter sayaci
    const textarea = document.getElementById("fb-message");
    const countEl = document.getElementById("fb-char-count");
    if (textarea && countEl) {
      textarea.addEventListener("input", () => {
        countEl.textContent = `${textarea.value.length} / 1000`;
      });
    }

    // Ekran goruntusu alma butonu
    const captureBtn = document.getElementById("fb-capture-btn");
    if (captureBtn) {
      captureBtn.addEventListener("click", () => captureGameScreenshot());
    }

    // Gorsel yukleme butonu ve dosya secici
    const uploadBtn = document.getElementById("fb-upload-btn");
    const fileInput = document.getElementById("fb-file-input");
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFileUpload(e.target.files[0]);
        }
      });
    }

    // Gorseli kaldir butonu
    const removeImgBtn = document.getElementById("fb-remove-img-btn");
    if (removeImgBtn) {
      removeImgBtn.addEventListener("click", () => removeAttachedImage());
    }

    // Aksiyonlar
    const copyBtn = document.getElementById("fb-copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => copyReport());
    }

    const downloadBtn = document.getElementById("fb-download-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => downloadReport());
    }

    // Varsayilan durum
    setCategory("idea");
    setRating(5);
  }

  return {
    init,
    open,
    close,
    toggle,
    isOpen,
    setCategory,
    setRating,
    getFormData,
    buildReportText,
    copyReport,
    downloadReport,
    downloadAttachment,
    captureGameScreenshot,
    handleFileUpload,
    removeAttachedImage,
  };
})();
