/* ===== app.js (AfSNET) =====
   - Injects shared header/footer
   - Sets active nav item
   - Fills data-config + data-list content
   - Adds mobile nav toggle
*/

const SITE = {
  brandTitle: "AfSNET",
  brandTagline: "Afreximbank programme",
  nav: [
    { href: "./index.html", label: "Home", key: "Home" },
    { href: "./about.html", label: "About", key: "About" },
    { href: "./programme.html", label: "Programme", key: "Programme" },
    { href: "./event.html", label: "Event", key: "Event" },
    { href: "./speakers-partners.html", label: "Speakers/Partners", key: "Speakers/Partners" },
    { href: "./travel-visa.html", label: "Travel & Visa", key: "Travel & Visa" },
    { href: "./media-press.html", label: "Media/Press", key: "Media/Press" },
    { href: "./hotels.html", label: "Hotels", key: "Hotels" },
    { href: "./apply.html", label: "Apply", key: "Apply", cta: true },
    { href: "./contact.html", label: "Contact", key: "Contact" }
  ]
};

// Optional content config (you can edit these later)
const CONFIG = {
  home: {
    pill: "Applications open",
    headline: "Register for the AfSNET programme",
    intro:
      "This portal supports participant registration and shares event information, travel guidance, hotels, and media resources.",
    tip:
      "Tip: Keep this page short. Put details inside the relevant pages so people don’t get lost.",
    facts: { dates: "TBC", location: "TBC", format: "Hybrid" },
    canDo: [
      "Register participation (Apply)",
      "See programme structure and event info",
      "Check travel & visa guidance",
      "View recommended hotels",
      "Access media/press information"
    ]
  }
};

/* ---------- Helpers ---------- */
function getPageTitleKey() {
  const meta = document.querySelector('meta[name="page-title"]');
  if (meta && meta.content) return meta.content.trim();

  // fallback: detect from filename
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (file.includes("index")) return "Home";
  if (file.includes("about")) return "About";
  if (file.includes("programme")) return "Programme";
  if (file.includes("event")) return "Event";
  if (file.includes("speakers")) return "Speakers/Partners";
  if (file.includes("travel")) return "Travel & Visa";
  if (file.includes("media")) return "Media/Press";
  if (file.includes("hotels")) return "Hotels";
  if (file.includes("apply")) return "Apply";
  if (file.includes("contact")) return "Contact";
  return "";
}

function get(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function normalizeHref(href) {
  // compare by filename only (works on GitHub Pages + local)
  try {
    const u = new URL(href, location.href);
    return (u.pathname.split("/").pop() || "").toLowerCase();
  } catch {
    return (href.split("/").pop() || "").toLowerCase();
  }
}

function currentFile() {
  return (location.pathname.split("/").pop() || "index.html").toLowerCase();
}

/* ---------- Header/Footer Injection ---------- */
function renderHeader(activeKey) {
  const links = SITE.nav
    .map(item => {
      const cls = ["nav-link"];
      if (item.cta) cls.push("cta");
      const isActive = item.key === activeKey;
      if (isActive) cls.push("active");

      return `<a class="${cls.join(" ")}" href="${item.href}" ${isActive ? 'aria-current="page"' : ""}>
        ${item.label}
      </a>`;
    })
    .join("");

  return `
<header class="site-header">
  <div class="container topbar">
    <a class="brand" href="./index.html" aria-label="${SITE.brandTitle} Home">
      <div class="logo" aria-hidden="true"></div>
      <div>
        <h1>${SITE.brandTitle}</h1>
        <p>${SITE.brandTagline}</p>
      </div>
    </a>

    <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">
      <span class="nav-toggle-bar" aria-hidden="true"></span>
      <span class="nav-toggle-bar" aria-hidden="true"></span>
      <span class="nav-toggle-bar" aria-hidden="true"></span>
    </button>

    <nav class="nav" aria-label="Primary navigation">
      ${links}
    </nav>
  </div>
</header>
`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return `
<footer class="site-footer">
  <div class="container">
    <div class="footer-row">
      <div><strong style="color:var(--navy)">Afreximbank</strong> <span class="muted">— AfSNET</span></div>
      <div>© <span id="year">${year}</span> Afreximbank. All rights reserved.</div>
    </div>
  </div>
</footer>
`;
}

function injectSharedLayout() {
  const activeKey = getPageTitleKey();
  const headerHost = document.getElementById("site-header");
  const footerHost = document.getElementById("site-footer");

  if (headerHost) headerHost.innerHTML = renderHeader(activeKey);
  if (footerHost) footerHost.innerHTML = renderFooter();

  // If header wasn't injected (older pages), still try to set active on existing nav
  setActiveNavFallback(activeKey);
}

/* ---------- Active Nav Fallback (for pages with static header) ---------- */
function setActiveNavFallback(activeKey) {
  const nav = document.querySelector("nav.nav");
  if (!nav) return;

  const links = nav.querySelectorAll("a[href]");
  const here = currentFile();

  links.forEach(a => {
    const target = normalizeHref(a.getAttribute("href"));
    const isActive = (activeKey && a.textContent.trim() === activeKey) || target === here;

    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/* ---------- Content Binding ---------- */
function applyDataConfig() {
  const nodes = document.querySelectorAll("[data-config]");
  if (!nodes.length) return;

  nodes.forEach(el => {
    const key = el.getAttribute("data-config");
    const value = get(CONFIG, key);
    if (value === undefined || value === null) return;

    // Keep it simple: fill text
    el.textContent = String(value);
  });
}

function applyDataLists() {
  const nodes = document.querySelectorAll("[data-list]");
  if (!nodes.length) return;

  nodes.forEach(el => {
    const key = el.getAttribute("data-list");
    const items = get(CONFIG, key);
    if (!Array.isArray(items) || items.length === 0) return;

    // Replace list contents
    el.innerHTML = items.map(x => `<li>${escapeHtml(String(x))}</li>`).join("");
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

/* ---------- Mobile Nav Toggle ---------- */
function enableMobileNav() {
  const btn = document.querySelector(".nav-toggle");
  const nav = document.querySelector("nav.nav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Close nav on link click (mobile)
  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    nav.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  });
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  injectSharedLayout();
  applyDataConfig();
  applyDataLists();
  enableMobileNav();

  // If there's a #year somewhere (older pages), fill it too
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});
