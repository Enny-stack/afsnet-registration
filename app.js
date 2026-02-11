let CONFIG = null;

/* ================================
   LOAD CONFIG
================================= */
async function loadConfig() {
  if (CONFIG) return CONFIG;
  const res = await fetch("./config.json", { cache: "no-store" });
  CONFIG = await res.json();
  return CONFIG;
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => {
    return acc && acc[k] !== undefined ? acc[k] : null;
  }, obj);
}

/* ================================
   ACTIVE NAV
================================= */
function setActiveNav() {
  const file = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach(a => {
    const href = (a.getAttribute("href") || "").replace("./", "");
    if (href === file) a.classList.add("active");
  });
}

/* ================================
   HEADER INJECTION
================================= */
function injectHeader(cfg) {
  const el = document.getElementById("site-header");
  if (!el) return;

  const logo = cfg?.site?.logoSrc || "./assets/logo/afsnet-logo.jpg";
  const tagline = cfg?.site?.tagline || "African Sub-Sovereign Governments Network";

  el.innerHTML = `
    <header>
      <div class="container topbar">

        <a class="brand" href="./index.html">
          <img class="site-logo" src="${logo}" alt="AfSNET Logo"/>
          <div>
            <h1>AfSNET</h1>
            <p>${tagline}</p>
          </div>
        </a>

        <nav class="nav">
          <a href="./index.html" data-i18n="nav.home">Home</a>
          <a href="./about.html" data-i18n="nav.about">About</a>
          <a href="./programme.html" data-i18n="nav.programme">Programme</a>
          <a href="./event.html" data-i18n="nav.event">Event</a>
          <a href="./speakers-partners.html" data-i18n="nav.speakers">Speakers</a>
          <a href="./travel-visa.html" data-i18n="nav.travel">Travel</a>
          <a href="./media-press.html" data-i18n="nav.media">Media</a>
          <a href="./hotels.html" data-i18n="nav.hotels">Hotels</a>
          <a class="cta" href="./apply.html" data-i18n="nav.apply">Apply</a>
          <a href="./contact.html" data-i18n="nav.contact">Contact</a>
        </nav>

        <div id="lang-slot"></div>
      </div>
    </header>
  `;

  injectLanguageSwitcher(cfg);
  setActiveNav();
}

/* ================================
   FOOTER INJECTION
================================= */
function injectFooter(cfg) {
  const el = document.getElementById("site-footer");
  if (!el) return;

  const year = new Date().getFullYear();

  el.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-container">

        <div class="footer-grid-3">

          <!-- LEFT -->
          <div class="footer-col brand-col">
            <div class="footer-brand">
              <img src="${cfg.site.logoSrc}" class="footer-logo-img" alt="AfSNET Logo"/>

              <div>
                <p class="footer-title">African Sub-Sovereign Governments Network (AfSNET)</p>
                <p class="footer-sub">
                  Connecting African states, investors, and projects through a trusted investment network.
                </p>
              </div>
            </div>

            <p class="footer-copy">
              © ${year} Afreximbank / AfSNET. All rights reserved.
            </p>
          </div>

          <!-- MIDDLE -->
          <div class="footer-col links-col">
            <h4>Quick links</h4>
            <div class="footer-links">
              <a href="./about.html">About</a>
              <a href="./programme.html">Programme</a>
              <a href="./apply.html">Apply</a>
              <a href="./contact.html">Contact</a>
            </div>
          </div>

          <!-- RIGHT -->
          <div class="footer-col address-col">
            <h4>Afreximbank HQ – Cairo</h4>
            <div class="footer-contact">
              <div class="line">72B El-Maahad El-Eshteraky Street, Heliopolis</div>
              <div class="line"><span class="label">Email:</span> ${cfg.site.supportEmail}</div>
              <div class="line"><span class="label">Tel:</span> ${cfg.site.phone}</div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  `;
}

/* ================================
   LANGUAGE SWITCHER
================================= */
function injectLanguageSwitcher(cfg) {
  const slot = document.getElementById("lang-slot");
  if (!slot) return;

  slot.innerHTML = `
    <div class="lang-switch">
      <select id="langSelect">
        <option value="en">EN</option>
        <option value="fr">FR</option>
        <option value="ar">AR</option>
      </select>
    </div>
  `;

  const select = document.getElementById("langSelect");

  const savedLang =
    localStorage.getItem("lang") ||
    cfg.site.defaultLang ||
    "en";

  select.value = savedLang;

  applyFullLanguage(cfg, savedLang);

  select.addEventListener("change", () => {
    const lang = select.value;
    localStorage.setItem("lang", lang);
    applyFullLanguage(cfg, lang);
  });
}

/* ================================
   APPLY LANGUAGE EVERYWHERE
================================= */
function applyFullLanguage(cfg, lang) {
  const dict = cfg.i18n?.[lang] || cfg.i18n.en;
  const bundle = cfg.content?.[lang] || cfg.content.en;

  // NAV translation
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  // Page content translation
  document.querySelectorAll("[data-config]").forEach(el => {
    const path = el.getAttribute("data-config");
    let val = getByPath(bundle, path);

    // fallback root (event.city etc.)
    if (val === null) val = getByPath(cfg, path);

    if (val !== null && typeof val !== "object") {
      el.textContent = val;
    }
  });

  // Lists (booking guidance etc.)
  document.querySelectorAll("[data-list]").forEach(ul => {
    const path = ul.getAttribute("data-list");
    const items = getByPath(bundle, path);

    if (Array.isArray(items)) {
      ul.innerHTML = items.map(x => `<li>${x}</li>`).join("");
    }
  });

  // Hotels table
  renderHotels(bundle);

  // Apply button
  wireApply(bundle);

  // RTL for Arabic
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

/* ================================
   HOTELS TABLE
================================= */
function renderHotels(bundle) {
  const body = document.getElementById("hotelsBody");
  if (!body) return;

  const list = bundle.hotels?.list || [];

  body.innerHTML = list.map(h => `
    <tr>
      <td>${h.name}</td>
      <td>${h.distance}</td>
      <td>${h.rate}</td>
      <td>${h.booking}</td>
    </tr>
  `).join("");
}

/* ================================
   APPLY FORM
================================= */
function wireApply(bundle) {
  const btn = document.getElementById("openExternalForm");
  if (!btn) return;

  btn.href = bundle.apply.externalFormUrl;
}

/* ================================
   INIT
================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const cfg = await loadConfig();

  injectHeader(cfg);
  injectFooter(cfg);

  const savedLang =
    localStorage.getItem("lang") ||
    cfg.site.defaultLang ||
    "en";

  applyFullLanguage(cfg, savedLang);
});
