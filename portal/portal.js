const SUPABASE_URL = "https://wtjsgzlyzgfbqpptgpap.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HlLHWAB1NQC8TxMcw09eHQ_D6q7EcUw";

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

  console.log("SESSION USER:", user);

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

  console.log("AFTER ensureParticipantLinked -> CURRENT_PARTICIPANT:", CURRENT_PARTICIPANT);

  return user;
}

async function ensureParticipantLinked() {
  if (!CURRENT_USER) return null;

  console.log("Looking up participant by email:", CURRENT_USER.email);

  const { data: participant, error } = await sb
    .from("participants")
    .select("*")
    .eq("auth_user_id", CURRENT_USER.id)
    .maybeSingle();

  console.log("Participant query result:", participant);
  console.log("Participant query error:", error);

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

  console.log("Linked participant final:", CURRENT_PARTICIPANT);
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
let CURRENT_TARGET_PARTICIPANT = null;

async function loadMeetingTarget() {
  const targetCard = document.getElementById("targetCard");
  if (!targetCard) return null;

  const params = new URLSearchParams(window.location.search);
  const targetId = params.get("target");

  if (!targetId) {
    targetCard.innerHTML = `<div class="error">No target participant was selected.</div>`;
    return null;
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
    targetCard.innerHTML = `<div class="error">Could not load the selected participant.</div>`;
    return null;
  }

  if (CURRENT_PARTICIPANT && CURRENT_PARTICIPANT.id === data.id) {
    targetCard.innerHTML = `<div class="error">You cannot request a meeting with yourself.</div>`;
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.disabled = true;
    return null;
  }

  CURRENT_TARGET_PARTICIPANT = data;

  targetCard.innerHTML = `
    <div class="target-name">${escapeHtml(data.full_name || "")}</div>
    <div class="target-org">${escapeHtml(data.organisation || "")}</div>
    <div class="muted"><strong>Country:</strong> ${escapeHtml(data.country || "Not specified")}</div>
    <div class="muted"><strong>Participant Type:</strong> ${escapeHtml(formatParticipantType(data.participant_type || "other"))}</div>
    <div class="muted"><strong>Meeting Interest:</strong> ${escapeHtml(data.meeting_interest || "Not specified")}</div>
    <div class="muted" style="margin-top:10px;">${escapeHtml(data.bio || "No profile summary yet.")}</div>
  `;

  return data;
}

async function submitMeetingRequest(event) {
  event.preventDefault();

  const statusEl = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  if (statusEl) {
    statusEl.className = "status";
    statusEl.textContent = "";
  }

  if (!CURRENT_PARTICIPANT) {
    if (statusEl) {
      statusEl.className = "status error";
      statusEl.textContent = "You must be signed in to submit a meeting request.";
    }
    return;
  }

  if (!CURRENT_TARGET_PARTICIPANT) {
    if (statusEl) {
      statusEl.className = "status error";
      statusEl.textContent = "No valid target participant was selected.";
    }
    return;
  }

  const meetingType = document.getElementById("meetingType")?.value || "";
  const preferredDay = document.getElementById("preferredDay")?.value || "";
  const preferredTime = document.getElementById("preferredTime")?.value.trim() || "";
  const alternativeTime = document.getElementById("alternativeTime")?.value.trim() || "";
  const reason = document.getElementById("reason")?.value.trim() || "";

  if (!meetingType || !preferredDay || !preferredTime || !reason) {
    if (statusEl) {
      statusEl.className = "status error";
      statusEl.textContent = "Please complete all required fields.";
    }
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  const payload = {
    requester_participant_id: CURRENT_PARTICIPANT.id,
    target_participant_id: CURRENT_TARGET_PARTICIPANT.id,
    meeting_type: meetingType,
    reason,
    preferred_day: preferredDay,
    preferred_time: preferredTime,
    alternative_time: alternativeTime,
    status: "pending_review"
  };

  const { error } = await sb
    .from("meeting_requests")
    .insert([payload]);

  if (error) {
    console.error("Meeting request insert error:", error);

    if (statusEl) {
      statusEl.className = "status error";
      statusEl.textContent = `Could not submit meeting request: ${error.message}`;
    }

    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  if (statusEl) {
    statusEl.className = "status success";
    statusEl.textContent = "Meeting request submitted successfully. The organising team will review it.";
  }

  const form = document.getElementById("meetingForm");
  if (form) form.reset();

  if (submitBtn) submitBtn.disabled = false;
}
async function loadMyMeetings() {
  if (!CURRENT_PARTICIPANT) return;

  await Promise.all([
    loadSentRequests(),
    loadReceivedRequests(),
    loadConfirmedMeetings()
  ]);
}

async function loadSentRequests() {
  const mount = document.getElementById("sentRequests");
  const countEl = document.getElementById("sentCount");
  if (!mount || !countEl || !CURRENT_PARTICIPANT) return;

  mount.innerHTML = `<div class="empty">Loading sent requests...</div>`;

  const { data, error } = await sb
    .from("meeting_requests")
    .select(`
      id,
      meeting_type,
      reason,
      preferred_day,
      preferred_time,
      alternative_time,
      status,
      organiser_notes,
      created_at,
      target:participants!meeting_requests_target_participant_id_fkey (
        id,
        full_name,
        organisation,
        country,
        participant_type
      )
    `)
    .eq("requester_participant_id", CURRENT_PARTICIPANT.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Sent requests error:", error);
    mount.innerHTML = `<div class="empty">Could not load sent requests.</div>`;
    countEl.textContent = "0";
    return;
  }

  countEl.textContent = String(data?.length || 0);

  if (!data || !data.length) {
    mount.innerHTML = `<div class="empty">You have not sent any meeting requests yet.</div>`;
    return;
  }

  mount.innerHTML = data.map(renderSentRequestCard).join("");
}

async function loadReceivedRequests() {
  const mount = document.getElementById("receivedRequests");
  const countEl = document.getElementById("receivedCount");
  if (!mount || !countEl || !CURRENT_PARTICIPANT) return;

  mount.innerHTML = `<div class="empty">Loading received requests...</div>`;

  const { data, error } = await sb
    .from("meeting_requests")
    .select(`
      id,
      meeting_type,
      reason,
      preferred_day,
      preferred_time,
      alternative_time,
      status,
      organiser_notes,
      created_at,
      requester:participants!meeting_requests_requester_participant_id_fkey (
        id,
        full_name,
        organisation,
        country,
        participant_type
      )
    `)
    .eq("target_participant_id", CURRENT_PARTICIPANT.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Received requests error:", error);
    mount.innerHTML = `<div class="empty">Could not load received requests.</div>`;
    countEl.textContent = "0";
    return;
  }

  countEl.textContent = String(data?.length || 0);

  if (!data || !data.length) {
    mount.innerHTML = `<div class="empty">No one has requested a meeting with you yet.</div>`;
    return;
  }

  mount.innerHTML = data.map(renderReceivedRequestCard).join("");
}

async function loadConfirmedMeetings() {
  const mount = document.getElementById("confirmedMeetings");
  const countEl = document.getElementById("confirmedCount");
  if (!mount || !countEl || !CURRENT_PARTICIPANT) return;

  mount.innerHTML = `<div class="empty">Loading confirmed meetings...</div>`;

  const { data, error } = await sb
    .from("confirmed_meetings")
    .select(`
      id,
      meeting_type,
      confirmed_date,
      confirmed_time,
      venue,
      table_name,
      reason,
      status,
      created_at,
      participant_a:participants!confirmed_meetings_participant_a_id_fkey (
        id,
        full_name,
        organisation,
        country
      ),
      participant_b:participants!confirmed_meetings_participant_b_id_fkey (
        id,
        full_name,
        organisation,
        country
      )
    `)
    .or(`participant_a_id.eq.${CURRENT_PARTICIPANT.id},participant_b_id.eq.${CURRENT_PARTICIPANT.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Confirmed meetings error:", error);
    mount.innerHTML = `<div class="empty">Could not load confirmed meetings.</div>`;
    countEl.textContent = "0";
    return;
  }

  countEl.textContent = String(data?.length || 0);

  if (!data || !data.length) {
    mount.innerHTML = `<div class="empty">You do not have any confirmed meetings yet.</div>`;
    return;
  }

  mount.innerHTML = data.map(renderConfirmedMeetingCard).join("");
}

function renderSentRequestCard(item) {
  const target = item.target || {};
  return `
    <div class="card">
      <div class="badge ${escapeHtml(item.status || "")}">${formatStatus(item.status)}</div>
      <div class="name">${escapeHtml(target.full_name || "Participant")}</div>
      <div class="org">${escapeHtml(target.organisation || "")}</div>

      <div class="meta">
        <div><strong>Meeting Type:</strong> ${escapeHtml(item.meeting_type || "")}</div>
        <div><strong>Preferred Day:</strong> ${escapeHtml(item.preferred_day || "Not specified")}</div>
        <div><strong>Preferred Time:</strong> ${escapeHtml(item.preferred_time || "Not specified")}</div>
        <div><strong>Alternative Time:</strong> ${escapeHtml(item.alternative_time || "Not specified")}</div>
      </div>

      <div class="reason"><strong>Reason:</strong> ${escapeHtml(item.reason || "")}</div>

      ${
        item.organiser_notes
          ? `<div class="muted"><strong>Organiser Notes:</strong> ${escapeHtml(item.organiser_notes)}</div>`
          : ``
      }
    </div>
  `;
}

function renderReceivedRequestCard(item) {
  const requester = item.requester || {};
  return `
    <div class="card">
      <div class="badge ${escapeHtml(item.status || "")}">${formatStatus(item.status)}</div>
      <div class="name">${escapeHtml(requester.full_name || "Participant")}</div>
      <div class="org">${escapeHtml(requester.organisation || "")}</div>

      <div class="meta">
        <div><strong>Meeting Type:</strong> ${escapeHtml(item.meeting_type || "")}</div>
        <div><strong>Preferred Day:</strong> ${escapeHtml(item.preferred_day || "Not specified")}</div>
        <div><strong>Preferred Time:</strong> ${escapeHtml(item.preferred_time || "Not specified")}</div>
        <div><strong>Alternative Time:</strong> ${escapeHtml(item.alternative_time || "Not specified")}</div>
      </div>

      <div class="reason"><strong>Reason:</strong> ${escapeHtml(item.reason || "")}</div>

      ${
        item.organiser_notes
          ? `<div class="muted"><strong>Organiser Notes:</strong> ${escapeHtml(item.organiser_notes)}</div>`
          : ``
      }
    </div>
  `;
}

function renderConfirmedMeetingCard(item) {
  const a = item.participant_a || {};
  const b = item.participant_b || {};

  const counterpart =
    CURRENT_PARTICIPANT && a.id === CURRENT_PARTICIPANT.id ? b : a;

  return `
    <div class="card">
      <div class="badge ${escapeHtml(item.status || "")}">${formatStatus(item.status)}</div>
      <div class="name">${escapeHtml(counterpart.full_name || "Meeting Participant")}</div>
      <div class="org">${escapeHtml(counterpart.organisation || "")}</div>

      <div class="meta">
        <div><strong>Meeting Type:</strong> ${escapeHtml(item.meeting_type || "")}</div>
        <div><strong>Date:</strong> ${escapeHtml(item.confirmed_date || "Not set")}</div>
        <div><strong>Time:</strong> ${escapeHtml(item.confirmed_time || "Not set")}</div>
        <div><strong>Venue:</strong> ${escapeHtml(item.venue || "Not set")}</div>
        <div><strong>Table:</strong> ${escapeHtml(item.table_name || "Not set")}</div>
      </div>

      <div class="reason"><strong>Reason:</strong> ${escapeHtml(item.reason || "")}</div>
    </div>
  `;
}

function formatStatus(status) {
  const map = {
    pending_review: "Pending Review",
    awaiting_recipient: "Awaiting Recipient",
    confirmed: "Confirmed",
    declined: "Declined",
    rescheduled: "Rescheduled",
    completed: "Completed"
  };

  return map[status] || status || "Unknown";
}
let ORGANISER_REQUESTS_CACHE = [];

async function ensureOrganiserAccess() {
  console.log("CURRENT_PARTICIPANT", CURRENT_PARTICIPANT);

  if (!CURRENT_PARTICIPANT || !CURRENT_PARTICIPANT.is_organiser) {
    alert("You do not have organiser access to this page.");
    window.location.href = "./dashboard.html";
    return false;
  }
  return true;
}

async function loadOrganiserRequests() {
  const mount = document.getElementById("organiserRequests");
  const info = document.getElementById("organiserInfo");
  if (!mount || !info) return;

  mount.innerHTML = `<div class="empty">Loading requests...</div>`;
  info.textContent = "Loading meeting requests...";

  const { data, error } = await sb
    .from("meeting_requests")
    .select(`
      id,
      requester_participant_id,
      target_participant_id,
      meeting_type,
      reason,
      preferred_day,
      preferred_time,
      alternative_time,
      status,
      organiser_notes,
      created_at,
      requester:participants!meeting_requests_requester_participant_id_fkey (
        id,
        full_name,
        organisation,
        country,
        participant_type,
        email
      ),
      target:participants!meeting_requests_target_participant_id_fkey (
        id,
        full_name,
        organisation,
        country,
        participant_type,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Organiser request load error:", error);
    info.textContent = "Could not load meeting requests.";
    mount.innerHTML = `<div class="empty">Unable to load requests right now.</div>`;
    return;
  }

  ORGANISER_REQUESTS_CACHE = Array.isArray(data) ? data : [];
  renderOrganiserRequests();
}

function renderOrganiserRequests() {
  const mount = document.getElementById("organiserRequests");
  const info = document.getElementById("organiserInfo");
  if (!mount || !info) return;

  const statusFilter = document.getElementById("organiserStatusFilter")?.value || "";
  const search = (document.getElementById("organiserSearch")?.value || "").trim().toLowerCase();

  const filtered = ORGANISER_REQUESTS_CACHE.filter(item => {
    const requester = item.requester || {};
    const target = item.target || {};

    const haystack = [
      requester.full_name || "",
      requester.organisation || "",
      target.full_name || "",
      target.organisation || "",
      item.meeting_type || "",
      item.reason || "",
      item.status || ""
    ].join(" ").toLowerCase();

    const matchesStatus = !statusFilter || item.status === statusFilter;
    const matchesSearch = !search || haystack.includes(search);

    return matchesStatus && matchesSearch;
  });

  info.textContent = `${filtered.length} request(s) shown`;

  if (!filtered.length) {
    mount.innerHTML = `<div class="empty">No meeting requests match your filters.</div>`;
    return;
  }

  mount.innerHTML = filtered.map(item => renderOrganiserRequestCard(item)).join("");
  bindOrganiserActions();
}

function renderOrganiserRequestCard(item) {
  const requester = item.requester || {};
  const target = item.target || {};

  return `
    <div class="card" data-request-id="${escapeHtml(item.id)}">
      <div class="badge ${escapeHtml(item.status || "")}">${formatStatus(item.status)}</div>

      <div class="pair">
        <div class="box">
          <div class="name">${escapeHtml(requester.full_name || "Requester")}</div>
          <div class="org">${escapeHtml(requester.organisation || "")}</div>
          <div class="row">
            <div><strong>Country:</strong> ${escapeHtml(requester.country || "Not specified")}</div>
            <div><strong>Type:</strong> ${escapeHtml(formatParticipantType(requester.participant_type || "other"))}</div>
            <div><strong>Email:</strong> ${escapeHtml(requester.email || "")}</div>
          </div>
        </div>

        <div class="box">
          <div class="name">${escapeHtml(target.full_name || "Target")}</div>
          <div class="org">${escapeHtml(target.organisation || "")}</div>
          <div class="row">
            <div><strong>Country:</strong> ${escapeHtml(target.country || "Not specified")}</div>
            <div><strong>Type:</strong> ${escapeHtml(formatParticipantType(target.participant_type || "other"))}</div>
            <div><strong>Email:</strong> ${escapeHtml(target.email || "")}</div>
          </div>
        </div>
      </div>

      <div class="row">
        <div><strong>Meeting Type:</strong> ${escapeHtml(item.meeting_type || "")}</div>
        <div><strong>Preferred Day:</strong> ${escapeHtml(item.preferred_day || "Not specified")}</div>
        <div><strong>Preferred Time:</strong> ${escapeHtml(item.preferred_time || "Not specified")}</div>
        <div><strong>Alternative Time:</strong> ${escapeHtml(item.alternative_time || "Not specified")}</div>
      </div>

      <div class="box">
        <strong>Reason:</strong><br>
        ${escapeHtml(item.reason || "")}
      </div>

      <div class="field">
        <label>Organiser Notes</label>
        <textarea data-field="organiser_notes">${escapeHtml(item.organiser_notes || "")}</textarea>
      </div>

      <div class="pair">
        <div class="field">
          <label>Update Status</label>
          <select data-field="status">
            <option value="pending_review" ${item.status === "pending_review" ? "selected" : ""}>Pending Review</option>
            <option value="awaiting_recipient" ${item.status === "awaiting_recipient" ? "selected" : ""}>Awaiting Recipient</option>
            <option value="confirmed" ${item.status === "confirmed" ? "selected" : ""}>Confirmed</option>
            <option value="declined" ${item.status === "declined" ? "selected" : ""}>Declined</option>
            <option value="rescheduled" ${item.status === "rescheduled" ? "selected" : ""}>Rescheduled</option>
            <option value="completed" ${item.status === "completed" ? "selected" : ""}>Completed</option>
          </select>
        </div>

        <div class="field">
          <label>Confirmed Date</label>
          <input type="date" data-field="confirmed_date" />
        </div>
      </div>

      <div class="pair">
        <div class="field">
          <label>Confirmed Time</label>
          <input type="text" data-field="confirmed_time" placeholder="e.g. 11:00 AM – 11:30 AM" />
        </div>

        <div class="field">
          <label>Venue</label>
          <input type="text" data-field="venue" placeholder="e.g. Meeting Lounge A" />
        </div>
      </div>

      <div class="field">
        <label>Table / Room</label>
        <input type="text" data-field="table_name" placeholder="e.g. Table 4 / Room B" />
      </div>

      <div class="actions">
        <button class="btn primary" type="button" data-action="save-request">Save Request Update</button>
        <button class="btn" type="button" data-action="confirm-meeting">Create Confirmed Meeting</button>
        <button class="btn danger" type="button" data-action="decline-request">Decline</button>
      </div>

      <div class="status" data-role="status-message"></div>
    </div>
  `;
}

function bindOrganiserActions() {
  document.querySelectorAll('[data-action="save-request"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest("[data-request-id]");
      if (!card) return;
      await saveOrganiserRequestUpdate(card);
    });
  });

  document.querySelectorAll('[data-action="confirm-meeting"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest("[data-request-id]");
      if (!card) return;
      await createConfirmedMeetingFromCard(card);
    });
  });

  document.querySelectorAll('[data-action="decline-request"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest("[data-request-id]");
      if (!card) return;
      await declineRequestFromCard(card);
    });
  });
}

