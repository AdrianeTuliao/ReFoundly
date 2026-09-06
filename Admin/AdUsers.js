// --- GLOBAL STATE ---
let allUsers = [];
let selectedUserId = null;
let selectedUserRole = null;
let currentUserId = null

const BACKEND_URL = 'http://localhost:3000'; // Change 3000 to your actual Backend Port    

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".content-wrapper");
    const tbody = document.getElementById("usersTableBody");
    const searchInput = document.getElementById("userSearch");
    const roleFilter = document.getElementById("roleFilter");
    const openAddBtn = document.getElementById("openAddUserBtn");
    openAddBtn?.addEventListener("click", openAddUserModal);
    const addForm = document.getElementById("addUserForm");
    addForm?.addEventListener("submit", handleAddAdmin);

    // Static Event Listeners (Fixes CSP/Eval errors)
    searchInput?.addEventListener("input", filterUsers);
    roleFilter?.addEventListener("change", filterUsers);
    
    // Modal Close buttons
    document.querySelectorAll(".close-x").forEach(btn => {
        btn.addEventListener("click", () => {
            closeViewModal();
            closeSuspendModal();
            closeAddUserModal();
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
        const res = await fetch(`${BACKEND_URL}/api/admin-users/all`);
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
function getUserInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(p => p.length > 0);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function renderTable(data) {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    data.forEach(user => {
        const isSuspended = user.status === "suspended";
        const isDeactivated = user.status === "deactivated";
        const initials = getUserInitials(user.name);
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="user-cell">
                <div class="avatar-initials">${initials}</div>
                <div class="user-info-stack">
                    <span class="user-name">${user.name}</span>
                    ${isSuspended ? '<span class="status-tag tag-red">SUSPENDED</span>' : ''}
                    ${isDeactivated ? '<span class="status-tag tag-gray">DEACTIVATED</span>' : ''}
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="badge ${user.role === 'admin' ? 'resolved' : 'pending'}">${user.role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td class="action-cell-right">
                <div class="action-buttons"></div>
            </td>`;

        const actionCell = tr.querySelector(".action-buttons");
        
        // 1. View Button
        actionCell.appendChild(createButton(`<i class="fa-solid fa-eye"></i>`, "btn-view", () => viewUser(user.id)));
        
        // 2. Suspend / Unsuspend Button Logic
        if (user.role !== "admin") {
    if (isSuspended) {
        const unsuspendBtn = createButton(
            `Unsuspend`,
            "btn-activate",
            () => handleUnsuspend(user.id, user.role)
        );

        unsuspendBtn.style.backgroundColor = "#5D8252";
        unsuspendBtn.style.color = "white";
        actionCell.appendChild(unsuspendBtn);

    } else if (!isDeactivated) {
        actionCell.appendChild(
            createButton(
                `Suspend`,
                "btn-delete",
                () => openSuspendModal(user.id, user.name, user.role)
            )
        );
    }
}
        
        // 3. Deactivate / Reactivate Toggle
        if (!isSuspended) {
            const toggleBtn = createButton(
                isDeactivated ? "Reactivate" : "Deactivate", 
                isDeactivated ? "btn-activate" : "btn-deactivate", 
                () => handleDeactivateToggle(user.id, user.status, user.role)
            );
            toggleBtn.style.backgroundColor = isDeactivated ? "#5D8252" : "#4a4a4a";
            toggleBtn.style.color = "white";
            actionCell.appendChild(toggleBtn);
        }

        tbody.appendChild(tr);
    });
}

// --- UN-SUSPEND HANDLER ---
let pendingUnsuspendId = null;
let pendingUnsuspendRole = null;

// Binagong handler na magbubukas ng Custom Modal imbes na browser prompt
function handleUnsuspend(userId, role) {
    pendingUnsuspendId = userId;
    pendingUnsuspendRole = role;

    const modal = document.getElementById("unsuspendModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

function closeUnsuspendModal() {
    const modal = document.getElementById("unsuspendModal");
    if (modal) {
        modal.style.display = "none";
    }
    pendingUnsuspendId = null;
    pendingUnsuspendRole = null;
}

async function executeUnsuspend() {
    if (!pendingUnsuspendId) return;

    try {
        const url = `${BACKEND_URL}/api/admin-users/unsuspend/${pendingUnsuspendId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: pendingUnsuspendRole })
        });

        closeUnsuspendModal();

        if (response.ok) {
            showToast("Suspension Lifted", "The account is now active again.", "success");
            fetchUsers();
        } else {
            const errorData = await response.json();
            showToast("Error", errorData.message || "Failed to lift suspension", "danger");
        }
    } catch (err) {
        console.error("Unsuspend error:", err);
        alert("Connection lost. Check backend server.");
    }
}

// I-expose sa global scope para sa HTML onclick attributes
window.handleUnsuspend = handleUnsuspend;
window.closeUnsuspendModal = closeUnsuspendModal;
window.executeUnsuspend = executeUnsuspend;

let pendingToggleId = null;
let pendingToggleStatus = null;
let pendingToggleRole = null;

function handleDeactivateToggle(userId, currentStatus, role) {
    pendingToggleId = userId;
    pendingToggleRole = role;
    pendingToggleStatus = currentStatus === "deactivated" ? "active" : "deactivated";
    
    const modal = document.getElementById("toggleStatusModal");
    const title = document.getElementById("toggleModalTitle");
    const header = document.getElementById("toggleModalHeader");
    const message = document.getElementById("toggleModalMessage");
    const confirmBtn = document.getElementById("confirmToggleBtn");

    if (pendingToggleStatus === "deactivated") {
        title.innerText = "Deactivate Account";
        if(header) header.style.backgroundColor = "#4a4a4a"; 
        message.innerText = "Are you sure you want to deactivate this account?";
        confirmBtn.innerText = "YES, DEACTIVATE";
    } else {
        title.innerText = "Activate Account";
        if(header) header.style.backgroundColor = "#5D8252"; 
        message.innerText = "Are you sure you want to activate this account?";
        confirmBtn.innerText = "YES, ACTIVATE";
    }

    confirmBtn.onclick = executeToggle;
    modal.style.display = "flex";
}

function closeToggleModal() {
    document.getElementById("toggleStatusModal").style.display = "none";
}
function closeViewModal() { document.getElementById("viewUserModal").style.display = "none"; }

async function executeToggle() {
    const confirmBtn = document.getElementById("confirmToggleBtn");
    const originalText = confirmBtn.innerText;
    
    confirmBtn.innerText = "Processing...";
    confirmBtn.disabled = true;

    try {
        const url = `${BACKEND_URL}/api/admin-users/status-toggle/${pendingToggleId}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                status: pendingToggleStatus,
                role: pendingToggleRole,
                actionSource: 'admin_manual'
            })
        });

        if (response.ok) {
            const isActivating = pendingToggleStatus === "active";

            showToast(
                isActivating ? "Account Reactivated" : "Account Deactivated",
                isActivating ? "The user can now log in again." : "Account has been placed on hold.",
                isActivating ? "success" : "danger"
            );

            closeToggleModal();
            fetchUsers(); // Refresh table
        } else {
            const errorData = await response.json();
            alert("Error: " + (errorData.message || "Failed to update status"));
        }
    } catch (err) {
        console.error("Toggle error:", err);
        alert("Connection lost. Check if backend is running on port " + BACKEND_URL.split(':').pop());
    } finally {
        confirmBtn.innerText = originalText;
        confirmBtn.disabled = false;
    }
}

// FIX: Time calculation logic
function calculateInactiveTime(deactivatedAt) {
    if (!deactivatedAt) return "Inactivity started just now";
    
    const start = new Date(deactivatedAt);
    const now = new Date();
    const diffInMs = now - start;
    
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHrs = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHrs / 24);

    if (diffInDays > 0) return `${diffInDays}d ${diffInHrs % 24}h remaining`;
    if (diffInHrs > 0) return `${diffInHrs} hour(s) active`;
    return `${diffInMins} minute(s) ago`;
}

function viewUser(id) {
    const user = allUsers.find(u => u.id == id);
    if (!user) return;

    document.getElementById("modalUserNameHeader").innerText = user.name;
    document.getElementById("viewName").innerText = user.name;
    document.getElementById("viewEmail").innerText = user.email;
    document.getElementById("viewRole").innerText = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById("viewId").innerText = user.id;

    const statusEl = document.getElementById("viewStatus");
    const ageSpan = document.getElementById("viewInactiveTime");

    // 1. Pag-parse ng Dahilan ng Suspension (Reasons)
    let rawReasons = user.suspend_reasons || user.reasons;
    let parsedReasons = [];
    if (rawReasons) {
        try {
            parsedReasons = typeof rawReasons === 'string' ? JSON.parse(rawReasons) : rawReasons;
        } catch(e) { 
            parsedReasons = typeof rawReasons === 'string' ? [rawReasons] : []; 
        }
    }

    // 2. Kuhanin o gawan ng Container ang Unsuspend Button sa ilalim ng View Modal
    let modalFooter = document.getElementById("viewModalUnsuspendContainer");
    if (!modalFooter) {
        const viewCard = document.querySelector("#viewUserModal .view-card");
        if (viewCard) {
            modalFooter = document.createElement("div");
            modalFooter.id = "viewModalUnsuspendContainer";
            modalFooter.style.cssText = "margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; text-align: right;";
            viewCard.appendChild(modalFooter);
        }
    }

    // 3. Logic kapag SUSPENDED ang user
    if (user.status === "suspended") {
        statusEl.style.color = "#d9534f";
        const reasonText = parsedReasons.length > 0 ? ` (${parsedReasons.join(', ')})` : " (No reason specified)";
        statusEl.innerText = `Suspended${reasonText}`;
        
        // Kwenta ng ilang araw pa bago ma-unsuspend
        if (user.suspended_until) {
            const liftDate = new Date(user.suspended_until);
            const now = new Date();
            const diffTime = liftDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
                ageSpan.innerText = `${diffDays} day(s) remaining (Lifts on ${liftDate.toLocaleDateString()})`;
            } else {
                ageSpan.innerText = `Lifts today (${liftDate.toLocaleDateString()})`;
            }
        } else {
            ageSpan.innerText = "Indefinite / Policy Violation";
        }

        // Ipakita ang Unsuspend Button
        if (modalFooter) {
            modalFooter.style.display = "block";
            modalFooter.innerHTML = `
                <button id="modalUnsuspendBtn" style="background-color: #5D8252; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem;">
                    <i class="fa-solid fa-user-check" style="margin-right: 6px;"></i> Unsuspend User
                </button>
            `;
            document.getElementById("modalUnsuspendBtn").onclick = async () => {
                closeViewModal();
                await handleUnsuspend(user.id);
            };
        }

    } else if (user.status === "deactivated") {
        statusEl.style.color = "#667";
        statusEl.innerText = "Deactivated (Admin Hold)";
        ageSpan.innerText = "Awaiting Reactivation";
        if (modalFooter) modalFooter.style.display = "none";
    } else {
        statusEl.style.color = "#5D8252";
        statusEl.innerText = "Active";
        ageSpan.innerText = calculateAccountAge(user.created_at);
        if (modalFooter) modalFooter.style.display = "none";
    }

    document.getElementById("viewDate").innerText = new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    document.getElementById("viewUserModal").style.display = "flex";
}

function calculateAccountAge(createdDate) {
    if (!createdDate) return "N/A";
    const start = new Date(createdDate);
    const now = new Date();
    const diffInMs = now - start;
    
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHrs = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHrs / 24);
    const diffInMonths = Math.floor(diffInDays / 30);

    if (diffInMonths > 0) return `${diffInMonths} month(s), ${diffInDays % 30} day(s)`;
    if (diffInDays > 0) return `${diffInDays} day(s), ${diffInHrs % 24} hr(s)`;
    if (diffInHrs > 0) return `${diffInHrs} hr(s), ${diffInMins % 60} min(s)`;
    return `${diffInMins} minute(s)`;
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

// --- MODAL: SUSPEND USER ---
function openSuspendModal(id, name, role) {
    selectedUserId = id; 
    selectedUserRole = role;
    const nameLabel = document.getElementById("suspendUserName");
    if (nameLabel) {
        nameLabel.innerText = `Are you sure you want to suspend ${name}?`;
    }
    document.getElementById("confirmView").style.display = "block";
    document.getElementById("reasonView").style.display = "none";
    document.getElementById("suspendModal").style.display = "flex";
}

function goToReasons() {
    console.log("Button clicked! Moving to reasons view...");
    document.getElementById("confirmView").style.display = "none";
    document.getElementById("reasonView").style.display = "block";
}

window.resetSuspendModal = () => {
    document.getElementById("confirmView").style.display = "block";
    document.getElementById("reasonView").style.display = "none";
    document.querySelectorAll('input[name="reason"]').forEach(cb => cb.checked = false);
};

function closeSuspendModal() {
    document.getElementById("suspendModal").style.display = "none";
    selectedUserId = null;
    selectedUserRole = null;
}

// Global functions exposed only for UI buttons that still use inline (optional but safer to use listeners)
window.closeSuspendModal = closeSuspendModal;
window.goToReasons = goToReasons;
window.resetSuspendModal = () => {
    document.getElementById("confirmView").style.display = "block";
    document.getElementById("reasonView").style.display = "none";
    document.querySelectorAll('input[name="reason"]').forEach(cb => cb.checked = false);
};

// 2. REPLACE YOUR ENTIRE confirmSuspension FUNCTION WITH THIS:
// 1. Ilagay ito sa itaas ng function (o sa pinakataas ng AdUsers.js file)
const SUSPENSION_DAYS = {
    "Spamming": 3,
    "Inappropriate Language": 7,
    "Policy Violation": 14,
    "Fraudulent Reports": 30
};

// 2. Ang na-update mong buong function:
async function confirmSuspension() {
    console.log("Attempting suspension for ID:", selectedUserId);

    // Check if an ID actually exists
    if (!selectedUserId) {
        console.error("No user selected!");
        return;
    }

    const checkboxes = document.querySelectorAll('input[name="reason"]:checked');
    const reasons = Array.from(checkboxes).map(cb => cb.value);

    if (reasons.length === 0) {
        alert("Please select at least one reason for suspension.");
        return;
    }

    // Alamin ang pinakamataas na days batay sa na-check na dahilan
    let maxDays = 7; // Default fallback (1 week)
    reasons.forEach(reason => {
        if (SUSPENSION_DAYS[reason] && SUSPENSION_DAYS[reason] > maxDays) {
            maxDays = SUSPENSION_DAYS[reason];
        }
    });

    // Use the full URL so it doesn't try to talk to the AI server (5500)
    const url = `${BACKEND_URL}/api/admin-users/suspend/${selectedUserId}`;
    console.log("Targeting Backend at:", url);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reasons: reasons, 
                role: selectedUserRole,
                durationDays: maxDays // <--- Naidagdag: Ipapadala sa backend
            }) 
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Server Error Page:", errorText);
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        // Success Actions
        closeSuspendModal();
        showToast("User Suspended", `Account suspended for ${maxDays} day(s).`, "danger");

        // Refresh table after suspension
        fetchUsers();

    } catch (error) {
        console.error("Suspension failed:", error);
        alert("Could not connect to the Backend server. Is it running on port " + BACKEND_URL.split(':').pop() + "?");
    }
}

// Ensure it's available to the HTML button
window.confirmSuspension = confirmSuspension;
function showToast(title, body, type = 'success') {
    const toast = document.getElementById('custom-toast');
    if (!toast) return;

    // Update Text
    toast.querySelector('.toast-title').innerText = title;
    toast.querySelector('.toast-body').innerText = body;
    
    // --- COLOR & ICON LOGIC ---
    if (type === 'danger') {
        // Red for Suspension
        toast.style.borderLeft = "6px solid #d9534f"; 
        const iconContainer = toast.querySelector('.toast-icon');
        if (iconContainer) {
            iconContainer.style.color = "#d9534f";
            iconContainer.querySelector('i').className = "fa-solid fa-triangle-exclamation";
        }
    } else {
        // Green for Reactivate, Deactivate, and Admin Creation
        toast.style.borderLeft = "6px solid #5D8252";
        const iconContainer = toast.querySelector('.toast-icon');
        if (iconContainer) {
            iconContainer.style.color = "#5D8252";
            iconContainer.querySelector('i').className = "fa-solid fa-circle-check";
        }
    }

    // Trigger Animation
    toast.classList.remove('toast-hidden');
    toast.classList.add('toast-visible');
    
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hidden');
    }, 3000);
}

// --- GLOBAL NOTIFICATION STATE (Synced with AdHome) ---
let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let currentNotifTab = 'all';
document.getElementById('notifBell')?.addEventListener('click', toggleNotifs);
document.getElementById('clearNotifsBtn')?.addEventListener('click', clearAllNotifs);

document.getElementById('tabAll')?.addEventListener('click', (e) => {
    e.stopPropagation();
    switchTab('all');
});
document.getElementById('tabUnread')?.addEventListener('click', (e) => {
    e.stopPropagation();
    switchTab('unread');
});

// --- CORE FUNCTIONS ---

function switchTab(type) {
    currentNotifTab = type;
    document.getElementById('tabAll').classList.toggle('active', type === 'all');
    document.getElementById('tabUnread').classList.toggle('active', type === 'unread');
    renderNotifDropdown();
}

function toggleNotifs() {
    const drop = document.getElementById("notifDropdown");
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

    // MAP logic to match AdHome's look
    list.innerHTML = displayList.map((n) => {
        // Find original index in global notifications array for correct clicking
        const originalIndex = notifications.findIndex(orig => orig === n);
        
        return `
        <div class="notif-item-modern ${n.read ? '' : 'unread-bg'}" onclick="handleNotifClick(${originalIndex})">
            <div class="notif-icon-circle" style="width:35px; height:35px; border-radius:50%; background:#7aa340; color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-file-invoice" style="font-size:0.8rem;"></i>
            </div>
            <div style="flex-grow:1;">
                <div style="font-size:0.85rem; color:#1c1e21; font-weight:${n.read ? '400' : '600'}">${n.text}</div>
                <div style="font-size:0.75rem; color:#65676b;">${n.time}</div>
            </div>
            ${!n.read ? '<div class="unread-dot-small"></div>' : ''}
        </div>
    `}).join('');
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

function updateNotifBadge() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.innerText = unreadCount;
    badge.style.display = unreadCount > 0 ? "block" : "none";
}

// --- MODAL FUNCTIONS ---
function openAddUserModal() {
    document.getElementById("addUserModal").style.display = "flex";
}

function closeAddUserModal() {
    document.getElementById("addUserModal").style.display = "none";
    document.getElementById("addUserForm").reset();
}

// Expose to global for the close-x button
window.closeAddUserModal = closeAddUserModal;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {

    const addForm = document.getElementById("addUserForm");
    addForm?.addEventListener("submit", handleAddAdmin);

    const contactInput = document.getElementById("addContact");
    contactInput?.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
    });

});

// --- SUBMIT HANDLER WITH VALIDATION ---
async function handleAddAdmin(e) {
    e.preventDefault();
    
    const name = document.getElementById("addName").value.trim();
    const email = document.getElementById("addEmail").value.trim();
    const contact = document.getElementById("addContact").value.trim();
    const password = document.getElementById("addPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com)$/;
    if (!emailRegex.test(email)) {
        alert("Please use a valid @gmail.com or @yahoo.com email address.");
        return;
    }

    if (contact.length !== 11) {
        alert("Contact number must be exactly 11 digits.");
        return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNoSpaces = !/\s/.test(password);

    if (password.length < 8) {
        alert("Password must be at least 8 characters long.");
        return;
    }
    if (!hasUppercase || !hasNumber) {
        alert("Password must contain at least one uppercase letter and one number.");
        return;
    }
    if (!hasSpecial) {
        alert("Password must contain at least one special character.");
        return;
    }
    if (!hasNoSpaces) {
        alert("Password cannot contain spaces.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match. Please re-type your password.");
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    
    submitBtn.innerText = "Creating...";
    submitBtn.disabled = true;

    try {
        const tokenRes = await fetch('/api/csrf-token');
        const { csrfToken } = await tokenRes.json();

        const response = await fetch('/api/admin-users/add', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                name: name,
                email: email,
                contact_number: contact,
                password: password
            })
        });

        if (!response.ok) {
            const errorText = await response.text(); 
            console.error("Server returned error:", errorText);
            alert("Server Error: Check if you are still logged in.");
            return;
        }

        const result = await response.json();

        if (result.success) {
            closeAddUserModal();
            showAdminSuccessToast(); 
            fetchUsers(); 
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        console.error("Add User Error:", err);
        alert("Connection error. Please check your server.");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

function showAdminSuccessToast() {
    let toast = document.getElementById('custom-toast');
    
    if (!toast) {
        alert("Account Created Successfully!");
        return;
    }

    toast.querySelector('.toast-title').innerText = "Success!";
    toast.querySelector('.toast-body').innerText = "Admin account created.";
    toast.classList.remove('toast-hidden');
    toast.classList.add('toast-visible');
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hidden');
    }, 3000);
}

// --- PASSWORD VISIBILITY TOGGLE ---
window.togglePasswordVisibility = function(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        iconElement.classList.remove("fa-eye");
        iconElement.classList.add("fa-eye-slash"); 
    } else {
        input.type = "password";
        iconElement.classList.remove("fa-eye-slash");
        iconElement.classList.add("fa-eye");
    }
};

// --- TOOLTIP ENGINE (Matches your user script) ---
function updateAdminChecklist(input, requirements) {
    let tooltip = document.getElementById(`tooltip-admin-${input.name}`);
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'input-tooltip-neat'; // Ensure this class is in your CSS
        tooltip.id = `tooltip-admin-${input.name}`;
        document.body.appendChild(tooltip);
    }

    const allValid = requirements.every(req => req.isValid);
    input.style.borderColor = (!allValid && input.value.length > 0) ? '#e53e3e' : '#ccc';

    const rect = input.getBoundingClientRect();
    tooltip.style.left = `${rect.right + window.scrollX + 15}px`;
    tooltip.style.top = `${rect.top + window.scrollY + (rect.height / 2)}px`;

    tooltip.innerHTML = requirements.map(req => `
        <div class="req-item" style="color: ${req.isValid ? '#444' : '#888'}; display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 4px;">
            <i class="fas ${req.isValid ? 'fa-check-circle' : 'fa-circle'}" style="color: ${req.isValid ? '#7aa340' : '#cbd5e0'}; font-size: 10px;"></i>
            <span>${req.text}</span>
        </div>
    `).join('');
}

function removeAdminTooltip(name) {
    const tooltip = document.getElementById(`tooltip-admin-${name}`);
    if (tooltip) tooltip.remove();
}

// --- ATTACH VALIDATORS ---
document.addEventListener("DOMContentLoaded", () => {
    const nameInp = document.getElementById('addName');
    const emailInp = document.getElementById('addEmail');
    const contactInp = document.getElementById('addContact');
    const passInp = document.getElementById('addPassword');
    const confirmInp = document.getElementById('confirmPassword');

    // Email Validation (Gmail/Yahoo Only)
    const checkEmail = () => {
        const val = emailInp.value.trim();
        const isValid = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com)$/.test(val);
        updateAdminChecklist(emailInp, [{ text: "Use @gmail.com or @yahoo.com", isValid }]);
    };
    emailInp?.addEventListener('input', checkEmail);
    emailInp?.addEventListener('focus', checkEmail);
    emailInp?.addEventListener('blur', () => removeAdminTooltip('email'));

    // Contact Validation (11 Digits)
    const checkContact = () => {
        contactInp.value = contactInp.value.replace(/\D/g, '').slice(0, 11);
        updateAdminChecklist(contactInp, [{ text: "Exactly 11 digits", isValid: contactInp.value.length === 11 }]);
    };
    contactInp?.addEventListener('input', checkContact);
    contactInp?.addEventListener('focus', checkContact);
    contactInp?.addEventListener('blur', () => removeAdminTooltip('contact'));

    // Password Validation (Complexity)
    const checkPass = () => {
        const val = passInp.value;
        updateAdminChecklist(passInp, [
            { text: "At least 8 characters", isValid: val.length >= 8 },
            { text: "One uppercase & one number", isValid: /[A-Z]/.test(val) && /\d/.test(val) },
            { text: "At least 1 special character", isValid: /[!@#$%^&*(),.?":{}|<>]/.test(val) },
            { text: "No spaces", isValid: val.length > 0 && !/\s/.test(val) }
        ]);
        if (confirmInp.value) checkMatch();
    };
    const checkMatch = () => {
        updateAdminChecklist(confirmInp, [{ text: "Passwords match", isValid: confirmInp.value === passInp.value && confirmInp.value !== "" }]);
    };
    passInp?.addEventListener('input', checkPass);
    passInp?.addEventListener('focus', checkPass);
    passInp?.addEventListener('blur', () => removeAdminTooltip('password'));
    confirmInp?.addEventListener('input', checkMatch);
    confirmInp?.addEventListener('focus', checkMatch);
    confirmInp?.addEventListener('blur', () => removeAdminTooltip('confirm_password'));
});

// Password Toggle Function
window.togglePasswordVisibility = function(inputId, icon) {
    const input = document.getElementById(inputId);
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
};

// --- HELPER FUNCTIONS ---
function createButton(text, className, onClick) {
    const btn = document.createElement("button");
    btn.innerHTML = text; // innerHTML allows icons
    btn.className = className;
    btn.addEventListener("click", onClick);
    return btn;
}

window.executeToggle = executeToggle;
window.closeToggleModal = closeToggleModal;
window.closeViewModal = closeViewModal;

function checkNotifications() {
    console.log("Checking for new reports...");
}