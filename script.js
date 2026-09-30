/* ===== Isaac Jessup Photography — script.js =====
   Shared behaviour: rolodex menu (all pages), home carousel,
   masonry gallery + lightbox. Photo data lives in data.js. */
(function () {
  const D = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);

  /* ---------------- Rolodex menu ---------------- */
  function buildMenu() {
    const overlay = document.createElement("div");
    overlay.className = "menu-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <button class="menu-close" type="button">Close ✕</button>
      <div class="rolodex" tabindex="0" aria-label="Portfolio folders">
        <div class="rolodex-line"></div>
        <div class="rolodex-wheel"></div>
      </div>
      <div class="menu-hint">Scroll · Drag · ↑ ↓ — click to open</div>`;
    document.body.appendChild(overlay);

    const rolo = $(".rolodex", overlay);
    const wheel = $(".rolodex-wheel", overlay);
    const cats = D.categories;
    const STEP = 17;             // degrees between cards
    const CARD_H = 84;
    const R = CARD_H / (2 * Math.tan((STEP / 2) * Math.PI / 180));

    const cards = cats.map((c, i) => {
      const el = document.createElement("a");
      el.className = "card";
      el.href = `gallery.html?c=${encodeURIComponent(c.slug)}`;
      el.innerHTML = (c.parent ? `<small>${c.parent}</small>` : "") +
        `<span>${c.name}</span><span class="count">${c.photos.length} photos</span>`;
      el.addEventListener("click", (e) => {
        if (moved > 6) { e.preventDefault(); return; }
        if (Math.round(pos) !== i) { e.preventDefault(); target = i; }
      });
      wheel.appendChild(el);
      return el;
    });

    const clamp = (v) => Math.max(0, Math.min(cats.length - 1, v));
    let pos = 0, target = 0, raf = null, moved = 0;

    // Start on the current gallery's folder when opened from a gallery page
    const cur = new URLSearchParams(location.search).get("c");
    const curIdx = cats.findIndex((c) => c.slug === cur);
    if (curIdx >= 0) pos = target = curIdx;

    function render() {
      const near = Math.round(pos);
      cards.forEach((el, i) => {
        const d = i - pos;
        const a = -d * STEP;
        if (Math.abs(a) > 95) { el.style.visibility = "hidden"; return; }
        el.style.visibility = "visible";
        el.style.transform = `translateZ(${-R}px) rotateX(${a}deg) translateZ(${R}px)`;
        el.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 0.13));
        el.classList.toggle("current", i === near);
      });
    }
    function tick() {
      pos += (target - pos) * 0.16;
      if (Math.abs(target - pos) < 0.001) pos = target;
      render();
      raf = pos === target ? null : requestAnimationFrame(tick);
    }
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };

    // Mouse wheel / trackpad
    let snapTimer;
    rolo.addEventListener("wheel", (e) => {
      e.preventDefault();
      target = clamp(target + e.deltaY / 110);
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => { target = Math.round(target); go(); }, 140);
      go();
    }, { passive: false });

    // Drag / touch
    let startY = 0, startT = 0, dragging = false;
    rolo.addEventListener("pointerdown", (e) => {
      dragging = true; moved = 0; startY = e.clientY; startT = target;
      rolo.classList.add("dragging");
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      moved = Math.max(moved, Math.abs(dy));
      target = clamp(startT - dy / (CARD_H * 0.9));
      go();
    });
    window.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false; rolo.classList.remove("dragging");
      target = Math.round(target); go();
      setTimeout(() => (moved = 0), 0);
    });

    // Keyboard
    document.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowDown") { target = clamp(Math.round(target) + 1); go(); e.preventDefault(); }
      if (e.key === "ArrowUp") { target = clamp(Math.round(target) - 1); go(); e.preventDefault(); }
      if (e.key === "Enter") location.href = cards[Math.round(pos)].href;
    });

    function open() {
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("menu-open");
      render(); rolo.focus({ preventScroll: true });
    }
    function close() {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("menu-open");
    }
    $(".menu-close", overlay).addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.querySelectorAll("[data-open-menu]").forEach((b) => b.addEventListener("click", open));
    render();
  }

  /* ---------------- Home carousel ---------------- */
  function buildCarousel() {
    const hero = $(".hero");
    if (!hero) return;
    const dots = $(".dots");
    const cap = $(".caption");
    const slides = D.carousel.map((p, i) => {
      const s = document.createElement("div");
      s.className = "slide" + (i === 0 ? " active" : "");
      s.style.backgroundImage = `url("${p.src}")`;
      hero.insertBefore(s, hero.firstChild);
      const d = document.createElement("button");
      d.setAttribute("aria-label", `Photo ${i + 1}`);
      d.addEventListener("click", () => show(i, true));
      dots.appendChild(d);
      return s;
    });
    let idx = 0, timer;
    function show(i, manual) {
      slides[idx].classList.remove("active");
      dots.children[idx].classList.remove("active");
      idx = (i + slides.length) % slides.length;
      slides[idx].classList.add("active");
      dots.children[idx].classList.add("active");
      if (cap) cap.textContent = D.carousel[idx].place || "";
      if (manual) restart();
    }
    function restart() { clearInterval(timer); timer = setInterval(() => show(idx + 1), 6000); }
    show(0); restart();
  }

  /* ---------------- Gallery (masonry, 3 across) ---------------- */
  function buildGallery() {
    const wrap = $(".masonry");
    if (!wrap) return;
    const slug = new URLSearchParams(location.search).get("c");
    const cats = D.categories;
    const i = Math.max(0, cats.findIndex((c) => c.slug === slug));
    const cat = cats[i];
    document.title = `${cat.name} — ${D.name}`;
    $(".gallery-head .eyebrow").textContent = cat.parent || "Portfolio";
    $(".gallery-head h1").textContent = cat.name;
    $(".gallery-head .meta").textContent = `${cat.photos.length} photographs`;

    const prev = cats[(i - 1 + cats.length) % cats.length];
    const next = cats[(i + 1) % cats.length];
    $(".gallery-nav .prev").href = `gallery.html?c=${prev.slug}`;
    $(".gallery-nav .prev").textContent = `← ${prev.name}`;
    $(".gallery-nav .next").href = `gallery.html?c=${next.slug}`;
    $(".gallery-nav .next").textContent = `${next.name} →`;

    // Each photo goes into whichever column is currently shortest,
    // using known aspect ratios — so portrait and landscape shots pack
    // tightly with no big empty gaps.
    function layout() {
      const n = window.innerWidth < 560 ? 2 : 3;
      wrap.innerHTML = "";
      const cols = Array.from({ length: n }, () => {
        const c = document.createElement("div");
        c.className = "masonry-col"; wrap.appendChild(c); return c;
      });
      const heights = new Array(n).fill(0);
      cat.photos.forEach((p, k) => {
        const t = document.createElement("div");
        t.className = "tile";
        t.style.aspectRatio = `${p.w} / ${p.h}`;
        const img = new Image();
        img.loading = "lazy"; img.decoding = "async"; img.alt = `${cat.name} ${k + 1}`;
        img.onload = () => img.classList.add("loaded");
        img.src = p.src;
        t.appendChild(img);
        t.addEventListener("click", () => openLb(k));
        const c = heights.indexOf(Math.min(...heights));
        cols[c].appendChild(t);
        heights[c] += p.h / p.w;
      });
    }
    let lastN = 0;
    const relayout = () => { const n = window.innerWidth < 560 ? 2 : 3; if (n !== lastN) { lastN = n; layout(); } };
    relayout(); window.addEventListener("resize", relayout);

    // Lightbox
    const lb = $(".lightbox"), lbImg = $(".lightbox img");
    let cur = 0;
    function openLb(k) { cur = k; lbImg.src = cat.photos[k].src; lb.classList.add("open"); }
    const step = (d) => openLb((cur + d + cat.photos.length) % cat.photos.length);
    $(".lb-prev").onclick = (e) => { e.stopPropagation(); step(-1); };
    $(".lb-next").onclick = (e) => { e.stopPropagation(); step(1); };
    $(".lb-close").onclick = () => lb.classList.remove("open");
    lb.addEventListener("click", (e) => { if (e.target === lb) lb.classList.remove("open"); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") lb.classList.remove("open");
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    });
  }

  /* ---------------- Contact ---------------- */
  function buildContact() {
    const bg = $(".contact-bg");
    if (bg && D.carousel.length) bg.style.backgroundImage = `url("${D.carousel[D.carousel.length - 1].src}")`;
    const c = D.contact;
    const set = (sel, href, text) => { const a = $(sel); if (a) { a.href = href; $(".value", a).textContent = text; } };
    set("#c-email", `mailto:${c.email}`, c.email);
    set("#c-ig", `https://instagram.com/${c.instagram.replace("@", "")}`, c.instagram);
    set("#c-tt", `https://www.tiktok.com/@${c.tiktok.replace("@", "")}`, c.tiktok);
  }

  buildMenu();
  buildCarousel();
  buildGallery();
  buildContact();
})();
