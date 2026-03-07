/* ================================
   AfSNET Portal - app.js (FINAL FIX)
   ✅ Prevents "stuck loading"
   ✅ No duplicate timers
   ✅ Preloader ALWAYS hides
   ✅ Ticker does not blink
   ✅ Language switcher can’t crash the site
   ✅ About render runs only where relevant
================================= */

let CONFIG = null;

/* ---------- PRELOADER ---------- */
function hidePreloaderSoon() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;
  preloader.classList.add("is-hidden");
  setTimeout(() => preloader.remove(), 450);
}

/* ---------- CONFIG ---------- */
async function loadConfig() {
  if (CONFIG) return CONFIG;

  try {
    const res = await fetch("./config.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`config.json fetch failed (${res.status})`);
    CONFIG = await res.json();
    return CONFIG;
  } catch (err) {
    console.error("❌ Failed to load config.json:", err);

    // Render error into page instead of replacing the whole body
    const main = document.getElementById("main") || document.querySelector("main");
    if (main) {
      main.innerHTML = `
        <section class="card pad section">
          <h2>Site configuration error</h2>
          <p>Please check <strong>config.json</strong> formatting (commas / quotes) and reload.</p>
          <p style="color:#666">Open DevTools → Console to see the exact error.</p>
        </section>
      `;
    }

    hidePreloaderSoon();
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

/* ---------- HEADER + FOOTER ---------- */
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
              <div class="brand-text">
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

          <div class="footer-col brand-col">
            <div class="footer-brand">
              <img src="${cfg?.site?.logoSrc || "./assets/logo/afsnet-logo.jpg"}"
                   class="footer-logo-img"
                   alt="AfSNET Logo" />
              <div>
                <p class="footer-title">African Sub-Sovereign Governments Network (AfSNET)</p>
                <p class="footer-sub">Connecting African states, investors, and projects through a trusted investment network.</p>
              </div>
            </div>

            <p class="footer-copy">© ${year} Afreximbank / AfSNET. All rights reserved.</p>

            <div class="footer-links" style="margin-top:12px">
              <a href="${afreximbankUrl}" target="_blank" rel="noopener">Afreximbank Website</a>
              <a href="${iatfUrl}" target="_blank" rel="noopener">IATF Website</a>
            </div>
          </div>

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

          <div class="footer-col address-col">
            <h4>Afreximbank Headquarters – Cairo, Egypt</h4>
            <div class="footer-contact">
              <div class="line">72 (B) El-Maahad El-Eshteraky Street – Heliopolis, Cairo 11341, Egypt</div>
              <div class="line"><span class="label">Postal Address:</span> P.O. Box 613 Heliopolis, Cairo 11757, Egypt</div>
              <div class="line"><span class="label">Email:</span> ${cfg?.site?.supportEmail || "afsnet@afreximbank.com"}</div>
              <div class="line"><span class="label">Tel:</span> ${cfg?.site?.phone || "+20-2-24564100"}</div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  `;
}

/* ---------- ROOT FILL ---------- */
function fillRootConfig(cfg) {
  document.querySelectorAll("[data-config]").forEach(el => {
    const path = el.getAttribute("data-config") || "";
    const isRoot =
      path.startsWith("site.") ||
      path.startsWith("event.") ||
      path.startsWith("downloads.");
    if (!isRoot) return;

    const val = getByPath(cfg, path);
    if (val !== null && typeof val !== "object") el.textContent = val;
  });

  document.querySelectorAll("[data-email]").forEach(el => {
    const path = el.getAttribute("data-email");
    const email = getByPath(cfg, path);
    if (email) {
      el.textContent = email;
      el.setAttribute("href", `mailto:${email}`);
    }
  });
}

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

/* ---------- DOWNLOADS ---------- */
function renderDownloads(cfg) {
  const ul = document.getElementById("downloadsList");
  if (!ul) return;

  const items = cfg?.downloads?.items || [];
  ul.innerHTML = items
    .map(i => `<li><a href="${i.file}" target="_blank" rel="noopener">${i.label}</a></li>`)
    .join("");
  ul.classList.add("list");
}

/* ---------- APPLY (TALLY) ---------- */
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

/* ---------- LANGUAGE SWITCHER (SAFE) ---------- */
function maybeRenderAbout(cfg, lang) {
  // Only run about rendering if about page elements exist
  const hasAbout = document.getElementById("aboutIntro")
    || document.getElementById("aboutObjectivesScroller")
    || document.getElementById("howWorksGrid");
  if (!hasAbout) return;

  try {
    renderAboutPage(cfg, lang);
  } catch (e) {
    console.warn("About render skipped:", e);
  }
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

  select.addEventListener("change", () => {
    try {
      const lang = select.value;

      applyLanguage(cfg, lang);
      fillRootConfig(cfg);
      applyConfigContent(cfg, lang);
      wireApply(cfg, lang);
      renderDownloads(cfg);

      initHomeTicker(cfg, lang);
      maybeRenderAbout(cfg, lang);
    } catch (e) {
      console.error("Language switch failed:", e);
    }
  });
}

/* ================================
   HOME HERO SLIDER
================================= */
let heroTimer = null;

function initHeroSlider() {
  const slides = Array.from(document.querySelectorAll(".hero-slider .hero-slide"));
  if (!slides.length) return;

  if (heroTimer) clearInterval(heroTimer);

  let idx = slides.findIndex(s => s.classList.contains("is-active"));
  if (idx < 0) idx = 0;

  slides.forEach((s, i) => s.classList.toggle("is-active", i === idx));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || slides.length === 1) return;

  heroTimer = setInterval(() => {
    slides[idx].classList.remove("is-active");
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add("is-active");
  }, 5000);
}

/* ================================
   TICKER (your version kept)
================================= */
let __tickerTimer = null;
let __tickerIdx = 0;

/* ... keep your existing ticker functions exactly as-is here ...
   parseEventStartDate, formatCountdown, getThemeText, getLabelText,
   getStartsInText, initHomeTicker
*/

/* ================================
   ABOUT PAGE (your version kept)
================================= */
/* ... keep your existing renderAboutPage + helpers exactly as-is ... */

/* ================================
   INIT
================================= */
document.addEventListener("DOMContentLoaded", async () => {
  try {
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
    maybeRenderAbout(cfg, savedLang);

    initHeroSlider();
  } finally {
    hidePreloaderSoon();
  }
});

// Safety net
window.addEventListener("load", hidePreloaderSoon);
