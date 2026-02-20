// --- GLOBAL STATE ---
let allUsers = [];
let selectedUserId = null;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".content-wrapper");
    const tbody = document.getElementById("usersTableBody");
    const searchInput = document.getElementById("userSearch");
    const roleFilter = document.getElementById("roleFilter");

    // Static Event Listeners (Fixes CSP/Eval errors)
    searchInput?.addEventListener("input", filterUsers);
    roleFilter?.addEventListener("change", filterUsers);
    
    // Modal Close buttons
    document.querySelectorAll(".close-x").forEach(btn => {
        btn.addEventListener("click", () => {
            closeViewModal();
            closeSuspendModal();
        });
    });

    // Navigation & Page Transitions
    if (wrapper) setTimeout(() => wrapper.classList.add("fade-in"), 100);

    // Initial Data Fetch
    fetchUsers();
    updateNotifBadge();
    checkNotifications(); 
    setInterval(checkNotifications, 20000);
});

// --- API & DATA FETCHING ---

async function fetchUsers() {
    const tbody = document.getElementById("usersTableBody");
    try {
        const res = await fetch("/api/admin-users/all");
        const data = await res.json();

        if (Array.isArray(data)) {
            allUsers = data;
            renderTable(allUsers);
        } else {
            tbody.innerHTML = `<tr><td colspan='5' style='text-align:center; color:red;'>Error: ${data.error || 'Unknown error'}</td></tr>`;
        }
    } catch (err) {
        console.error("Fetch Users Error:", err);
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Cannot connect to server.</td></tr>";
    }
}

// --- UI RENDERING ---

function renderTable(data) {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    data.forEach(user => {
        const badgeClass = user.role === "admin" ? "resolved" : "pending";
        const roleLabel = user.role === "admin" ? "Admin" : "User";
        const isSuspended = user.status === "suspended";
        const suspendedTag = isSuspended ? `<span style="color:red; font-size:0.7rem; margin-left:5px;">(SUSPENDED)</span>` : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="user-cell">
                <div class="avatar"></div>
                ${user.name} ${suspendedTag}
            </td>
            <td>${user.email}</td>
            <td><span class="badge ${badgeClass}">${roleLabel}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td class="action-buttons"></td>`;

        // Securely attach buttons to avoid inline onclick
        const actionCell = tr.querySelector(".action-buttons");
        
        const viewBtn = createButton(`<i class="fa-solid fa-eye"></i> View`, "btn-view", () => viewUser(user.id));
        const suspendBtn = createButton(`Suspend`, "btn-delete", () => openSuspendModal(user.id, user.name));
        
        actionCell.appendChild(viewBtn);
        actionCell.appendChild(suspendBtn);

        tbody.appendChild(tr);
    });
}

function createButton(html, className, callback) {
    const btn = document.createElement("button");
    btn.className = className;
    btn.innerHTML = html;
    btn.addEventListener("click", callback);
    return btn;
}

// --- FILTER LOGIC ---

function filterUsers() {
    const searchInput = document.getElementById("userSearch");
    const roleFilter = document.getElementById("roleFilter");
    
    const search = searchInput.value.toLowerCase();
    const role = roleFilter.value;

    const filtered = allUsers.filter(u => {
        const name = u.name || "";
        const email = u.email || "";
        const matchSearch = name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
        const matchRole = role === "all" || u.role === role;
        return matchSearch && matchRole;
    });
    renderTable(filtered);
}

// --- MODAL: VIEW USER ---

function viewUser(id) {
    const userId = Number(id);
    const user = allUsers.find(u => u.id == userId);
    
    if (user) {
        document.getElementById("modalUserNameHeader").innerText = user.name;
        document.getElementById("viewName").innerText = user.name;
        document.getElementById("viewEmail").innerText = user.email;
        
        const roleText = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        document.getElementById("viewRole").innerText = roleText;
        
        document.getElementById("viewId").innerText = user.id;
        document.getElementById("viewDate").innerText = new Date(user.created_at).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        });
        document.getElementById("viewStatus").innerText = user.status || "Active";

        document.getElementById("viewUserModal").style.display = "flex";
    }
}

function closeViewModal() {
    document.getElementById("viewUserModal").style.display = "none";
}

// --- MODAL: SUSPEND USER ---

function openSuspendModal(id, name) {
    selectedUserId = id;
    document.getElementById("suspendUserName").innerText = `Are you sure you want to suspend ${name}?`;
    
    document.getElementById("confirmView").style.display = "block";
    document.getElementById("reasonView").style.display = "none";
    document.getElementById("suspendModal").style.display = "flex";

    // Bind modal-specific actions once
    document.getElementById("confirmYes")?.replaceWith(createButton("YES", "btn-danger", goToReasons));
}

function goToReasons() {
    document.getElementById("confirmView").style.display = "none";
    document.getElementById("reasonView").style.display = "block";
}

function closeSuspendModal() {
    document.getElementById("suspendModal").style.display = "none";
    selectedUserId = null;
}

// Global functions exposed only for UI buttons that still use inline (optional but safer to use listeners)
window.closeSuspendModal = closeSuspendModal;
window.goToReasons = goToReasons;
window.resetSuspendModal = () => {
    document.getElementById("confirmView").style.display = "block";
    document.getElementById("reasonView").style.display = "none";
    document.querySelectorAll('input[name="reason"]').forEach(cb => cb.checked = false);
};

async function confirmSuspension() {
    const checkboxes = document.querySelectorAll('input[name="reason"]:checked');
    const reasons = Array.from(checkboxes).map(cb => cb.value);

    if (reasons.length === 0) {
        alert("Please select at least one reason for suspension.");
        return;
    }

    try {
        const response = await fetch(`/api/admin-users/suspend/${selectedUserId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reasons: reasons })
        });

        if (response.ok) {
            alert("This account has been suspended.");
            closeSuspendModal();
            fetchUsers(); // Refresh data without full page reload
        }
    } catch (err) {
        console.error("Suspension failed:", err);
        closeSuspendModal();
    }
}
window.confirmSuspension = confirmSuspension;

