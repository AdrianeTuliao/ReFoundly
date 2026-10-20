// --- PAGE TRANSITION & INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".content-wrapper");

    if (wrapper) {
        setTimeout(() => {
            wrapper.classList.add("fade-in");
        }, 100);
    }

    // Fetch Admin Profile info on load
    fetchAdminProfile();

    // Initialize Notifications
    updateNotifBadge();
    checkNotifications(); 
    setInterval(checkNotifications, 20000);

    // Sync email text under admin name
    const emailEl = document.getElementById("admin-email");
    const sub = document.getElementById("admin-subtext");
    if (emailEl && sub) {
        const sync = () => {
            const t = emailEl.textContent.trim();
            sub.textContent = (t && t !== "Loading...") ? t : "";
        };
        new MutationObserver(sync).observe(emailEl, { childList: true, characterData: true, subtree: true });
        sync();
    }

    // Smooth Navigation Transitions
    const navLinks = document.querySelectorAll('.sidebar nav a, .sidebar-footer a, .avatar-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.hostname === window.location.hostname) {
                e.preventDefault();
                const nextURL = link.href;
                
                if (wrapper) wrapper.classList.remove("fade-in");
                
                setTimeout(() => {
                    window.location.href = nextURL;
                }, 500);
            }
        });
    });
});

let adminOriginalData = {};

// --- ADMIN PROFILE FETCH & DISPLAY ---

async function fetchAdminProfile() {
    try {
        console.log("Attempting to fetch admin profile...");
        const response = await fetch('/admin/me', { credentials: 'include' });
        const data = await response.json();
        
        if (response.ok) {
            adminOriginalData = data;

            const nameEl = document.getElementById("admin-name");
            const headingEl = document.getElementById("admin-name-heading");
            const emailEl = document.getElementById("admin-email");
            const contactEl = document.getElementById("admin-contact");
            const avatarEl = document.getElementById("admin-avatar");
            const topAvatarEl = document.getElementById("top-admin-avatar"); // Top header avatar

            if (nameEl) nameEl.textContent = data.name || "Admin";
            if (headingEl) headingEl.textContent = data.name || "Admin";
            if (emailEl) emailEl.textContent = data.email || "N/A";
            if (contactEl) contactEl.textContent = data.contact_number || "No contact number added";

            if (data.profile_picture) {
                // Main profile avatar
                if (avatarEl) {
                    avatarEl.style.backgroundImage = `url(${data.profile_picture})`;
                    avatarEl.style.backgroundSize = "cover";
                    avatarEl.style.backgroundPosition = "center";
                }
                // Top header avatar
                if (topAvatarEl) {
                    topAvatarEl.style.backgroundImage = `url(${data.profile_picture})`;
                    topAvatarEl.style.backgroundSize = "cover";
                    topAvatarEl.style.backgroundPosition = "center";
                }
            }
        } else {
            console.error("Failed to load admin profile:", data.message);
        }
    } catch (error) {
        console.error("Error fetching admin profile:", error);
    }
}

// --- PROFILE PICTURE UPLOAD ---

