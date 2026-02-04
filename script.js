// =====================
// LOADER (your original)
// =====================

const loader = document.getElementById("loader");
const app = document.getElementById("app"); // (ако нямаш #app в HTML, това е OK, ползваме optional chaining)
const barFill = document.getElementById("barFill");

const config = {
  minDurationMs: 2200,
  maxDurationMs: 3400,
  tickMs: 120,
};

let progress = 0;

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const totalDuration = rand(config.minDurationMs, config.maxDurationMs);
const steps = Math.ceil(totalDuration / config.tickMs);

function stepAmount(p) {
  if (p < 35) return rand(6, 11);
  if (p < 70) return rand(3, 7);
  if (p < 90) return rand(1, 3);
  return 0;
}

let currentStep = 0;

const interval = setInterval(() => {
  currentStep++;
  const cap = 92;

  progress = Math.min(cap, progress + stepAmount(progress));
  if (barFill) barFill.style.width = progress + "%";

  if (currentStep >= steps) {
    clearInterval(interval);

    if (barFill) barFill.style.width = "100%";

    setTimeout(() => {
      loader?.classList.add("loader--done");
      app?.classList.remove("app--hidden");
      document.body.classList.add("is-ready"); // ✅ за твоите entrance анимации
    }, 420);
  }
}, config.tickMs);




// =====================
// TOPBAR: milky bg on scroll
// =====================
const topbar = document.querySelector(".topbar");
const SCROLL_TRIGGER = 24;

function updateNavOnScroll() {
  if (!topbar) return;
  topbar.classList.toggle("is-scrolled", window.scrollY > SCROLL_TRIGGER);
}
window.addEventListener("scroll", updateNavOnScroll, { passive: true });
updateNavOnScroll();

// =====================
// MOBILE MENU + letters + swipe
// =====================
const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");
const mobileClose = document.getElementById("mobileMenuClose");

function openMenu() {
  if (!mobileMenu || !burger) return;
  mobileMenu.classList.add("is-open");
  burger.classList.add("is-open");
  mobileMenu.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  animateMobileLinksIn();
}

function closeMenu() {
  if (!mobileMenu || !burger) return;
  mobileMenu.classList.remove("is-open");
  burger.classList.remove("is-open");
  mobileMenu.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function toggleMenu() {
  if (!mobileMenu) return;
  const isOpen = mobileMenu.classList.contains("is-open");
  isOpen ? closeMenu() : openMenu();
}

if (burger && mobileMenu) burger.addEventListener("click", toggleMenu);
if (mobileClose) mobileClose.addEventListener("click", closeMenu);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mobileMenu?.classList.contains("is-open")) closeMenu();
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => closeMenu());
});

let lettersWrapped = false;

function wrapLinkLetters() {
  if (lettersWrapped || !mobileMenu) return;

  const links = mobileMenu.querySelectorAll(".mobileMenu__nav a");
  links.forEach((a) => {
    const text = a.textContent.trim();
    a.setAttribute("aria-label", text);

    const wrapper = document.createElement("span");
    wrapper.className = "letters";
    wrapper.setAttribute("aria-hidden", "true");

    [...text].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "letter";
      s.textContent = ch === " " ? "\u00A0" : ch;
      wrapper.appendChild(s);
    });

    a.textContent = "";
    a.appendChild(wrapper);
  });

  lettersWrapped = true;
}

function animateMobileLinksIn() {
  wrapLinkLetters();
  const letters = mobileMenu?.querySelectorAll(".letter") || [];
  letters.forEach((el) => el.classList.remove("in"));
  letters.forEach((el, i) => {
    el.style.transitionDelay = `${i * 12}ms`;
    requestAnimationFrame(() => el.classList.add("in"));
  });
}

let touchStartY = 0;
let touchStartX = 0;
let isSwiping = false;

mobileMenu?.addEventListener(
  "touchstart",
  (e) => {
    if (!mobileMenu.classList.contains("is-open")) return;
    const t = e.touches[0];
    touchStartY = t.clientY;
    touchStartX = t.clientX;
    isSwiping = true;
  },
  { passive: true }
);

mobileMenu?.addEventListener(
  "touchmove",
  (e) => {
    if (!isSwiping) return;
    const t = e.touches[0];
    const dy = t.clientY - touchStartY;
    const dx = t.clientX - touchStartX;

    if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      isSwiping = false;
      closeMenu();
    }
  },
  { passive: true }
);

mobileMenu?.addEventListener(
  "touchend",
  () => {
    isSwiping = false;
  },
  { passive: true }
);

// =====================
// SCROLL SPY (active link) ✅ FIXED (top-offset based)
// =====================
function setActiveLinkById(id) {
  const allLinks = document.querySelectorAll(".navPill__link, .mobileMenu__nav a");
  allLinks.forEach((a) => a.classList.remove("is-active"));

  const targets = document.querySelectorAll(
    `.navPill__link[href="#${CSS.escape(id)}"], .mobileMenu__nav a[href="#${CSS.escape(id)}"]`
  );
  targets.forEach((a) => a.classList.add("is-active"));
}

