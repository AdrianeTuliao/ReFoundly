// --- Global State ---
let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;

document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".content-wrapper");
    
    // 1. Fade-in animation
    if (wrapper) {
        setTimeout(() => wrapper.classList.add("fade-in"), 100);
    }

    // 2. Initialize Logic
    loadDashboardData();
    updateNotifBadge();
    checkNotifications(); 
    setInterval(checkNotifications, 20000);

    // 3. Setup Notification Listeners (CSP SECURE)
    const bell = document.getElementById('notifBell');
    const clearBtn = document.getElementById('clearNotifsBtn');

    if (bell) {
        bell.addEventListener('click', toggleNotifs);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllNotifs);
    }

    // 4. Page Transition logic
    const navLinks = document.querySelectorAll('.sidebar nav a, .sidebar-footer a, .avatar-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.hostname === window.location.hostname && !link.hash) {
                e.preventDefault();
                const nextURL = link.href;
                if(wrapper) wrapper.classList.remove("fade-in");
                setTimeout(() => { window.location.href = nextURL; }, 500);
            }
        });
    });
});

async function loadDashboardData() {
    try {
        // Fetch Stats
        const statsRes = await fetch('/api/admin/stats');
        const stats = await statsRes.json();

        // Update Cards
        document.getElementById("stat-lost").innerText = stats.totalLost || 0;
        document.getElementById("stat-found").innerText = stats.totalFound || 0;
        document.getElementById("stat-pending").innerText = stats.totalPending || 0;
        document.getElementById("stat-claimed").innerText = stats.totalClaimed || 0;

        // Update Charts
        const counts = [stats.totalLost, stats.totalFound, stats.totalPending, stats.totalClaimed];
        const maxVal = Math.max(...counts, 1);
        
        updateBar("#bar-lost", stats.totalLost || 0, maxVal);
        updateBar("#bar-found", stats.totalFound || 0, maxVal);
        updateBar("#bar-pending", stats.totalPending || 0, maxVal);
        updateBar("#bar-claimed", stats.totalClaimed || 0, maxVal);

        const totalItems = (stats.totalLost || 0) + (stats.totalFound || 0);
        const rate = totalItems > 0 ? Math.round((stats.totalClaimed / totalItems) * 100) : 0;
        
        document.getElementById("res-text-main").innerText = rate + "%";
        document.getElementById("res-text-inner").innerText = rate + "%";
        document.getElementById("res-circle").style.background = `conic-gradient(#27ae60 ${rate}%, #e0e0e0 ${rate}%)`;

        // Fetch Activity & Render Table (CSP SECURE)
        const activityRes = await fetch('/api/admin/recent-activity');
        const activity = await activityRes.json();
        renderActivityTable(activity);

    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }
}

// Separate function for table rendering to keep it clean
function renderActivityTable(activity) {
    const tbody = document.getElementById("activity-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    activity.forEach(item => {
        let statusClass = "pending"; 
        const type = (item.report_type || "").toLowerCase();
        
        if (type === 'lost') statusClass = "lost-badge"; 
        else if (type === 'found') statusClass = "found-badge";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.item_name}</strong></td>
            <td>${item.category}</td>
            <td><span class="badge ${statusClass}">${item.report_type}</span></td>
            <td>${item.formattedDate || "N/A"}</td> 
            <td class="action-cell"></td>
        `;

        // Create button manually to attach listener (Avoiding onclick string)
        const manageBtn = document.createElement('button');
        manageBtn.className = 'btn-view';
        manageBtn.textContent = 'Manage';
        manageBtn.addEventListener('click', () => {
            window.location.href = 'AdReport.html';
        });

        row.querySelector('.action-cell').appendChild(manageBtn);
        tbody.appendChild(row);
    });
}

function updateBar(selector, value, max) {
    const bar = document.querySelector(selector);
    if (bar) {
        const heightPercentage = (value / max) * 100;
        bar.style.height = heightPercentage + "%";
        bar.querySelector("span").innerText = value;
    }
}

// --- Notifications Logic ---

async function checkNotifications() {
    try {
        const response = await fetch('/api/admin/items');
        const freshData = await response.json();

        freshData.forEach(item => {
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
    const list = document.getElementById("notifList");
    if (!drop || !list) return;

    const isOpening = drop.style.display === "none" || drop.style.display === "";
    drop.style.display = isOpening ? "block" : "none";
    
    if(isOpening) {
        if (notifications.length === 0) {
            list.innerHTML = `<div style="padding: 20px; text-align: center; color: #999; font-size: 0.85rem;">No notifications</div>`;
        } else {
            list.innerHTML = ""; // Clear list
            notifications.forEach((n, index) => {
                const item = document.createElement('div');
                item.style.cssText = `padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 0.85rem; color: #444; cursor: pointer; background: ${n.read ? 'white' : '#f0f7ef'}`;
                item.innerHTML = `<strong>${n.time}</strong>: ${n.text}`;
                item.addEventListener('click', () => handleNotifClick(index));
                list.appendChild(item);
            });
        }
    }
}

function handleNotifClick(index) {
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