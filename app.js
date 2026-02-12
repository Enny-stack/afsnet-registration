let CONFIG = null;

async function loadConfig() {
  if (CONFIG) return CONFIG;

  try {
    const res = await fetch("./config.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`config.json fetch failed (${res.status})`);
    CONFIG = await res.json();
    return CONFIG;
  } catch (err) {
    console.error("❌ Failed to load config.json:", err);
    // Don't crash silently — at least show something.
    const body = document.querySelector("body");
    if (body) {
      body.innerHTML = `
        <div style="max-width:900px;margin:40px auto;padding:16px;font-family:system-ui">
          <h2>Site configuration error</h2>
          <p>Please check <strong>config.json</strong> formatting (commas / quotes) and reload.</p>
          <p style="color:#666">Open DevTools → Console to see the exact error.</p>
        </div>
      `;
    }
    throw err;
  }
}

function getByPath(obj, path) {
  return path
    .split(".")
    .reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj);
}

function setActiveNav() {
  const file = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach(a => {
    const href = (a.getAttribute("href") || "").replace("./", "");
    if (href === file) a.classList.add("active");
  });
}

/* ================================
   HEADER + FOOTER INJECTION
================================= */

function injectHeader(cfg) {
  const el = document.getElementById("site-header");
  if (!el) return;

  const logo = cfg?.site?.logoSrc || "./assets/logo/afsnet-logo.jpg";
  const name = cfg?.site?.name || "AfSNET";
  const tagline = cfg?.site?.tagline || "African Sub-Sovereign Governments Network";

  el.innerHTML = `
    <header>
      <div class="header-shell">
        <div class="header-inner">
          <div class="topbar">

            <a class="brand" href="./index.html" aria-label="${name} Home">
              <img class="site-logo" src="${logo}" alt="${name} logo" />
              <div>
                <h1>${name}</h1>
                <p>${tagline}</p>
              </div>
            </a>

            <nav class="nav" aria-label="Primary navigation">
              <a href="./index.html" data-i18n="nav.home">Home</a>
              <a href="./about.html" data-i18n="nav.about">About</a>
              <a href="./programme.html" data-i18n="nav.programme">Programme</a>
              <a href="./event.html" data-i18n="nav.event">Event</a>
              <a href="./speakers-partners.html" data-i18n="nav.speakers">Speakers/Partners</a>
              <a href="./travel-visa.html" data-i18n="nav.travel">Travel & Visa</a>
              <a href="./media-press.html" data-i18n="nav.media">Media/Press</a>
              <a href="./hotels.html" data-i18n="nav.hotels">Hotels</a>
              <a class="cta" href="./apply.html" data-i18n="nav.apply">Apply</a>
              <a href="./contact.html" data-i18n="nav.contact">Contact</a>
            </nav>

            <div class="lang-slot" id="lang-slot"></div>

          </div>
        </div>
      </div>
    </header>
  `;

  injectLanguageSwitcher(cfg);
  setActiveNav();
}