(function initScrollSpy() {
  // Ако browser няма CSS.escape (рядко), правим fallback
  if (!window.CSS) window.CSS = {};
  if (!CSS.escape) CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");

  // Колко пиксела под topbar-а искаш да “мериш”
  const TOP_OFFSET = 120; // ✅ може да го пипнеш: 96 / 110 / 120

  const candidates = Array.from(document.querySelectorAll("section[id], main[id], header[id]"));

  // Взимаме само тези, които имат и съответен линк в менюто
  const sections = candidates.filter((el) => {
    if (!el.id) return false;
    return !!document.querySelector(`a[href="#${CSS.escape(el.id)}"]`);
  });

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const inView = entries.filter((e) => e.isIntersecting);
      if (!inView.length) return;

      // ✅ Избираме секцията, чийто top е най-близо до TOP_OFFSET
      const best = inView
        .map((e) => ({
          id: e.target.id,
          dist: Math.abs(e.boundingClientRect.top - TOP_OFFSET),
        }))
        .sort((a, b) => a.dist - b.dist)[0];

      if (best?.id) setActiveLinkById(best.id);
    },
    {
      threshold: [0.01, 0.1, 0.2, 0.35],
      rootMargin: `-${TOP_OFFSET}px 0px -55% 0px`,
    }
  );

  sections.forEach((sec) => observer.observe(sec));

  // Ако има hash при load
  const hash = (location.hash || "").replace("#", "");
  if (hash && document.getElementById(hash)) setActiveLinkById(hash);
})();



// =====================
// HERO crossfade (2 photos)
// =====================
const heroImages = ["img/kushta-za-gosti-ema-nachalo.webp", "img/kushta-za-gosti-ema-nachalo1.webp"];

(function initHeroSlider() {
  const layerA = document.querySelector(".hero__bgLayer.is-a");
  const layerB = document.querySelector(".hero__bgLayer.is-b");
  if (!layerA || !layerB) return;

  layerA.style.backgroundImage = `url("${heroImages[0]}")`;
  layerB.style.backgroundImage = `url("${heroImages[1]}")`;

  let activeIsA = true;
  layerA.classList.add("is-active");

  const INTERVAL = 7500;

  setInterval(() => {
    activeIsA = !activeIsA;
    if (activeIsA) {
      layerA.classList.add("is-active");
      layerB.classList.remove("is-active");
    } else {
      layerB.classList.add("is-active");
      layerA.classList.remove("is-active");
    }
  }, INTERVAL);
})();

// =====================
// ABOUT (first about section) reveal
// =====================
(function initAboutReveal() {
  const about = document.querySelector(".about");
  if (!about) return;

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) about.classList.add("is-visible");
    },
    { threshold: 0.25 }
  );

  obs.observe(about);
})();

// =====================
// ABOUT DETAILS reveal (ONLY ONCE) + REPLAY FILM EVERY 10s
// =====================
(function initAboutDetailsRevealAndReplay() {
  const section = document.querySelector(".aboutDetails");
  const film = document.querySelector(".aboutDetails .film");
  if (!section || !film) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  if (reduceMotion) {
    section.classList.add("is-visible");
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      if (entries[0].isIntersecting) {
        section.classList.add("is-visible");
        obs.disconnect();
      }
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
  );
  revealObserver.observe(section);

  const PERIOD_MS = 10000;
  let timer = null;

  const replay = () => {
    if (!section.classList.contains("is-visible")) return;

    film.classList.add("is-cycle");
    void film.offsetHeight; // force reflow
    film.classList.remove("is-cycle");
  };

  const start = () => {
    if (timer) return;
    timer = setInterval(replay, PERIOD_MS);
  };

  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  const inViewObs = new IntersectionObserver(
    (entries) => {
      const inView = entries[0]?.isIntersecting;
      if (inView) start();
      else stop();
    },
    { threshold: 0.25 }
  );
  inViewObs.observe(section);

  const classObs = new MutationObserver(() => {
    if (section.classList.contains("is-visible")) {
      replay();
      start();
      classObs.disconnect();
    }
  });
  classObs.observe(section, { attributes: true, attributeFilter: ["class"] });

  if (section.classList.contains("is-visible")) {
    replay();
    start();
  }
})();


// =====================
// ROOMS TABS (5 стаи)
// =====================
(function initRoomsTabs(){
  const tablist = document.querySelector(".roomsTabs .tabsPill");
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

  function activateTab(tab){
    tabs.forEach((t) => {
      const isOn = t === tab;

      t.classList.toggle("is-active", isOn);
      t.setAttribute("aria-selected", isOn ? "true" : "false");
      t.tabIndex = isOn ? 0 : -1;

      const panelId = t.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;

      if (panel){
        panel.hidden = !isOn;
        panel.classList.toggle("is-active", isOn);
      }
    });
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab)));

  tablist.addEventListener("keydown", (e) => {
    const currentIndex = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;

    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") nextIndex = 0;
    if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== currentIndex){
      e.preventDefault();
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    }
  });

  const active = tabs.find(t => t.classList.contains("is-active")) || tabs[0];
  activateTab(active);
})();


