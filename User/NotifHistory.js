let currentFilter = 'all'; 
let currentPage = 1;
const itemsPerPage = 10;
let currentUserId = localStorage.getItem('userId') || localStorage.getItem('id'); 

document.addEventListener("DOMContentLoaded", renderFullHistory);

// Escapes text before it's injected into innerHTML — see notifications.js
// for why this matters (notification text can carry another user's raw
// chat input, e.g. via "New message from X: <preview>").
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
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');
    renderFullHistory();
}

// Pagination Controls
function movePage(direction) {
    currentPage += direction;
    renderFullHistory();
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
                ${!isRead ? '<div class="unread-dot" style="width: 10px; height: 10px; background: #7aa340; border-radius: 50%; margin-left: auto;"></div>' : ''}
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
        // Preferred path: a single bulk request, if the backend supports it.
        const res = await fetch('/api/user/notifications/read-all', { method: 'POST' });
        if (!res.ok) throw new Error('Bulk read-all endpoint unavailable');
    } catch (err) {
        // Fallback: mark each currently-unread notification individually
        // using the endpoint we know exists (/read/:id). Slower, but works
        // even if /read-all hasn't been added to the server yet.
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
        // 🟢 FIX: correct route is /api/user/notifications/read/:id
        await fetch(`/api/user/notifications/read/${notifId}`, { method: 'POST' });

        const notifications = JSON.parse(localStorage.getItem('refoundly_user_private')) || [];
        const updated = notifications.map(n => n.id === notifId ? { ...n, is_read: 1 } : n);
        localStorage.setItem('refoundly_user_private', JSON.stringify(updated));
    } catch (err) {
        console.error("Failed to mark notification as read:", err);
    }

    // Conversation-linked notifications (new message, agreement update,
    // dispute, confirmed transaction) always go straight to that chat.
    if (conversationId) {
        window.location.href = `message.html?conversation=${conversationId}`;
        return;
    }

    // No linked item (e.g. a general/system notice) -> just go to history
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