let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;
let currentNotifTab = 'all';

// --- GLOBAL STATE FOR PAGINATION & SEARCH ---
let allAgreements = [];
let filteredAgreements = [];
let currentPage = 1;
let currentStage = 'all';
const itemsPerPage = 8;

/* =========================================================
   STAGES & BARANGAY CONTACTS
   ========================================================= */

const STAGES = {
    review:            { label: 'Awaiting Review',                style: 'background:#fff3cd; color:#856404;' },
    awaiting_barangay: { label: 'Waiting for Barangay Approval',  style: 'background:#e0f2fe; color:#0369a1;' },
    approved:          { label: 'Ready for Handover',             style: 'background:#d1fae5; color:#047857;' },
    resched:           { label: 'Rescheduling',                   style: 'background:#ede9fe; color:#6d28d9;' },
    completed:         { label: 'Completed',                      style: 'background:#d1fae5; color:#047857;' },
    disputed:          { label: 'Disputed',                       style: 'background:#fde2e1; color:#b3261e;' },
    pending:           { label: 'Pending Both Parties',           style: 'background:#eee; color:#666;' }
};

// One place that maps backend agreement_status -> UI stage.
function getStage(item) {
    const s = item.agreement_status;
    if (s === 'both_agreed' || s === 'admin_reviewing') return 'review';
    // Admin confirmed + PDF generated. The barangay is contacted manually outside the system,
    // so this stays "waiting" until the handover is completed or rescheduled.
    if (s === 'confirmed' || s === 'awaiting_barangay') return 'awaiting_barangay';
    // Only set after the admin records that the barangay replied with approval.
    if (s === 'barangay_approved') return 'approved';
    if (s === 'completed') return 'completed';
    if (s === 'reschedule_requested') return 'resched';
    if (s === 'disputed') return 'disputed';
    return 'pending';
}

/* =========================================================
   DATE / TIME FORMATTING
   The API sends DATE columns as full ISO strings ("2026-10-14T16:00:00.000Z")
   and TIME columns as "16:08:00". These helpers turn them into
   "Oct 15, 2026" and "4:08 PM" (Philippine time, same as the server).
   ========================================================= */

const PH_TIMEZONE = 'Asia/Manila';

function formatDateOnly(value) {
    if (!value) return '';
    const str = String(value).trim();

    // Plain calendar date (no time part): format it as-is, no timezone shifting.
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
        });
    }

    const parsed = new Date(str);
    if (isNaN(parsed)) return str;
    return parsed.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: PH_TIMEZONE
    });
}

