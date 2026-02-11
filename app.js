let CONFIG = null;

async function loadConfig() {
  if (CONFIG) return CONFIG;
  const res = await fetch("./config.json", { cache: "no-store" });
  CONFIG = await res.json();
  return CONFIG;
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj);
}

function setActiveNav() {
  const file = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach(a => {
    const href = (a.getAttribute("href") || "").replace("./", "");
    if (href === file) a.classList.add("active");
  });
}

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
                <h1>AfSNET</h1>
                <p>African Sub-Sovereign Governments Network</p>
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
    // ✅ NOW the header exists, so we can inject language dropdown
  injectLanguageSwitcher();
}
function injectLanguageSwitcher() {
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
}
function injectFooter(cfg) {
  const el = document.getElementById("site-footer");
  if (!el) return;

  const year = new Date().getFullYear();

  el.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-container">

        <div class="footer-grid-3">

          <!-- LEFT: Brand (must start at edge) -->
          <div class="footer-col brand-col">
            <div class="footer-brand">
             <img src="${cfg?.site?.logoSrc || './assets/logo/afsnet-logo.jpg'}"
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
          </div>

          <!-- MIDDLE: Quick Links -->
          <div class="footer-col links-col">
            <h4>Quick links</h4>
            <div class="footer-links">
              <a href="./about.html">About</a>
              <a href="./programme.html">Programmes</a>
              <a href="./apply.html">Calls / Apply</a>
              <a href="./event.html">Impact / Event</a>
              <a href="./contact.html">Contact</a>
            </div>
          </div>

          <!-- RIGHT: Address Box -->
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

              <div class="line">
                <span class="label">Fax:</span> +202-24564110; +202-24515008
              </div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  `;
}
function fillTextFromConfig(cfg) {
  // data-config="path.to.value"
  document.querySelectorAll("[data-config]").forEach(el => {
    const path = el.getAttribute("data-config");
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

  // data-list="path.to.array"
  document.querySelectorAll("[data-list]").forEach(ul => {
    const path = ul.getAttribute("data-list");
    const items = getByPath(cfg, path);
    if (Array.isArray(items)) {
      ul.innerHTML = items.map(x => `<li>${x}</li>`).join("");
      ul.classList.add("list");
    }
  });
}

function renderHotels(cfg) {
  const body = document.getElementById("hotelsBody");
  if (!body) return;
  const list = cfg.hotels?.list || [];
  body.innerHTML = list.map(h => `
    <tr>
      <td>${h.name || ""}</td>
      <td>${h.distance || ""}</td>
      <td>${h.rate || ""}</td>
      <td>${h.booking || ""}</td>
    </tr>
  `).join("");
}

function renderDownloads(cfg) {
  const ul = document.getElementById("downloadsList");
  if (!ul) return;
  const items = cfg.downloads?.items || [];
  ul.innerHTML = items.map(i => `
    <li><a href="${i.file}" target="_blank" rel="noopener">${i.label}</a></li>
  `).join("");
  ul.classList.add("list");
}

function wireApply(cfg) {
  const btn = document.getElementById("openExternalForm");
  if (!btn) return;
  const url = cfg.apply?.externalFormUrl;
  if (!url || url.includes("xxxxxxxx")) {
    btn.textContent = "External form (add link in config.json)";
    btn.setAttribute("href", "./contact.html");
    return;
  }
  btn.setAttribute("href", url);
}

document.addEventListener("DOMContentLoaded", async () => {
  const cfg = await loadConfig();
  injectHeader(cfg);
  injectFooter(cfg);
  fillTextFromConfig(cfg);
  renderHotels(cfg);
  renderDownloads(cfg);
  wireApply(cfg);
});
const translations = {
  en: {
    "nav.home": "Home",
    "nav.about": "About",
    "nav.programme": "Programme",
    "nav.event": "Event",
    "nav.speakers": "Speakers/Partners",
    "nav.travel": "Travel & Visa",
    "nav.media": "Media/Press",
    "nav.hotels": "Hotels",
    "nav.apply": "Apply",
    "nav.contact": "Contact"
  },

  fr: {
    "nav.home": "Accueil",
    "nav.about": "À propos",
    "nav.programme": "Programme",
    "nav.event": "Événement",
    "nav.speakers": "Intervenants / Partenaires",
    "nav.travel": "Voyage & Visa",
    "nav.media": "Médias / Presse",
    "nav.hotels": "Hôtels",
    "nav.apply": "Candidater",
    "nav.contact": "Contact"
  },

  ar: {
    "nav.home": "الرئيسية",
    "nav.about": "عن البرنامج",
    "nav.programme": "البرنامج",
    "nav.event": "الفعالية",
    "nav.speakers": "المتحدثون / الشركاء",
    "nav.travel": "السفر والتأشيرة",
    "nav.media": "الإعلام / الصحافة",
    "nav.hotels": "الفنادق",
    "nav.apply": "التسجيل",
    "nav.contact": "اتصل بنا"
  }
};
function applyLanguage(lang) {
  const dict = translations[lang];
  if (!dict) return;

  // Replace all elements that have data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  // Arabic direction switch
  if (lang === "ar") {
    document.documentElement.setAttribute("dir", "rtl");
  } else {
    document.documentElement.setAttribute("dir", "ltr");
  }

  // Save choice
  localStorage.setItem("lang", lang);
}
function injectLanguageSwitcher() {
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

  // Apply language immediately
  applyLanguage(savedLang);
applyConfigContent(window.__AFSNET_CFG, savedLang);
 

  // Switch instantly on change
  select.addEventListener("change", () => {
    applyLanguage(select.value);
     applyConfigContent(window.__AFSNET_CFG, select.value);
  });
}
function applyConfigContent(cfg, lang){
  const bundle = cfg?.content?.[lang] || cfg?.content?.en;
  if (!bundle) return;

  // Fill any element with data-config="path.to.key"
  document.querySelectorAll("[data-config]").forEach(el=>{
    const path = el.getAttribute("data-config");  // e.g. "home.headline"
    const value = path.split(".").reduce((o,k)=> (o ? o[k] : undefined), bundle);
    if (value !== undefined) el.textContent = value;
  });
}
