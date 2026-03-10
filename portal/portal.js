const SUPABASE_URL = "https://wzxszvuokbbmbqxwmfhd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4enN6dnVva2JibWJxeHdtZmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTY2NTEsImV4cCI6MjA4ODczMjY1MX0.IdtqNgspWuLHOujkOuFSlUU8uz_zLjw0RgvcsmXQfHQ";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let DIRECTORY_CACHE = [];
let CURRENT_USER = null;
let CURRENT_PARTICIPANT = null;

async function login() {
  const emailInput = document.getElementById("email");
  const email = emailInput ? emailInput.value.trim() : "";

  if (!email) {
    alert("Please enter your email address.");
    return;
  }

  const redirectTo = `${window.location.origin}${window.location.pathname.replace("login.html", "dashboard.html")}`;

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Check your email for your login link.");
}

async function logoutUser() {
  await sb.auth.signOut();
  window.location.href = "./login.html";
}

async function getSessionUser() {
  const { data, error } = await sb.auth.getUser();
  if (error) {
    console.error("Error getting user:", error);
    return null;
  }
  return data.user || null;
}

async function ensureSignedIn() {
  const user = await getSessionUser();

  if (!user) {
    window.location.href = "./login.html";
    return null;
  }

  CURRENT_USER = user;

  const userStatus = document.getElementById("userStatus");
  if (userStatus) {
    userStatus.textContent = `Signed in as ${user.email}`;
  }

  await ensureParticipantLinked();
  return user;
}

async function ensureParticipantLinked() {
  if (!CURRENT_USER) return null;

  const { data: participant, error } = await sb
    .from("participants")
    .select("*")
    .eq("email", CURRENT_USER.email)
    .maybeSingle();

  if (error) {
    console.error("Error loading participant:", error);
    return null;
  }

  if (!participant) {
    alert("Your email is not yet approved for the AfSNET meeting portal.");
    await logoutUser();
    return null;
  }

  if (!participant.is_approved) {
    alert("Your portal access is still awaiting approval.");
    await logoutUser();
    return null;
  }

  CURRENT_PARTICIPANT = participant;

  if (!participant.auth_user_id) {
    const { error: updateError } = await sb
      .from("participants")
      .update({ auth_user_id: CURRENT_USER.id })
      .eq("id", participant.id);

    if (updateError) {
      console.error("Error linking auth user:", updateError);
    } else {
      CURRENT_PARTICIPANT.auth_user_id = CURRENT_USER.id;
    }
  }

  return CURRENT_PARTICIPANT;
}

async function loadDirectory() {
  const grid = document.getElementById("directoryGrid");
  const info = document.getElementById("resultsInfo");

  if (!grid || !info) return;

  info.textContent = "Loading participants...";
  grid.innerHTML = "";

  const { data, error } = await sb
    .from("participants")
    .select("id, full_name, organisation, country, participant_type, meeting_interest, sectors, bio, email")
    .eq("is_approved", true)
    .eq("is_visible_in_directory", true)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Directory load error:", error);
    info.textContent = "Could not load participant directory.";
    grid.innerHTML = `<div class="empty">Unable to load participants right now.</div>`;
    return;
  }

  DIRECTORY_CACHE = Array.isArray(data) ? data : [];
  renderDirectory();
}

function renderDirectory() {
  const grid = document.getElementById("directoryGrid");
  const info = document.getElementById("resultsInfo");

  if (!grid || !info) return;

  const search = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  const typeFilter = document.getElementById("typeFilter")?.value || "";
  const interestFilter = document.getElementById("interestFilter")?.value || "";

  const filtered = DIRECTORY_CACHE.filter(person => {
    const haystack = [
      person.full_name || "",
      person.organisation || "",
      person.country || "",
      person.participant_type || "",
      person.meeting_interest || "",
      Array.isArray(person.sectors) ? person.sectors.join(" ") : "",
      person.bio || ""
    ].join(" ").toLowerCase();

    const matchesSearch = !search || haystack.includes(search);
    const matchesType = !typeFilter || person.participant_type === typeFilter;
    const matchesInterest = !interestFilter || person.meeting_interest === interestFilter;

    return matchesSearch && matchesType && matchesInterest;
  });

  info.textContent = `${filtered.length} participant(s) found`;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty">No participants match your search or filters.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(person => {
    const safeName = escapeHtml(person.full_name || "");
    const safeOrg = escapeHtml(person.organisation || "");
    const safeCountry = escapeHtml(person.country || "Not specified");
    const safeType = escapeHtml(formatParticipantType(person.participant_type || "other"));
    const safeInterest = escapeHtml(person.meeting_interest || "Not specified");
    const safeBio = escapeHtml(person.bio || "No profile summary yet.");
    const sectors = Array.isArray(person.sectors) ? person.sectors : [];

    const sectorPills = sectors.slice(0, 3).map(sector =>
      `<span class="pill">${escapeHtml(sector)}</span>`
    ).join("");

    const isSelf = CURRENT_PARTICIPANT && CURRENT_PARTICIPANT.id === person.id;

    return `
      <div class="card">
        <div class="name">${safeName}</div>
        <div class="org">${safeOrg}</div>

        <div class="meta">
          <div><strong>Country:</strong> ${safeCountry}</div>
          <div><strong>Type:</strong> ${safeType}</div>
          <div><strong>Meeting Interest:</strong> ${escapeHtml(safeInterest)}</div>
        </div>

        <div class="pill-row">
          ${sectorPills}
        </div>

        <div class="bio">${safeBio}</div>

        <div class="actions">
          ${
            isSelf
              ? `<span class="btn" style="opacity:.65;cursor:not-allowed;">This is you</span>`
              : `<a class="btn primary" href="./request-meeting.html?target=${encodeURIComponent(person.id)}">Request Meeting</a>`
          }
        </div>
      </div>
    `;
  }).join("");
}

function formatParticipantType(value) {
  const map = {
    government: "Government",
    investor: "Investor",
    private_sector: "Private Sector",
    dfi: "DFI",
    project_sponsor: "Project Sponsor",
    ipa: "IPA",
    media: "Media",
    organiser: "Organiser",
    other: "Other"
  };
  return map[value] || value;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