function injectFooter(cfg) {
  const el = document.getElementById("site-footer");
  if (!el) return;

  const year = new Date().getFullYear();

  // Supports both naming styles safely (afreximbank / afreximbankUrl etc.)
  const afreximbankUrl =
    cfg?.site?.externalLinks?.afreximbankUrl ||
    cfg?.site?.externalLinks?.afreximbank ||
    "https://www.afreximbank.com";

  const iatfUrl =
    cfg?.site?.externalLinks?.iatfUrl ||
    cfg?.site?.externalLinks?.iatf ||
    "https://www.iatf.africa";

  el.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-container">

        <div class="footer-grid-3">

          <!-- LEFT: Brand -->
          <div class="footer-col brand-col">
            <div class="footer-brand">
              <img src="${cfg?.site?.logoSrc || "./assets/logo/afsnet-logo.jpg"}"
                   class="footer-logo-img"
                   alt="AfSNET Logo" />

              <div>
                <p class="footer-title">
                  African Sub-Sovereign Governments Network (AfSNET)
                </p>
                <p class="footer-sub">
                  Connecting African states, investors, and projects through a trusted investment network.
                </p>
              </div>
            </div>

            <p class="footer-copy">
              © ${year} Afreximbank / AfSNET. All rights reserved.
            </p>

            <div class="footer-links" style="margin-top:12px">
              <a href="${afreximbankUrl}" target="_blank" rel="noopener">Afreximbank Website</a>
              <a href="${iatfUrl}" target="_blank" rel="noopener">IATF Website</a>
            </div>
          </div>

          <!-- MIDDLE -->
          <div class="footer-col links-col">
            <h4>Quick links</h4>
            <div class="footer-links">
              <a href="./about.html">About</a>
              <a href="./programme.html">Programme</a>
              <a href="./apply.html">Apply</a>
              <a href="./event.html">Event</a>
              <a href="./contact.html">Contact</a>
            </div>
          </div>

          <!-- RIGHT -->
          <div class="footer-col address-col">
            <h4>Afreximbank Headquarters – Cairo, Egypt</h4>

            <div class="footer-contact">
              <div class="line">
                72 (B) El-Maahad El-Eshteraky Street – Heliopolis, Cairo 11341, Egypt
              </div>
              <div class="line">
                <span class="label">Postal Address:</span>
                P.O. Box 613 Heliopolis, Cairo 11757, Egypt
              </div>
              <div class="line">
                <span class="label">Email:</span> ${cfg?.site?.supportEmail || "afsnet@afreximbank.com"}
              </div>
              <div class="line">
                <span class="label">Tel:</span> ${cfg?.site?.phone || "+20-2-24564100"}
              </div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  `;
}

/* ================================
   ROOT (NON-LANGUAGE) FILL
   - site.*, event.*, downloads.*
================================= */
function fillRootConfig(cfg) {
  document.querySelectorAll("[data-config]").forEach(el => {
    const path = el.getAttribute("data-config") || "";

    // Only fill these from ROOT cfg:
    const isRoot =
      path.startsWith("site.") ||
      path.startsWith("event.") ||
      path.startsWith("downloads.");

    if (!isRoot) return;

    const val = getByPath(cfg, path);
    if (val !== null && typeof val !== "object") el.textContent = val;
  });

  // data-email="site.supportEmail"
  document.querySelectorAll("[data-email]").forEach(el => {
    const path = el.getAttribute("data-email");
    const email = getByPath(cfg, path);
    if (email) {
      el.textContent = email;
      el.setAttribute("href", `mailto:${email}`);
    }
  });
}

/* ================================
   DOWNLOADS
================================= */
function renderDownloads(cfg) {
  const ul = document.getElementById("downloadsList");
  if (!ul) return;

  const items = cfg?.downloads?.items || [];
  ul.innerHTML = items
    .map(i => `<li><a href="${i.file}" target="_blank" rel="noopener">${i.label}</a></li>`)
    .join("");
  ul.classList.add("list");
}

/* ================================
   APPLY BUTTON (TALLY)
================================= */
function wireApply(cfg, lang) {
  const btn = document.getElementById("openExternalForm");
  if (!btn) return;

  const url =
    cfg?.content?.[lang]?.apply?.externalFormUrl ||
    cfg?.content?.en?.apply?.externalFormUrl;

  if (!url) return;

  btn.setAttribute("href", url);
  btn.setAttribute("target", "_blank");
  btn.setAttribute("rel", "noopener");
}

/* ================================
   ✅ ADDED: HOME ANNOUNCEMENT TICKER
================================= */
function initHomeTicker(cfg, lang) {
  const track = document.getElementById("homeTickerTrack");
  if (!track) return;

  const msg =
    cfg?.i18n?.[lang]?.["home.announcement"] ||
    cfg?.i18n?.en?.["home.announcement"] ||
    "";

  if (!msg.trim()) {
    track.innerHTML = "";
    return;
  }

  // Build one “item” (dot + text). We repeat it enough times for smooth scrolling.
  const itemHTML = `
    <span class="ticker-item">
      <span class="ticker-dot" aria-hidden="true"></span>
      <span class="ticker-text">${msg}</span>
    </span>
  `;

  // Repeat to exceed viewport width; duplicate again to support -50% animation loop.
  const repeated = new Array(10).fill(itemHTML).join("");
  track.innerHTML = repeated + repeated;
}

/* ================================
   ✅ ADDED: SIMPLE SLIDER (OBJECTIVES)
================================= */
function initSnapSlider(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const scroller = root.querySelector("[data-snap-scroller]");
  const dotsWrap = root.querySelector("[data-snap-dots]");
  const btnPrev = root.querySelector("[data-snap-prev]");
  const btnNext = root.querySelector("[data-snap-next]");

  if (!scroller) return;

  const cards = Array.from(scroller.querySelectorAll("[data-snap-card]"));
  if (!cards.length) return;

  // Build dots
  if (dotsWrap) {
    dotsWrap.innerHTML = cards
      .map((_, i) => `<button type="button" class="snap-dot" aria-label="Go to slide ${i + 1}" data-dot-index="${i}"></button>`)
      .join("");
  }

  const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll(".snap-dot")) : [];

  function setActive(index) {
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  }

  function currentIndex() {
    // Find card closest to left edge
    const left = scroller.getBoundingClientRect().left;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(c.getBoundingClientRect().left - left);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function scrollToIndex(i) {
    cards[i]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActive(i);
  }

  // Initial active
  setActive(0);

  // Scroll listener updates active dot
  let raf = null;
  scroller.addEventListener("scroll", () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => setActive(currentIndex()));
  });

  // Dot click
  dots.forEach(d => {
    d.addEventListener("click", () => {
      const i = Number(d.getAttribute("data-dot-index"));
      scrollToIndex(i);
    });
  });

  // Arrows
  if (btnPrev) btnPrev.addEventListener("click", () => {
    const i = Math.max(0, currentIndex() - 1);
    scrollToIndex(i);
  });

  if (btnNext) btnNext.addEventListener("click", () => {
    const iNow = currentIndex();

    // ✅ About-page behavior: if you're on the last card, jump to "How AfSNET works" and highlight it briefly
    if (iNow === cards.length - 1) {
      const target = document.getElementById("howAfsnetWorks");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });

        // brief highlight without needing CSS changes
        const prevOutline = target.style.outline;
        const prevOutlineOffset = target.style.outlineOffset;
        target.style.outline = "3px solid rgba(201,162,39,.85)";
        target.style.outlineOffset = "10px";
        setTimeout(() => {
          target.style.outline = prevOutline;
          target.style.outlineOffset = prevOutlineOffset;
        }, 1200);
      }
      return;
    }

    const i = Math.min(cards.length - 1, iNow + 1);
    scrollToIndex(i);
  });
}

/* ================================
   ✅ ADDED: ABOUT PAGE (CONFIG-DRIVEN OBJECTIVES + EDITIONS + HOW-WORKS)
================================= */
function renderAboutPage(cfg, lang) {
  const bundle = cfg?.content?.[lang] || cfg?.content?.en;
  const about = bundle?.about;
  if (!about) return;

  // Intro paragraphs (optional: about.introParagraphs[])
  const wrap = document.getElementById("aboutIntroParagraphs");
  if (wrap) {
    const paras = Array.isArray(about.introParagraphs) ? about.introParagraphs : null;

    // If introParagraphs exists, render them. Otherwise leave existing data-config intro in HTML.
    if (paras && paras.length) {
      wrap.innerHTML = paras
        .map((t, idx) => `<p class="muted"${idx === paras.length - 1 ? ' style="margin-bottom:0"' : ""}>${t}</p>`)
        .join("");
    }
  }

  // Editions list
  const editionsEl = document.getElementById("aboutEditionsList");
  if (editionsEl && Array.isArray(about.editions)) {
    editionsEl.innerHTML = about.editions.map(x => `<li>${x}</li>`).join("");
    editionsEl.classList.add("list");
  }

  // Objectives slider cards (optional: about.objectivesCards[])
  const scroller = document.getElementById("objectivesScroller");
  if (scroller && Array.isArray(about.objectivesCards)) {
    scroller.innerHTML = about.objectivesCards.map(card => {
      const img = card?.image || "";
      const alt = card?.alt || card?.title || "Objective";
      const title = card?.title || "";
      const desc = card?.description || "";
      return `
        <article class="snap-card" data-snap-card>
          <div class="snap-img">
            ${img ? `<img src="${img}" alt="${alt}">` : ``}
          </div>
          <div class="snap-body">
            <h4>${title}</h4>
            <p class="muted">${desc}</p>
          </div>
        </article>
      `;
    }).join("");

    // Re-init slider after re-render
    initSnapSlider("objectivesSlider");
  }

  // How AfSNET works table (optional: about.howWorksTable)
  const grid = document.getElementById("howWorksGrid");
  const table = about?.howWorksTable;
  if (grid && table?.headers && Array.isArray(table?.rows)) {
    const headers = table.headers;
    const rows = table.rows;

    // Expect 3 columns
    if (headers.length >= 3) {
      const col0 = rows.map(r => `<div class="flow-row">${r?.[0] ?? ""}</div>`).join("");
      const col1 = rows.map(r => `<div class="flow-row">${r?.[1] ?? ""}</div>`).join("");
      const col2 = rows.map(r => `<div class="flow-row">${r?.[2] ?? ""}</div>`).join("");

      grid.innerHTML = `
        <div class="flow-col">
          <div class="flow-head">${headers[0]}</div>
          ${col0}
        </div>
        <div class="flow-col">
          <div class="flow-head">${headers[1]}</div>
          ${col1}
        </div>
        <div class="flow-col">
          <div class="flow-head">${headers[2]}</div>
          ${col2}
        </div>
      `;
    }
  }
}

/* ================================
   LANGUAGE
================================= */
function applyLanguage(cfg, lang) {
  const dict = cfg?.i18n?.[lang] || cfg?.i18n?.en;
  if (!dict) return;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lang);
  localStorage.setItem("lang", lang);
}

function applyConfigContent(cfg, lang) {
  const bundle = cfg?.content?.[lang] || cfg?.content?.en;
  if (!bundle) return;

  // Fill text nodes for language bundle (home.*, about.*, programme.*, etc.)
  document.querySelectorAll("[data-config]").forEach(el => {
    const path = el.getAttribute("data-config") || "";

    // Skip ROOT fills here (they are handled by fillRootConfig)
    const isRoot =
      path.startsWith("site.") ||
      path.startsWith("event.") ||
      path.startsWith("downloads.");

    if (isRoot) return;

    const value = getByPath(bundle, path);
    if (value !== null && typeof value !== "object") {
      el.textContent = value;
    }
  });

  // Lists from language bundle
  document.querySelectorAll("[data-list]").forEach(ul => {
    const path = ul.getAttribute("data-list");
    const items = getByPath(bundle, path);

    if (Array.isArray(items)) {
      ul.innerHTML = items.map(x => `<li>${x}</li>`).join("");
      ul.classList.add("list");
    }
  });

  // ✅ ADDED: About page dynamic blocks (only runs if elements exist)
  renderAboutPage(cfg, lang);
}

function injectLanguageSwitcher(cfg) {
  const slot = document.getElementById("lang-slot");
  if (!slot) return;

  slot.innerHTML = `
    <div class="lang-switch">
      <select id="langSelect" aria-label="Language selector">
        <option value="en">EN</option>
        <option value="fr">FR</option>
        <option value="ar">AR</option>
      </select>
    </div>
  `;

  const select = document.getElementById("langSelect");
  const savedLang = localStorage.getItem("lang") || cfg?.site?.defaultLang || "en";
  select.value = savedLang;

  // Apply immediately
  applyLanguage(cfg, savedLang);
  fillRootConfig(cfg);
  applyConfigContent(cfg, savedLang);
  wireApply(cfg, savedLang);
  renderDownloads(cfg);

  // ✅ ADDED: ensure ticker updates when language changes
  initHomeTicker(cfg, savedLang);

  select.addEventListener("change", () => {
    const lang = select.value;
    applyLanguage(cfg, lang);
    fillRootConfig(cfg);
    applyConfigContent(cfg, lang);
    wireApply(cfg, lang);
    renderDownloads(cfg);

    // ✅ ADDED
    initHomeTicker(cfg, lang);
  });
}

/* ================================
   INIT
================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const cfg = await loadConfig();

  injectHeader(cfg);
  injectFooter(cfg);

  const savedLang = localStorage.getItem("lang") || cfg?.site?.defaultLang || "en";

  applyLanguage(cfg, savedLang);
  fillRootConfig(cfg);
  applyConfigContent(cfg, savedLang);
  renderDownloads(cfg);
  wireApply(cfg, savedLang);

  // ✅ ADDED: ticker + objective slider init (only runs if elements exist)
  initHomeTicker(cfg, savedLang);
  initSnapSlider("objectivesSlider");
});
