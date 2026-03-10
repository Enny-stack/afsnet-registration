/* ================================ 
   AfSNET Portal - app.js (UPDATED)
   ✅ Fixes site stuck on loading
   ✅ Keeps preloader safe
   ✅ Keeps language switcher working
   ✅ About page supports:
      - intro paragraphs
      - editions list
      - objectives slider
      - HOW AFSNET WORKS as 3 branded cards
      - config-driven background images
================================= */

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
    a.classList.toggle("active", href === file);
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

/* ================================
   ROOT (NON-LANGUAGE) FILL
================================= */
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
   SUMMIT / TICKER
================================= */
let __tickerTimer = null;
let __tickerIdx = 0;

function parseEventStartDate(cfg) {
  const raw = (cfg?.event?.dates || "").trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
    .replace(/[–—]/g, "-")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const yearMatch = cleaned.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;

  const monthMatch = cleaned.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i
  );
  const monthName = monthMatch ? monthMatch[1] : null;

  const dayMatch = cleaned.match(/\b(\d{1,2})(?:\s*-\s*\d{1,2})?\b/);
  const day = dayMatch ? Number(dayMatch[1]) : null;

  if (!year || !monthName || !day) return null;

  const d = new Date(`${monthName} ${day}, ${year} 09:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function formatCountdown(targetDate, lang) {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { label: (lang === "fr" ? "En cours" : lang === "ar" ? "جارٍ الآن" : "Live"), isLive: true };
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const mins = totalMinutes - days * 60 * 24 - hours * 60;

  const dLbl = (lang === "fr") ? "j" : (lang === "ar") ? "ي" : "d";
  const hLbl = (lang === "fr") ? "h" : (lang === "ar") ? "س" : "h";
  const mLbl = (lang === "fr") ? "min" : (lang === "ar") ? "د" : "m";

  return { label: `${days}${dLbl} ${hours}${hLbl} ${mins}${mLbl}`, isLive: false };
}

function getThemeText(lang) {
  return (lang === "fr")
    ? "Thème : Accélérer l’industrialisation infranationale : le rôle du commerce et de l’investissement à l’ère de la ZLECAf"
    : (lang === "ar")
    ? "الموضوع: تسريع التصنيع على المستوى دون السيادي: دور التجارة والاستثمار في عصر منطقة التجارة الحرة القارية الأفريقية"
    : "Theme: Scaling Up Sub-Sovereign Industrialisation: The Role of Trade and Investment in the AfCFTA Era";
}

function getLabelText(lang) {
  return (lang === "fr") ? "MISE À JOUR"
    : (lang === "ar") ? "تحديث"
    : "SUMMIT UPDATE";
}

function getStartsInText(lang) {
  return (lang === "fr") ? "Début dans"
    : (lang === "ar") ? "يبدأ خلال"
    : "Starts in";
}

function initHomeTicker(cfg, lang) {
  const track = document.getElementById("homeTickerTrack");
  if (!track) return;

  const msg =
    cfg?.i18n?.[lang]?.["home.announcement"] ||
    cfg?.i18n?.en?.["home.announcement"] ||
    "";

  const section = track.closest(".ticker");
  if (!msg.trim()) {
    if (section) section.style.display = "none";
    return;
  }
  if (section) section.style.display = "";

  const slides = msg
    .split(/(?:\.\s+|\n+)/)
    .map(s => s.trim())
    .filter(Boolean);

  const list = slides.length ? slides : [msg.trim()];

  const startDate = parseEventStartDate(cfg);
  const cd = startDate ? formatCountdown(startDate, lang) : null;

  if (!track.querySelector(".summit-ui")) {
    track.innerHTML = `
      <div class="summit-ui">
        <div class="summit-left">
          <div class="summit-label">
            <span class="status-dot" aria-hidden="true"></span>
            <span class="summit-label-text"></span>
          </div>
        </div>

        <div class="summit-middle">
          <div class="summit-slide" id="tickerSlide"></div>
          <div class="summit-theme" id="summitTheme"></div>
        </div>

        <div class="summit-right">
          <div class="countdown" id="countdownBox" style="display:none">
            <small class="countdown-small"></small>
            <span class="countdown-span"></span>
          </div>

          <div class="summit-actions">
            <a class="btn primary" href="./apply.html" data-ticker-register>Register</a>
          </div>
        </div>
      </div>
    `;
  }

  const labelEl = track.querySelector(".summit-label-text");
  if (labelEl) labelEl.textContent = getLabelText(lang);

  const regBtn = track.querySelector("[data-ticker-register]");
  if (regBtn) regBtn.textContent = (lang === "fr") ? "S’inscrire" : (lang === "ar") ? "سجّل الآن" : "Register";

  const themeEl = track.querySelector("#summitTheme");
  if (themeEl) themeEl.textContent = getThemeText(lang);

  const cdBox = track.querySelector("#countdownBox");
  const cdSmall = track.querySelector(".countdown-small");
  const cdSpan = track.querySelector(".countdown-span");

  if (cd && cdBox && cdSmall && cdSpan) {
    cdBox.style.display = "";
    cdSmall.textContent = getStartsInText(lang);
    cdSpan.textContent = cd.label;
  } else if (cdBox) {
    cdBox.style.display = "none";
  }

  const slideEl = track.querySelector("#tickerSlide");
  if (!slideEl) return;

  if (__tickerIdx >= list.length) __tickerIdx = 0;
  slideEl.textContent = list[__tickerIdx];

  if (__tickerTimer) clearInterval(__tickerTimer);

  const intervalMs = Math.max(2500, Number(cfg?.site?.tickerRotateMs) || 4500);

  __tickerTimer = setInterval(() => {
    if (list.length <= 1) return;

    slideEl.classList.add("is-out");

    setTimeout(() => {
      __tickerIdx = (__tickerIdx + 1) % list.length;
      slideEl.textContent = list[__tickerIdx];
      slideEl.classList.remove("is-out");
    }, 280);

  }, intervalMs);
}

/* ================================
   ABOUT PAGE HELPERS
================================= */

function applyAboutImages(cfg, lang) {
  const bundle = cfg?.content?.[lang]?.about || cfg?.content?.en?.about;

  const heroImage = bundle?.heroImage;
  const howWorksImages = bundle?.howWorksImages || {};

  const heroEl = document.querySelector(".bg-about-hero");
  if (heroEl && heroImage) {
    heroEl.style.setProperty("--bg-image", `url("${heroImage}")`);
  }

  const stageEl = document.querySelector(".bg-work-stage");
  if (stageEl && howWorksImages.stage) {
    stageEl.style.setProperty("--bg-image", `url("${howWorksImages.stage}")`);
  }

  const processEl = document.querySelector(".bg-work-process");
  if (processEl && howWorksImages.process) {
    processEl.style.setProperty("--bg-image", `url("${howWorksImages.process}")`);
  }

  const outputEl = document.querySelector(".bg-work-output");
  if (outputEl && howWorksImages.output) {
    outputEl.style.setProperty("--bg-image", `url("${howWorksImages.output}")`);
  }
}

/* ================================
   ABOUT PAGE (CONFIG-DRIVEN)
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

  if (!Array.isArray(headers) || headers.length !== 3 || !Array.isArray(rows) || !rows.length) {
    grid.innerHTML = "";
    return;
  }

  const col0 = rows.map(r => r?.[0] ?? "").filter(Boolean);
  const col1 = rows.map(r => r?.[1] ?? "").filter(Boolean);
  const col2 = rows.map(r => r?.[2] ?? "").filter(Boolean);

  grid.innerHTML = `
    <div class="work-card bg-card bg-work-stage">
      <div class="work-overlay">
        <h4>${headers[0]}</h4>
        <ul class="list">
          ${col0.map(item => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    </div>

    <div class="work-card bg-card bg-work-process">
      <div class="work-overlay">
        <h4>${headers[1]}</h4>
        <ul class="list">
          ${col1.map(item => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    </div>

    <div class="work-card bg-card bg-work-output">
      <div class="work-overlay">
        <h4>${headers[2]}</h4>
        <ul class="list">
          ${col2.map(item => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;

  applyAboutImages(cfg, lang);
}

function renderAboutPage(cfg, lang) {
  renderAboutIntro(cfg, lang);
  renderAboutEditions(cfg, lang);
  renderAboutCtas(cfg, lang);
  renderAboutObjectives(cfg, lang);
  renderHowWorks(cfg, lang);
  applyAboutImages(cfg, lang);

  initSnapSlider("objectivesSlider");
}

/* ================================
   SIMPLE SLIDER (OBJECTIVES)
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

  setActive(0);

  scroller.onscroll = () => {
    window.requestAnimationFrame(() => setActive(currentIndex()));
  };

  dots.forEach(d => {
    d.onclick = () => {
      const i = Number(d.getAttribute("data-dot-index"));
      scrollToIndex(i);
    };
  });

  if (btnPrev) btnPrev.onclick = () => {
    const i = Math.max(0, currentIndex() - 1);
    scrollToIndex(i);
  };

  if (btnNext) btnNext.onclick = () => {
    const iNow = currentIndex();
    const last = cards.length - 1;

    if (iNow >= last) {
      const target = document.getElementById("howWorks");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.remove("flash-highlight");
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

  select.addEventListener("change", () => {
    const lang = select.value;

    applyLanguage(cfg, lang);
    fillRootConfig(cfg);
    applyConfigContent(cfg, lang);
    wireApply(cfg, lang);
    renderDownloads(cfg);

    initHomeTicker(cfg, lang);
    renderAboutPage(cfg, lang);
  });
}

/* ================================
   HOME HERO SLIDER
================================= */
let heroTimer = null;

function initHeroSlider(){
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
   PRELOADER
================================= */
function hidePreloaderSoon() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;
  preloader.classList.add("is-hidden");
  setTimeout(() => preloader.remove(), 450);
}

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
    renderAboutPage(cfg, savedLang);

    initHeroSlider();
  } finally {
    hidePreloaderSoon();
  }
});

window.addEventListener("load", hidePreloaderSoon);