// =====================
// PHOTO MODAL (popup) + slider
// =====================
(function initRoomPhotoModal(){
  const modal = document.getElementById("photoModal");
  if (!modal) return;

  const titleEl = modal.querySelector("#photoModalTitle");
  const imgEl = modal.querySelector(".photoModal__img");
  const dotsEl = modal.querySelector(".photoModal__dots");
  const prevBtn = modal.querySelector(".photoModal__nav--prev");
  const nextBtn = modal.querySelector(".photoModal__nav--next");

  const ROOM_PHOTOS = {
    double1: ["img/staia-1.webp","img/staia-1-1.webp","img/staia-1-2.webp"],
    double2: ["img/dvoina-staia-n2.1.webp","img/dvoina-staia-n2.2.webp","img/dvoina-staia-n2.webp"],
    double3: ["img/dvoina-staia-n3.webp","img/dvoina-staia-n3.1.webp","img/dvoina-staia-n3.2.webp"],
    triple: ["img/troina-staia.webp","img/troina-staia1.webp","img/troina-staia-wc.webp"],
    quad:   ["img/chetvorna-staia.webp","img/chetvorna-staia1.webp","img/chetvorna-staia2.webp"],
    studio: ["img/junior-suit.webp","img/junior-suit1.webp","img/junior-suit2.webp"],
  };

  const ROOM_TITLES = {
    double1: "Двойна стая 1",
    double2: "Двойна стая 2",
    double3: "Двойна стая 3",
    triple: "Тройна стая",
    quad: "Четворна стая (спалня + 2 единични легла)",
    studio: "Студио (спалня + диван)",
  };

  let currentRoomKey = null;
  let currentIndex = 0;
  let lastActiveTrigger = null;

  function lockScroll(locked){
    document.body.style.overflow = locked ? "hidden" : "";
  }

  function setImage(index){
    const list = ROOM_PHOTOS[currentRoomKey] || [];
    if (!list.length) return;

    currentIndex = (index + list.length) % list.length;

    const src = list[currentIndex];
    imgEl.src = src;

    const roomTitle = ROOM_TITLES[currentRoomKey] || "Снимки";
    imgEl.alt = `${roomTitle} – снимка ${currentIndex + 1}`;
    if (titleEl) titleEl.textContent = roomTitle;

    if (dotsEl){
      const dots = Array.from(dotsEl.querySelectorAll(".photoDot"));
      dots.forEach((d, i) => d.classList.toggle("is-active", i === currentIndex));
    }
  }

  function buildDots(){
    if (!dotsEl) return;
    dotsEl.innerHTML = "";

    const list = ROOM_PHOTOS[currentRoomKey] || [];
    list.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "photoDot" + (i === currentIndex ? " is-active" : "");
      b.setAttribute("aria-label", `Снимка ${i + 1}`);
      b.addEventListener("click", () => setImage(i));
      dotsEl.appendChild(b);
    });
  }

  function openModal(roomKey, triggerEl){
    currentRoomKey = roomKey;
    currentIndex = 0;
    lastActiveTrigger = triggerEl || null;

    const list = ROOM_PHOTOS[currentRoomKey] || [];
    if (!list.length) return;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockScroll(true);

    buildDots();
    setImage(0);

    const closeBtn = modal.querySelector('[data-close="1"]');
    closeBtn?.focus?.();
  }

  function closeModal(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    lockScroll(false);

    lastActiveTrigger?.focus?.();
    lastActiveTrigger = null;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".seePhotosBtn");
    if (!btn) return;

    const roomKey = btn.getAttribute("data-room");
    if (!roomKey) return;

    openModal(roomKey, btn);
  });

  modal.addEventListener("click", (e) => {
    const shouldClose = e.target?.closest?.('[data-close="1"]');
    if (shouldClose) closeModal();
  });

  prevBtn?.addEventListener("click", () => setImage(currentIndex - 1));
  nextBtn?.addEventListener("click", () => setImage(currentIndex + 1));

  window.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setImage(currentIndex - 1);
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setImage(currentIndex + 1);
    }
  });

  let sx = 0;
  let sy = 0;
  let tracking = false;

  const figure = modal.querySelector(".photoModal__figure");
  figure?.addEventListener("touchstart", (e) => {
    if (!modal.classList.contains("is-open")) return;
    const t = e.touches[0];
    sx = t.clientX;
    sy = t.clientY;
    tracking = true;
  }, { passive: true });

  figure?.addEventListener("touchmove", (e) => {
    if (!tracking) return;
    const t = e.touches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;

    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.2){
      tracking = false;
      if (dx < 0) setImage(currentIndex + 1);
      else setImage(currentIndex - 1);
    }
  }, { passive: true });

  figure?.addEventListener("touchend", () => {
    tracking = false;
  }, { passive: true });

})();


// =====================
// Tabs scroll hint (mobile)
// =====================
(function initTabsScrollHint(){
  const tabsPill = document.querySelector(".roomsTabs .tabsPill");
  if (!tabsPill) return;

  const mq = window.matchMedia("(max-width: 640px)");

  function updateScrollable(){
    const isScrollable = tabsPill.scrollWidth > tabsPill.clientWidth + 4;
    tabsPill.classList.toggle("is-scrollable", mq.matches && isScrollable);

    const atEnd = (tabsPill.scrollLeft + tabsPill.clientWidth) >= (tabsPill.scrollWidth - 2);
    if (atEnd) tabsPill.classList.add("is-scrolled");
  }

  function onScroll(){
    if (!mq.matches) return;
    if (tabsPill.scrollLeft > 6) tabsPill.classList.add("is-scrolled");
    else tabsPill.classList.remove("is-scrolled");
  }

  tabsPill.addEventListener("scroll", onScroll, { passive: true });

  if (mq.addEventListener) mq.addEventListener("change", updateScrollable);
  window.addEventListener("resize", updateScrollable, { passive: true });

  updateScrollable();
})();


