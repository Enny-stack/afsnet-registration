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

  el.innerHTML = `
    <header>
      <div class="container topbar">
        <a class="brand" href="./index.html" aria-label="${cfg.site?.name || "AfSNET"} Home">
          <div class="logo" aria-hidden="true"></div>
          <div>
            <h1>${cfg.site?.name || "AfSNET"}</h1>
            <p>${cfg.site?.tagline || ""}</p>
          </div>
        </a>

        <nav class="nav" aria-label="Primary navigation">
          <a href="./index.html">Home</a>
          <a href="./about.html">About</a>
          <a href="./programme.html">Programme</a>
          <a href="./event.html">Event</a>
          <a href="./speakers-partners.html">Speakers/Partners</a>
          <a href="./travel-visa.html">Travel & Visa</a>
          <a href="./media-press.html">Media/Press</a>
          <a href="./hotels.html">Hotels</a>
          <a class="cta" href="./apply.html">Apply</a>
          <a href="./contact.html">Contact</a>
        </nav>
      </div>
    </header>
  `;
  setActiveNav();
}

function injectFooter(cfg) {
  const el = document.getElementById("site-footer");
  if (!el) return;

  const year = new Date().getFullYear();

  // Optional: pull email/phone from config if present
  const supportEmail = cfg?.site?.supportEmail || "afsnet@afreximbank.com";
  const phone = cfg?.site?.phone || "TBC";

  el.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">

          <!-- Left: AfSNET identity -->
          <div class="footer-col">
            <div class="footer-brand">
              <div class="footer-logo" aria-hidden="true"></div>
              <div>
                <p class="footer-title">African Sub-Sovereign Governments Network (AfSNET)</p>
                <p class="footer-sub">
                  Connecting African states, investors, and projects through a trusted investment network.
                </p>
              </div>
            </div>

            <div class="footer-bottom">
              <div>
                © ${year} Afreximbank / The African Sub-Sovereign Governments Network (AfSNET). All rights reserved.
              </div>
            </div>
          </div>

          <!-- Right: Links + Address -->
          <div class="footer-col">
            <h4>Quick links</h4>
            <div class="footer-links">
              <a href="./about.html">About</a>
              <a href="./programme.html">Programmes</a>
              <a href="./apply.html">Calls / Apply</a>
              <a href="./event.html">Impact / Event</a>
              <a href="./contact.html">Contact</a>
            </div>

            <div style="height:14px"></div>

            <div class="footer-contact">
              <div class="line">
                <span class="label">Afreximbank Headquarters – Cairo, Egypt</span>
              </div>
              <div class="line">
                72 (B) El-Maahad El-Eshteraky Street – Heliopolis, Cairo<br/>
                11341, Egypt
              </div>

              <div class="line">
                <span class="label">Postal Address:</span>
                P.O. Box 613 Heliopolis, Cairo 11757, Egypt
              </div>

              <div class="line">
                <span class="label">Email:</span>
                <a href="mailto:${supportEmail}">${supportEmail}</a>
              </div>

              <div class="line">
                <span class="label">Tel:</span>
                ${phone}
              </div>

              <div class="line">
                <span class="label">Fax:</span>
                +202-24564110; +202-24515008
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
