document.addEventListener("DOMContentLoaded", () => {
            const wrapper = document.querySelector(".content-wrapper");

            if (wrapper) {
                setTimeout(() => {
                    wrapper.classList.add("fade-in");
                }, 100);
            }

            console.log("Attempting to fetch admin profile...");
            if (typeof fetchAdminProfile === 'function') {
                fetchAdminProfile();
            }

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
        // --- Notification Variables ---
let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;

document.addEventListener("DOMContentLoaded", () => {
    // ... your existing fade-in and nav logic ...
    
    // Initialize Notifications
    updateNotifBadge();
    // Check for notifications immediately and then every 20 seconds
    checkNotifications(); 
    setInterval(checkNotifications, 20000);
});

async function checkNotifications() {
    try {
        const response = await fetch('/api/admin/items'); // Using the same endpoint as AdReport
        const freshData = await response.json();

        freshData.forEach(item => {
            if (!knownItemIds.has(item.id)) {
                // Trigger notification if it's a new item or if it's the first load but pending
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
    const unreadCount = notifications.filter(n => !n.read).length;
    if(unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.style.display = "block";
    } else {
        badge.style.display = "none";
    }
}

function toggleNotifs() {
    const drop = document.getElementById("notifDropdown");
    const list = document.getElementById("notifList");
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
}

function handleNotifClick(index) {
    notifications[index].read = true;
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    window.location.href = 'AdReport.html'; // Redirect to management page
}

function clearAllNotifs() {
    notifications = [];
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    toggleNotifs();
}