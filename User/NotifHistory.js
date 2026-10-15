let currentFilter = 'all'; 
let currentPage = 1;
const itemsPerPage = 10;
let currentUserId = localStorage.getItem('userId') || localStorage.getItem('id'); 

document.addEventListener("DOMContentLoaded", renderFullHistory);

// Escapes text before injecting into innerHTML
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Date Formatting
function formatNiceDate(dateString) {
    if (!dateString || dateString === "Just now") return "Just now";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const options = { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    };
    
    return date.toLocaleString('en-US', options);
}

// History Filtering
function updateFilter(type) {
    currentFilter = type;
    currentPage = 1;
    document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
    
    const activeTabId = type === 'unread' ? 'tabUnread' : 'tabAll';
    const activeTab = document.getElementById(activeTabId);
    if (activeTab) activeTab.classList.add('active');

    renderFullHistory();
}

// Pagination Controls
function movePage(direction) {
    currentPage += direction;
    renderFullHistory();
}

// If the server can't delete the notifications (for example the clear-all route is missing),
// we remember "hide everything up to this id" in this browser, so Clear All still empties the page.
function historyClearKey() { return 'refoundly_history_cleared_' + String(currentUserId); }
function getHistoryCleared() {
    try { return Number(localStorage.getItem(historyClearKey())) || 0; } catch (e) { return 0; }
}

// Clear All Notifications Function
async function clearNotifs() {
    const ok = await rfConfirm(
        "This will permanently remove all of your notification history. This can't be undone.",
        { title: "Clear all notifications?", confirmText: "Yes, clear all", cancelText: "Cancel", danger: true }
    );
    if (!ok) return;

    // 1) Ask the server to delete them
    try {
        await fetch('/api/user/notifications/clear-all', { method: 'POST' });
    } catch (err) {
        console.warn("clear-all request failed:", err);
    }

    // 2) Check what the server still has. If anything is left, the server did not really delete
    //    them (missing route, error, ...), so hide them in this browser instead.
    let remaining = [];
    try {
        const check = await fetch('/api/user/notifications');
        if (check.ok) {
            const data = await check.json();
            if (Array.isArray(data)) remaining = data;
        }
    } catch (err) { /* offline: nothing to check */ }

    if (remaining.length) {
        console.warn(`Server still has ${remaining.length} notification(s) after clear-all. ` +
                     `Hiding them in this browser. Add/fix POST /api/user/notifications/clear-all on the server.`);
        const newestId = Math.max(...remaining.map(n => Number(n.id) || 0));
        try { localStorage.setItem(historyClearKey(), String(newestId)); } catch (e) { /* private mode */ }
    }

    localStorage.removeItem('refoundly_user_private');
    currentPage = 1;
    await renderFullHistory();
}

