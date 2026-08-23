let currentFilter = 'all'; 
let currentPage = 1;
const itemsPerPage = 10;
let currentUserId = localStorage.getItem('userId') || localStorage.getItem('id'); 

document.addEventListener("DOMContentLoaded", renderFullHistory);

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
        const messageContent = n.message || n.text || "Notification updated";
        const timeContent = formatNiceDate(n.created_at || n.time);
        
        const targetId = n.item_id || n.itemId;
        const targetUrl = targetId ? `history.html?id=${targetId}` : '#';

        const iconBg = isRead ? '#f0f2f5' : '#7aa340';
        const iconColor = isRead ? '#65676b' : '#ffffff';

        return `
            <div class="notif-list-item ${isRead ? '' : 'unread'}" 
                 onclick="handleNotifClick(${n.id}, '${targetUrl}')">
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

// Notification Click Handler
async function handleNotifClick(notifId, url) {
    if (url === '#') return;

    try {
        await fetch(`/api/notifications/read/${notifId}`, { method: 'POST' });
        
        const notifications = JSON.parse(localStorage.getItem('refoundly_user_private')) || [];
        const updated = notifications.map(n => n.id === notifId ? { ...n, is_read: 1 } : n);
        localStorage.setItem('refoundly_user_private', JSON.stringify(updated));

        window.location.href = url;
    } catch (err) {
        console.error("Navigation error:", err);
        window.location.href = url; 
    }
}