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
async function loadMyMeetings() {
  if (!CURRENT_PARTICIPANT) return;

  await Promise.all([
    loadSentRequests(),
    loadReceivedRequests(),
    loadConfirmedMeetings()
  ]);
}

async function loadSentRequests() {
  const mount = document.getElementById("sentRequestsList");
  if (!mount) return;

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
      created_at,
      target:target_participant_id (
        full_name,
        organisation,
        country
      )
    `)
    .eq("requester_participant_id", CURRENT_PARTICIPANT.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Sent requests error:", error);
    mount.innerHTML = `<div class="empty">Could not load sent requests.</div>`;
    return;
  }

  if (!data || !data.length) {
    mount.innerHTML = `<div class="empty">You have not submitted any meeting requests yet.</div>`;
    return;
  }

  mount.innerHTML = data.map(item => {
    const target = Array.isArray(item.target) ? item.target[0] : item.target;
    return `
      <div class="item">
        <div class="status-pill status-${escapeHtml(item.status || "pending_review")}">${formatStatus(item.status)}</div>
        <div class="row-title">${escapeHtml(item.meeting_type || "")} request to ${escapeHtml(target?.full_name || "Participant")}</div>
        <div class="meta">
          <div><strong>Organisation:</strong> ${escapeHtml(target?.organisation || "Not specified")}</div>
          <div><strong>Country:</strong> ${escapeHtml(target?.country || "Not specified")}</div>
          <div><strong>Reason:</strong> ${escapeHtml(item.reason || "")}</div>
          <div><strong>Preferred Day:</strong> ${escapeHtml(item.preferred_day || "Not specified")}</div>
          <div><strong>Preferred Time:</strong> ${escapeHtml(item.preferred_time || "Not specified")}</div>
          <div><strong>Alternative Time:</strong> ${escapeHtml(item.alternative_time || "Not specified")}</div>
        </div>
      </div>
    `;
  }).join("");
}

async function loadReceivedRequests() {
  const mount = document.getElementById("receivedRequestsList");
  if (!mount) return;

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
      created_at,
      requester:requester_participant_id (
        full_name,
        organisation,
        country
      )
    `)
    .eq("target_participant_id", CURRENT_PARTICIPANT.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Received requests error:", error);
    mount.innerHTML = `<div class="empty">Could not load received requests.</div>`;
    return;
  }

  if (!data || !data.length) {
    mount.innerHTML = `<div class="empty">No meeting requests have been sent to you yet.</div>`;
    return;
  }

  mount.innerHTML = data.map(item => {
    const requester = Array.isArray(item.requester) ? item.requester[0] : item.requester;
    return `
      <div class="item">
        <div class="status-pill status-${escapeHtml(item.status || "pending_review")}">${formatStatus(item.status)}</div>
        <div class="row-title">${escapeHtml(item.meeting_type || "")} request from ${escapeHtml(requester?.full_name || "Participant")}</div>
        <div class="meta">
          <div><strong>Organisation:</strong> ${escapeHtml(requester?.organisation || "Not specified")}</div>
          <div><strong>Country:</strong> ${escapeHtml(requester?.country || "Not specified")}</div>
          <div><strong>Reason:</strong> ${escapeHtml(item.reason || "")}</div>
          <div><strong>Preferred Day:</strong> ${escapeHtml(item.preferred_day || "Not specified")}</div>
          <div><strong>Preferred Time:</strong> ${escapeHtml(item.preferred_time || "Not specified")}</div>
          <div><strong>Alternative Time:</strong> ${escapeHtml(item.alternative_time || "Not specified")}</div>
        </div>
      </div>
    `;
  }).join("");
}

