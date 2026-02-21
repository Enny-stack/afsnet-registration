let CONFIG = null;

async function loadConfig() {
  if (CONFIG) return CONFIG;

  const res = await fetch("./config.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load config.json (${res.status})`);
  CONFIG = await res.json();
  return CONFIG;
}

function getByPath(obj, path) {
  if (!obj || !path) return null;
  return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj);
}

function getLang(cfg) {
  const url = new URL(window.location.href);
  const urlLang = url.searchParams.get("lang");
  const saved = localStorage.getItem("lang");
  const def = cfg?.site?.defaultLang || "en";
  const lang = (urlLang || saved || def).toLowerCase();
  return ["en", "fr", "ar"].includes(lang) ? lang : def;
}

function setLang(lang) {
  localStorage.setItem("lang", lang);
  // keep URL clean; reload is simplest for static sites
  const url = new URL(window.location.href);
  url.searchParams.delete("lang");
  window.location.href = url.toString();
}

function setHtmlLangDir(lang) {
  document.documentElement.lang = lang || "en";
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

function t(cfg, lang, key) {
  const val =
    cfg?.i18n?.[lang]?.[key] ??
    cfg?.i18n?.en?.[key] ??
    null;
  return typeof val === "string" ? val : null;
}

function c(cfg, lang, path) {
  // content lookup with fallback to English
  const val =
    getByPath(cfg?.content?.[lang], path) ??
    getByPath(cfg?.content?.en, path) ??
    null;
  return val;
}

function applyI18n(cfg, lang) {
  // Translate data-i18n elements if translation exists;
  // if missing, KEEP existing text (do not blank it).
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const translated = t(cfg, lang, key);
    if (translated !== null) el.textContent = translated;
  });
}

function applyContent(cfg, lang) {
  // Populate text nodes from content.* using data-config
  document.querySelectorAll("[data-config]").forEach(el => {
    const path = el.getAttribute("data-config");
    if (!path) return;
    const val = c(cfg, lang, path);
    if (val === null || val === undefined) return;

    // only set text for primitives
    if (typeof val === "string" || typeof val === "number") {
      el.textContent = String(val);
    }
  });

  // Populate UL/OL lists from arrays using data-list
  document.querySelectorAll("[data-list]").forEach(el => {
    const path = el.getAttribute("data-list");
    if (!path) return;

    const val = c(cfg, lang, path);
    if (!Array.isArray(val)) return;

    // clear and rebuild list
    el.innerHTML = "";
    val.forEach(item => {
      if (typeof item !== "string") return;
      const li = document.createElement("li");
      li.textContent = item;
      el.appendChild(li);
    });
  });
}

function applyEmailLinks(cfg) {
  document.querySelectorAll("[data-email]").forEach(a => {
    const path = a.getAttribute("data-email");
    if (!path) return;
    const email = getByPath(cfg, path);
    if (!email || typeof email !== "string") return;

    a.textContent = email;
    a.setAttribute("href", `mailto:${email}`);
  });
}

function setActiveNav() {
  const file = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach(a => {
    const href = (a.getAttribute("href") || "").replace("./", "");
    if (href === file) a.classList.add("active");
  });
}

