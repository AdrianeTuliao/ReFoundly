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
        currentPage = 1;
        renderTable();
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
    const status = item.agreement_status;
    if (stage === 'Scheduled') return status === 'both_agreed' || status === 'admin_reviewing';
    if (stage === 'Pending Clearance') return status === 'admin_reviewing' || status === 'both_agreed';
    if (stage === 'Completed') return status === 'confirmed' || status === 'completed';
    if (stage === 'Disputed') return status === 'disputed';
    return true;
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
        let statusBadge = "";
        let actionBtn = "";

        if (item.agreement_status === 'confirmed' || item.agreement_status === 'completed') {
            statusBadge = `<span class="log-badge badge-admin">Confirmed</span>`;
            actionBtn = `
                <a href="${item.transaction_report_path}" target="_blank" class="btn-action view-btn" style="padding:5px 10px; background:#5D8252; color:white; border-radius:4px; text-decoration:none; font-size:0.8rem; margin-right:4px;"><i class="fa-solid fa-file-pdf"></i> Report</a>
                <button onclick="openHandoverModal(${item.conversation_id})" class="btn-action" style="padding:5px 10px; background:#eef2eb; color:#333; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:0.8rem;"><i class="fa-solid fa-eye"></i></button>
            `;
        } else if (item.agreement_status === 'disputed') {
            statusBadge = `<span class="log-badge" style="background:#fde2e1; color:#b3261e;">Disputed</span>`;
            actionBtn = `<button onclick="openHandoverModal(${item.conversation_id})" class="btn-action" style="padding:5px 10px; background:#b3261e; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;"><i class="fa-solid fa-magnifying-glass"></i> Review</button>`;
        } else if (item.agreement_status === 'admin_reviewing' || item.agreement_status === 'both_agreed') {
            statusBadge = `<span class="log-badge badge-security" style="background:#fff3cd; color:#856404;">Awaiting Review</span>`;
            actionBtn = `<button onclick="openHandoverModal(${item.conversation_id})" class="btn-action confirm-btn" style="padding:5px 10px; background:#7aa340; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;"><i class="fa-solid fa-magnifying-glass"></i> Review</button>`;
        } else {
            statusBadge = `<span class="log-badge badge-report">${item.agreement_status}</span>`;
            actionBtn = `<span style="color:#999; font-size:0.8rem;">Pending Both Parties</span>`;
        }

        const formattedDate = item.meetup_date
            ? new Date(item.meetup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : (item.admin_notified_at ? new Date(item.admin_notified_at).toLocaleDateString() : 'TBD');

        const formattedTime = item.meetup_time || (item.admin_notified_at ? new Date(item.admin_notified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

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
                    <strong>${formattedDate}</strong><br>
                    <small style="color:#666;">${formattedTime}</small>
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
                <p><strong>Date/Time:</strong> ${escapeHtml(item.incident_date || 'N/A')} ${escapeHtml(item.incident_time || '')}</p>
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
            ${item.meetup_date ? `&middot; ${escapeHtml(item.meetup_date)}` : ''}
            ${item.meetup_time ? `${escapeHtml(item.meetup_time)}` : ''}
        </div>

        <div class="handover-transcript">
            <h4><i class="fa-solid fa-comments"></i> Chat transcript (read-only)</h4>
            <div id="handoverTranscriptBody" class="handover-transcript-body">
                <div class="handover-transcript-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading conversation...</div>
            </div>
        </div>

        <div class="handover-actions">
            ${item.agreement_status !== 'confirmed' && item.agreement_status !== 'completed' ? `
                <button class="btn-dispute" onclick="disputeTransaction(${item.conversation_id})">
                    <i class="fa-solid fa-triangle-exclamation"></i> Flag as Disputed
                </button>
                <button class="btn-confirm" onclick="confirmTransaction(${item.conversation_id})">
                    <i class="fa-solid fa-check"></i> Confirm & Generate PDF
                </button>
            ` : `
                <a href="${item.transaction_report_path}" target="_blank" class="btn-confirm" style="text-decoration:none; text-align:center;">
                    <i class="fa-solid fa-file-pdf"></i> View Transaction Report
                </a>
            `}
        </div>
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

        container.innerHTML = data.messages.map(m => `
            <div class="handover-msg">
                <strong>${escapeHtml(m.sender_name || 'User')}:</strong>
                ${m.image_path
                    ? `<a href="${escapeAttr(m.image_path)}" target="_blank">[photo]</a>`
                    : `<span>${escapeHtml(m.message || '')}</span>`}
                <small>${new Date(m.created_at).toLocaleString()}</small>
            </div>
        `).join('');
    } catch (err) {
        console.error("Transcript load failed:", err);
        container.innerHTML = `<div style="padding:14px; color:#b3261e; text-align:center; font-size:0.85rem;">Could not load the conversation.</div>`;
    }
}

// Confirm transaction and trigger backend PDF generation
async function confirmTransaction(conversationId) {
    if (!confirm("Are you sure you want to confirm this agreement and generate the transaction PDF?")) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/transactions/${conversationId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            alert("Transaction confirmed successfully! PDF report generated.");
            closeHandoverModal();
            if (result.reportPath) {
                window.open(result.reportPath, '_blank');
            }
            fetchAgreements();
        } else {
            alert("Failed to confirm transaction: " + (result.message || "Unknown error"));
        }
    } catch (err) {
        console.error("Confirmation Error:", err);
        alert("An error occurred while confirming the transaction.");
    }
}

// Flag a transaction as disputed
async function disputeTransaction(conversationId) {
    const reason = prompt("Briefly describe the issue with this agreement:");
    if (reason === null) return;

    try {
        const response = await fetch(`/api/admin/transactions/${conversationId}/dispute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        const result = await response.json();

        if (result.success) {
            alert("Transaction flagged as disputed. Both parties have been notified.");
            closeHandoverModal();
            fetchAgreements();
        } else {
            alert("Failed to flag transaction: " + (result.message || "Unknown error"));
        }
    } catch (err) {
        console.error("Dispute Error:", err);
        alert("An error occurred while flagging the transaction.");
    }
}

// Simple client-side CSV export of the current filtered view
function exportAgreementsCsv() {
    if (filteredAgreements.length === 0) {
        alert("No agreement records to export.");
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
            item.agreement_status || ''
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
    const scheduled = data.filter(i => i.agreement_status === 'confirmed' || i.agreement_status === 'completed').length;
    const pending = data.filter(i => i.agreement_status === 'admin_reviewing' || i.agreement_status === 'both_agreed').length;
    const disputes = data.filter(i => i.agreement_status === 'disputed').length;

    const scheduledEl = document.getElementById('metric-scheduled');
    const clearanceEl = document.getElementById('metric-clearance');
    const disputedEl = document.getElementById('metric-disputed');

    if (scheduledEl) scheduledEl.innerText = scheduled;
    if (clearanceEl) clearanceEl.innerText = pending;
    if (disputedEl) disputedEl.innerText = disputes;
}