// =====================
// FIX: exact scroll offset for menu anchors
// =====================
(function initExactAnchorScroll(){
  const topbarInner = document.querySelector(".topbar__inner");
  if (!topbarInner) return;

  function getOffset(){
    const rect = topbarInner.getBoundingClientRect();
    return Math.round(rect.height + 26);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || href.length < 2) return;

    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();

    const y = target.getBoundingClientRect().top + window.pageYOffset - getOffset();
    window.scrollTo({ top: y, behavior: "smooth" });

    history.pushState(null, "", href);
  });
})();

// ========= Puzzle Gallery + Lightbox (clean) =========
(function () {
  "use strict";

  function applyOrientationClass(src) {
    const panel = document.querySelector(".puzzleLightbox__panel");
    if (!panel) return;

    const probe = new Image();
    probe.onload = () => {
      const w = probe.naturalWidth || 1;
      const h = probe.naturalHeight || 1;
      const r = w / h;

      panel.classList.remove("is-portrait", "is-square", "is-wide");

      if (r > 1.15) panel.classList.add("is-wide");
      else if (r >= 0.85 && r <= 1.15) panel.classList.add("is-square");
      else panel.classList.add("is-portrait");
    };
    probe.src = src;
  }

  function initPuzzleGallery() {
    const grid = document.getElementById("puzzleGrid");
    if (!grid) return;

    // Guard: да не вържем listener-и 2 пъти
    if (grid.dataset.puzzleBound === "1") return;

    const items = Array.from(grid.querySelectorAll(".puzzleItem"));
    if (!items.length) return;

    const lb = document.getElementById("puzzleLightbox");
    const lbImg = document.getElementById("puzzleImg");
    const lbCount = document.getElementById("puzzleCount");
    if (!lb || !lbImg || !lbCount) return;

    const btnPrev = lb.querySelector(".puzzleLightbox__nav--prev");
    const btnNext = lb.querySelector(".puzzleLightbox__nav--next");

    items.forEach((b, i) => b.style.setProperty("--d", `${i * 45}ms`));

    const images = items
      .map((b) => b.getAttribute("data-full") || b.querySelector("img")?.getAttribute("src"))
      .filter(Boolean);

    if (!images.length) return;

    let index = 0;

    function render(i) {
      index = (i + images.length) % images.length;
      const src = images[index];
      lbImg.src = src;
      lbCount.textContent = `${index + 1} / ${images.length}`;
      applyOrientationClass(src);
    }

    function openLB(i) {
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      render(i);
    }

    function closeLB() {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    items.forEach((b, i) => b.addEventListener("click", () => openLB(i)));

    lb.addEventListener("click", (e) => {
      if (e.target.closest('[data-close="1"]')) closeLB();
    });

    btnPrev && btnPrev.addEventListener("click", () => render(index - 1));
    btnNext && btnNext.addEventListener("click", () => render(index + 1));

    if (!window.__puzzleKeyBound) {
      window.__puzzleKeyBound = true;
      window.addEventListener(
        "keydown",
        (e) => {
          const lightbox = document.getElementById("puzzleLightbox");
          if (!lightbox || !lightbox.classList.contains("is-open")) return;

          if (e.key === "Escape") closeLB();
          if (e.key === "ArrowLeft") render(index - 1);
          if (e.key === "ArrowRight") render(index + 1);
        },
        { passive: true }
      );
    }

    grid.dataset.puzzleBound = "1";
  }

  // “Събуждане” на lazy снимките само когато секцията наближи
  function wakeGalleryLazyImages() {
    const grid = document.getElementById("puzzleGrid");
    if (!grid) return;

    const imgs = Array.from(grid.querySelectorAll("img[loading='lazy']"));
    if (!imgs.length) return;

    const wake = () => {
      imgs.forEach((img) => {
        img.loading = "eager";
        img.decoding = "async";
        const src = img.getAttribute("src");
        if (src) img.src = src;
        if (img.decode) img.decode().catch(() => {});
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          wake();
          io.disconnect();
        }
      },
      { rootMargin: "700px", threshold: 0.01 }
    );

    io.observe(grid);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPuzzleGallery();
    wakeGalleryLazyImages();
  });
})();

  
/* GALLERY SECTION
(function puzzleGallery() {
  const grid = document.getElementById("puzzleGrid");
  const items = grid ? Array.from(grid.querySelectorAll(".puzzleItem")) : [];
  if (!grid || !items.length) return;

  items.forEach((b, i) => {
    b.style.setProperty("--d", `${i * 45}ms`);
  });

  const images = items.map((b) => b.getAttribute("data-full") || b.querySelector("img")?.src).filter(Boolean);

  const lb = document.getElementById("puzzleLightbox");
  const lbImg = document.getElementById("puzzleImg");
  const lbCount = document.getElementById("puzzleCount");
  const btnPrev = lb?.querySelector(".puzzleLightbox__nav--prev");
  const btnNext = lb?.querySelector(".puzzleLightbox__nav--next");

  if (!lb || !lbImg || !lbCount) return;

  let index = 0;

  function render(i){
    index = (i + images.length) % images.length;
    lbImg.src = images[index];
    lbCount.textContent = `${index + 1} / ${images.length}`;

    applyOrientationClass(images[index]);
  }

  function openLB(i){
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    render(i);
  }

  function closeLB(){
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  items.forEach((b, i) => b.addEventListener("click", () => openLB(i)));

  lb.addEventListener("click", (e) => {
    if (e.target.closest('[data-close="1"]')) closeLB();
  });

  btnPrev?.addEventListener("click", () => render(index - 1));
  btnNext?.addEventListener("click", () => render(index + 1));

  window.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLB();
    if (e.key === "ArrowLeft") render(index - 1);
    if (e.key === "ArrowRight") render(index + 1);
  }, { passive: true });
})();

function applyOrientationClass(src) {
  const panel = document.querySelector(".puzzleLightbox__panel");
  if (!panel) return;

  const probe = new Image();
  probe.onload = () => {
    const w = probe.naturalWidth || 1;
    const h = probe.naturalHeight || 1;
    const r = w / h;

    panel.classList.remove("is-portrait", "is-square", "is-wide");

    if (r > 1.15) panel.classList.add("is-wide");
    else if (r >= 0.85 && r <= 1.15) panel.classList.add("is-square");
    else panel.classList.add("is-portrait");
  };
  probe.src = src;
}*/