function injectHeader(cfg, lang) {
  const el = document.getElementById("site-header");
  if (!el) return;

  const logoSrc = cfg?.site?.logoSrc || cfg?.site?.logo || "./assets/logo/afsnet-logo.jpg";
  const siteName = cfg?.site?.name || "AfSNET";

  el.innerHTML = `
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="./index.html" aria-label="${siteName}">
          <img class="brand-logo" src="${logoSrc}" alt="${siteName} logo" />
          <span class="brand-text">
            <span class="brand-name">${siteName}</span>
            <span class="brand-tagline">${cfg?.site?.tagline || ""}</span>
          </span>
        </a>

        <nav class="nav" aria-label="Primary">
          <a href="./index.html" data-i18n="nav.home">Home</a>
          <a href="./about.html" data-i18n="nav.about">About</a>
          <a href="./programme.html" data-i18n="nav.programme">Programme</a>
          <a href="./schedule-meeting.html" data-i18n="nav.schedule">Schedule Meeting</a>
          <a href="./event.html" data-i18n="nav.event">Event</a>
          <a href="./speakers-partners.html" data-i18n="nav.speakers">Speakers/Partners</a>
          <a href="./travel-visa.html" data-i18n="nav.travel">Travel & Visa</a>
          <a href="./media-press.html" data-i18n="nav.media">Media/Press</a>
          <a href="./hotels.html" data-i18n="nav.hotels">Hotels</a>
          <a class="cta" href="./apply.html" data-i18n="nav.apply">Apply</a>
          <a href="./contact.html" data-i18n="nav.contact">Contact</a>
        </nav>

        <div class="lang-switch" aria-label="Language switcher">
          <button type="button" class="btn tiny ${lang === "en" ? "primary" : "ghost"}" data-lang="en">EN</button>
          <button type="button" class="btn tiny ${lang === "fr" ? "primary" : "ghost"}" data-lang="fr">FR</button>
          <button type="button" class="btn tiny ${lang === "ar" ? "primary" : "ghost"}" data-lang="ar">AR</button>
        </div>
      </div>
    </header>
  `;

  el.querySelectorAll("[data-lang]").forEach(btn => {
    btn.addEventListener("click", () => setLang(btn.getAttribute("data-lang")));
  });
}

function injectFooter(cfg) {
  const el = document.getElementById("site-footer");
  if (!el) return;

  const year = new Date().getFullYear();
  const afrex = cfg?.site?.externalLinks?.afreximbankUrl || cfg?.site?.externalLinks?.afreximbank || "https://www.afreximbank.com";
  const iatf = cfg?.site?.externalLinks?.iatfUrl || cfg?.site?.externalLinks?.iatf || "https://www.iatf.africa";

  el.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-inner">
        <div class="muted small">© ${year} ${cfg?.site?.name || "AfSNET"}</div>
        <div class="footer-links small">
          <a href="${afrex}" target="_blank" rel="noopener">Afreximbank</a>
          <span class="muted">•</span>
          <a href="${iatf}" target="_blank" rel="noopener">IATF</a>
        </div>
      </div>
    </footer>
  `;
}

function setupApplyExternalForm(cfg, lang) {
  const btn = document.getElementById("openExternalForm");
  if (!btn) return;

  const url =
    c(cfg, lang, "apply.externalFormUrl") ||
    c(cfg, "en", "apply.externalFormUrl");

  if (typeof url === "string" && url.trim()) {
    btn.setAttribute("href", url.trim());
  }
}

function renderHotels(cfg, lang) {
  const tbody = document.getElementById("hotelsBody");
  if (!tbody) return;

  const list = c(cfg, lang, "hotels.list") || [];
  if (!Array.isArray(list)) return;

  tbody.innerHTML = "";

  list.forEach(row => {
    if (!row || typeof row !== "object") return;

    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = row.name ?? "";
    tr.appendChild(tdName);

    const tdDist = document.createElement("td");
    tdDist.textContent = row.distance ?? "";
    tr.appendChild(tdDist);

    const tdRate = document.createElement("td");
    tdRate.textContent = row.rate ?? "";
    tr.appendChild(tdRate);

    const tdBooking = document.createElement("td");
    const booking = row.booking ?? "";
    if (typeof booking === "string" && booking.trim().startsWith("http")) {
      const a = document.createElement("a");
      a.href = booking.trim();
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = booking.trim();
      tdBooking.appendChild(a);
    } else {
      tdBooking.textContent = booking;
    }
    tr.appendChild(tdBooking);

    tbody.appendChild(tr);
  });
}

async function init() {
  try {
    const cfg = await loadConfig();
    const lang = getLang(cfg);

    setHtmlLangDir(lang);

    injectHeader(cfg, lang);
    injectFooter(cfg);

    // apply translations/content AFTER header/footer injection
    applyI18n(cfg, lang);
    applyContent(cfg, lang);

    applyEmailLinks(cfg);
    setupApplyExternalForm(cfg, lang);
    renderHotels(cfg, lang);

    setActiveNav();
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", init);
