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
   HEADER INJECTION (NO DROPDOWNS)
================================= */

function injectHeader(cfg) {
  const el = document.getElementById("site-header");
  if (!el) return;

  const logoSrc = cfg?.site?.logoSrc || "./assets/logo/afsnet-logo.jpg";
  const name = cfg?.site?.name || "AfSNET";
  const tagline = cfg?.site?.tagline || "";

  const langs = Object.keys(cfg?.i18n || { en: {} });
  const langOptions = langs
    .map(l => `<option value="${l}">${String(l).toUpperCase()}</option>`)
    .join("");

  // ✅ Make sure these filenames match your repo EXACTLY
  el.innerHTML = `
    <header>
      <div class="header-shell">
        <div class="header-inner">
          <div class="topbar">

            <a class="brand" href="./index.html" aria-label="${name}">
              <img class="site-logo" src="${logoSrc}" alt="${name} logo" />
              <div class="brand-text">
                <h1>${name}</h1>
                <p>${tagline}</p>
              </div>
            </a>

            <div class="header-nav-wrap">
              <nav class="nav nav-primary" aria-label="Primary navigation">
                <a href="./index.html" data-i18n="nav.home">Home</a>
                <a href="./about.html" data-i18n="nav.about">About</a>
                <a href="./programme.html" data-i18n="nav.programme">Programme</a>
                <a href="./schedule.html" data-i18n="nav.schedule">Schedule Meeting</a>
                <a href="./event.html" data-i18n="nav.event">Event</a>
                <a href="./speakers-partners.html" data-i18n="nav.speakersPartners">Speakers/Partners</a>
                <a href="./media-press.html" data-i18n="nav.mediaPress">Media/Press</a>
                <a href="./travel-visa.html" data-i18n="nav.travelVisa">Travel & Visa</a>
                <a href="./hotels.html" data-i18n="nav.hotels">Hotels</a>
              </nav>

              <nav class="nav nav-actions" aria-label="Actions">
                <a class="cta" href="./apply.html" data-i18n="nav.apply">Apply</a>
                <a href="./contact.html" data-i18n="nav.contact">Contact</a>
              </nav>
            </div>

            <div class="lang-switch">
              <select id="langSelect" aria-label="Language selector">
                ${langOptions}
              </select>
            </div>

          </div>
        </div>
      </div>
    </header>
  `;
}

/* ================================
   FOOTER INJECTION (RESTORE STYLES)
   IMPORTANT: Uses your existing
   .footer-links a styling
================================= */

