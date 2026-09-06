// --- GLOBAL USER NOTIFICATION ENGINE ---
let currentNotifTab = 'all';

// Toast Storage & State Setup
if (!window.shownToastIds) {
    window.shownToastIds = new Set(JSON.parse(sessionStorage.getItem('shownNotifToasts') || '[]'));
}

// Global ReFoundly Toast Function
function showRefoundlyToast(title, message, iconClass = 'fa-solid fa-bell') {
    let container = document.getElementById('refoundly-toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'refoundly-toast-container';
        container.className = 'refoundly-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'refoundly-toast';
    toast.innerHTML = `
        <div class="refoundly-toast-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="refoundly-toast-content">
            <h4 class="refoundly-toast-title">${title}</h4>
            <p class="refoundly-toast-body">${message}</p>
        </div>
        <button class="refoundly-toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// Match Popup Checker
function checkAndShowMatchPopups(notifications) {
    if (!Array.isArray(notifications)) return;

    const unreadNotifs = notifications.filter(n => n.is_read == 0 || n.is_read === false || n.read === false);

    unreadNotifs.forEach(n => {
        if (!window.shownToastIds.has(n.id)) {
            showRefoundlyToast(
                "New Notification!",
                n.message || n.text || "You have a new update on your ReFoundly account.",
                "fa-solid fa-bell"
            );

            window.shownToastIds.add(n.id);
            sessionStorage.setItem('shownNotifToasts', JSON.stringify([...window.shownToastIds]));
        }
    });
}

// Update Notifications UI
async function updateNotificationsUI() {
    const list = document.getElementById("notifList");
    const badge = document.getElementById("notifBadge");
    
    try {
        const res = await fetch('/api/user/notifications');
        if (!res.ok) return;
        
        const data = await res.json();

        // Trigger Popup Toast Alert for unread notifications
        if (Array.isArray(data)) {
            checkAndShowMatchPopups(data);
        }

        // Check unread status
        const unreadCount = data.filter(n => n.is_read == 0 || n.is_read === false || n.read === false).length;
        
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? "flex" : "none";
        }

        if (!list) return;

        let displayList = currentNotifTab === 'unread' 
            ? data.filter(n => n.is_read == 0 || n.is_read === false || n.read === false) 
            : data;

        if (displayList.length === 0) {
            list.innerHTML = `<div class="notif-empty" style="padding:20px; text-align:center; color:#65676b;">No ${currentNotifTab === 'unread' ? 'unread' : ''} notifications</div>`;
            return;
        }

        list.innerHTML = displayList.map(n => {
            const safeMessage = n.message || '';
            const date = n.created_at ? new Date(n.created_at).toLocaleDateString() : '';

            return `
                <div class="notif-item-modern ${n.is_read ? '' : 'unread-bg'}" onclick="handleGlobalNotifClick(${n.id}, ${n.item_id || 'null'})">
                    <div class="notif-icon-circle" style="background: #7aa340; width:35px; height:35px; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fa-solid fa-bell" style="font-size:0.8rem;"></i>
                    </div>
                    <div style="flex-grow:1;">
                        <div style="font-size:0.85rem; color:#1c1e21; font-weight:${n.is_read ? '600' : '700'}">${safeMessage}</div>
                        <div style="font-size:0.75rem; color:#65676b;">${date}</div>
                    </div>
                    ${!n.is_read ? '<div class="unread-dot-small"></div>' : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Notification Load Error:", err);
    }
}

// Click & Tab Helpers
async function handleGlobalNotifClick(id, itemId) {
    try {
        await fetch(`/api/user/notifications/read/${id}`, { method: 'POST' });
        await updateNotificationsUI(); 
        if (!itemId) {
            window.location.href = 'history.html';
            return;
        }
        const res = await fetch(`/api/items/${itemId}`);
        if (res.ok) {
            const item = await res.json();
            const dbType = (item.report_type || "").toLowerCase().trim();

            // 🟢 FIX: don't depend on `finalRedirect` — it's only defined in
            // dashboard.js, which isn't loaded on every page (history.html,
            // lost.html, found.html, etc). Calling it there threw a
            // ReferenceError that got swallowed by the catch below, which
            // silently redirected to history.html instead — making a real
            // match look like it pointed back at your own post.
            if (typeof finalRedirect === 'function') {
                finalRedirect(itemId, dbType);
            } else {
                window.location.href = dbType === 'lost'
                    ? `lost.html?open=${itemId}`
                    : `found.html?open=${itemId}`;
            }
        } else {
            window.location.href = 'history.html';
        }
    } catch (err) {
        console.error("Could not mark notification as read", err);
        window.location.href = 'history.html';
    }
}

function switchNotifTab(type) {
    currentNotifTab = type;
    document.getElementById('tabAll')?.classList.toggle('active', type === 'all');
    document.getElementById('tabUnread')?.classList.toggle('active', type === 'unread');
    updateNotificationsUI();
}

function initNotifications() {
    const bell = document.getElementById('notifBell');
    const dropdown = document.getElementById('notifDropdown');
    const tabAll = document.getElementById('tabAll');
    const tabUnread = document.getElementById('tabUnread');

    if (bell && dropdown) {
        dropdown.style.display = "none";

        bell.onclick = (e) => {
            e.stopPropagation();
            const isOpening = dropdown.style.display === "none" || dropdown.style.display === "";
            dropdown.style.display = isOpening ? "flex" : "none";
            if (isOpening) updateNotificationsUI();
        };

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== bell) {
                dropdown.style.display = "none";
            }
        });
    }

    tabAll?.addEventListener('click', (e) => { e.stopPropagation(); switchNotifTab('all'); });
    tabUnread?.addEventListener('click', (e) => { e.stopPropagation(); switchNotifTab('unread'); });
    
    updateNotificationsUI();
}

document.addEventListener("DOMContentLoaded", initNotifications);
setInterval(updateNotificationsUI, 20000);