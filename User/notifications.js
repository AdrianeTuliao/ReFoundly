// --- GLOBAL USER NOTIFICATION ENGINE ---
let currentNotifTab = 'all';

// Escapes text before it's injected into innerHTML.
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

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
            <h4 class="refoundly-toast-title">${escapeHtml(title)}</h4>
            <p class="refoundly-toast-body">${escapeHtml(message)}</p>
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

// Loads rf-dialog.js on demand, so the custom confirm modal works on EVERY page that has the bell,
// even if that page forgot the <script src="rf-dialog.js"> tag.
function ensureRfDialog() {
    return new Promise(resolve => {
        if (typeof rfConfirm === 'function') return resolve(true);
        const s = document.createElement('script');
        s.src = 'rf-dialog.js';
        s.onload = () => resolve(typeof rfConfirm === 'function');
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
}

// ---- Bell "Clear All" memory --------------------------------------------------
// The bell and the Notification History page read the SAME list from the server, so marking
// notifications as read never made them disappear. Instead we remember "hide everything up to
// this notification id" for this user in this browser. Newer notifications still appear.
function bellClearKey(data) {
    const uid = Array.isArray(data) && data.length ? data[0].user_id : '';
    return 'refoundly_bell_cleared_' + (uid ?? '');
}
function getBellClearedBefore(data) {
    try { return Number(localStorage.getItem(bellClearKey(data))) || 0; } catch (e) { return 0; }
}
function visibleForBell(data) {
    if (!Array.isArray(data)) return data;
    const cutoff = getBellClearedBefore(data);
    return cutoff ? data.filter(n => Number(n.id) > cutoff) : data;
}

// Clear all global notifications using the custom rfConfirm modal
async function clearAllGlobalNotifs() {
    const hasDialog = await ensureRfDialog();
    const ok = hasDialog
        ? await rfConfirm(
            "This clears all notifications from your bell. You can still find them in Notification History.",
            { title: "Clear all notifications?", confirmText: "Yes, clear all", cancelText: "Cancel", danger: true }
          )
        : confirm("Clear all notifications from the bell?");   // last-resort fallback if rf-dialog.js can't load
    if (!ok) return;

    try {
        const res = await fetch('/api/user/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;

        // 1) Hide everything up to the newest notification from the bell right away
        const newestId = Math.max(...data.map(n => Number(n.id) || 0));
        try { localStorage.setItem(bellClearKey(data), String(newestId)); } catch (e) { /* private mode */ }
        updateNotificationsUI();

        // 2) Also mark the unread ones as read on the server, so the unread badge stays at 0
        const unread = data.filter(n => n.is_read == 0 || n.is_read === false || n.read === false);
        await Promise.all(
            unread.map(n => fetch(`/api/user/notifications/read/${n.id}`, { method: 'POST' }).catch(() => {}))
        );
    } catch (err) {
        console.error("Failed to clear global notifications:", err);
    }
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
        
        const data = visibleForBell(await res.json());   // hides notifications cleared from the bell

        if (Array.isArray(data)) {
            checkAndShowMatchPopups(data);
        }

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
            list.innerHTML = `<div class="notif-empty" style="padding:20px; text-align:center;">No ${currentNotifTab === 'unread' ? 'unread' : ''} notifications</div>`;
            return;
        }

        list.innerHTML = displayList.map(n => {
            const safeMessage = escapeHtml(n.message || '');
            const date = n.created_at ? new Date(n.created_at).toLocaleDateString() : '';

            return `
                <div class="notif-item-modern ${n.is_read ? '' : 'unread-bg'}" onclick="handleGlobalNotifClick(${n.id}, ${n.item_id || 'null'}, ${n.conversation_id || 'null'})">
                    <div class="notif-icon-circle" style="background: #7aa340; width:35px; height:35px; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fa-solid fa-bell" style="font-size:0.8rem;"></i>
                    </div>
                    <div style="flex-grow:1;">
                        <div class="notif-text" style="font-size:0.85rem; font-weight:${n.is_read ? '600' : '700'}">${safeMessage}</div>
                        <div class="notif-date" style="font-size:0.75rem;">${date}</div>
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
async function handleGlobalNotifClick(id, itemId, conversationId) {
    try {
        await fetch(`/api/user/notifications/read/${id}`, { method: 'POST' });
        await updateNotificationsUI();

        if (conversationId) {
            window.location.href = `message.html?conversation=${conversationId}`;
            return;
        }

        if (!itemId) {
            window.location.href = 'history.html';
            return;
        }

        const res = await fetch(`/api/items/${itemId}`);
        if (res.ok) {
            const item = await res.json();
            const dbType = (item.report_type || "").toLowerCase().trim();

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
    const clearBtn = document.getElementById('clearNotifsBtn'); 

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

    // Capture phase + stopImmediatePropagation: runs before, and blocks, any older handler on this
    // button (for example a native confirm() left in dashboard.js), so only the custom modal shows.
    clearBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        clearAllGlobalNotifs();
    }, true);

    updateNotificationsUI();
}

document.addEventListener("DOMContentLoaded", initNotifications);
setInterval(updateNotificationsUI, 20000);