function injectFooter(cfg) {
  const el = document.getElementById("site-footer");
  if (!el) return;

  const logoSrc = cfg?.site?.logoSrc || "./assets/logo/afsnet-logo.jpg";
  const name = cfg?.site?.name || "AfSNET";
  const tagline = cfg?.site?.tagline || "African Sub-Sovereign Governments Network";

  const supportEmail = cfg?.site?.supportEmail || "afsnet@afreximbank.com";
  const phone = cfg?.site?.phone || "";

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
              <img class="footer-logo-img" src="${logoSrc}" alt="${name} logo" />
              <div>
                <p class="footer-title">${name}</p>
                <p class="footer-sub">${tagline}</p>
              </div>
            </div>

            <p style="margin-top:12px; color: rgba(255,255,255,.78); max-width: 520px;">
              <span data-i18n="footer.aboutLine">
                Connecting African states, investors, and projects through a trusted investment network.
              </span>
            </p>

            <!-- ✅ THESE TWO BUTTONS USE YOUR EXISTING FOOTER PILL STYLE -->
            <div class="footer-links" style="margin-top:14px;">
              <a href="${afreximbankUrl}" target="_blank" rel="noopener" data-i18n="footer.afreximbankWebsite">Afreximbank Website</a>
              <a href="${iatfUrl}" target="_blank" rel="noopener" data-i18n="footer.iatfWebsite">IATF Website</a>
            </div>

            <div class="footer-bottom" style="margin-top:16px;">
              <div>© 2026 Afreximbank / AfSNET. <span data-i18n="footer.rights">All rights reserved.</span></div>
            </div>
          </div>

          <div class="footer-col links-col">
            <h4 data-i18n="footer.quickLinks">Quick links</h4>
            <div class="footer-links">
              <a href="./about.html" data-i18n="nav.about">About</a>
              <a href="./programme.html" data-i18n="nav.programme">Programme</a>
              <a href="./apply.html" data-i18n="nav.apply">Apply</a>
              <a href="./event.html" data-i18n="nav.event">Event</a>
              <a href="./contact.html" data-i18n="nav.contact">Contact</a>
            </div>
          </div>

          <div class="footer-col address-col">
            <h4 data-i18n="footer.hq">Afreximbank Headquarters – Cairo, Egypt</h4>

            <div class="footer-contact">
              <div>
                <div class="label" data-i18n="footer.emailLabel">Email:</div>
                <div class="line">
                  <a href="mailto:${supportEmail}" style="color: rgba(255,255,255,.88)">${supportEmail}</a>
                </div>
              </div>

              <div>
                <div class="label" data-i18n="footer.telLabel">Tel:</div>
                <div class="line">${phone}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  `;
}

/* ================================
   I18N: DO NOT BLANK CONTENT
================================= */

function applyLangDir(lang) {
  const dir = (lang === "ar") ? "rtl" : "ltr";
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", dir);
}

function applyI18n(cfg, lang) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;

    // ✅ fallback to English
    const t = cfg?.i18n?.[lang]?.[key] ?? cfg?.i18n?.en?.[key];

    // ✅ do nothing if missing (prevents blanks)
    if (t === null || t === undefined || t === "") return;

    el.textContent = t;
  });
}

function applyConfigContent(cfg, lang) {
  const bundle = cfg?.content?.[lang] ?? cfg?.content?.en ?? null;
  if (!bundle) return;

  document.querySelectorAll("[data-config]").forEach(el => {
    const path = el.getAttribute("data-config");
    if (!path) return;

    const mode = el.getAttribute("data-config-mode") || "text";
    const val = getByPath(bundle, path);

    // ✅ do nothing if missing (prevents blanks)
    if (val === null || val === undefined || val === "") return;

    if (mode === "html") el.innerHTML = val;
    else el.textContent = val;
  });
}

function applyEventFields(cfg) {
  const ev = cfg?.event || {};
  document.querySelectorAll("[data-event]").forEach(el => {
    const key = el.getAttribute("data-event");
    if (!key) return;
    const val = ev[key];
    if (val === null || val === undefined || val === "") return;
    el.textContent = val;
  });
}

function setupLanguageSwitch(cfg) {
  const select = document.getElementById("langSelect");
  if (!select) return;

  const saved = localStorage.getItem("afsnet_lang");
  const initial = saved || cfg?.site?.defaultLang || "en";
  select.value = initial;

  applyLangDir(initial);
  applyI18n(cfg, initial);
  applyConfigContent(cfg, initial);
  applyEventFields(cfg);

  select.addEventListener("change", () => {
    const lang = select.value || "en";
    localStorage.setItem("afsnet_lang", lang);

    applyLangDir(lang);
    applyI18n(cfg, lang);
    applyConfigContent(cfg, lang);
    applyEventFields(cfg);
  });
}

/* ================================
   PRELOADER (IF PRESENT)
================================= */

function setupPreloader() {
  const pre = document.querySelector(".preloader");
  if (!pre) return;

  window.addEventListener("load", () => {
    pre.classList.add("is-hidden");
    setTimeout(() => pre.remove(), 450);
  });
}

/* ================================
   INIT
================================= */

(async function init() {
  const cfg = await loadConfig();
  injectHeader(cfg);
  injectFooter(cfg);

  setupLanguageSwitch(cfg);
  setActiveNav();
  setupPreloader();
})();