// Notification History Rendering
async function renderFullHistory() {
    const listContainer = document.getElementById("historyList");
    const paginationContainer = document.getElementById("pagination-container");

    if (!currentUserId || currentUserId === "null" || currentUserId === "0") {
        try {
            const sessionResponse = await fetch('/api/get-session-info'); 
            if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();
                if (sessionData.userId) {
                    currentUserId = String(sessionData.userId);
                    localStorage.setItem('userId', currentUserId);
                }
            }
        } catch (err) { console.error("Session recovery failed:", err); }
    }

    try {
        const response = await fetch('/api/user/notifications');
        if (response.ok) {
            const dbData = await response.json();
            if (Array.isArray(dbData)) {
                localStorage.setItem('refoundly_user_private', JSON.stringify(dbData));
            }
        }
    } catch (err) { console.error("Fetch failed:", err); }

    const notifications = JSON.parse(localStorage.getItem('refoundly_user_private')) || [];
    let displayList = notifications.filter(n => {
        const myId = String(currentUserId).trim();
        const notifOwnerId = String(n.user_id).trim();
        const isForMe = (notifOwnerId === myId); 
        const content = n.message || n.text || "";
        const isNotAdminAction = !content.includes("New Report");
        return isForMe && isNotAdminAction;
    }).reverse();

    // Notifications hidden by Clear All (only used when the server could not delete them)
    const clearedBefore = getHistoryCleared();
    if (clearedBefore) displayList = displayList.filter(n => Number(n.id) > clearedBefore);

    if (currentFilter === 'unread') {
        displayList = displayList.filter(n => (n.is_read == 0 || n.read === false));
    }

    const totalItems = displayList.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = displayList.slice(startIndex, startIndex + itemsPerPage);

    // Pagination UI Update
    if (paginationContainer) {
        paginationContainer.innerHTML = `
            <div class="pagination-controls">
                <button id="prevPage" class="page-arrow" onclick="movePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span id="pageDisplay" class="page-num">
                    Page ${currentPage} of ${totalPages}
                </span>
                <button id="nextPage" class="page-arrow" onclick="movePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    if (totalItems === 0) {
        listContainer.innerHTML = `<div style="padding: 60px; text-align: center; color: #888;">No notification history found.</div>`;
        return;
    }

    // List Rendering
    listContainer.innerHTML = paginatedItems.map(n => {
        const isRead = n.is_read == 1 || n.read === true;
        const messageContent = escapeHtml(n.message || n.text || "Notification updated");
        const timeContent = formatNiceDate(n.created_at || n.time);
        
        const targetId = n.item_id || n.itemId || null;
        const conversationId = n.conversation_id || null;

        const iconBg = isRead ? '#f0f2f5' : '#7aa340';
        const iconColor = isRead ? '#65676b' : '#ffffff';

        return `
            <div class="notif-list-item ${isRead ? '' : 'unread'}" 
                 onclick="handleNotifClick(${n.id}, ${targetId ?? 'null'}, ${conversationId ?? 'null'})">
                <div class="icon-box" style="background: ${iconBg}; color: ${iconColor};">
                    <i class="fa-solid fa-bell"></i>
                </div>
                <div class="notif-info">
                    <p style="font-weight: ${isRead ? '400' : '600'}">${messageContent}</p>
                    <span><i class="far fa-clock"></i> ${timeContent}</span>
                </div>
                ${!isRead ? '<div class="unread-dot" style="width: 10px; height: 10px; background: #7aa340; border-radius: 50%; margin-left: auto; flex-shrink: 0; align-self: center;"></div>' : ''}
            </div>
        `;
    }).join('');
}

// Mark every notification as read in one go
async function markAllAsRead() {
    const btn = document.getElementById('markAllReadBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Marking...`;
    }

    try {
        const res = await fetch('/api/user/notifications/read-all', { method: 'POST' });
        if (!res.ok) throw new Error('Bulk read-all endpoint unavailable');
    } catch (err) {
        const notifications = JSON.parse(localStorage.getItem('refoundly_user_private')) || [];
        const unread = notifications.filter(n => !(n.is_read == 1 || n.read === true));

        await Promise.all(
            unread.map(n =>
                fetch(`/api/user/notifications/read/${n.id}`, { method: 'POST' }).catch(() => {})
            )
        );
    }

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-check-double"></i> Mark All as Read`;
    }

    renderFullHistory();
}

// Notification Click Handler
async function handleNotifClick(notifId, itemId, conversationId) {
    try {
        await fetch(`/api/user/notifications/read/${notifId}`, { method: 'POST' });

        const notifications = JSON.parse(localStorage.getItem('refoundly_user_private')) || [];
        const updated = notifications.map(n => n.id === notifId ? { ...n, is_read: 1 } : n);
        localStorage.setItem('refoundly_user_private', JSON.stringify(updated));
    } catch (err) {
        console.error("Failed to mark notification as read:", err);
    }

    if (conversationId) {
        window.location.href = `message.html?conversation=${conversationId}`;
        return;
    }

    if (!itemId) {
        window.location.href = 'history.html';
        return;
    }
    try {
        const res = await fetch(`/api/items/${itemId}`);
        if (res.ok) {
            const item = await res.json();
            const type = (item.report_type || "").toLowerCase().trim();
            window.location.href = type === 'lost'
                ? `lost.html?open=${itemId}`
                : `found.html?open=${itemId}`;
        } else {
            window.location.href = 'history.html';
        }
    } catch (err) {
        console.error("Could not resolve matched item:", err);
        window.location.href = 'history.html';
    }
}