window.uploadAdminAvatar = async function(input) {
    if (input.files && input.files[0]) {
        const formData = new FormData();
        formData.append('profile_picture', input.files[0]);

        try {
            const response = await fetch('/api/admin/profile-picture', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const result = await response.json();

            if (response.ok && result.success) {
                const avatarEl = document.getElementById("admin-avatar");
                if (avatarEl) {
                    avatarEl.style.backgroundImage = `url(${result.profile_picture})`;
                    avatarEl.style.backgroundSize = "cover";
                    avatarEl.style.backgroundPosition = "center";
                }
                alert("Profile picture updated successfully!");
            } else {
                alert(result.message || "Failed to upload image.");
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("An error occurred while uploading.");
        }
    }
};

// --- INLINE EDIT MODE (TOGGLE VIEW/EDIT FIELDS) ---

window.enableAdminEditMode = function() {
    // Populate input fields with current cached data
    const inputName = document.getElementById("input-name");
    const inputEmail = document.getElementById("input-email");
    const inputContact = document.getElementById("input-contact");

    if (inputName) inputName.value = adminOriginalData.name || "";
    if (inputEmail) inputEmail.value = adminOriginalData.email || "";
    if (inputContact) inputContact.value = (adminOriginalData.contact_number && adminOriginalData.contact_number !== "No contact number added") ? adminOriginalData.contact_number : "";

    // Toggle view elements vs edit inputs
    const viewName = document.getElementById("view-name");
    const editName = document.getElementById("edit-name");
    if (viewName) viewName.style.display = "none";
    if (editName) editName.style.display = "block";

    const viewEmail = document.getElementById("view-email");
    const editEmail = document.getElementById("edit-email");
    if (viewEmail) viewEmail.style.display = "none";
    if (editEmail) editEmail.style.display = "block";

    const viewContact = document.getElementById("view-contact");
    const editContact = document.getElementById("edit-contact");
    if (viewContact) viewContact.style.display = "none";
    if (editContact) editContact.style.display = "block";

    // Show avatar camera upload button
    const avatarBtn = document.getElementById("avatarUploadBtn");
    if (avatarBtn) avatarBtn.style.display = "flex";

    // Toggle action buttons
    const editBtn = document.getElementById("editProfileBtn");
    const saveBtn = document.getElementById("saveProfileBtn");
    const cancelBtn = document.getElementById("cancelProfileBtn");

    if (editBtn) editBtn.style.display = "none";
    if (saveBtn) saveBtn.style.display = "inline-block";
    if (cancelBtn) cancelBtn.style.display = "inline-block";
};

window.cancelAdminEditMode = function() {
    const viewName = document.getElementById("view-name");
    const editName = document.getElementById("edit-name");
    if (viewName) viewName.style.display = "block";
    if (editName) editName.style.display = "none";

    const viewEmail = document.getElementById("view-email");
    const editEmail = document.getElementById("edit-email");
    if (viewEmail) viewEmail.style.display = "block";
    if (editEmail) editEmail.style.display = "none";

    const viewContact = document.getElementById("view-contact");
    const editContact = document.getElementById("edit-contact");
    if (viewContact) viewContact.style.display = "block";
    if (editContact) editContact.style.display = "none";

    const avatarBtn = document.getElementById("avatarUploadBtn");
    if (avatarBtn) avatarBtn.style.display = "none";

    const editBtn = document.getElementById("editProfileBtn");
    const saveBtn = document.getElementById("saveProfileBtn");
    const cancelBtn = document.getElementById("cancelProfileBtn");

    if (editBtn) editBtn.style.display = "inline-block";
    if (saveBtn) saveBtn.style.display = "none";
    if (cancelBtn) cancelBtn.style.display = "none";
};

window.saveAdminChanges = async function() {
    const updatedName = document.getElementById("input-name") ? document.getElementById("input-name").value.trim() : "";
    const updatedEmail = document.getElementById("input-email") ? document.getElementById("input-email").value.trim() : "";
    const updatedContact = document.getElementById("input-contact") ? document.getElementById("input-contact").value.trim() : "";

    if (!updatedName || !updatedEmail) {
        alert("Name and Email cannot be empty.");
        return;
    }

    try {
        const response = await fetch('/api/admin/update-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: updatedName,
                email: updatedEmail,
                contact_number: updatedContact
            }),
            credentials: 'include'
        });

        const result = await response.json();
        if (response.ok && result.success) {
            alert("Profile updated successfully!");
            cancelAdminEditMode();
            fetchAdminProfile(); // Refresh details
        } else {
            alert(result.message || "Failed to update profile.");
        }
    } catch (err) {
        console.error("Update error:", err);
        alert("An error occurred while saving changes.");
    }
};

window.openChangePasswordModal = function() {
    const currentPassword = window.prompt("Enter current password:");
    if (!currentPassword) return;

    const newPassword = window.prompt("Enter new password (at least 8 characters with letters/numbers):");
    if (!newPassword || newPassword.length < 8) {
        alert("Password must be at least 8 characters long.");
        return;
    }

    alert("Password change functionality can be integrated with your backend change-password route.");
};

// --- NOTIFICATION SYSTEM ---

let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;

async function checkNotifications() {
    try {
        const response = await fetch('/api/admin/items'); 
        const freshData = await response.json();

        if (Array.isArray(freshData)) {
            freshData.forEach(item => {
                if (!knownItemIds.has(item.id)) {
                    if (!isInitialLoad || item.status === "Pending Approval") {
                        addNotif(`New Report: ${item.item_name}`, item.id);
                    }
                    knownItemIds.add(item.id);
                }
            });

            localStorage.setItem('refoundly_known_ids', JSON.stringify([...knownItemIds]));
        }
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
    if(unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.style.display = "block";
    } else {
        badge.style.display = "none";
    }
}

window.toggleNotifs = function() {
    const drop = document.getElementById("notifDropdown");
    const list = document.getElementById("notifList");
    if (!drop || !list) return;

    const isOpening = drop.style.display === "none" || drop.style.display === "";
    drop.style.display = isOpening ? "block" : "none";
    
    if(isOpening) {
        if (notifications.length === 0) {
            list.innerHTML = `<div style="padding: 20px; text-align: center; color: #999; font-size: 0.85rem;">No notifications</div>`;
        } else {
            list.innerHTML = notifications.map((n, index) => `
                <div style="padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 0.85rem; color: #444; cursor: pointer; background: ${n.read ? 'white' : '#f0f7ef'}" 
                     onclick="handleNotifClick(${index})">
                    <strong>${n.time}</strong>: ${n.text}
                </div>
            `).join('');
        }
    }
};

window.handleNotifClick = function(index) {
    notifications[index].read = true;
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    window.location.href = 'AdReport.html';
};

window.clearAllNotifs = function() {
    notifications = [];
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    toggleNotifs();
};