// --- NOTIFICATIONS ---

async function checkNotifications() {
    try {
        const response = await fetch('/api/admin/items'); 
        const freshData = await response.json();
        let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
        let isInitialLoad = !localStorage.getItem('refoundly_known_ids');

        freshData.forEach(item => {
            if (!knownItemIds.has(item.id)) {
                if (!isInitialLoad || item.status === "Pending Approval") {
                    addNotif(`New Report: ${item.item_name}`, item.id);
                }
                knownItemIds.add(item.id);
            }
        });
        localStorage.setItem('refoundly_known_ids', JSON.stringify([...knownItemIds]));
    } catch (error) { console.error(error); }
}

function addNotif(text, itemId) {
    let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    notifications.unshift({ text, time, itemId, read: false });
    if (notifications.length > 20) notifications.pop();
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
}

function updateNotifBadge() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.innerText = unreadCount;
    badge.style.display = unreadCount > 0 ? "block" : "none";
}

window.toggleNotifs = () => {
    const drop = document.getElementById("notifDropdown");
    const list = document.getElementById("notifList");
    let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
    const isOpening = drop.style.display === "none" || drop.style.display === "";
    
    drop.style.display = isOpening ? "block" : "none";
    
    if(isOpening) {
        if (notifications.length === 0) {
            list.innerHTML = `<div style="padding: 20px; text-align: center; color: #999; font-size: 0.85rem;">No notifications</div>`;
        } else {
            list.innerHTML = "";
            notifications.forEach((n, index) => {
                const item = document.createElement("div");
                item.className = "notif-item";
                item.style.cssText = `padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 0.85rem; color: #444; cursor: pointer; background: ${n.read ? 'white' : '#f0f7ef'}`;
                item.innerHTML = `<strong>${n.time}</strong>: ${n.text}`;
                item.addEventListener("click", () => handleNotifClick(index));
                list.appendChild(item);
            });
        }
    }
};

function handleNotifClick(index) {
    let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
    notifications[index].read = true;
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    window.location.href = 'AdReport.html';
}

window.clearAllNotifs = () => {
    localStorage.setItem('refoundly_notifications', JSON.stringify([]));
    updateNotifBadge();
    document.getElementById("notifDropdown").style.display = "none";
};