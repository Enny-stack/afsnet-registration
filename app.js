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

let __tickerTimer = null;

function initHomeTicker(cfg, lang) {
  const track = document.getElementById("homeTickerTrack");
  if (!track) return;

  const section = track.closest(".ticker");

  const msg =
    cfg?.i18n?.[lang]?.["home.announcement"] ||
    cfg?.i18n?.en?.["home.announcement"] ||
    "";

  if (__tickerTimer) {
    clearInterval(__tickerTimer);
    __tickerTimer = null;
  }

  if (!msg.trim()) {
    track.innerHTML = "";
    if (section) section.style.display = "none";
    return;
  }

  if (section) section.style.display = "";

  const rawParts = msg
   .split(/(?:\.\s+|\n+)/)
    .map(s => s.trim())
    .filter(Boolean);

  const parts = rawParts.length ? rawParts : [msg.trim()];

  track.innerHTML = `
    <div class="ticker-rotate">
      <div class="ticker-badge">
        <span class="ticker-dot"></span>
        <span>${
          lang === "fr" ? "Annonce" :
          lang === "ar" ? "إعلان" :
          "Announcement"
        }</span>
      </div>
      <div class="ticker-slide" id="tickerSlide"></div>
    </div>
  `;

  const slide = document.getElementById("tickerSlide");
  if (!slide) return;

  let idx = 0;
  slide.textContent = parts[idx];

  const intervalMs = Number(cfg?.site?.tickerRotateMs) || 4000;

 setTimeout(() => {
  __tickerTimer = setInterval(() => {
    slide.classList.add("is-out");

    setTimeout(() => {
      idx = (idx + 1) % parts.length;
      slide.textContent = parts[idx];
      slide.classList.remove("is-out");
    }, 350);

  }, intervalMs);
}, 600);
/* ================================
   ✅ ABOUT PAGE (CONFIG-DRIVEN)
================================= */
function renderAboutIntro(cfg, lang) {
  const mount = document.getElementById("aboutIntro");
  if (!mount) return;

  const bundle = cfg?.content?.[lang]?.about || cfg?.content?.en?.about;
  const paras = bundle?.introParagraphs;

  if (!Array.isArray(paras) || !paras.length) {
    mount.innerHTML = "";
    return;
  }

  mount.innerHTML = paras
    .map((p, idx) => `<p class="muted"${idx === paras.length - 1 ? ' style="margin-bottom:0"' : ""}>${p}</p>`)
    .join("");
}

function renderAboutEditions(cfg, lang) {
  const ul = document.getElementById("aboutEditionsList");
  if (!ul) return;

  const bundle = cfg?.content?.[lang]?.about || cfg?.content?.en?.about;
  const editions = bundle?.editions || [];
  ul.innerHTML = Array.isArray(editions) ? editions.map(x => `<li>${x}</li>`).join("") : "";
}

function renderAboutCtas(cfg, lang) {
  const applyBtn = document.getElementById("aboutCtaApply");
  const programmeBtn = document.getElementById("aboutCtaProgramme");
  const eventBtn = document.getElementById("aboutCtaEvent");

  if (!applyBtn && !programmeBtn && !eventBtn) return;

  const bundle = cfg?.content?.[lang]?.about || cfg?.content?.en?.about;
  const cta = bundle?.cta || cfg?.content?.en?.about?.cta || {};

  if (applyBtn && cta.apply) applyBtn.textContent = cta.apply;
  if (programmeBtn && cta.programme) programmeBtn.textContent = cta.programme;
  if (eventBtn && cta.event) eventBtn.textContent = cta.event;
}

function renderAboutObjectives(cfg, lang) {
  const scroller = document.getElementById("aboutObjectivesScroller");
  if (!scroller) return;

  const bundle = cfg?.content?.[lang]?.about || cfg?.content?.en?.about;
  const objectives = bundle?.objectives || [];

  if (!Array.isArray(objectives) || !objectives.length) {
    scroller.innerHTML = "";
    return;
  }

  scroller.innerHTML = objectives.map(o => `
    <article class="snap-card" data-snap-card>
      <div class="snap-img">
        <img src="${o.image || ""}" alt="${(o.title || "").replace(/"/g, "&quot;")}">
      </div>
      <div class="snap-body">
        <h4>${o.title || ""}</h4>
        <p class="muted">${o.description || ""}</p>
      </div>
    </article>
  `).join("");
}

function renderHowWorks(cfg, lang) {
  const grid = document.getElementById("howWorksGrid");
  if (!grid) return;

  const bundle = cfg?.content?.[lang]?.about || cfg?.content?.en?.about;
  const table = bundle?.howWorksTable || cfg?.content?.en?.about?.howWorksTable;

  const headers = table?.headers || [];
  const rows = table?.rows || [];

  if (!Array.isArray(headers) || headers.length !== 3 || !Array.isArray(rows)) {
    grid.innerHTML = "";
    return;
  }

  const col0 = rows.map(r => r?.[0] ?? "");
  const col1 = rows.map(r => r?.[1] ?? "");
  const col2 = rows.map(r => r?.[2] ?? "");

  grid.innerHTML = `
    <div class="flow-col">
      <div class="flow-head">${headers[0]}</div>
      ${col0.map(x => `<div class="flow-row">${x}</div>`).join("")}
    </div>
    <div class="flow-col">
      <div class="flow-head">${headers[1]}</div>
      ${col1.map(x => `<div class="flow-row">${x}</div>`).join("")}
    </div>
    <div class="flow-col">
      <div class="flow-head">${headers[2]}</div>
      ${col2.map(x => `<div class="flow-row">${x}</div>`).join("")}
    </div>
  `;
}

function renderAboutPage(cfg, lang) {
  renderAboutIntro(cfg, lang);
  renderAboutEditions(cfg, lang);
  renderAboutCtas(cfg, lang);
  renderAboutObjectives(cfg, lang);
  renderHowWorks(cfg, lang);

  // Re-init slider after objectives injected
  initSnapSlider("objectivesSlider");
}

/* ================================
   ✅ SIMPLE SLIDER (OBJECTIVES)
================================= */
function initSnapSlider(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const scroller = root.querySelector("[data-snap-scroller]");
  const dotsWrap = root.querySelector("[data-snap-dots]");
  let btnPrev = root.querySelector("[data-snap-prev]");
  let btnNext = root.querySelector("[data-snap-next]");

  if (!scroller) return;

  const cards = Array.from(scroller.querySelectorAll("[data-snap-card]"));
  if (!cards.length) {
    if (dotsWrap) dotsWrap.innerHTML = "";
    return;
  }

  // ✅ Reset listeners safely by cloning buttons
  if (btnPrev) {
    const clone = btnPrev.cloneNode(true);
    btnPrev.parentNode.replaceChild(clone, btnPrev);
    btnPrev = clone;
  }
  if (btnNext) {
    const clone = btnNext.cloneNode(true);
    btnNext.parentNode.replaceChild(clone, btnNext);
    btnNext = clone;
  }

  // Build dots fresh
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

  // Replace scroll handler (avoid stacking listeners)
  scroller.onscroll = () => {
    window.requestAnimationFrame(() => setActive(currentIndex()));
  };

  // Dot click
  dots.forEach(d => {
    d.onclick = () => {
      const i = Number(d.getAttribute("data-dot-index"));
      scrollToIndex(i);
    };
  });

  // Arrows
  if (btnPrev) btnPrev.onclick = () => {
    const i = Math.max(0, currentIndex() - 1);
    scrollToIndex(i);
  };

  if (btnNext) btnNext.onclick = () => {
    const iNow = currentIndex();
    const last = cards.length - 1;

    // ✅ If last card, jump to How Works and highlight
    if (iNow >= last) {
      const target = document.getElementById("howWorks");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.remove("flash-highlight");
        // force reflow for restart animation
        void target.offsetWidth;
        target.classList.add("flash-highlight");
      }
      return;
    }

    scrollToIndex(Math.min(last, iNow + 1));
  };
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

  document.querySelectorAll("[data-config]").forEach(el => {
    const path = el.getAttribute("data-config") || "";

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

  document.querySelectorAll("[data-list]").forEach(ul => {
    const path = ul.getAttribute("data-list");
    const items = getByPath(bundle, path);

    if (Array.isArray(items)) {
      ul.innerHTML = items.map(x => `<li>${x}</li>`).join("");
      ul.classList.add("list");
    }
  });
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

  applyLanguage(cfg, savedLang);
  fillRootConfig(cfg);
  applyConfigContent(cfg, savedLang);
  wireApply(cfg, savedLang);
  renderDownloads(cfg);

  initHomeTicker(cfg, savedLang);

  // ✅ render About page (only if About elements exist)
  renderAboutPage(cfg, savedLang);

  select.addEventListener("change", () => {
    const lang = select.value;
    applyLanguage(cfg, lang);
    fillRootConfig(cfg);
    applyConfigContent(cfg, lang);
    wireApply(cfg, lang);
    renderDownloads(cfg);

    initHomeTicker(cfg, lang);

    // ✅ re-render About content per language
    renderAboutPage(cfg, lang);
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

  initHomeTicker(cfg, savedLang);

  // ✅ About page config rendering + slider init
  renderAboutPage(cfg, savedLang);
});
// Preloader: hide when page is ready
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  preloader.classList.add("is-hidden");
  setTimeout(() => preloader.remove(), 450);
});
