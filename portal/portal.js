const SUPABASE_URL = "https://qvjstykrpwhozkugvsah.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pPHAdINqscBoi2ORm-73gg_SeyK3gH5";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let DIRECTORY_CACHE = [];
let CURRENT_USER = null;
let CURRENT_PARTICIPANT = null;

let loginCooldown = false;

async function login() {
  if (loginCooldown) return;

  const emailInput = document.getElementById("email");
  const btn = document.getElementById("magicLinkBtn");
  const email = emailInput ? emailInput.value.trim() : "";

  if (!email) {
    alert("Please enter your email address.");
    return;
  }

  loginCooldown = true;

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Please wait 60s...";
  }

  const redirectTo = "https://enny-stack.github.io/afsnet-registration/portal/dashboard.html";

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Check your email for your login link.");
  }

  let seconds = 60;

  const timer = setInterval(() => {
    seconds -= 1;

    if (btn && seconds > 0) {
      btn.textContent = `Please wait ${seconds}s...`;
    }

    if (seconds <= 0) {
      clearInterval(timer);
      loginCooldown = false;

      if (btn) {
        btn.disabled = false;
        btn.textContent = "Send Magic Link";
      }
    }
  }, 1000);
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
let CURRENT_TARGET = null;

async function loadMeetingTarget() {
  const box = document.getElementById("targetBox");
  if (!box) return;

  const params = new URLSearchParams(window.location.search);
  const targetId = params.get("target");

  if (!targetId) {
    box.innerHTML = `<div class="muted">No participant was selected.</div>`;
    return;
  }

  const { data, error } = await sb
    .from("participants")
    .select("id, full_name, organisation, country, participant_type, meeting_interest, bio")
    .eq("id", targetId)
    .eq("is_approved", true)
    .eq("is_visible_in_directory", true)
    .maybeSingle();

  if (error || !data) {
    console.error("Error loading target participant:", error);
    box.innerHTML = `<div class="muted">Unable to load the selected participant.</div>`;
    return;
  }

  CURRENT_TARGET = data;

  box.innerHTML = `
    <div class="target-name">${escapeHtml(data.full_name || "")}</div>
    <div class="target-org">${escapeHtml(data.organisation || "")}</div>
    <div><strong>Country:</strong> ${escapeHtml(data.country || "Not specified")}</div>
    <div><strong>Type:</strong> ${escapeHtml(formatParticipantType(data.participant_type || "other"))}</div>
    <div><strong>Meeting Interest:</strong> ${escapeHtml(data.meeting_interest || "Not specified")}</div>
    <div class="muted">${escapeHtml(data.bio || "No profile summary available.")}</div>
  `;
}

async function submitMeetingRequest() {
  const statusEl = document.getElementById("formStatus");
  const meetingType = document.getElementById("meetingType")?.value || "";
  const preferredDay = document.getElementById("preferredDay")?.value.trim() || "";
  const preferredTime = document.getElementById("preferredTime")?.value.trim() || "";
  const alternativeTime = document.getElementById("alternativeTime")?.value.trim() || "";
  const reason = document.getElementById("reason")?.value.trim() || "";

  if (!statusEl) return;

  statusEl.className = "status";
  statusEl.textContent = "";

  if (!CURRENT_PARTICIPANT) {
    statusEl.className = "status error";
    statusEl.textContent = "You must be signed in as an approved participant.";
    return;
  }

  if (!CURRENT_TARGET) {
    statusEl.className = "status error";
    statusEl.textContent = "No target participant was loaded.";
    return;
  }

  if (CURRENT_PARTICIPANT.id === CURRENT_TARGET.id) {
    statusEl.className = "status error";
    statusEl.textContent = "You cannot request a meeting with yourself.";
    return;
  }

  if (!meetingType) {
    statusEl.className = "status error";
    statusEl.textContent = "Please select a meeting type.";
    return;
  }

  if (!reason) {
    statusEl.className = "status error";
    statusEl.textContent = "Please provide the reason for the meeting.";
    return;
  }

  const payload = {
    requester_participant_id: CURRENT_PARTICIPANT.id,
    target_participant_id: CURRENT_TARGET.id,
    meeting_type: meetingType,
    reason,
    preferred_day: preferredDay || null,
    preferred_time: preferredTime || null,
    alternative_time: alternativeTime || null,
    status: "pending_review"
  };

  const { error } = await sb
    .from("meeting_requests")
    .insert(payload);

  if (error) {
    console.error("Meeting request insert error:", error);
    statusEl.className = "status error";
    statusEl.textContent = error.message || "Could not submit the meeting request.";
    return;
  }

  statusEl.className = "status success";
  statusEl.textContent = "Meeting request submitted successfully. The organising team will review and coordinate it.";

  document.getElementById("meetingType").value = "";
  document.getElementById("preferredDay").value = "";
  document.getElementById("preferredTime").value = "";
  document.getElementById("alternativeTime").value = "";
  document.getElementById("reason").value = "";
}