// =====================
// PRICES -> SELECT ROOM + SCROLL TO BOOKING
// =====================
(function initPricesToBooking(){
  const cards = Array.from(document.querySelectorAll(".priceCard"));
  const bookingSection = document.getElementById("rezervacia");

  const roomOut = document.getElementById("bookingRoom");
  const roomHidden = document.getElementById("room");
  const priceHidden = document.getElementById("pricePerNight");

  const guestsSelect = document.getElementById("guests");

  function setSelectedCard(card){
    cards.forEach(c => c.classList.remove("is-selected"));
    card.classList.add("is-selected");

    const roomName = card.getAttribute("data-room") || "—";
    const price = Number(card.getAttribute("data-price") || 0);
    const guests = card.getAttribute("data-guests");

    if (roomOut) roomOut.innerHTML = `Избрана опция: <strong>${roomName}</strong>`;
    if (roomHidden) roomHidden.value = roomName;
    if (priceHidden) priceHidden.value = price ? String(price) : "";

    if (guestsSelect && guests) guestsSelect.value = String(guests);

    if (typeof window.__recalcBookingTotal === "function") {
      window.__recalcBookingTotal();
    }
  }

  cards.forEach(card => {
    const btn = card.querySelector("[data-book-now]");
    if (!btn) return;

    btn.addEventListener("click", () => {
      setSelectedCard(card);
      bookingSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  if (cards[0]) setSelectedCard(cards[0]);
})();


// =====================
// BOOKING: ROOM DROPDOWN -> SET PRICE + (OPTIONAL) GUESTS + RECALC
// =====================
(function initRoomDropdown(){
  const roomSelect = document.getElementById("roomSelect");
  if (!roomSelect) return;

  const guestsSelect = document.getElementById("guests");

  const roomHidden = document.getElementById("room");
  const priceHidden = document.getElementById("pricePerNight");

  function applySelectedOption(){
    const opt = roomSelect.options[roomSelect.selectedIndex];
    if (!opt) return;

    const roomName = opt.getAttribute("data-room") || "";
    const price = Number(opt.getAttribute("data-price") || 0);
    const guests = opt.getAttribute("data-guests") || "";

    if (roomHidden) roomHidden.value = roomName;
    if (priceHidden) priceHidden.value = price ? String(price) : "";

    // if (guestsSelect && guests) guestsSelect.value = String(guests);

    if (typeof window.__recalcBookingTotal === "function") {
      window.__recalcBookingTotal();
    }

    window.__renderBookingSuggestions?.();
  }

  roomSelect.addEventListener("change", applySelectedOption);
})();


// =====================
// BOOKING CALENDAR (check-in + check-out range) + PRICE CALC
// =====================
(function initBookingCalendar(){
  const cal = document.getElementById("cal");
  if (!cal) return;

  const grid = document.getElementById("calGrid");
  const title = document.getElementById("calTitle");
  const prev = document.getElementById("calPrev");
  const next = document.getElementById("calNext");

  const checkinInput = document.getElementById("checkin");
  const checkoutInput = document.getElementById("checkout");
  const submitBtn = document.getElementById("submitBtn");
  const dateNote = document.getElementById("dateNote");

  const bookingPriceEl = document.getElementById("bookingPrice");
  const calHint = document.getElementById("calHint");

  const pricePerNightHidden = document.getElementById("pricePerNight");
  const nightsHidden = document.getElementById("nights");
  const totalPriceHidden = document.getElementById("totalPrice");

  const monthsBg = ["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"];

  const today = new Date();
  today.setHours(0,0,0,0);

  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let start = null;
  let end = null;

  if (calHint) calHint.textContent = "ИЗБЕРЕТЕ ДАТИ ЗА ДА ВИДИТЕ ЦЕНА";

  function fmt(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function isSameDay(a,b){
    return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  }

  function nightsBetween(a,b){
    if (!a || !b) return 0;
    const ms = 24*60*60*1000;
    const aa = new Date(a); aa.setHours(0,0,0,0);
    const bb = new Date(b); bb.setHours(0,0,0,0);
    return Math.max(0, Math.round((bb - aa)/ms));
  }

  function eur(n){ return `${Math.round(n)} €`; }

  function setSubmitState(){
    const price = Number(pricePerNightHidden?.value || 0);
    const ok = !!(start && end && price > 0);

    if (submitBtn) submitBtn.disabled = !ok;

    if (dateNote) {
      if (!start || !end) {
        dateNote.textContent = `* Моля, изберете дата на настаняване и дата на напускане, и изберете опция.`;
      } else if (price <= 0) {
        dateNote.textContent = `Избрано: ${fmt(start)} → ${fmt(end)} • Изберете опция, за да се изчисли цена.`;
      } else {
        dateNote.textContent = `Избрано: ${fmt(start)} → ${fmt(end)}`;
      }
    }
  }

  function recalcTotal(){
    const price = Number(pricePerNightHidden?.value || 0);
    const n = nightsBetween(start, end);
    const total = price > 0 ? price * n : 0;

    if (nightsHidden) nightsHidden.value = n ? String(n) : "";
    if (totalPriceHidden) totalPriceHidden.value = total ? String(total) : "";

    const strong = bookingPriceEl?.querySelector("strong");
    if (strong) {
      if (!start || !end || price <= 0 || n <= 0) strong.textContent = "--";
      else strong.textContent = `${eur(total)} (${n} нощ${n === 1 ? "" : "увки"})`;
    }

    if (calHint) calHint.textContent = "ИЗБЕРЕТЕ ДАТИ ЗА ДА ВИДИТЕ ЦЕНА";

    setSubmitState();

    window.__renderBookingSuggestions?.();
  }

  window.__recalcBookingTotal = recalcTotal;

  function render(){
    if (!grid || !title) return;

    grid.innerHTML = "";
    title.textContent = `${monthsBg[view.getMonth()]} ${view.getFullYear()}`;

    const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
    const lastDay  = new Date(view.getFullYear(), view.getMonth()+1, 0);

    const startIndex = (firstDay.getDay() + 6) % 7;
    const prevLast = new Date(view.getFullYear(), view.getMonth(), 0).getDate();

    const total = 42;

    for (let i=0; i<total; i++){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calDay";

      let cellDate = null;
      let dayNum = 0;

      if (i < startIndex){
        dayNum = prevLast - (startIndex - 1 - i);
        btn.classList.add("is-muted");
        cellDate = new Date(view.getFullYear(), view.getMonth()-1, dayNum);
      } else if (i >= startIndex + lastDay.getDate()){
        dayNum = i - (startIndex + lastDay.getDate()) + 1;
        btn.classList.add("is-muted");
        cellDate = new Date(view.getFullYear(), view.getMonth()+1, dayNum);
      } else {
        dayNum = i - startIndex + 1;
        cellDate = new Date(view.getFullYear(), view.getMonth(), dayNum);
      }

      btn.textContent = String(dayNum);

      const d0 = new Date(cellDate);
      d0.setHours(0,0,0,0);
      const isPast = d0 < today;
      if (isPast) btn.classList.add("is-disabled");

      if (start && isSameDay(d0, start)) btn.classList.add("is-start");
      if (end && isSameDay(d0, end)) btn.classList.add("is-end");
      if (start && end && d0 > start && d0 < end) btn.classList.add("is-inRange");

      btn.addEventListener("click", () => {
        if (isPast) return;

        if (!start || (start && end)){
          start = d0;
          end = null;
        } else {
          if (d0 <= start){
            start = d0;
            end = null;
          } else {
            end = d0;
          }
        }

        if (checkinInput) checkinInput.value = start ? fmt(start) : "";
        if (checkoutInput) checkoutInput.value = end ? fmt(end) : "";

        if (btn.classList.contains("is-muted")){
          view = new Date(d0.getFullYear(), d0.getMonth(), 1);
        }

        render();
        recalcTotal();
      });

      grid.appendChild(btn);
    }
  }

  prev?.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth()-1, 1);
    render();
  });

  next?.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth()+1, 1);
    render();
  });

  render();
  recalcTotal();
})();