function formatTimeOnly(value) {
    if (!value) return '';
    const str = String(value).trim();
    if (/[ap]\.?m\.?$/i.test(str)) return str;           // already "4:08 PM"

    const m = str.match(/^(\d{1,2}):(\d{2})/);           // "16:08:00" -> 4:08 PM
    if (!m) return str;
    const hour24 = Number(m[1]);
    if (hour24 > 23) return str;

    const suffix = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${m[2]} ${suffix}`;
}

// "Oct 15, 2026 at 4:08 PM" (or just the date when there is no time)
function formatDateTime(dateValue, timeValue) {
    const d = formatDateOnly(dateValue);
    const t = formatTimeOnly(timeValue);
    if (!d) return t;
    return t ? `${d} at ${t}` : d;
}

function formatMeetup(item) {
    if (!item.meetup_date) return 'Not set';
    return formatDateTime(item.meetup_date, item.meetup_time);
}

document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.getElementById("agreements-wrapper") || document.querySelector(".content-wrapper");

    if (wrapper) {
        setTimeout(() => wrapper.classList.add("fade-in"), 100);
    }

    fetchAgreements();
    updateNotifBadge();
    checkNotifications();
    setInterval(checkNotifications, 20000);
    setInterval(fetchAgreements, 30000);

    // --- SEARCH & PAGINATION LISTENERS (matching AdAgreements.html ids) ---
    document.getElementById('agreementSearchInput')?.addEventListener('input', handleSearch);
    document.getElementById('stageFilter')?.addEventListener('change', (e) => {
        currentStage = e.target.value;
        handleSearch();   // re-filter by the chosen stage (renderTable alone kept showing the old list)
    });

    document.getElementById('prevBtn')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById('nextBtn')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredAgreements.length / itemsPerPage) || 1;
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    document.getElementById('exportAgreementsBtn')?.addEventListener('click', exportAgreementsCsv);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeHandoverModal);
    document.getElementById('handoverModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'handoverModal') closeHandoverModal();
    });

    document.getElementById('tabAll')?.addEventListener('click', (e) => {
        e.stopPropagation();
        switchTab('all');
    });
    document.getElementById('tabUnread')?.addEventListener('click', (e) => {
        e.stopPropagation();
        switchTab('unread');
    });

    const bell = document.getElementById('notifBell') || document.querySelector('.fa-bell');
    const clearBtn = document.getElementById('clearNotifsBtn');

    if (bell) {
        bell.id = "notifBell";
        bell.addEventListener('click', toggleNotifs);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllNotifs);
    }

    const navLinks = document.querySelectorAll('.sidebar nav a, .sidebar-footer a, .avatar-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.hostname === window.location.hostname && !link.hash) {
                e.preventDefault();
                const nextURL = link.href;
                if (wrapper) wrapper.classList.remove("fade-in");
                setTimeout(() => { window.location.href = nextURL; }, 500);
            }
        });
    });
});

function switchTab(type) {
    currentNotifTab = type;
    document.getElementById('tabAll')?.classList.toggle('active', type === 'all');
    document.getElementById('tabUnread')?.classList.toggle('active', type === 'unread');
    renderNotifDropdown();
}

// Fetch pending and confirmed party agreements from backend
async function fetchAgreements() {
    try {
        const response = await fetch('/api/admin/pending-transactions');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        allAgreements = Array.isArray(data.transactions) ? data.transactions : [];
        updateStatCards(allAgreements);
        handleSearch();
    } catch (err) {
        console.error("Agreements Fetch Error:", err);
        allAgreements = [];
        renderTable();
    }
}

function matchesStage(item, stage) {
    if (stage === 'all') return true;
    return getStage(item) === stage;
}

// Search Filter Logic
function handleSearch() {
    const query = document.getElementById('agreementSearchInput')?.value.toLowerCase() || "";

    filteredAgreements = allAgreements.filter(item => {
        const itemName = (item.item_name || "").toLowerCase();
        const partyA = (item.user_one_name || "").toLowerCase();
        const partyB = (item.user_two_name || "").toLowerCase();
        const barangay = (item.meetup_barangay || "").toLowerCase();
        const status = (item.agreement_status || "").toLowerCase();
        const agrId = `#agr-${item.conversation_id}`.toLowerCase();

        const matchesQuery = itemName.includes(query) ||
               partyA.includes(query) ||
               partyB.includes(query) ||
               barangay.includes(query) ||
               status.includes(query) ||
               agrId.includes(query);

        return matchesQuery && matchesStage(item, currentStage);
    });

    currentPage = 1;
    renderTable();
}

