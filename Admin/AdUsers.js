// --- GLOBAL STATE ---
let allUsers = [];
let selectedUserId = null;

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
        const isSuspended = user.status === "suspended";
        const isDeactivated = user.status === "deactivated";
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="user-cell">
                <div class="avatar"></div>
                ${user.name} 
                ${isSuspended ? '<span style="color:red; font-size:0.7rem;"> (SUSPENDED)</span>' : ''}
                ${isDeactivated ? '<span style="color:#666; font-size:0.7rem;"> (DEACTIVATED)</span>' : ''}
            </td>
            <td>${user.email}</td>
            <td><span class="badge ${user.role === 'admin' ? 'resolved' : 'pending'}">${user.role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td class="action-buttons"></td>`;

        const actionCell = tr.querySelector(".action-buttons");
        
        actionCell.appendChild(createButton(`<i class="fa-solid fa-eye"></i> View`, "btn-view", () => viewUser(user.id)));
        actionCell.appendChild(createButton(`Suspend`, "btn-delete", () => openSuspendModal(user.id, user.name)));
        
        const toggleBtn = createButton(isDeactivated ? "Activate" : "Deactivate", isDeactivated ? "btn-activate" : "btn-deactivate", () => handleDeactivateToggle(user.id, user.status));
        toggleBtn.style.backgroundColor = isDeactivated ? "#7aa340" : "#4a4a4a";
        toggleBtn.style.color = "white";
        actionCell.appendChild(toggleBtn);

        tbody.appendChild(tr);
    });
}

let pendingToggleId = null;
let pendingToggleStatus = null;

function handleDeactivateToggle(userId, currentStatus) {
    pendingToggleId = userId;
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
        if(header) header.style.backgroundColor = "#7aa340"; 
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
    try {
        const response = await fetch(`/api/admin-users/status-toggle/${pendingToggleId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: pendingToggleStatus })
        });

        if (response.ok) {
            closeToggleModal();
            fetchUsers(); // Refresh the table
        }
    } catch (err) {
        console.error("Toggle error:", err);
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
    document.getElementById("viewStatus").innerText = user.status || "Active";
    
    document.getElementById("viewDate").innerText = new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    const ageSpan = document.getElementById("viewInactiveTime");
    if (ageSpan) {
        ageSpan.innerText = calculateAccountAge(user.created_at);
    }

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
let showingHistory = false;

function updateNotifBadge() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    
    let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
    
    const recentCount = notifications.filter(n => !n.cleared).length;
    
    badge.innerText = recentCount;
    badge.style.display = recentCount > 0 ? "block" : "none";
}

function renderNotifList() {
    const list = document.getElementById("notifList");
    const notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];

    const displayList = showingHistory 
        ? notifications.filter(n => n.cleared) 
        : notifications.filter(n => !n.cleared);

    list.innerHTML = "";

    if (displayList.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center; color: #999; font-size: 0.85rem;">
                            No ${showingHistory ? 'history' : 'recent notifications'}
                          </div>`;
    } else {
        displayList.forEach((n) => {
            const item = document.createElement("div");
            item.className = "notif-item";
            const isHistoryItem = n.cleared; 
            
            item.style.cssText = `
                padding: 12px 15px; 
                border-bottom: 1px solid #eee; 
                font-size: 0.85rem; 
                cursor: pointer; 
                background: ${isHistoryItem ? '#f9f9f9' : (n.read ? 'white' : '#f0f7ef')};
                opacity: ${isHistoryItem ? '0.8' : '1'};
                border-left: ${!isHistoryItem && !n.read ? '4px solid #7aa340' : 'none'};
            `;
            
            item.innerHTML = `<strong>${n.time}</strong>: ${n.text} ${isHistoryItem ? '<span style="font-size:0.6rem; color:gray; margin-left:5px;">(Archived)</span>' : ''}`;
            
            item.addEventListener("click", () => {
                const idx = notifications.indexOf(n);
                handleNotifClick(idx);
            });
            list.appendChild(item);
        });
    }
}

window.clearAllNotifs = () => {
    let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
    
    notifications = notifications.map(n => ({ ...n, cleared: true, read: true }));
    
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    
    updateNotifBadge(); 
    renderNotifList();  
};

window.toggleNotifs = () => {
    const drop = document.getElementById("notifDropdown");
    const title = document.querySelector(".notif-header span"); 
    
    const isOpening = drop.style.display === "none" || drop.style.display === "";
    drop.style.display = isOpening ? "block" : "none";
    
    if(isOpening) {
        showingHistory = false;
        if(title) title.innerText = "Recent Notifications";
        renderNotifList();
    }
};

window.showNotifHistory = (e) => {
    e.stopPropagation();
    showingHistory = !showingHistory;
    const btn = document.getElementById("historyBtn");
    const title = document.querySelector(".notif-header span");

    if (showingHistory) {
        btn.innerText = "Show Recent";
        title.innerText = "Notification History";
    } else {
        btn.innerText = "View History";
        title.innerText = "Recent Notifications";
    }
    renderNotifList();
};

function handleNotifClick(index) {
    let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
    if(index !== -1) {
        notifications[index].read = true;
        localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
        updateNotifBadge();
        window.location.href = 'AdReport.html';
    }
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

        const result = await response.json();

        if (result.success) {
            alert("New Admin account created successfully.");
            closeAddUserModal();
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
    emailInp.addEventListener('input', checkEmail);
    emailInp.addEventListener('focus', checkEmail);
    emailInp.addEventListener('blur', () => removeAdminTooltip('email'));

    // Contact Validation (11 Digits)
    const checkContact = () => {
        contactInp.value = contactInp.value.replace(/\D/g, '').slice(0, 11);
        updateAdminChecklist(contactInp, [{ text: "Exactly 11 digits", isValid: contactInp.value.length === 11 }]);
    };
    contactInp.addEventListener('input', checkContact);
    contactInp.addEventListener('focus', checkContact);
    contactInp.addEventListener('blur', () => removeAdminTooltip('contact'));

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
    passInp.addEventListener('input', checkPass);
    passInp.addEventListener('focus', checkPass);
    passInp.addEventListener('blur', () => removeAdminTooltip('password'));
    confirmInp.addEventListener('input', checkMatch);
    confirmInp.addEventListener('focus', checkMatch);
    confirmInp.addEventListener('blur', () => removeAdminTooltip('confirm_password'));
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