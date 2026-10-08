/* ===== Isaac Jessup Photography — script.js =====
   Shared behaviour: pop-up portfolio menu (all pages), home carousel,
   masonry gallery + lightbox. Photo data lives in data.js. */
(function () {
  const D = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  // Random order on every visit (Fisher–Yates shuffle)
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------------- Portfolio menu (pop-up) ---------------- */
  function buildMenu() {
    const cur = new URLSearchParams(location.search).get("c");
    const inProject = (c) => c.parent === "Projects";
    const WORK = ["portraits", "products", "projects-ryan-and-audrey-engagment"];
    const isWork = (c) => WORK.includes(c.slug) || inProject(c);
    const curCat = D.categories.find((c) => c.slug === cur);
    const onProjects = /projects\.html$/.test(location.pathname) || (curCat && inProject(curCat));
    const item = (href, name, isCur, i) =>
      `<li style="--i:${i}"><a href="${href}"${isCur ? ' class="current"' : ""}>${name}</a></li>`;
    const link = (c, i) => item(`gallery.html?c=${encodeURIComponent(c.slug)}`, c.name, c.slug === cur, i);
    const places = D.categories.filter((c) => !isWork(c));
    const bySlug = (s) => D.categories.find((c) => c.slug === s);
    const n = places.length;
    const workHtml = [
      link(bySlug("portraits"), n),
      link(bySlug("products"), n + 1),
      item("projects.html", "Projects", onProjects, n + 2),
      link(bySlug("projects-ryan-and-audrey-engagment"), n + 3),
    ].join("");

    const overlay = document.createElement("div");
    overlay.className = "menu-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <button class="menu-close" type="button">Close ✕</button>
      <nav class="menu-panel" aria-label="Portfolio">
        <section>
          <h2 class="menu-label">Places</h2>
          <ul class="menu-list menu-places">${places.map(link).join("")}</ul>
        </section>
        <section>
          <h2 class="menu-label">Work</h2>
          <ul class="menu-list">${workHtml}</ul>
        </section>
      </nav>`;
    document.body.appendChild(overlay);

    function open() {
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("menu-open");
    }
    function close() {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("menu-open");
    }
    overlay.querySelector(".menu-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("open")) close(); });
    document.querySelectorAll("[data-open-menu]").forEach((b) => b.addEventListener("click", open));
  }

  /* ---------------- Home carousel ---------------- */
  function buildCarousel() {
    const hero = $(".hero");
    if (!hero) return;
    const dots = $(".dots");
    const cap = $(".caption");
    // A slide marked "featured" always opens the site; the rest are shuffled
    const feat = D.carousel.filter((p) => p.featured);
    D.carousel = feat.concat(shuffle(D.carousel.filter((p) => !p.featured)));
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
    cat.photos = shuffle(cat.photos.slice());
    document.title = `${cat.name} — ${D.name}`;
    const eb = $(".gallery-head .eyebrow");
    if (cat.parent === "Projects") eb.innerHTML = '<a href="projects.html">← Projects</a>';
    else eb.textContent = "Portfolio";
    $(".gallery-head h1").textContent = cat.name;
    $(".gallery-head .meta").textContent = `${cat.photos.length} photographs`;

    // Prev/next stays within the same group (main galleries, or the three projects)
    const group = cats.filter((c) => (c.parent === "Projects") === (cat.parent === "Projects"));
    const gi = group.indexOf(cat);
    const prev = group[(gi - 1 + group.length) % group.length];
    const next = group[(gi + 1) % group.length];
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