// Render dynamic agreement records into HTML table
function renderTable() {
    const container = document.getElementById('agreementsTableBody');
    const pageDisplay = document.getElementById('pageDisplay');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (!container) return;

    if (filteredAgreements.length === 0) {
        container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #777;">No agreement records found.</td></tr>`;
        if (pageDisplay) pageDisplay.innerText = "Page 1 of 1";
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    const totalPages = Math.ceil(filteredAgreements.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredAgreements.slice(start, end);

    if (pageDisplay) pageDisplay.innerText = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    container.innerHTML = paginatedItems.map(item => {
        const stage = getStage(item);
        const statusBadge = `<span class="log-badge" style="${STAGES[stage].style}">${STAGES[stage].label}</span>`;

        const reportBtn = item.transaction_report_path
            ? `<a href="${escapeAttr(item.transaction_report_path)}" target="_blank" class="btn-action view-btn" style="padding:5px 10px; background:#5D8252; color:white; border-radius:4px; text-decoration:none; font-size:0.8rem; margin-right:4px;"><i class="fa-solid fa-file-pdf"></i> Report</a>`
            : '';

        const btnLabel = stage === 'review' ? 'Review' : 'View';
        const btnColor = stage === 'disputed' ? '#b3261e' : '#7aa340';

        const actionBtn = stage === 'pending'
            ? `<span style="color:#999; font-size:0.8rem;">Pending Both Parties</span>`
            : `${reportBtn}<button onclick="openHandoverModal(${item.conversation_id})" class="btn-action" style="padding:5px 10px; background:${btnColor}; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;"><i class="fa-solid fa-magnifying-glass"></i> ${btnLabel}</button>`;

        const roles = getPartyRoles(item);

        return `
            <tr>
                <td><strong>#AGR-${item.conversation_id}</strong></td>
                <td>
                    <strong>${escapeHtml(item.item_name || 'Unnamed Item')}</strong><br>
                    <small style="color:#666;">${escapeHtml(item.category || '')} (${escapeHtml(item.report_type || '')})</small>
                </td>
                <td>
                    <div><strong style="color:#7aa340;">${roles.userOne}:</strong> ${escapeHtml(item.user_one_name || 'N/A')} <small>(${escapeHtml(item.user_one_contact || 'No contact')})</small></div>
                    <div><strong style="color:#2b580c;">${roles.userTwo}:</strong> ${escapeHtml(item.user_two_name || 'N/A')} <small>(${escapeHtml(item.user_two_contact || 'No contact')})</small></div>
                </td>
                <td><strong>${escapeHtml(item.meetup_barangay || 'Not specified')}</strong></td>
                <td>
                    <strong>${escapeHtml(formatMeetup(item))}</strong>
                </td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

/* =========================================================
   HANDOVER REVIEW MODAL — full item + both parties + chat transcript
   ========================================================= */

function closeHandoverModal() {
    const modal = document.getElementById('handoverModal');
    if (modal) modal.style.display = 'none';
}

async function openHandoverModal(conversationId) {
    const modal = document.getElementById('handoverModal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    if (!modal || !modalBody) return;

    const item = allAgreements.find(a => Number(a.conversation_id) === Number(conversationId));
    if (!item) return;

    if (modalTitle) modalTitle.textContent = `Agreement #AGR-${conversationId} — Verification & Clearance`;

    const roles = getPartyRoles(item);

    modalBody.innerHTML = `
        <div class="handover-review-grid">
            <div class="handover-review-photo">
                ${item.image_path
                    ? `<img src="${escapeAttr(item.image_path)}" alt="${escapeAttr(item.item_name || 'Item')}">`
                    : `<div class="handover-no-photo"><i class="fa-solid fa-box-open"></i></div>`}
            </div>
            <div class="handover-review-details">
                <h3>${escapeHtml(item.item_name || 'Unnamed Item')}</h3>
                <p><strong>Category:</strong> ${escapeHtml(item.category || 'N/A')} &middot; <strong>Type:</strong> ${escapeHtml(item.report_type || 'N/A')}</p>
                <p><strong>Location reported:</strong> ${escapeHtml(item.location || 'N/A')}</p>
                <p><strong>Date/Time:</strong> ${escapeHtml(formatDateTime(item.incident_date, item.incident_time) || 'N/A')}</p>
                <p class="handover-desc">${escapeHtml(item.description || 'No description provided.')}</p>
            </div>
        </div>

        <div class="handover-parties">
            <div class="handover-party">
                <span class="handover-party-label party-a">${roles.userOne}</span>
                <strong>${escapeHtml(item.user_one_name || 'N/A')}</strong>
                <small>${escapeHtml(item.user_one_email || '')} &middot; ${escapeHtml(item.user_one_contact || 'No contact')}</small>
            </div>
            <div class="handover-party">
                <span class="handover-party-label party-b">${roles.userTwo}</span>
                <strong>${escapeHtml(item.user_two_name || 'N/A')}</strong>
                <small>${escapeHtml(item.user_two_email || '')} &middot; ${escapeHtml(item.user_two_contact || 'No contact')}</small>
            </div>
        </div>

        <div class="handover-meetup">
            <i class="fa-solid fa-map-marker-alt"></i>
            <strong>${escapeHtml(item.meetup_barangay || 'Not specified')}</strong>
            &middot; ${escapeHtml(formatMeetup(item))}
        </div>

        ${item.reschedule_reason ? `<p style="font-size:0.82rem; color:#6d28d9; margin-bottom:12px;"><strong>Last reschedule reason:</strong> ${escapeHtml(item.reschedule_reason)}</p>` : ''}


        <div class="handover-transcript">
            <h4><i class="fa-solid fa-comments"></i> Chat transcript (read-only)</h4>
            <div id="handoverTranscriptBody" class="handover-transcript-body">
                <div class="handover-transcript-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading conversation...</div>
            </div>
        </div>

        <div class="handover-actions">${buildModalActions(item)}</div>
    `;

    modal.style.display = 'flex';
    loadTranscript(conversationId);
}

async function loadTranscript(conversationId) {
    const container = document.getElementById('handoverTranscriptBody');
    if (!container) return;

    try {
        const res = await fetch(`/api/admin/conversations/${conversationId}/messages`);
        const data = await res.json();

        if (!data.success || !Array.isArray(data.messages) || data.messages.length === 0) {
            container.innerHTML = `<div style="padding:14px; color:#999; text-align:center; font-size:0.85rem;">No messages exchanged yet.</div>`;
            return;
        }

        container.innerHTML = data.messages.map(m => {
            let bodyHtml;

            if (m.message_type === 'image' && m.image_url) {
                const sensitiveTag = m.is_sensitive
                    ? `<span style="color:#b3261e; font-weight:600; font-size:0.75rem;">[Sensitive document]</span> `
                    : '';
                bodyHtml = `${sensitiveTag}<a href="${escapeAttr(m.image_url)}" target="_blank">
                    <img src="${escapeAttr(m.image_url)}" alt="Attached photo" style="max-width:160px; max-height:160px; border-radius:8px; display:block; margin-top:4px;">
                </a>`;
            } else {
                bodyHtml = `<span>${escapeHtml(m.message || '')}</span>`;
            }

            return `
                <div class="handover-msg">
                    <strong>${escapeHtml(m.sender_name || 'User')}:</strong>
                    ${bodyHtml}
                    <small>${new Date(m.created_at).toLocaleString()}</small>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Transcript load failed:", err);
        container.innerHTML = `<div style="padding:14px; color:#b3261e; text-align:center; font-size:0.85rem;">Could not load the conversation.</div>`;
    }
}

/* =========================================================
   THEMED DIALOG (replaces native confirm() / prompt() / alert())
   ========================================================= */

function showAgrDialog({ title = "Are you sure?", message = "", type = "confirm", danger = false, confirmText = "Confirm", cancelText = "Cancel", placeholder = "" } = {}) {
    return new Promise((resolve) => {
        const overlay = document.getElementById("agrDialog");
        const iconEl = document.getElementById("agrDialogIcon");
        const titleEl = document.getElementById("agrDialogTitle");
        const messageEl = document.getElementById("agrDialogMessage");
        const inputWrap = document.getElementById("agrDialogInputWrap");
        const input = document.getElementById("agrDialogInput");
        const cancelBtn = document.getElementById("agrDialogCancel");
        const confirmBtn = document.getElementById("agrDialogConfirm");

        if (!overlay) {
            // Fallback if the dialog markup isn't present for some reason.
            if (type === "alert") { alert(message); return resolve(true); }
            if (type === "prompt") return resolve(prompt(message));
            return resolve(confirm(message));
        }

        titleEl.textContent = title;
        messageEl.textContent = message;

        iconEl.className = `agr-dialog-icon${danger ? " danger" : ""}`;
        iconEl.innerHTML = `<i class="fa-solid ${danger ? "fa-triangle-exclamation" : (type === "alert" ? "fa-circle-check" : "fa-circle-question")}"></i>`;

        confirmBtn.textContent = confirmText;
        confirmBtn.className = `agr-dialog-btn agr-dialog-confirm${danger ? " danger" : ""}`;

        if (type === "prompt") {
            inputWrap.style.display = "block";
            input.value = "";
            input.placeholder = placeholder;
        } else {
            inputWrap.style.display = "none";
        }

        cancelBtn.style.display = type === "alert" ? "none" : "inline-block";

        overlay.classList.add("active");

        const cleanup = () => {
            overlay.classList.remove("active");
            confirmBtn.removeEventListener("click", onConfirm);
            cancelBtn.removeEventListener("click", onCancel);
        };

        function onConfirm() {
            cleanup();
            if (type === "prompt") return resolve(input.value.trim());
            if (type === "alert") return resolve(true);
            resolve(true);
        }

        function onCancel() {
            cleanup();
            resolve(type === "prompt" ? null : false);
        }

        confirmBtn.addEventListener("click", onConfirm);
        cancelBtn.addEventListener("click", onCancel);

        if (type === "prompt") {
            setTimeout(() => input.focus(), 50);
        }
    });
}

/* =========================================================
   MODAL ACTIONS PER STAGE
   ========================================================= */

function buildModalActions(item) {
    const id = item.conversation_id;
    const stage = getStage(item);

    const pdfLink = item.transaction_report_path
        ? `<a href="${escapeAttr(item.transaction_report_path)}" target="_blank" class="btn-confirm" style="text-decoration:none; text-align:center;"><i class="fa-solid fa-file-pdf"></i> View Transaction Report</a>`
        : '';

    const reschedBtn = `<button class="btn-dispute" style="background:#ede9fe; color:#6d28d9; border-color:#d4c8f7;" onclick="rescheduleTransaction(${id})"><i class="fa-solid fa-calendar-xmark"></i> Re-schedule</button>`;

    if (stage === 'review' || stage === 'disputed') {
        return `
            <button class="btn-dispute" onclick="disputeTransaction(${id})"><i class="fa-solid fa-triangle-exclamation"></i> Flag as Disputed</button>
            <button class="btn-confirm" onclick="confirmTransaction(${id})"><i class="fa-solid fa-check"></i> Confirm & Generate PDF</button>`;
    }
    if (stage === 'awaiting_barangay') {
        // Barangay replied "yes"  -> Barangay Approved (notifies users it is ready)
        // Barangay replied "no"   -> Re-schedule (reason required)
        return `
            ${reschedBtn}
            <button class="btn-confirm" onclick="markBarangayApproved(${id})"><i class="fa-solid fa-building-circle-check"></i> Barangay Approved</button>
            ${pdfLink}`;
    }
    if (stage === 'approved') {
        // Barangay approved -> after the meetup actually happens, the admin closes it here.
        return `
            ${reschedBtn}
            <button class="btn-confirm" onclick="markCompleted(${id})"><i class="fa-solid fa-flag-checkered"></i> Mark as Completed</button>
            ${pdfLink}`;
    }
    return pdfLink; // completed / rescheduling / pending: nothing more for the admin to do
}

// Shared POST helper for the new admin actions
async function postAdminAction(conversationId, action, body, successTitle, successMsg) {
    try {
        const response = await fetch(`/api/admin/transactions/${conversationId}/${action}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            },
            body: JSON.stringify(body || {})
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned an invalid response (Endpoint might be missing or offline).");
        }

        const result = await response.json();
        if (!result.success) throw new Error(result.message || "Unknown error occurred.");

        closeHandoverModal();
        await fetchAgreements();
        await showAgrDialog({ type: "alert", title: successTitle, message: successMsg, confirmText: "Got it" });
        return true;
    } catch (err) {
        console.error(`${action} Error:`, err);
        await showAgrDialog({ type: "alert", danger: true, title: "Something went wrong", message: err.message || "Request failed.", confirmText: "Okay" });
        return false;
    }
}

// Admin records that the barangay replied (email / call / message) and approved the schedule.
async function markBarangayApproved(conversationId) {
    const ok = await showAgrDialog({
        title: "Barangay approved this schedule?",
        message: "Only confirm after the barangay hall has replied with their approval. Both users will be told the handover is ready.",
        confirmText: "Yes, barangay approved"
    });
    if (!ok) return;

    await postAdminAction(conversationId, 'barangay-approved', {},
        "Handover is ready", "Both parties were notified that the barangay approved the schedule.");
}

// Admin closes the handover once the item was really handed over -> Successful Transaction.
async function markCompleted(conversationId) {
    const ok = await showAgrDialog({
        title: "Mark this handover as completed?",
        message: "Only confirm after the item was handed over to its owner. This counts as a Successful Transaction and marks the item as Resolved.",
        confirmText: "Yes, completed"
    });
    if (!ok) return;

    await postAdminAction(conversationId, 'complete', {},
        "Transaction completed", "The handover was recorded as a Successful Transaction and both parties were notified.");
}

/* =========================================================
   RE-SCHEDULE (reason required)
   ========================================================= */

function showRescheduleDialog(item) {
    return new Promise((resolve) => {
        const wrap = document.createElement('div');
        wrap.className = 'agr-dialog-overlay active';
        wrap.innerHTML = `
        <div class="agr-dialog-card" style="max-width:420px;">
            <div class="agr-dialog-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
            <h3>Re-schedule #AGR-${item.conversation_id}</h3>
            <p>Both users will be asked to agree to a new schedule.</p>
            <div class="agr-dialog-input-wrap">
                <textarea id="rsReason" rows="2" maxlength="300" placeholder="Reason (required), e.g. Barangay hall is unavailable that day"></textarea>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <input type="date" id="rsDate" style="flex:1; padding:8px; border:1px solid #e2e8f0; border-radius:8px;">
                    <input type="time" id="rsTime" style="flex:1; padding:8px; border:1px solid #e2e8f0; border-radius:8px;">
                </div>
                <small style="color:#94a3b8;">Date and time are optional. Leave blank to let the users pick.</small>
            </div>
            <div class="agr-dialog-actions">
                <button type="button" class="agr-dialog-btn agr-dialog-cancel" id="rsCancel">Cancel</button>
                <button type="button" class="agr-dialog-btn agr-dialog-confirm" id="rsOk">Send to users</button>
            </div>
        </div>`;
        document.body.appendChild(wrap);

        const done = (value) => { wrap.remove(); resolve(value); };
        wrap.querySelector('#rsCancel').onclick = () => done(null);
        wrap.querySelector('#rsOk').onclick = () => {
            const reasonEl = wrap.querySelector('#rsReason');
            const reason = reasonEl.value.trim();
            if (!reason) { reasonEl.style.borderColor = '#dc2626'; reasonEl.focus(); return; }
            done({
                reason,
                newDate: wrap.querySelector('#rsDate').value || null,
                newTime: wrap.querySelector('#rsTime').value || null
            });
        };
        setTimeout(() => wrap.querySelector('#rsReason').focus(), 50);
    });
}

async function rescheduleTransaction(conversationId) {
    const item = allAgreements.find(a => Number(a.conversation_id) === Number(conversationId));
    if (!item) return;

    const data = await showRescheduleDialog(item);
    if (!data) return;

    await postAdminAction(conversationId, 'reschedule', data,
        "Re-schedule sent", "Both parties were notified and asked to agree to a new schedule.");
}

// Confirm transaction and trigger backend PDF generation
async function confirmTransaction(conversationId) {
    const confirmed = await showAgrDialog({
        title: "Confirm this agreement?",
        message: "This generates the official transaction PDF and tells both parties it is now waiting for barangay approval.",
        confirmText: "Confirm & Generate PDF"
    });
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/admin/transactions/${conversationId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            await showAgrDialog({
                type: "alert",
                title: "Confirmed",
                message: "The PDF was generated and both parties were told it is waiting for barangay approval.",
                confirmText: "Got it"
            });
            closeHandoverModal();
            if (result.reportPath) {
                window.open(result.reportPath, '_blank');
            }
            fetchAgreements();
        } else {
            await showAgrDialog({
                type: "alert",
                title: "Couldn't confirm",
                danger: true,
                message: result.message || "Unknown error occurred.",
                confirmText: "Okay"
            });
        }
    } catch (err) {
        console.error("Confirmation Error:", err);
        await showAgrDialog({
            type: "alert",
            title: "Something went wrong",
            danger: true,
            message: "An error occurred while confirming the transaction.",
            confirmText: "Okay"
        });
    }
}

// Flag a transaction as disputed
async function disputeTransaction(conversationId) {
    const reason = await showAgrDialog({
        type: "prompt",
        title: "Flag as disputed",
        message: "Briefly describe the issue with this agreement.",
        placeholder: "e.g. Item description doesn't match what was discussed...",
        confirmText: "Flag Transaction",
        danger: true
    });
    if (reason === null) return;

    try {
        const response = await fetch(`/api/admin/transactions/${conversationId}/dispute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        const result = await response.json();

        if (result.success) {
            await showAgrDialog({
                type: "alert",
                title: "Transaction flagged",
                message: "Both parties have been notified of the dispute.",
                confirmText: "Got it"
            });
            closeHandoverModal();
            fetchAgreements();
        } else {
            await showAgrDialog({
                type: "alert",
                title: "Couldn't flag transaction",
                danger: true,
                message: result.message || "Unknown error occurred.",
                confirmText: "Okay"
            });
        }
    } catch (err) {
        console.error("Dispute Error:", err);
        await showAgrDialog({
            type: "alert",
            title: "Something went wrong",
            danger: true,
            message: "An error occurred while flagging the transaction.",
            confirmText: "Okay"
        });
    }
}

// Simple client-side CSV export of the current filtered view
async function exportAgreementsCsv() {
    if (filteredAgreements.length === 0) {
        await showAgrDialog({
            type: "alert",
            title: "Nothing to export",
            message: "No agreement records match your current filters.",
            confirmText: "Okay"
        });
        return;
    }

    const headers = ["Agreement ID", "Item", "Category", "Party A Name", "Party A Role", "Party B Name", "Party B Role", "Barangay", "Meetup Date", "Meetup Time", "Status"];
    const rows = filteredAgreements.map(item => {
        const roles = getPartyRoles(item);
        return [
            `AGR-${item.conversation_id}`,
            item.item_name || '',
            item.category || '',
            item.user_one_name || '',
            roles.userOne,
            item.user_two_name || '',
            roles.userTwo,
            item.meetup_barangay || '',
            item.meetup_date || '',
            item.meetup_time || '',
            STAGES[getStage(item)].label
        ];
    });

    const csv = [headers, ...rows]
        .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refoundly_agreements_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function escapeAttr(str) {
    return escapeHtml(str);
}

// Whoever posted the item is the Finder (if it was posted to "Found") or
// the Owner (if it was posted to "Lost"). The other person in the
// conversation carries the opposite role.
function getPartyRoles(item) {
    const posterIsUserOne = Number(item.item_owner_id) === Number(item.user_one_id);
    const isFoundReport = (item.report_type || '').toLowerCase() === 'found';

    const posterRole = isFoundReport ? 'Finder' : 'Owner';
    const otherRole = isFoundReport ? 'Owner' : 'Finder';

    return {
        userOne: posterIsUserOne ? posterRole : otherRole,
        userTwo: posterIsUserOne ? otherRole : posterRole
    };
}

/* --- NOTIFICATION LOGIC --- */
async function checkNotifications() {
    try {
        const response = await fetch('/api/admin/items');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const freshData = await response.json();
        const itemsArray = Array.isArray(freshData) ? freshData : (freshData.items || freshData.data || []);

        itemsArray.forEach(item => {
            if (!knownItemIds.has(item.id)) {
                if (!isInitialLoad || item.status === "Pending Approval") {
                    addNotif(`New Report: ${item.item_name}`, item.id);
                }
                knownItemIds.add(item.id);
            }
        });

        localStorage.setItem('refoundly_known_ids', JSON.stringify([...knownItemIds]));
        isInitialLoad = false;
    } catch (error) {
        console.error("Notification Fetch Error:", error);
    }
}

function addNotif(text, itemId) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    notifications.unshift({ text, time, itemId, read: false });
    if (notifications.length > 20) notifications.pop();

    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
}

function updateNotifBadge() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.innerText = unreadCount;
    badge.style.display = unreadCount > 0 ? "block" : "none";
}

function toggleNotifs() {
    const drop = document.getElementById("notifDropdown");
    if (!drop) return;
    const isOpening = drop.style.display === "none" || drop.style.display === "";
    drop.style.display = isOpening ? "block" : "none";

    if (isOpening) renderNotifDropdown();
}

function renderNotifDropdown() {
    const list = document.getElementById("notifList");
    if (!list) return;

    let displayList = [...notifications];
    if (currentNotifTab === 'unread') {
        displayList = displayList.filter(n => !n.read);
    }

    if (displayList.length === 0) {
        list.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #999; font-size: 0.85rem;">
            No ${currentNotifTab === 'unread' ? 'unread' : ''} notifications
        </div>`;
        return;
    }

    list.innerHTML = displayList.map((n) => {
        const globalIndex = notifications.indexOf(n);
        return `
        <div class="notif-item-modern ${n.read ? '' : 'unread-bg'}" onclick="handleNotifClick(${globalIndex})">
            <div class="notif-icon-circle" style="width:35px; height:35px; border-radius:50%; background:#7aa340; color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-file-invoice" style="font-size:0.8rem;"></i>
            </div>
            <div style="flex-grow:1;">
                <div style="font-size:0.85rem; color:#1c1e21; font-weight:${n.read ? '400' : '600'}">${n.text}</div>
                <div style="font-size:0.75rem; color:#65676b;">${n.time}</div>
            </div>
            ${!n.read ? '<div class="unread-dot-small"></div>' : ''}
        </div>
    `;}).join('');
}

function handleNotifClick(index) {
    if (index === -1) return;
    notifications[index].read = true;
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    window.location.href = 'AdReport.html';
}

function clearAllNotifs() {
    notifications = [];
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    const drop = document.getElementById("notifDropdown");
    if (drop) drop.style.display = "none";
}

function updateStatCards(data) {
    const stages = data.map(getStage);
    
    // Scheduled = barangay-approved handovers that are still waiting for the meetup to happen
    const scheduled = stages.filter(s => s === 'approved').length;
    // Successful = handovers the admin closed as completed
    const successful = stages.filter(s => s === 'completed').length;
    
    // Pending = mga naghihintay pa ng review o approval ng barangay ('review' o 'awaiting_barangay')
    const pending = stages.filter(s => s === 'review' || s === 'awaiting_barangay').length;
    const disputes = stages.filter(s => s === 'disputed').length;

    const scheduledEl = document.getElementById('metric-scheduled');
    const clearanceEl = document.getElementById('metric-clearance');
    const disputedEl = document.getElementById('metric-disputed');
    const successEl = document.getElementById('metric-completed');

    if (successEl) successEl.innerText = successful;
    if (scheduledEl) scheduledEl.innerText = scheduled;
    if (clearanceEl) clearanceEl.innerText = pending;
    if (disputedEl) disputedEl.innerText = disputes;
}