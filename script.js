/* ============================================================
   Carneiros Temporada — script.js
   JavaScript Puro (Vanilla JS):
   - Hero Carrossel (auto-avanço, dots, swipe e fallback de imagens locais)
   - Modal Lightbox com Miniaturas, Zoom por Duplo Toque e Swipe
   - Botão "Voltar" do Android fecha o Modal sem sair da página
   - Scroll-Spy sincronizando barra fixa e cartões de seleção
   - Compatibilidade iOS Safari / WhatsApp WebView (webkit-playsinline)
   ============================================================ */
(function () {
  "use strict";

  /* ── 1. CONFIGURAÇÃO DO WHATSAPP ── */
  var WHATSAPP_NUMBER = window.WHATSAPP_NUMBER || "5581999999999";

  function buildWhatsAppLinks() {
    var links = document.querySelectorAll(".wa-link");
    links.forEach(function (link) {
      var msg =
        link.getAttribute("data-msg") ||
        "Olá! Vim pelo catálogo visual e gostaria de consultar disponibilidade.";
      link.href =
        "https://wa.me/" +
        WHATSAPP_NUMBER +
        "?text=" +
        encodeURIComponent(msg);
      link.target = "_blank";
      link.rel = "noopener";
    });
  }

  /* ── 1b. PERFORMANCE GLOBAL: decoding assíncrono + lazy em todas as <img> ── */
  function optimizeImages() {
    document.querySelectorAll("img").forEach(function (img) {
      img.setAttribute("decoding", "async");
      if (!img.hasAttribute("loading")) {
        img.setAttribute("loading", "lazy");
      }
    });
  }

  /* ── 2. FALLBACK AUTOMÁTICO DE IMAGENS ── */
  function initImageFallbacks(root) {
    var images = (root || document).querySelectorAll("img[data-fallback]");
    images.forEach(function (img) {
      if (img.dataset.fallbackBound) return;
      img.dataset.fallbackBound = "1";

      var fallbackApplied = false;
      var applyFallback = function () {
        var fb = img.getAttribute("data-fallback");
        if (fb && !fallbackApplied && img.getAttribute("src") !== fb) {
          fallbackApplied = true;
          img.src = fb;
        }
      };

      img.addEventListener("error", applyFallback);
      if (img.complete && img.naturalWidth === 0) {
        applyFallback();
      }
    });
  }

  /* ── 3. HERO CARROSSEL DE ALTO IMPACTO ── */
  function initHeroCarousel() {
    var carousel = document.getElementById("heroCarousel");
    if (!carousel) return;

    var slides = Array.prototype.slice.call(
      carousel.querySelectorAll(".hero-slide")
    );
    var dots = Array.prototype.slice.call(
      carousel.querySelectorAll(".hero-dot")
    );
    var current = 0;
    var timer = null;

    // Respeita "reduzir movimento" do sistema (acessibilidade + economia de bateria)
    var reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function goTo(index) {
      var next = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === next);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === next);
      });
      current = next;
    }

    function startAuto() {
      stopAuto();
      timer = setInterval(function () {
        if (!document.hidden) {
          goTo(current + 1);
        }
      }, 5500);
    }

    function stopAuto() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        goTo(parseInt(dot.getAttribute("data-slide"), 10) || 0);
        startAuto();
      });
    });

    // Gesto de deslizar no celular
    var touchStartX = 0;
    carousel.addEventListener(
      "touchstart",
      function (e) {
        touchStartX = e.touches[0].clientX;
      },
      { passive: true }
    );
    carousel.addEventListener(
      "touchend",
      function (e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 45) {
          goTo(dx < 0 ? current + 1 : current - 1);
          startAuto();
        }
      },
      { passive: true }
    );

    // Pausa quando a aba fica oculta (economia de bateria no celular)
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopAuto();
      } else if (!reduceMotion) {
        startAuto();
      }
    });

    // Pausa o carrossel quando ele sai da tela (economia de CPU/rede no celular)
    if ("IntersectionObserver" in window) {
      var carouselObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              if (!reduceMotion) startAuto();
            } else {
              stopAuto();
            }
          });
        },
        { threshold: 0.15 }
      );
      carouselObserver.observe(carousel);
    }

    if (!reduceMotion) {
      startAuto();
    }
  }

  /* ── 4. LIGHTBOX / MODAL TELA CHEIA ── */
  var lightbox = document.getElementById("lightbox");
  var stage = document.getElementById("lbStage");
  var captionEl = document.getElementById("lbCaption");
  var countEl = document.getElementById("lbCount");
  var propEl = document.getElementById("lbProp");
  var thumbsEl = document.getElementById("lbThumbs");
  var btnClose = document.getElementById("lbClose");
  var btnPrev = document.getElementById("lbPrev");
  var btnNext = document.getElementById("lbNext");
  var btnZoom = document.getElementById("lbZoom");
  var lbCta = document.getElementById("lbCta");
  var lbCtaText = document.getElementById("lbCtaText");

  var currentItems = [];
  var currentIndex = 0;
  var lastFocusedEl = null;
  var historyPushed = false;

  function clearStageMedia() {
    stage.classList.remove("zoomed");
    var activeVideo = stage.querySelector("video");
    if (activeVideo) {
      try {
        activeVideo.pause();
      } catch (e) {}
      activeVideo.removeAttribute("src");
      activeVideo.load();
    }
    stage.innerHTML = "";
  }

  function renderThumbnails() {
    thumbsEl.innerHTML = "";
    currentItems.forEach(function (item, idx) {
      var thumbBtn = document.createElement("button");
      thumbBtn.type = "button";
      thumbBtn.className = "lb-thumb" + (idx === currentIndex ? " active" : "");
      thumbBtn.setAttribute("aria-label", "Ver mídia " + (idx + 1));

      var thumbImg = document.createElement("img");
      thumbImg.src = item.thumbSrc;
      thumbImg.alt = "";
      var fallbackApplied = false;
      thumbImg.addEventListener("error", function () {
        if (
          item.thumbFallback &&
          !fallbackApplied &&
          thumbImg.getAttribute("src") !== item.thumbFallback
        ) {
          fallbackApplied = true;
          thumbImg.src = item.thumbFallback;
        }
      });
      thumbBtn.appendChild(thumbImg);

      if (item.type === "video" || item.type === "youtube") {
        var vTag = document.createElement("span");
        vTag.className = "lb-thumb-video-tag";
        vTag.innerHTML =
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        thumbBtn.appendChild(vTag);
      }

      thumbBtn.addEventListener("click", function () {
        currentIndex = idx;
        renderLightboxSlide();
      });

      thumbsEl.appendChild(thumbBtn);
    });
  }

  function updateActiveThumb() {
    var allThumbs = thumbsEl.querySelectorAll(".lb-thumb");
    allThumbs.forEach(function (thumb, i) {
      var isCurrent = i === currentIndex;
      thumb.classList.toggle("active", isCurrent);
      if (isCurrent && typeof thumb.scrollIntoView === "function") {
        thumb.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    });
  }

  function renderLightboxSlide() {
    clearStageMedia();
    var item = currentItems[currentIndex];
    if (!item) return;

    var loader = document.createElement("div");
    loader.className = "lb-loader";
    loader.textContent = "Carregando mídia em alta resolução…";
    stage.appendChild(loader);

    if (item.type === "youtube") {
      if (btnZoom) btnZoom.style.display = "none";

      var iframe = document.createElement("iframe");
      iframe.title = item.caption || "Player de vídeo do YouTube";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.addEventListener("load", function () {
        if (loader.parentNode) loader.remove();
      });

      iframe.src = item.full;
      stage.appendChild(iframe);
    } else if (item.type === "video") {
      if (btnZoom) btnZoom.style.display = "none";

      var video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.preload = "auto";
      // Poster leve evita "tela preta" enquanto o vídeo carrega
      if (item.thumbSrc) video.poster = item.thumbSrc;
      else if (item.thumbFallback) video.poster = item.thumbFallback;

      var usedFallback = false;
      var tryVideoFallback = function () {
        if (!usedFallback && item.videoFallback) {
          usedFallback = true;
          video.src = item.videoFallback;
          video.load();
          video.play().catch(function () {});
        }
      };

      video.addEventListener("error", tryVideoFallback);
      video.addEventListener("loadeddata", function () {
        if (loader.parentNode) loader.remove();
      });
      video.addEventListener("canplay", function () {
        if (loader.parentNode) loader.remove();
      });

      video.src = item.full;
      stage.appendChild(video);

      setTimeout(function () {
        if (video.readyState === 0 && item.videoFallback && !usedFallback) {
          tryVideoFallback();
        }
      }, 1350);
    } else {
      if (btnZoom) btnZoom.style.display = "grid";

      var fullImg = new Image();
      fullImg.alt = item.caption || "Foto ampliada";
      fullImg.setAttribute("decoding", "async");
      var fallbackApplied = false;

      fullImg.addEventListener("load", function () {
        if (loader.parentNode) loader.remove();
        stage.appendChild(fullImg);
      });

      fullImg.addEventListener("error", function () {
        if (item.fullFallback && !fallbackApplied) {
          fallbackApplied = true;
          fullImg.src = item.fullFallback;
        } else {
          loader.textContent = "Não foi possível carregar esta imagem.";
        }
      });

      // Toque duplo no celular ou duplo clique para dar zoom
      var lastTapTime = 0;
      fullImg.addEventListener("touchend", function (e) {
        var now = Date.now();
        if (now - lastTapTime < 280) {
          e.preventDefault();
          stage.classList.toggle("zoomed");
        }
        lastTapTime = now;
      });

      fullImg.addEventListener("dblclick", function () {
        stage.classList.toggle("zoomed");
      });

      fullImg.src = item.full;
      if (fullImg.complete && fullImg.naturalWidth === 0 && item.fullFallback) {
        fallbackApplied = true;
        fullImg.src = item.fullFallback;
      }
    }

    countEl.textContent = currentIndex + 1 + " / " + currentItems.length;
    captionEl.textContent = item.caption || "";
    updateActiveThumb();
  }

  function extractGalleryItems(galleryEl) {
    var buttons = Array.prototype.slice.call(
      galleryEl.querySelectorAll(".media-item")
    );
    return buttons.map(function (btn) {
      var imgEl = btn.querySelector("img");
      var mediaType = btn.getAttribute("data-type");
      return {
        type:
          mediaType === "youtube"
            ? "youtube"
            : mediaType === "video"
              ? "video"
              : "image",
        full: btn.getAttribute("data-full"),
        fullFallback:
          btn.getAttribute("data-full-fallback") ||
          (imgEl ? imgEl.getAttribute("data-fallback") : ""),
        videoFallback: btn.getAttribute("data-video-fallback") || "",
        thumbSrc: imgEl ? imgEl.getAttribute("src") : "",
        thumbFallback: imgEl ? imgEl.getAttribute("data-fallback") : "",
        caption: btn.getAttribute("data-caption") || ""
      };
    });
  }

  function openLightbox(items, startIndex, propertyName) {
    currentItems = items;
    currentIndex = startIndex || 0;
    lastFocusedEl = document.activeElement;

    propEl.textContent = propertyName || "Acomodação";

    if (lbCta) {
      var customMsg =
        "Olá! Tenho interesse em *" +
        (propertyName || "uma acomodação") +
        "*. Pode me passar a disponibilidade e os valores para as minhas datas?";
      lbCta.setAttribute("data-msg", customMsg);
      lbCta.href =
        "https://wa.me/" +
        WHATSAPP_NUMBER +
        "?text=" +
        encodeURIComponent(customMsg);
    }

    if (lbCtaText) {
      lbCtaText.textContent =
        "Tenho interesse em " +
        (propertyName || "esta opção") +
        " — Falar no WhatsApp";
    }

    renderThumbnails();
    renderLightboxSlide();

    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    // Esconde a barra fixa de escolha enquanto a foto/vídeo estiver em tela cheia
    document.body.classList.add("lb-open");

    if (window.history && window.history.pushState && !historyPushed) {
      window.history.pushState({ lightboxOpen: true }, "");
      historyPushed = true;
    }
  }

  function closeLightbox(fromPopState) {
    if (!lightbox.classList.contains("open")) return;

    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.body.classList.remove("lb-open");
    clearStageMedia();

    if (historyPushed && !fromPopState && window.history.back) {
      historyPushed = false;
      window.history.back();
    } else {
      historyPushed = false;
    }

    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus({ preventScroll: true });
    }
  }

  function stepSlide(delta) {
    if (!currentItems.length) return;
    currentIndex =
      (currentIndex + delta + currentItems.length) % currentItems.length;
    renderLightboxSlide();
  }

  function bindGalleryEvents() {
    var galleries = document.querySelectorAll(".media-gallery");
    galleries.forEach(function (galleryEl) {
      var propName = galleryEl.getAttribute("data-gallery") || "Acomodação";
      var buttons = Array.prototype.slice.call(
        galleryEl.querySelectorAll(".media-item")
      );

      buttons.forEach(function (btn, index) {
        btn.addEventListener("click", function () {
          var items = extractGalleryItems(galleryEl);
          openLightbox(items, index, propName);
        });
      });
    });

    var openAllBtns = document.querySelectorAll("[data-open-gallery]");
    openAllBtns.forEach(function (openBtn) {
      openBtn.addEventListener("click", function () {
        var targetName = openBtn.getAttribute("data-open-gallery");
        var galleryEl = document.querySelector(
          '.media-gallery[data-gallery="' + targetName + '"]'
        );
        if (galleryEl) {
          var items = extractGalleryItems(galleryEl);
          openLightbox(items, 0, targetName);
        }
      });
    });

    btnClose.addEventListener("click", function () {
      closeLightbox(false);
    });
    btnPrev.addEventListener("click", function () {
      stepSlide(-1);
    });
    btnNext.addEventListener("click", function () {
      stepSlide(1);
    });

    if (btnZoom) {
      btnZoom.addEventListener("click", function () {
        stage.classList.toggle("zoomed");
      });
    }

    var backdrop = lightbox.querySelector("[data-lb-close]");
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        closeLightbox(false);
      });
    }

    // Botão "Voltar" do Android fecha o Lightbox sem sair da página
    window.addEventListener("popstate", function () {
      if (lightbox.classList.contains("open")) {
        closeLightbox(true);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox(false);
      else if (e.key === "ArrowLeft") stepSlide(-1);
      else if (e.key === "ArrowRight") stepSlide(1);
    });

    // Gestos: Swipe Lateral (trocar mídia) e Swipe Down (fechar)
    var touchStartX = 0;
    var touchStartY = 0;
    var isSwiping = false;

    stage.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length !== 1 || stage.classList.contains("zoomed")) return;
        isSwiping = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    stage.addEventListener(
      "touchend",
      function (e) {
        if (!isSwiping) return;
        isSwiping = false;

        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          stepSlide(dx < 0 ? 1 : -1);
          return;
        }

        if (dy > 85 && Math.abs(dy) > Math.abs(dx) * 1.4) {
          closeLightbox(false);
        }
      },
      { passive: true }
    );
  }

  /* ── 5. NAVEGAÇÃO: BARRA FIXA + CARTÕES + SCROLL-SPY ── */
  function initScrollAndNavigation() {
    var topbar = document.getElementById("topbar");
    var quickNavBar = document.getElementById("quickNavBar");
    var quickChips = document.querySelectorAll(".quick-chip");
    var sections = document.querySelectorAll("article[data-section]");
    var revealEls = document.querySelectorAll(".reveal");

    window.addEventListener(
      "scroll",
      function () {
        if (topbar) {
          topbar.classList.toggle("scrolled", window.scrollY > 12);
        }
        // Efeito "grudado" na barra de escolha ao passar do hero
        if (quickNavBar) {
          quickNavBar.classList.toggle(
            "stuck",
            window.scrollY > quickNavBar.offsetTop - 68
          );
        }
      },
      { passive: true }
    );

    function setActiveProperty(sectionId) {
      quickChips.forEach(function (chip) {
        chip.classList.toggle(
          "active",
          chip.getAttribute("data-target") === sectionId
        );
      });
    }

    quickChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        setActiveProperty(chip.getAttribute("data-target"));
      });
    });

    if ("IntersectionObserver" in window) {
      var sectionObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              setActiveProperty(entry.target.getAttribute("data-section"));
            }
          });
        },
        { rootMargin: "-25% 0px -55% 0px", threshold: 0.05 }
      );

      sections.forEach(function (sec) {
        sectionObserver.observe(sec);
      });

      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08 }
      );

      revealEls.forEach(function (el) {
        revealObserver.observe(el);
      });
    } else {
      revealEls.forEach(function (el) {
        el.classList.add("visible");
      });
    }

    var yearEl = document.getElementById("year");
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  /* ── 6. COMPARTILHAR CATÁLOGO (Web Share API + fallback copiar link) ── */
  function initShareButton() {
    var btn = document.getElementById("btnShare");
    var label = document.getElementById("btnShareText");
    if (!btn) return;

    var showStatus = function (message) {
      if (!label) return;
      label.textContent = message;
      setTimeout(function () {
        label.textContent = "Compartilhar catálogo";
      }, 2200);
    };

    var copyLink = function () {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        showStatus("Copie o link do navegador");
        return;
      }

      try {
        navigator.clipboard
          .writeText(window.location.href)
          .then(function () {
            showStatus("Link copiado!");
          })
          .catch(function () {
            showStatus("Não foi possível copiar");
          });
      } catch (error) {
        showStatus("Não foi possível copiar");
      }
    };

    btn.addEventListener("click", function () {
      var shareData = {
        title: document.title,
        text:
          "Privê Lopes Temporada — hospedagens em Carneiros & Porto de Galinhas. Veja o catálogo:",
        url: window.location.href
      };

      if (navigator.share) {
        try {
          navigator.share(shareData).catch(function (error) {
            if (!error || error.name !== "AbortError") {
              copyLink();
            }
          });
        } catch (error) {
          copyLink();
        }
        return;
      }

      copyLink();
    });
  }

  /* ── Inicialização ── */
  document.addEventListener("DOMContentLoaded", function () {
    optimizeImages();
    buildWhatsAppLinks();
    initImageFallbacks(document);
    initHeroCarousel();
    bindGalleryEvents();
    initScrollAndNavigation();
    initShareButton();
  });
})();