async function loadConfirmedMeetings() {
  const mount = document.getElementById("confirmedMeetingsList");
  if (!mount) return;

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
      participant_a:participant_a_id (
        full_name,
        organisation
      ),
      participant_b:participant_b_id (
        full_name,
        organisation
      )
    `)
    .or(`participant_a_id.eq.${CURRENT_PARTICIPANT.id},participant_b_id.eq.${CURRENT_PARTICIPANT.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Confirmed meetings error:", error);
    mount.innerHTML = `<div class="empty">Could not load confirmed meetings.</div>`;
    return;
  }

  if (!data || !data.length) {
    mount.innerHTML = `<div class="empty">You do not have any confirmed meetings yet.</div>`;
    return;
  }

  mount.innerHTML = data.map(item => {
    const a = Array.isArray(item.participant_a) ? item.participant_a[0] : item.participant_a;
    const b = Array.isArray(item.participant_b) ? item.participant_b[0] : item.participant_b;

    return `
      <div class="item">
        <div class="status-pill status-${escapeHtml(item.status || "confirmed")}">${formatStatus(item.status)}</div>
        <div class="row-title">${escapeHtml(item.meeting_type || "")} Meeting</div>
        <div class="meta">
          <div><strong>Participants:</strong> ${escapeHtml(a?.full_name || "Participant A")} (${escapeHtml(a?.organisation || "")}) and ${escapeHtml(b?.full_name || "Participant B")} (${escapeHtml(b?.organisation || "")})</div>
          <div><strong>Date:</strong> ${escapeHtml(item.confirmed_date || "Not confirmed yet")}</div>
          <div><strong>Time:</strong> ${escapeHtml(item.confirmed_time || "Not confirmed yet")}</div>
          <div><strong>Venue:</strong> ${escapeHtml(item.venue || "TBC")}</div>
          <div><strong>Table / Room:</strong> ${escapeHtml(item.table_name || "TBC")}</div>
          <div><strong>Reason:</strong> ${escapeHtml(item.reason || "Not specified")}</div>
        </div>
      </div>
    `;
  }).join("");
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
async function ensureOrganiserAccess() {
  if (!CURRENT_PARTICIPANT) {
    window.location.href = "./login.html";
    return false;
  }

  if (!CURRENT_PARTICIPANT.is_organiser) {
    alert("You do not have organiser access.");
    window.location.href = "./dashboard.html";
    return false;
  }

  return true;
}

async function loadOrganiserRequests() {
  const mount = document.getElementById("organiserRequestsList");
  if (!mount) return;

  mount.innerHTML = `<div class="empty">Loading meeting requests...</div>`;

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
      requester:requester_participant_id (
        id,
        full_name,
        organisation,
        country,
        email
      ),
      target:target_participant_id (
        id,
        full_name,
        organisation,
        country,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Organiser requests load error:", error);
    mount.innerHTML = `<div class="empty">Could not load meeting requests.</div>`;
    return;
  }

  if (!data || !data.length) {
    mount.innerHTML = `<div class="empty">No meeting requests available yet.</div>`;
    return;
  }

  mount.innerHTML = data.map(item => {
    const requester = Array.isArray(item.requester) ? item.requester[0] : item.requester;
    const target = Array.isArray(item.target) ? item.target[0] : item.target;

    const safeId = escapeHtml(item.id);

    return `
      <div class="item">
        <div class="item-head">
          <div class="row-title">${escapeHtml(item.meeting_type || "")} request</div>
          <div class="status-pill status-${escapeHtml(item.status || "pending_review")}">${formatStatus(item.status)}</div>
        </div>

        <div class="meta">
          <div><strong>Requester:</strong> ${escapeHtml(requester?.full_name || "")} — ${escapeHtml(requester?.organisation || "")}</div>
          <div><strong>Requester Country:</strong> ${escapeHtml(requester?.country || "Not specified")}</div>
          <div><strong>Requester Email:</strong> ${escapeHtml(requester?.email || "Not specified")}</div>
          <div><strong>Target:</strong> ${escapeHtml(target?.full_name || "")} — ${escapeHtml(target?.organisation || "")}</div>
          <div><strong>Target Country:</strong> ${escapeHtml(target?.country || "Not specified")}</div>
          <div><strong>Target Email:</strong> ${escapeHtml(target?.email || "Not specified")}</div>
          <div><strong>Reason:</strong> ${escapeHtml(item.reason || "")}</div>
          <div><strong>Preferred Day:</strong> ${escapeHtml(item.preferred_day || "Not specified")}</div>
          <div><strong>Preferred Time:</strong> ${escapeHtml(item.preferred_time || "Not specified")}</div>
          <div><strong>Alternative Time:</strong> ${escapeHtml(item.alternative_time || "Not specified")}</div>
        </div>

        <div class="editor-grid">
          <div>
            <label for="status-${safeId}">Update Status</label>
            <select id="status-${safeId}">
              <option value="pending_review" ${item.status === "pending_review" ? "selected" : ""}>Pending Review</option>
              <option value="awaiting_recipient" ${item.status === "awaiting_recipient" ? "selected" : ""}>Awaiting Recipient</option>
              <option value="confirmed" ${item.status === "confirmed" ? "selected" : ""}>Confirmed</option>
              <option value="declined" ${item.status === "declined" ? "selected" : ""}>Declined</option>
              <option value="rescheduled" ${item.status === "rescheduled" ? "selected" : ""}>Rescheduled</option>
              <option value="completed" ${item.status === "completed" ? "selected" : ""}>Completed</option>
            </select>
          </div>

          <div>
            <label for="confirm-date-${safeId}">Confirmed Date</label>
            <input type="date" id="confirm-date-${safeId}" />
          </div>

          <div>
            <label for="confirm-time-${safeId}">Confirmed Time</label>
            <input type="text" id="confirm-time-${safeId}" placeholder="e.g. 2:00 PM – 2:30 PM" />
          </div>

          <div>
            <label for="venue-${safeId}">Venue</label>
            <input type="text" id="venue-${safeId}" placeholder="e.g. CICC Meeting Zone" />
          </div>

          <div>
            <label for="table-${safeId}">Table / Room</label>
            <input type="text" id="table-${safeId}" placeholder="e.g. Table B12 / Room 2" />
          </div>

          <div>
            <label for="notes-${safeId}">Organiser Notes</label>
            <textarea id="notes-${safeId}" placeholder="Internal notes, approval notes, coordination updates...">${escapeHtml(item.organiser_notes || "")}</textarea>
          </div>
        </div>

        <div class="admin-actions">
          <button class="btn primary" type="button" onclick="updateMeetingRequestStatus('${item.id}')">Save Status / Notes</button>
          <button class="btn gold" type="button" onclick="createConfirmedMeeting('${item.id}', '${requester?.id || ""}', '${target?.id || ""}', '${escapeJs(item.meeting_type || "")}', '${escapeJs(item.reason || "")}')">Create Confirmed Meeting</button>
        </div>

        <div class="mini-note" id="request-status-${safeId}"></div>
      </div>
    `;
  }).join("");
}

async function updateMeetingRequestStatus(requestId) {
  const safeId = cssSafeId(requestId);
  const statusEl = document.getElementById(`request-status-${safeId}`);
  const statusValue = document.getElementById(`status-${safeId}`)?.value || "pending_review";
  const notesValue = document.getElementById(`notes-${safeId}`)?.value.trim() || null;

  if (statusEl) {
    statusEl.textContent = "Saving...";
    statusEl.style.color = "";
  }

  const { error } = await sb
    .from("meeting_requests")
    .update({
      status: statusValue,
      organiser_notes: notesValue
    })
    .eq("id", requestId);

  if (error) {
    console.error("Update request error:", error);
    if (statusEl) {
      statusEl.textContent = error.message || "Could not update request.";
      statusEl.style.color = "#B42318";
    }
    return;
  }

  if (statusEl) {
    statusEl.textContent = "Request updated successfully.";
    statusEl.style.color = "#0B5D3B";
  }

  await loadOrganiserRequests();
}

async function createConfirmedMeeting(requestId, participantAId, participantBId, meetingType, reason) {
  const safeId = cssSafeId(requestId);
  const statusEl = document.getElementById(`request-status-${safeId}`);
  const dateValue = document.getElementById(`confirm-date-${safeId}`)?.value || null;
  const timeValue = document.getElementById(`confirm-time-${safeId}`)?.value.trim() || null;
  const venueValue = document.getElementById(`venue-${safeId}`)?.value.trim() || null;
  const tableValue = document.getElementById(`table-${safeId}`)?.value.trim() || null;
  const notesValue = document.getElementById(`notes-${safeId}`)?.value.trim() || null;

  if (!participantAId || !participantBId) {
    if (statusEl) {
      statusEl.textContent = "Participant IDs are missing for this request.";
      statusEl.style.color = "#B42318";
    }
    return;
  }

  if (!dateValue || !timeValue) {
    if (statusEl) {
      statusEl.textContent = "Please provide confirmed date and time before creating the meeting.";
      statusEl.style.color = "#B42318";
    }
    return;
  }

  if (statusEl) {
    statusEl.textContent = "Creating confirmed meeting...";
    statusEl.style.color = "";
  }

  const { error: insertError } = await sb
    .from("confirmed_meetings")
    .insert({
      request_id: requestId,
      participant_a_id: participantAId,
      participant_b_id: participantBId,
      meeting_type: meetingType,
      confirmed_date: dateValue,
      confirmed_time: timeValue,
      venue: venueValue,
      table_name: tableValue,
      reason: reason,
      status: "confirmed"
    });

  if (insertError) {
    console.error("Create confirmed meeting error:", insertError);
    if (statusEl) {
      statusEl.textContent = insertError.message || "Could not create confirmed meeting.";
      statusEl.style.color = "#B42318";
    }
    return;
  }

  const { error: updateError } = await sb
    .from("meeting_requests")
    .update({
      status: "confirmed",
      organiser_notes: notesValue
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("Update request after confirm error:", updateError);
  }

  if (statusEl) {
    statusEl.textContent = "Confirmed meeting created successfully.";
    statusEl.style.color = "#0B5D3B";
  }

  await loadOrganiserRequests();
}

function cssSafeId(value) {
  return String(value).replaceAll(/[^a-zA-Z0-9\-_]/g, "_");
}

function escapeJs(str) {
  return String(str)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', '\\"')
    .replaceAll("\n", " ")
    .replaceAll("\r", " ");
}