// =====================
// ✅ BOOKING FORM submit (FORMSPREE - FIXED)
// =====================
(function initBookingForm(){
  const form = document.getElementById("bookForm");
  if (!form) return;

  const successBox = document.getElementById("bookingSuccess");
  const submitBtn  = document.getElementById("submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // не оставяме възможност за двойно натискане
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) throw new Error("Formspree submit failed");

      // ✅ reset форма
      form.reset();

      // ✅ показваме success
      if (successBox) {
        successBox.classList.add("is-show");
        setTimeout(() => successBox.classList.remove("is-show"), 6000);
        successBox.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } catch (err) {
      alert("Грешка при изпращане. Моля, опитайте отново.");
      console.error(err);
    } finally {
      // ✅ връщаме правилното disabled състояние според избрани дати/опция
      window.__recalcBookingTotal?.();
    }
  });
})();


// =====================
// SCROLL TO TOP BUTTON
// =====================
(function initScrollTop(){
  const btn = document.getElementById("toTop");
  if (!btn) return;

  const showAfter = 300;

  function toggleBtn(){
    btn.classList.toggle("is-show", window.scrollY > showAfter);
  }

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", toggleBtn, { passive: true });
  toggleBtn();
})();


// =====================
// Smart room suggestions (2..16) + 3 separate doubles for 2 guests + full inventory for 16
// + ✅ selected highlight (is-selected) + ✅ remember selection across re-render
// =====================
(function initBookingSuggestions(){
  const suggestEl = document.getElementById("bookingSuggest");
  const guestsEl = document.getElementById("guests");
  const roomSelect = document.getElementById("roomSelect");
  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");

  const roomHidden = document.getElementById("room");
  const pricePerNightHidden = document.getElementById("pricePerNight");
  const nightsHidden = document.getElementById("nights");
  const totalPriceHidden = document.getElementById("totalPrice");
  const bookingPriceEl = document.getElementById("bookingPrice");

  if (!suggestEl || !guestsEl) return;

  let lastSelectedLabel = "";
  let lastSelectedPricePerNight = 0;

  const PRICE = { double:40, triple:55, quad:60, studio:60, house:310 };
  const INVENTORY = { double:3, triple:1, quad:1, studio:1 };
  const CAP = { double:2, triple:3, quad:4, studio:4 };

  function parseDate(v){
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function getNights(){
    const ci = parseDate(checkinEl?.value);
    const co = parseDate(checkoutEl?.value);
    if (!ci || !co) return 0;
    const nights = Math.round((co - ci) / (1000*60*60*24));
    return nights > 0 ? nights : 0;
  }

  function formatEuro(n){ return `${Math.round(n)}€`; }

  function comboCapacity(c){
    return c.double*CAP.double + c.triple*CAP.triple + c.quad*CAP.quad + c.studio*CAP.studio;
  }

  function comboRooms(c){
    return c.double + c.triple + c.quad + c.studio;
  }

  function comboPricePerNight(c){
    return c.double*PRICE.double + c.triple*PRICE.triple + c.quad*PRICE.quad + c.studio*PRICE.studio;
  }

  function comboLabel(c){
    const parts = [];
    if (c.double) parts.push(`${c.double}× Двойна стая`);
    if (c.triple) parts.push(`${c.triple}× Тройна стая`);
    if (c.quad) parts.push(`${c.quad}× Четворна стая`);
    if (c.studio) parts.push(`${c.studio}× Студио`);
    return parts.join(" + ");
  }

  function generateInventoryCombos(targetGuests){
    const out = [];

    for (let d = 0; d <= INVENTORY.double; d++){
      for (let t = 0; t <= INVENTORY.triple; t++){
        for (let q = 0; q <= INVENTORY.quad; q++){
          for (let s = 0; s <= INVENTORY.studio; s++){
            const c = { double:d, triple:t, quad:q, studio:s };
            const rooms = comboRooms(c);
            if (rooms === 0) continue;

            const cap = comboCapacity(c);
            if (cap < targetGuests) continue;

            out.push({
              c,
              cap,
              rooms,
              pricePerNight: comboPricePerNight(c),
              label: comboLabel(c),
            });
          }
        }
      }
    }

    out.sort((a,b) =>
      a.pricePerNight - b.pricePerNight ||
      a.rooms - b.rooms ||
      (a.cap - targetGuests) - (b.cap - targetGuests)
    );

    const seen = new Set();
    const uniq = [];
    for (const r of out){
      const key = JSON.stringify(r.c);
      if (!seen.has(key)){
        seen.add(key);
        uniq.push(r);
      }
    }

    return uniq;
  }

  function applySelectedClass(btn){
    const all = suggestEl.querySelectorAll(".bookingSuggest__item");
    all.forEach(x => x.classList.remove("is-selected"));
    btn?.classList?.add("is-selected");
  }

  function setSelectedCombo(label, pricePerNight, nights, clickedBtn){
    lastSelectedLabel = label;
    lastSelectedPricePerNight = Number(pricePerNight) || 0;

    if (clickedBtn) applySelectedClass(clickedBtn);

    if (roomHidden) roomHidden.value = label;
    if (pricePerNightHidden) pricePerNightHidden.value = String(pricePerNight);

    if (nightsHidden) nightsHidden.value = String(nights);
    const total = nights ? pricePerNight * nights : 0;
    if (totalPriceHidden) totalPriceHidden.value = total ? String(total) : "";

    if (bookingPriceEl){
      bookingPriceEl.innerHTML = nights
        ? `Обща цена: <strong>${formatEuro(total)}</strong> (${nights} нощувки)`
        : `Обща цена: <strong>--</strong>`;
    }

    pricePerNightHidden?.dispatchEvent?.(new Event("change", { bubbles:true }));
    window.__recalcBookingTotal?.();
  }

  function maybeRestoreSelection(){
    if (!lastSelectedLabel || !lastSelectedPricePerNight) return;

    const items = Array.from(suggestEl.querySelectorAll(".bookingSuggest__item"));
    const match = items.find((btn) => {
      const lbl = btn.getAttribute("data-label") || "";
      const ppn = Number(btn.getAttribute("data-ppn") || 0);
      return lbl === lastSelectedLabel && ppn === lastSelectedPricePerNight;
    });

    if (match) applySelectedClass(match);
  }

  function render(){
    const guests = parseInt(guestsEl.value || "0", 10);
    const nights = getNights();

    suggestEl.innerHTML = "";

    if (!guests || guests < 2 || guests > 16) return;

    const wrap = document.createElement("div");
    wrap.className = "bookingSuggest__wrap";

    const h = document.createElement("div");
    h.className = "bookingSuggest__title";
    h.textContent = nights
      ? `Опции за ${guests} гости • ${nights} нощувки:`
      : `Опции за ${guests} гости:`;
    wrap.appendChild(h);

    const list = document.createElement("div");
    list.className = "bookingSuggest__list";

    if (guests === 2){
      const doubles = [
        { label:"Двойна стая 1", perNight: PRICE.double, cap: 2 },
        { label:"Двойна стая 2", perNight: PRICE.double, cap: 2 },
        { label:"Двойна стая 3", perNight: PRICE.double, cap: 2 },
      ];

      doubles.forEach((it, idx) => {
        const total = nights ? it.perNight * nights : it.perNight;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "bookingSuggest__item" + (idx === 0 ? " is-top" : "");
        btn.setAttribute("data-label", it.label);
        btn.setAttribute("data-ppn", String(it.perNight));

        btn.innerHTML = `
          <div class="bookingSuggest__left">
            <div class="bookingSuggest__name">${it.label}</div>
            <div class="bookingSuggest__meta">${it.cap} места</div>
          </div>
          <div class="bookingSuggest__right">
            <div class="bookingSuggest__price">${nights ? `${formatEuro(total)} общо` : `${formatEuro(it.perNight)} / нощ`}</div>
            <div class="bookingSuggest__sub">${nights ? `${formatEuro(it.perNight)} / нощ` : ""}</div>
          </div>
        `;
        btn.addEventListener("click", () => setSelectedCombo(it.label, it.perNight, nights, btn));
        list.appendChild(btn);
      });

      wrap.appendChild(list);

      const note = document.createElement("div");
      note.className = "bookingSuggest__note";
      note.textContent = "Забележка: Наличността се потвърждава след заявка.";
      wrap.appendChild(note);

      suggestEl.appendChild(wrap);
      maybeRestoreSelection();
      return;
    }

// ✅ 16 гости -> САМО ЦЯЛАТА КЪЩА
if (guests === 16){

  const houseBtn = document.createElement("button");
  houseBtn.type = "button";
  houseBtn.className = "bookingSuggest__item is-top";

  const houseTotal = nights ? PRICE.house * nights : PRICE.house;

  houseBtn.setAttribute("data-label", "Цялата къща");
  houseBtn.setAttribute("data-ppn", String(PRICE.house));

  houseBtn.innerHTML = `
    <div class="bookingSuggest__left">
      <div class="bookingSuggest__name">Цялата къща</div>
      <div class="bookingSuggest__meta">16 места</div>
    </div>
    <div class="bookingSuggest__right">
      <div class="bookingSuggest__price">${nights ? `${formatEuro(houseTotal)} общо` : `${formatEuro(PRICE.house)} / нощ`}</div>
      <div class="bookingSuggest__sub">${nights ? `${formatEuro(PRICE.house)} / нощ` : ""}</div>
    </div>
  `;

  houseBtn.addEventListener("click", () => {
    setSelectedCombo("Цялата къща", PRICE.house, nights, houseBtn);
  });

  list.appendChild(houseBtn);
  wrap.appendChild(list);
  suggestEl.appendChild(wrap);

  maybeRestoreSelection();
  return;
}


    const combos = generateInventoryCombos(guests);
    const top = combos.slice(0, 5);

    top.forEach((r, idx) => {
      const total = nights ? r.pricePerNight * nights : r.pricePerNight;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bookingSuggest__item" + (idx === 0 ? " is-top" : "");
      btn.setAttribute("data-label", r.label);
      btn.setAttribute("data-ppn", String(r.pricePerNight));

      btn.innerHTML = `
        <div class="bookingSuggest__left">
          <div class="bookingSuggest__name">${r.label}</div>
          <div class="bookingSuggest__meta">${r.cap} места</div>
        </div>
        <div class="bookingSuggest__right">
          <div class="bookingSuggest__price">${nights ? `${formatEuro(total)} общо` : `${formatEuro(r.pricePerNight)} / нощ`}</div>
          <div class="bookingSuggest__sub">${nights ? `${formatEuro(r.pricePerNight)} / нощ` : ""}</div>
        </div>
      `;

      btn.addEventListener("click", () => setSelectedCombo(r.label, r.pricePerNight, nights, btn));
      list.appendChild(btn);
    });

    wrap.appendChild(list);

    const note = document.createElement("div");
    note.className = "bookingSuggest__note";
    note.textContent = "Забележка: Това са автоматични предложения според броя гости. Наличността се потвърждава след заявка.";
    wrap.appendChild(note);

    suggestEl.appendChild(wrap);

    maybeRestoreSelection();
  }

  window.__renderBookingSuggestions = render;

  guestsEl.addEventListener("change", render);
  roomSelect?.addEventListener("change", () => setTimeout(render, 0));
  checkinEl?.addEventListener("change", render);
  checkoutEl?.addEventListener("change", render);

  render();
})();