async function saveOrganiserRequestUpdate(card) {
  const requestId = card.getAttribute("data-request-id");
  const status = card.querySelector('[data-field="status"]')?.value || "pending_review";
  const organiserNotes = card.querySelector('[data-field="organiser_notes"]')?.value.trim() || "";
  const statusEl = card.querySelector('[data-role="status-message"]');

  setCardStatus(statusEl, "Saving request update...", "");

  const { error } = await sb
    .from("meeting_requests")
    .update({
      status,
      organiser_notes: organiserNotes
    })
    .eq("id", requestId);

  if (error) {
    console.error("Save request update error:", error);
    setCardStatus(statusEl, `Could not save update: ${error.message}`, "error");
    return;
  }

  updateLocalRequestCache(requestId, { status, organiser_notes: organiserNotes });
  setCardStatus(statusEl, "Request updated successfully.", "success");
  renderOrganiserRequests();
}

async function declineRequestFromCard(card) {
  const requestId = card.getAttribute("data-request-id");
  const organiserNotes = card.querySelector('[data-field="organiser_notes"]')?.value.trim() || "";
  const statusEl = card.querySelector('[data-role="status-message"]');

  setCardStatus(statusEl, "Declining request...", "");

  const { error } = await sb
    .from("meeting_requests")
    .update({
      status: "declined",
      organiser_notes: organiserNotes
    })
    .eq("id", requestId);

  if (error) {
    console.error("Decline request error:", error);
    setCardStatus(statusEl, `Could not decline request: ${error.message}`, "error");
    return;
  }

  updateLocalRequestCache(requestId, { status: "declined", organiser_notes: organiserNotes });
  setCardStatus(statusEl, "Request declined.", "success");
  renderOrganiserRequests();
}

