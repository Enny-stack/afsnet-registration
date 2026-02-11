let CONFIG = null;

async function loadConfig() {
  if (CONFIG) return CONFIG;
  const res = await fetch("./config.json", { cache: "no-store" });
  CONFIG = await res.json();
  return CONFIG;
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
  const tagline =
    cfg?.site?.tagline || "African Sub-Sovereign Governments Network";

  el.innerHTML = `
    <header>
      <div class="header-shell">
        <div class="header-inner">
          <div class="topbar">

            <a class="brand" href="./index.html" aria-label="${name} Home">
              <img class="site-logo" src="${logo}" alt="${name} logo" />
              <div>
                <h1>AfSNET</h1>
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
    cfg?.site?.externalLinks?.afreximbankUrl || "https://www.afreximbank.com/";

  const iatfUrl =
    cfg?.site?.externalLinks?.iatfUrl ||
    "https://www.intrafricantradefair.com/";

  el.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-container">

        <div class="footer-grid-3">

          <!-- LEFT: Brand -->
          <div class="footer-col brand-col">
            <div class="footer-brand">
              <img src="${cfg?.site?.logoSrc}"
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
              <a href="${afreximbankUrl}" target="_blank" rel="noopener">
                Afreximbank Website
              </a>
              <a href="${iatfUrl}" target="_blank" rel="noopener">
                IATF Website
              </a>
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
                <span class="label">Email:</span> afsnet@afreximbank.com
              </div>
              <div class="line">
                <span class="label">Tel:</span> +20-2-24564100
              </div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  `;
}

/* ================================
   LANGUAGE SYSTEM
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
    const path = el.getAttribute("data-config");
    const value = path.split(".").reduce((o, k) => (o ? o[k] : null), bundle);
    if (value !== null) el.textContent = value;
  });

  document.querySelectorAll("[data-list]").forEach(ul => {
    const path = ul.getAttribute("data-list");
    const items = path.split(".").reduce((o, k) => (o ? o[k] : null), bundle);

    if (Array.isArray(items)) {
      ul.innerHTML = items.map(x => `<li>${x}</li>`).join("");
    }
  });
}

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
  const savedLang = localStorage.getItem("lang") || "en";
  select.value = savedLang;

  applyLanguage(cfg, savedLang);
  applyConfigContent(cfg, savedLang);

  select.addEventListener("change", () => {
    const lang = select.value;
    applyLanguage(cfg, lang);
    applyConfigContent(cfg, lang);
  });
}

/* ================================
   INIT
================================= */

document.addEventListener("DOMContentLoaded", async () => {
  const cfg = await loadConfig();

  injectHeader(cfg);
  injectFooter(cfg);

  const savedLang = localStorage.getItem("lang") || "en";
  applyLanguage(cfg, savedLang);
  applyConfigContent(cfg, savedLang);
});
