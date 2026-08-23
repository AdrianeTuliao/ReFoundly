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
        document.getElementById("res-circle").style.background = `conic-gradient(#5D8252 ${rate}%, #f1f5f9 ${rate}%)`;

        // Fetch Activity & Render Table (CSP SECURE)
        const activityRes = await fetch('/api/admin/recent-activity');
        const activity = await activityRes.json();
        renderActivityTable(activity);

    } catch (err) {
        console.error("Dashboard Load Error:", err);
    }
}

function renderActivityTable(activity) {
    const tbody = document.getElementById("activity-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    activity.forEach(item => {
        let statusClass = "pending"; 
        const type = (item.report_type || "").toLowerCase();
        
        if (type === 'lost') statusClass = "lost-badge"; 
        else if (type === 'found') statusClass = "found-badge";

        // --- 12-HOUR FORMAT LOGIC ---
        let displayTime = "N/A";
        if (item.incident_time) {
            // Split the "HH:MM:SS" string from the database
            const [hours, minutes] = item.incident_time.split(':');
            let h = parseInt(hours);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12; // Convert 0 to 12 for midnight
            displayTime = `${h}:${minutes} ${ampm}`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.item_name}</strong></td>
            <td>${item.category}</td>
            <td><span class="badge ${statusClass}">${item.report_type}</span></td>
            <td>${item.formattedDate || "N/A"}</td> 
            <td>${displayTime}</td> <td class="action-cell"></td>
        `;

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

// --- Global State Update ---
let currentNotifTab = 'all';

// Inside your DOMContentLoaded, add these listeners:
document.getElementById('tabAll').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent dropdown from closing
    switchTab('all');
});
document.getElementById('tabUnread').addEventListener('click', (e) => {
    e.stopPropagation();
    switchTab('unread');
});

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

    list.innerHTML = displayList.map((n, index) => `
        <div class="notif-item-modern ${n.read ? '' : 'unread-bg'}" onclick="handleNotifClick(${notifications.indexOf(n)})">
            <div class="notif-icon-circle" style="width:35px; height:35px; border-radius:50%; background:#7aa340; color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-file-invoice" style="font-size:0.8rem;"></i>
            </div>
            <div style="flex-grow:1;">
                <div style="font-size:0.85rem; color:#1c1e21; font-weight:${n.read ? '400' : '600'}">${n.text}</div>
                <div style="font-size:0.75rem; color:#65676b;">${n.time}</div>
            </div>
            ${!n.read ? '<div class="unread-dot-small"></div>' : ''}
        </div>
    `).join('');
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