async function createConfirmedMeetingFromCard(card) {
  const requestId = card.getAttribute("data-request-id");
  const confirmedDate = card.querySelector('[data-field="confirmed_date"]')?.value || "";
  const confirmedTime = card.querySelector('[data-field="confirmed_time"]')?.value.trim() || "";
  const venue = card.querySelector('[data-field="venue"]')?.value.trim() || "";
  const tableName = card.querySelector('[data-field="table_name"]')?.value.trim() || "";
  const organiserNotes = card.querySelector('[data-field="organiser_notes"]')?.value.trim() || "";
  const statusEl = card.querySelector('[data-role="status-message"]');

  const requestItem = ORGANISER_REQUESTS_CACHE.find(x => x.id === requestId);
  if (!requestItem) {
    setCardStatus(statusEl, "Could not find request in organiser cache.", "error");
    return;
  }

  if (!confirmedDate || !confirmedTime || !venue) {
    setCardStatus(statusEl, "Please provide confirmed date, confirmed time, and venue.", "error");
    return;
  }

  setCardStatus(statusEl, "Creating confirmed meeting...", "");

  const meetingPayload = {
    request_id: requestItem.id,
    participant_a_id: requestItem.requester_participant_id,
    participant_b_id: requestItem.target_participant_id,
    meeting_type: requestItem.meeting_type,
    confirmed_date: confirmedDate,
    confirmed_time: confirmedTime,
    venue: venue,
    table_name: tableName,
    reason: requestItem.reason,
    status: "confirmed"
  };

  const { error: insertError } = await sb
    .from("confirmed_meetings")
    .insert([meetingPayload]);

  if (insertError) {
    console.error("Confirmed meeting insert error:", insertError);
    setCardStatus(statusEl, `Could not create confirmed meeting: ${insertError.message}`, "error");
    return;
  }

  const { error: updateError } = await sb
    .from("meeting_requests")
    .update({
      status: "confirmed",
      organiser_notes: organiserNotes
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("Request status confirm error:", updateError);
    setCardStatus(statusEl, `Meeting created, but request update failed: ${updateError.message}`, "error");
    return;
  }

  updateLocalRequestCache(requestId, { status: "confirmed", organiser_notes: organiserNotes });
  setCardStatus(statusEl, "Confirmed meeting created successfully.", "success");
  renderOrganiserRequests();
}

function updateLocalRequestCache(requestId, patch) {
  ORGANISER_REQUESTS_CACHE = ORGANISER_REQUESTS_CACHE.map(item => {
    if (item.id !== requestId) return item;
    return { ...item, ...patch };
  });
}

function setCardStatus(statusEl, message, mode) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "status";
  if (mode) statusEl.classList.add(mode);
}
