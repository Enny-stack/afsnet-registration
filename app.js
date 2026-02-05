/* ===== app.js ===== */

/** Safe dot-path getter: getByPath(obj, "a.b.c") */
function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

const DEFAULT_CONFIG = {
  site: {
    programName: "AfSNET",
    orgName: "Afreximbank",
    tagline: "Afreximbank programme",
    baseTitle: "AfSNET",
    supportEmail: "afsnet@afreximbank.com",
    phone: "TBC",
    format: "Hybrid"
  },
  event: { dates: "TBC", venue: "TBC", city: "TBC", country: "TBC" },
  registration: { formEndpoint: "https://formspree.io/f/REPLACE_ME", redirectUrl: "./thank-you.html", ajaxEnabled: false }
};

async function loadConfig() {
  try {
    const res = await fetch("./config.json", { cache: "no-store" });
    if (!res.ok) throw new Error("config fetch failed");
    const cfg = await res.json();
    return { ...DEFAULT_CONFIG, ...cfg };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function deriveConfig(cfg) {
  const city = cfg.event?.city || "TBC";
  const country = cfg.event?.country || "TBC";
  cfg.event = cfg.event || {};
  cfg.event.cityCountry = (city === "TBC" && country === "TBC") ? "TBC" : `${city}, ${country}`;
  return cfg;
}

function injectHeaderFooter(cfg) {
  const headerHost = document.getElementById("site-header");
  const footerHost = document.getElementById("site-footer");

  const navItems = [
    { label: "Home", href: "./index.html" },
    { label: "About", href: "./about.html" },
    { label: "Programme", href: "./programme.html" },
    { label: "Event", href: "./event.html" },
    { label: "Speakers/Partners", href: "./speakers-partners.html" },
    { label: "Travel & Visa", href: "./travel-visa.html" },
    { label: "Media/Press", href: "./media-press.html" },
    { label: "Hotels", href: "./hotels.html" },
    { label: "Apply", href: "./apply.html", cta: true },
    { label: "Contact", href: "./contact.html" }
  ];

  // determine current page for active nav
  let current = window.location.pathname.split("/").pop();
  if (!current) current = "index.html"; // when path ends with "/"
  if (current === "") current = "index.html";

  const navHtml = navItems.map(item => {
    const hrefFile = item.href.replace("./", "");
    const isActive = (current === hrefFile) || (current === "" && hrefFile === "index.html");
    const cls = [
      isActive ? "active" : "",
      item.cta ? "cta" : ""
    ].join(" ").trim();

    return `<a class="${escapeHtml(cls)}" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`;
  }).join("");

  if (headerHost) {
    headerHost.innerHTML = `
      <header>
        <div class="container topbar">
          <a class="brand" href="./index.html" aria-label="${escapeHtml(cfg.site.programName)} Home">
            <div class="logo" aria-hidden="true"></div>
            <div>
              <h1>${escapeHtml(cfg.site.programName)}</h1>
              <p>${escapeHtml(cfg.site.tagline)}</p>
            </div>
          </a>
          <nav class="nav" aria-label="Primary navigation">
            ${navHtml}
          </nav>
        </div>
      </header>
    `;
  }

  const year = new Date().getFullYear();
  if (footerHost) {
    footerHost.innerHTML = `
      <footer class="container">
        <div class="footer-row">
          <div><strong style="color:var(--navy)">${escapeHtml(cfg.site.orgName)}</strong> <span class="muted">— ${escapeHtml(cfg.site.programName)}</span></div>
          <div>© <span>${year}</span> ${escapeHtml(cfg.site.orgName)}. All rights reserved.</div>
        </div>
      </footer>
    `;
  }
}

function applyBindings(cfg) {
  // Text bindings: <span data-config="event.dates"></span>
  document.querySelectorAll("[data-config]").forEach(el => {
    const path = el.getAttribute("data-config");
    const val = getByPath(cfg, path);
    if (val !== undefined && val !== null) el.textContent = val;
  });

  // Email bindings: <a data-email="site.supportEmail"></a>
  document.querySelectorAll("[data-email]").forEach(a => {
    const path = a.getAttribute("data-email");
    const email = getByPath(cfg, path);
    if (email) {
      a.textContent = email;
      a.setAttribute("href", `mailto:${email}`);
    }
  });

  // Lists: <ul data-list="about.objectives"></ul>
  document.querySelectorAll("[data-list]").forEach(ul => {
    const path = ul.getAttribute("data-list");
    const items = getByPath(cfg, path);
    if (Array.isArray(items)) {
      ul.innerHTML = items.map(x => `<li>${escapeHtml(x)}</li>`).join("");
      ul.classList.add("list");
    }
  });
}

function renderProgrammeFlow(cfg) {
  const tbody = document.getElementById("programmeFlowBody");
  const rows = cfg.programme?.flow;
  if (!tbody || !Array.isArray(rows)) return;

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.time ?? "")}</td>
      <td>${escapeHtml(r.session ?? "")}</td>
      <td>${escapeHtml(r.notes ?? "")}</td>
    </tr>
  `).join("");
}

function renderHotels(cfg) {
  const tbody = document.getElementById("hotelsBody");
  const rows = cfg.hotels?.list;
  if (!tbody || !Array.isArray(rows)) return;

  tbody.innerHTML = rows.map(h => `
    <tr>
      <td>${escapeHtml(h.name ?? "")}</td>
      <td>${escapeHtml(h.distance ?? "")}</td>
      <td>${escapeHtml(h.rate ?? "")}</td>
      <td>${escapeHtml(h.booking ?? "")}</td>
    </tr>
  `).join("");
}

function renderSpeakersPartners(cfg) {
  const speakersHost = document.getElementById("speakersGrid");
  const partnersHost = document.getElementById("partnersGrid");

  const speakers = cfg.speakersPartners?.speakers;
  const partners = cfg.speakersPartners?.partners;

  if (speakersHost && Array.isArray(speakers)) {
    speakersHost.innerHTML = speakers.map(s => `
      <div class="box">
        <span class="tag">Speaker</span>
        <h4 style="margin:10px 0 4px;color:var(--navy)">${escapeHtml(s.name ?? "")}</h4>
        <div class="muted small">${escapeHtml(s.title ?? "")}${s.org ? ` — ${escapeHtml(s.org)}` : ""}</div>
        <div class="muted small" style="margin-top:6px">Topic: ${escapeHtml(s.topic ?? "TBC")}</div>
      </div>
    `).join("");
  }

  if (partnersHost && Array.isArray(partners)) {
    partnersHost.innerHTML = partners.map(p => `
      <div class="box">
        <span class="tag">Partner</span>
        <h4 style="margin:10px 0 4px;color:var(--navy)">${escapeHtml(p.name ?? "")}</h4>
        <div class="muted small">Role: ${escapeHtml(p.role ?? "TBC")}</div>
      </div>
    `).join("");
  }
}

function setupRegistration(cfg) {
  const form = document.getElementById("afsnetForm");
  const statusEl = document.getElementById("status");
  const submitBtn = document.getElementById("submitBtn");

  if (!form) return;

  // Set endpoint + redirect
  if (cfg.registration?.formEndpoint) form.setAttribute("action", cfg.registration.formEndpoint);
  const redirectInput = form.querySelector('input[name="_redirect"]');
  if (redirectInput && cfg.registration?.redirectUrl) redirectInput.value = cfg.registration.redirectUrl;

  // Warn if placeholder endpoint
  if (statusEl && String(form.action).includes("REPLACE_ME")) {
    statusEl.style.display = "block";
    statusEl.className = "status bad";
    statusEl.textContent = "Admin note: Replace registration.formEndpoint in config.json with your real form endpoint.";
  }

  // Optional AJAX submit
  if (!cfg.registration?.ajaxEnabled) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const gotcha = form.querySelector('input[name="_gotcha"]');
    if (gotcha && gotcha.value) return;

    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.className = "status";
      statusEl.textContent = "Submitting…";
    }
    if (submitBtn) submitBtn.disabled = true;

    try {
      const data = new FormData(form);
      const res = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { "Accept": "application/json" }
      });

      if (res.ok) {
        if (statusEl) {
          statusEl.className = "status ok";
          statusEl.textContent = "Submitted. Check your email for confirmation.";
        }
        form.reset();
      } else {
        if (statusEl) {
          statusEl.className = "status bad";
          statusEl.textContent = "Submission failed. Please try again.";
        }
      }
    } catch {
      if (statusEl) {
        statusEl.className = "status bad";
        statusEl.textContent = "Network error. Please try again.";
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

(async function init() {
  let cfg = await loadConfig();
  cfg = deriveConfig(cfg);

  injectHeaderFooter(cfg);
  applyBindings(cfg);

  renderProgrammeFlow(cfg);
  renderHotels(cfg);
  renderSpeakersPartners(cfg);
  setupRegistration(cfg);

  // Base title convention
  const pageTitle = document.querySelector("meta[name='page-title']")?.getAttribute("content");
  if (pageTitle) document.title = `${cfg.site.baseTitle} | ${pageTitle}`;
})();
